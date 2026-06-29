const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const redis  = require('../config/redis');
const { sendOTP } = require('../services/sms');
const logger = require('../utils/logger');

const OTP_TTL      = 5 * 60;
const MAX_ATTEMPTS = 3;

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ success: false, error: 'Invalid phone number' });

    const attempts = await redis.get(`otp_rate:${phone}`);
    if (attempts && Number(attempts) >= 3)
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Try again in 10 minutes.' });

    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);

    await redis.set(`otp:${phone}`, JSON.stringify({ hash, attempts: 0 }), OTP_TTL);

    const pipe = redis.client.multi();
    pipe.incr(`otp_rate:${phone}`);
    pipe.expire(`otp_rate:${phone}`, 10 * 60);
    await pipe.exec();

    if (process.env.NODE_ENV === 'production') {
      await sendOTP(phone, otp);
    } else {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent', expiresIn: OTP_TTL });
  } catch (err) { next(err); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, name, gender } = req.body;
    if (!phone || !otp)
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });

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
      return res.status(400).json({ success: false, error: 'Incorrect OTP' });
    }

    // Check if user exists
    let { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user = rows[0];
    let isNew = false;

    if (!user) {
      // New user — need name
      if (!name) {
        // Don't delete OTP yet — frontend needs to submit name
        return res.status(200).json({ success: true, isNew: true, requiresName: true });
      }
      // Create user
      const result = await db.query(
        `INSERT INTO users (phone, name, gender) VALUES ($1, $2, $3) RETURNING *`,
        [phone, name.trim(), gender || 'prefer_not_to_say']
      );
      user  = result.rows[0];
      isNew = true;
    }

    // Only delete OTP after full success
    await redis.del(`otp:${phone}`);

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
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, error: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored  = await redis.get(`refresh:${payload.userId}`);
    if (stored !== refreshToken)
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });

    const token = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ success: true, token });
  } catch (err) {
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ success: false, error: 'Invalid token' });
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await redis.del(`refresh:${req.user.id}`);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};