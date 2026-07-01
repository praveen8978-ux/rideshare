const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const db       = require('../config/db');
const redis    = require('../config/redis');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');
const logger   = require('../utils/logger');

const OTP_TTL      = 5 * 60;
const MAX_ATTEMPTS = 3;

// ── Token helpers ──────────────────────────────────────────

// Generate a unique token family ID (ties access + refresh together)
const generateTokenFamily = () => crypto.randomBytes(16).toString('hex');

// Generate access token (short-lived: 15 mins)
const generateAccessToken = (userId, sessionId) =>
  jwt.sign(
    { userId, sessionId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

// Generate refresh token (long-lived: 30 days)
const generateRefreshToken = (userId, sessionId, family) =>
  jwt.sign(
    { userId, sessionId, family, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

// Store session in Redis
// Key: session:{sessionId} → { userId, family, refreshTokenHash }
const storeSession = async (sessionId, userId, family, refreshToken) => {
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ userId, family, hash }),
    30 * 24 * 60 * 60 // 30 days
  );
};

// Blacklist a token in Redis (until it expires naturally)
const blacklistToken = async (token, ttlSeconds) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.set(`blacklist:${hash}`, '1', ttlSeconds);
};

// Check if token is blacklisted
const isBlacklisted = async (token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const val  = await redis.get(`blacklist:${hash}`);
  return val === '1';
};

// Lock account on suspicious activity (reuse of rotated token)
const lockAccount = async (userId, reason) => {
  logger.warn(`SECURITY: Locking account ${userId} — ${reason}`);
  // Delete ALL sessions for this user
  const keys = await redis.client.keys(`session:*`);
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.userId === userId) await redis.del(key);
    }
  }
  // Store lock flag (admin must unlock)
  await redis.set(`locked:${userId}`, reason, 24 * 60 * 60);
};

// Issue full token pair + store session
const issueTokenPair = async (userId) => {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const family    = generateTokenFamily();

  const accessToken  = generateAccessToken(userId, sessionId);
  const refreshToken = generateRefreshToken(userId, sessionId, family);

  await storeSession(sessionId, userId, family, refreshToken);

  return { accessToken, refreshToken, sessionId };
};

