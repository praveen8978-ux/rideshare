const Razorpay = require('razorpay');
const crypto   = require('crypto');
const db       = require('../config/db');
const logger   = require('../utils/logger');

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

exports.createOrder = async ({ amount, bookingRef }) => {
  if (!razorpay) return { id: `dev_order_${Date.now()}` };
  const order = await razorpay.orders.create({
    amount:   Math.round(amount * 100),
    currency: 'INR',
    receipt:  bookingRef,
    notes:    { platform: 'rideshare' },
  });
  return order;
};

exports.verifySignature = (orderId, paymentId, signature) => {
  const body     = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

exports.releaseToDriver = async (bookingId) => {
  const { rows } = await db.query(
    `SELECT p.*, u.razorpay_fund_account_id
     FROM payments p
     JOIN users u ON u.id = p.payee_id
     WHERE p.booking_id = $1 AND p.status = 'held'`,
    [bookingId]
  );
  const payment = rows[0];
  if (!payment) return;

  try {
    const payout = await razorpay.payouts.create({
      account_number:      process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id:     payment.razorpay_fund_account_id,
      amount:              Math.round(payment.driver_payout * 100),
      currency:            'INR',
      mode:                'UPI',
      purpose:             'payout',
      queue_if_low_balance: true,
      reference_id:        `payout_${bookingId}`,
    });

    await db.query(
      `UPDATE payments SET status = 'released', released_at = NOW(), razorpay_payout_id = $1
       WHERE booking_id = $2`,
      [payout.id, bookingId]
    );
    logger.info(`Payment released for booking ${bookingId}`);
  } catch (err) {
    logger.error(`Payout failed for booking ${bookingId}`, { err });
    throw err;
  }
};

exports.handleWebhook = async (req, res) => {
  const sig      = req.headers['x-razorpay-signature'];
  const body     = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (sig !== expected)
    return res.status(400).json({ error: 'Invalid signature' });

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const { order_id, id: payment_id } = payload.payment.entity;
    await db.query(
      `UPDATE payments SET razorpay_payment_id = $1, status = 'held', held_at = NOW()
       WHERE razorpay_order_id = $2`,
      [payment_id, order_id]
    );
  }

  if (event === 'payment.failed') {
    const { order_id } = payload.payment.entity;
    await db.query(
      `UPDATE payments SET status = 'failed', failure_reason = $1
       WHERE razorpay_order_id = $2`,
      [payload.payment.entity.error_description, order_id]
    );
  }

  res.json({ status: 'ok' });
};