const express = require('express');
const r       = express.Router();
const { authenticate }  = require('../middleware/auth');
const { handleWebhook } = require('../services/payment');
const db = require('../config/db');

r.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

r.use(authenticate);
r.get('/booking/:bookingId', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.status, p.amount, p.platform_fee, p.driver_payout,
              p.method, p.held_at, p.released_at, p.razorpay_order_id
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = $1 AND (b.passenger_id = $2 OR p.payee_id = $2)`,
      [req.params.bookingId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Payment not found' });
    res.json({ success: true, payment: rows[0] });
  } catch (err) { next(err); }
});

module.exports = r;