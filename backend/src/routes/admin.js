const express = require('express');
const r       = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../config/db');

r.use(authenticate);

r.get('/stats', async (req, res, next) => {
  try {
    const [users, rides, bookings, revenue] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM rides'),
      db.query('SELECT COUNT(*) FROM bookings WHERE status = $1', ['completed']),
      db.query('SELECT COALESCE(SUM(platform_fee),0) AS total FROM payments WHERE status = $1', ['released']),
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers:       Number(users.rows[0].count),
        totalRides:       Number(rides.rows[0].count),
        completedRides:   Number(bookings.rows[0].count),
        totalRevenue:     Number(revenue.rows[0].total),
      },
    });
  } catch (err) { next(err); }
});

module.exports = r;