// ── POST /auth/send-otp ────────────────────────────────────
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Valid email address required' });

    const identifier = email.trim().toLowerCase();

    // Check if account is locked
    const locked = await redis.get(`locked:${identifier}`);
    if (locked)
      return res.status(403).json({ success: false, error: 'Account locked for security reasons. Contact support.' });

    // Rate limit: 3 OTPs per 10 mins
    const attempts = await redis.get(`otp_rate:${identifier}`);
    if (attempts && Number(attempts) >= 3)
      return res.status(429).json({ success: false, error: 'Too many requests. Try again in 10 minutes.' });

    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);
    await redis.set(`otp:${identifier}`, JSON.stringify({ hash, attempts: 0 }), OTP_TTL);

    const pipe = redis.client.multi();
    pipe.incr(`otp_rate:${identifier}`);
    pipe.expire(`otp_rate:${identifier}`, 10 * 60);
    await pipe.exec();

    const { rows } = await db.query('SELECT name FROM users WHERE email = $1', [identifier]);
    const name = rows[0]?.name || 'there';

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

    // Check if account is locked
    const locked = await redis.get(`locked:${identifier}`);
    if (locked)
      return res.status(403).json({ success: false, error: 'Account locked for security reasons. Contact support.' });

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

    // Check user
    let { rows } = await db.query('SELECT * FROM users WHERE email = $1', [identifier]);
    let user  = rows[0];
    let isNew = false;

    if (!user) {
      if (!name) {
        return res.status(200).json({
          success: true, isNew: true, requiresName: true,
          message: 'OTP verified. Please provide your name.',
        });
      }
      const result = await db.query(
        `INSERT INTO users (email, name, gender, phone) VALUES ($1,$2,$3,$4) RETURNING *`,
        [identifier, name.trim(), gender || 'prefer_not_to_say', null]
      );
      user  = result.rows[0];
      isNew = true;
      await sendWelcomeEmail(identifier, name.trim());
    }

    // Delete OTP after success
    await redis.del(`otp:${identifier}`);

    // Issue token pair (access + refresh with session)
    const { accessToken, refreshToken, sessionId } = await issueTokenPair(user.id);

    await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id]);
    logger.info(`User ${isNew ? 'registered' : 'logged in'}: ${identifier} session:${sessionId}`);

    res.json({
      success: true, isNew,
      accessToken,   // short-lived (15 min)
      refreshToken,  // long-lived (30 days), rotates on use
      sessionId,
      user: {
        id: user.id, email: user.email, phone: user.phone,
        name: user.name, role: user.role, gender: user.gender,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    logger.error('verifyOtp error', { err: err.message });
    next(err);
  }
};

// ── POST /auth/refresh ─────────────────────────────────────
// Token rotation: old refresh token blacklisted, new pair issued
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, error: 'Refresh token required' });

    // Check blacklist FIRST
    if (await isBlacklisted(refreshToken)) {
      // Someone is using an already-rotated token — likely theft
      // Decode to find userId and lock the account
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.userId) {
          await lockAccount(decoded.userId, 'Refresh token reuse detected — possible token theft');
        }
      } catch {}
      logger.warn('SECURITY: Blacklisted refresh token used');
      return res.status(401).json({
        success: false,
        error: 'Security alert: This session has been invalidated. Please log in again.',
      });
    }

    // Verify token signature
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh')
      return res.status(401).json({ success: false, error: 'Invalid token type' });

    // Load session from Redis
    const sessionData = await redis.get(`session:${payload.sessionId}`);
    if (!sessionData) {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }

    const session = JSON.parse(sessionData);

    // Verify family matches (prevents session hijacking across families)
    if (session.family !== payload.family) {
      await lockAccount(payload.userId, 'Token family mismatch — possible session hijacking');
      return res.status(401).json({
        success: false,
        error: 'Security alert: Suspicious activity detected. Please log in again.',
      });
    }

    // Verify refresh token hash matches stored hash
    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (session.hash !== incomingHash) {
      await lockAccount(payload.userId, 'Refresh token hash mismatch');
      return res.status(401).json({
        success: false,
        error: 'Security alert: Token mismatch detected.',
      });
    }

    // Blacklist the old refresh token immediately
    const oldTtl = payload.exp - Math.floor(Date.now() / 1000);
    if (oldTtl > 0) await blacklistToken(refreshToken, oldTtl);

    // Delete old session
    await redis.del(`session:${payload.sessionId}`);

    // Issue brand new token pair
    const { accessToken: newAccess, refreshToken: newRefresh, sessionId: newSessionId } =
      await issueTokenPair(payload.userId);

    logger.info(`Token rotated for user ${payload.userId} → new session:${newSessionId}`);

    res.json({
      success: true,
      accessToken:  newAccess,
      refreshToken: newRefresh,
      sessionId:    newSessionId,
    });
  } catch (err) {
    logger.error('refreshToken error', { err: err.message });
    next(err);
  }
};

// ── POST /auth/logout ──────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Blacklist the refresh token
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const ttl     = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await blacklistToken(refreshToken, ttl);
        await redis.del(`session:${payload.sessionId}`);
      } catch {}
    }

    // Blacklist the access token too
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      try {
        const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
        const ttl     = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await blacklistToken(accessToken, ttl);
      } catch {}
    }

    logger.info(`User ${req.user?.id} logged out`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

// ── POST /auth/logout-all ──────────────────────────────────
// Logout from ALL devices
exports.logoutAll = async (req, res, next) => {
  try {
    const keys = await redis.client.keys('session:*');
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.userId === req.user.id) await redis.del(key);
      }
    }
    logger.info(`User ${req.user.id} logged out from all devices`);
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) { next(err); }
};