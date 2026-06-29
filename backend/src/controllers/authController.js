const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const redis    = require('../config/redis');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');
const logger   = require('../utils/logger');

const OTP_TTL      = 5 * 60;
const MAX_ATTEMPTS = 3;

// ── POST /auth/send-otp ────────────────────────────────────
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Valid email address required' });

    const identifier = email.trim().toLowerCase();

    // Rate limit: 3 OTPs per 10 mins
    const rateKey  = `otp_rate:${identifier}`;
    const attempts = await redis.get(rateKey);
    if (attempts && Number(attempts) >= 3)
      return res.status(429).json({ success: false, error: 'Too many requests. Try again in 10 minutes.' });

    // Generate & store OTP
    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);
    await redis.set(`otp:${identifier}`, JSON.stringify({ hash, attempts: 0 }), OTP_TTL);

    // Rate limit tracking
    const pipe = redis.client.multi();
    pipe.incr(rateKey);
    pipe.expire(rateKey, 10 * 60);
    await pipe.exec();

    // Get name if user exists
    const { rows } = await db.query('SELECT name FROM users WHERE email = $1', [identifier]);
    const name = rows[0]?.name || 'there';

    // Send email
    await sendOTPEmail(identifier, otp, name);

    res.json({ success: true, message: `OTP sent to ${identifier}`, expiresIn: OTP_TTL });
  } catch (err) {
    logger.error('sendOtp error', { err: err.message });
    next(err);
  }
};

// ── POST /auth/verify-otp ──────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, name, gender } = req.body;

    if (!email || !otp)
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });

    const identifier = email.trim().toLowerCase();

    // Verify OTP
    const cached = await redis.get(`otp:${identifier}`);
    if (!cached)
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });

    const { hash, attempts } = JSON.parse(cached);

    if (attempts >= MAX_ATTEMPTS) {
      await redis.del(`otp:${identifier}`);
      return res.status(400).json({ success: false, error: 'Too many failed attempts. Request a new OTP.' });
    }

    const valid = await bcrypt.compare(otp, hash);
    if (!valid) {
      await redis.set(
        `otp:${identifier}`,
        JSON.stringify({ hash, attempts: attempts + 1 }),
        OTP_TTL
      );
      return res.status(400).json({ success: false, error: 'Incorrect OTP. Please try again.' });
    }

    // Check if user exists
    let { rows } = await db.query('SELECT * FROM users WHERE email = $1', [identifier]);
    let user  = rows[0];
    let isNew = false;

    if (!user) {
      // New user — need name first
      if (!name) {
        return res.status(200).json({
          success:      true,
          isNew:        true,
          requiresName: true,
          message:      'OTP verified. Please provide your name.',
        });
      }

      // Create user
      const result = await db.query(
        `INSERT INTO users (email, name, gender, phone)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [identifier, name.trim(), gender || 'prefer_not_to_say', null]
      );
      user  = result.rows[0];
      isNew = true;

      // Send welcome email
      await sendWelcomeEmail(identifier, name.trim());
    }

    // Delete OTP after full success
    await redis.del(`otp:${identifier}`);

    // Generate tokens
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

    logger.info(`User ${isNew ? 'registered' : 'logged in'}: ${identifier}`);

    res.json({
      success: true,
      isNew,
      token,
      refreshToken,
      user: {
        id:        user.id,
        email:     user.email,
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