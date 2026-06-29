const express = require('express');
const r       = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

r.use(authenticate);

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) { next(err); }
});

r.patch('/:id/read', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

r.patch('/read-all', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = r;