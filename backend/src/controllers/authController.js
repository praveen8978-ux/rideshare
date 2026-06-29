const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const redis  = require('../config/redis');
const logger = require('../utils/logger');

const OTP_TTL      = 5 * 60;
const MAX_ATTEMPTS = 3;

// ── Twilio helpers ─────────────────────────────────────────
const getTwilio = () => {
  if (!process.env.TWILIO_ACCOUNT_SID) return null;
  return require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
};

const useVerify = () => false;

// ── POST /auth/send-otp ────────────────────────────────────
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ success: false, error: 'Invalid phone number. Use +91XXXXXXXXXX format.' });

    // Rate limit: max 3 OTPs per 10 mins
    const attempts = await redis.get(`otp_rate:${phone}`);
    if (attempts && Number(attempts) >= 3)
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Try again in 10 minutes.' });

    const pipe = redis.client.multi();
    pipe.incr(`otp_rate:${phone}`);
    pipe.expire(`otp_rate:${phone}`, 10 * 60);
    await pipe.exec();

    // ── Twilio Verify (recommended) ──────────────────────
    if (useVerify()) {
      const twilio = getTwilio();
      await twilio.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to: phone, channel: 'sms' });

      logger.info(`OTP sent via Twilio Verify to ${phone}`);
      return res.json({ success: true, message: 'OTP sent to your mobile', expiresIn: 300 });
    }

    // ── Fallback: our own OTP + direct SMS ───────────────
    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);
    await redis.set(`otp:${phone}`, JSON.stringify({ hash, attempts: 0 }), OTP_TTL);

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_PHONE) {
      const twilio = getTwilio();
      await twilio.messages.create({
        body: `Your RideShare OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
        from: process.env.TWILIO_PHONE,
        to:   phone,
      });
      logger.info(`OTP sent via SMS to ${phone}`);
    } else {
      // Dev mode — print to terminal
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent', expiresIn: OTP_TTL });
  } catch (err) {
    logger.error('sendOtp error', { err: err.message });
    next(err);
  }
};

// ── POST /auth/verify-otp ──────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, name, gender } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ success: false, error: 'Phone and OTP are required' });

    // ── Verify OTP ───────────────────────────────────────
    if (useVerify()) {
      // Twilio Verify handles OTP validation
      try {
        const twilio = getTwilio();
        const check = await twilio.verify.v2
          .services(process.env.TWILIO_VERIFY_SID)
          .verificationChecks.create({ to: phone, code: otp });

        if (check.status !== 'approved') {
          return res.status(400).json({ success: false, error: 'Incorrect OTP. Please try again.' });
        }
      } catch (err) {
  logger.error('Twilio verify check failed', { 
    err: err.message,
    code: err.code,
    status: err.status,
    moreInfo: err.moreInfo
  });
  return res.status(400).json({ success: false, error: 'OTP verification failed. Request a new one.' });
}

    } else {
      // Our own Redis OTP verification
      const cached = await redis.get(`otp:${phone}`);
      if (!cached)
        return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });

      const { hash, attempts } = JSON.parse(cached);

      if (attempts >= MAX_ATTEMPTS) {
        await redis.del(`otp:${phone}`);
        return res.status(400).json({ success: false, error: 'Too many failed attempts. Request a new OTP.' });
      }

      const valid = await bcrypt.compare(otp, hash);
      if (!valid) {
        await redis.set(
          `otp:${phone}`,
          JSON.stringify({ hash, attempts: attempts + 1 }),
          OTP_TTL
        );
        return res.status(400).json({ success: false, error: 'Incorrect OTP. Please try again.' });
      }

      // Valid — delete OTP only when name is provided (new user) or user exists
      const userCheck = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (!userCheck.rows[0] && !name) {
        // New user needs name — keep OTP for now
      } else {
        await redis.del(`otp:${phone}`);
      }
    }

    // ── Check if user exists ─────────────────────────────
    let { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user  = rows[0];
    let isNew = false;

    if (!user) {
      // New user — need name first
      if (!name) {
        return res.status(200).json({
          success:      true,
          isNew:        true,
          requiresName: true,
          message:      'OTP verified. Please provide your name to complete registration.',
        });
      }

      // Create new user
      const result = await db.query(
        `INSERT INTO users (phone, name, gender)
         VALUES ($1, $2, $3) RETURNING *`,
        [phone, name.trim(), gender || 'prefer_not_to_say']
      );
      user  = result.rows[0];
      isNew = true;

      // Clean up OTP for new user
      if (!useVerify()) await redis.del(`otp:${phone}`);
    }

    // ── Generate tokens ──────────────────────────────────
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '90d' }
    );

    await redis.set(`refresh:${user.id}`, refreshToken, 90 * 24 * 60 * 60);
    await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id]);

    logger.info(`User ${isNew ? 'registered' : 'logged in'}: ${phone}`);

    res.json({
      success: true,
      isNew,
      token,
      refreshToken,
      user: {
        id:        user.id,
        phone:     user.phone,
        name:      user.name,
        role:      user.role,
        gender:    user.gender,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    logger.error('verifyOtp error', { err: err.message });
    next(err);
  }
};

// ── POST /auth/refresh ─────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, error: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored  = await redis.get(`refresh:${payload.userId}`);

    if (stored !== refreshToken)
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });

    const token = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, error: 'Invalid token' });
    next(err);
  }
};

// ── POST /auth/logout ──────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await redis.del(`refresh:${req.user.id}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};