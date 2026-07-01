const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('../config/db');
const redis  = require('../config/redis');
const logger = require('../utils/logger');

const isBlacklisted = async (token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const val  = await redis.get(`blacklist:${hash}`);
  return val === '1';
};

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, error: 'No token provided' });

    const token = header.split(' ')[1];

    // Check blacklist before anything else
    if (await isBlacklisted(token)) {
      return res.status(401).json({ success: false, error: 'Token has been revoked. Please log in again.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.type !== 'access')
      return res.status(401).json({ success: false, error: 'Invalid token type' });

    // Check if account is locked
    const locked = await redis.get(`locked:${payload.userId}`);
    if (locked)
      return res.status(403).json({ success: false, error: 'Account locked for security reasons. Contact support.' });

    const { rows } = await db.query(
      'SELECT id, phone, email, name, role, gender, is_active, is_banned FROM users WHERE id = $1',
      [payload.userId]
    );

    if (!rows[0] || !rows[0].is_active || rows[0].is_banned)
      return res.status(401).json({ success: false, error: 'Account inactive or banned' });

    req.user      = rows[0];
    req.sessionId = payload.sessionId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role) && req.user.role !== 'both')
    return res.status(403).json({ success: false, error: `Requires role: ${roles.join(' or ')}` });
  next();
};

const womenOnly = (req, res, next) => {
  if (req.user.gender !== 'female')
    return res.status(403).json({ success: false, error: 'This ride is women-only' });
  next();
};

module.exports = { authenticate, requireRole, womenOnly };