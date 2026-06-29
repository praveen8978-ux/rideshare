const db = require('../config/db');
const { segmentDistance, decodePolyline } = require('../utils/geo');
const { calculateFare }        = require('../services/fareEngine');
const { createOrder }          = require('../services/payment');
const { sendPushNotification } = require('../services/notification');
const { generateOTP }          = require('../utils/otp');

exports.createBooking = async (req, res, next) => {
  try {
    const {
      rideId, seatsBooked = 1,
      pickupName, pickupLat, pickupLng,
      dropoffName, dropoffLat, dropoffLng,
    } = req.body;

    const { rows: rideRows } = await db.query(
      'SELECT * FROM rides WHERE id = $1 AND status = $2',
      [rideId, 'scheduled']
    );
    const ride = rideRows[0];
    if (!ride)
      return res.status(404).json({ success: false, error: 'Ride not found or not available' });
    if (ride.driver_id === req.user.id)
      return res.status(400).json({ success: false, error: 'Cannot book your own ride' });
    if (ride.seats_available < seatsBooked)
      return res.status(400).json({ success: false, error: 'Not enough seats' });
    if (ride.women_only && req.user.gender !== 'female')
      return res.status(403).json({ success: false, error: 'This ride is women-only' });

    const { rows: existing } = await db.query(
      `SELECT id FROM bookings WHERE ride_id = $1 AND passenger_id = $2
       AND status NOT IN ('rejected','cancelled')`,
      [rideId, req.user.id]
    );
    if (existing[0])
      return res.status(400).json({ success: false, error: 'You already have a booking on this ride' });

    const pts        = decodePolyline(ride.route_polyline);
    const segmentKm  = segmentDistance(pts, pickupLat, pickupLng, dropoffLat, dropoffLng);
    const fare       = calculateFare({ distanceKm: segmentKm, baseFare: Number(ride.base_fare), seats: seatsBooked });
    const COMMISSION = 0.15;
    const platformFee  = Math.round(fare.total * COMMISSION * 100) / 100;
    const driverPayout = Math.round((fare.total - platformFee) * 100) / 100;

    const order = await createOrder({ amount: fare.total, bookingRef: `ride_${rideId}` });

    const { rows } = await db.query(
      `INSERT INTO bookings (
        ride_id, passenger_id,
        pickup_name, pickup_lat, pickup_lng,
        dropoff_name, dropoff_lat, dropoff_lng,
        segment_km, seats_booked,
        fare_total, platform_fee, driver_payout
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        rideId, req.user.id,
        pickupName, pickupLat, pickupLng,
        dropoffName, dropoffLat, dropoffLng,
        Math.round(segmentKm * 100) / 100, seatsBooked,
        fare.total, platformFee, driverPayout,
      ]
    );

    await db.query(
      `INSERT INTO payments (booking_id, payer_id, payee_id, amount, platform_fee, driver_payout, method, razorpay_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,'upi',$7)`,
      [rows[0].id, req.user.id, ride.driver_id, fare.total, platformFee, driverPayout, order.id]
    );

    req.app.get('io').to(`user:${ride.driver_id}`).emit('booking:new_request', {
      bookingId: rows[0].id, rideId,
      passenger: { id: req.user.id, name: req.user.name },
      seats: seatsBooked, fare: fare.total,
      pickup: pickupName, dropoff: dropoffName,
    });

    await sendPushNotification(ride.driver_id, {
      title: 'New ride request',
      body:  `${req.user.name} wants ${seatsBooked} seat(s) — ${pickupName} → ${dropoffName}`,
    });

    res.status(201).json({
      success: true,
      booking: rows[0],
      payment: { orderId: order.id, amount: fare.total, currency: 'INR' },
    });
  } catch (err) { next(err); }
};

exports.acceptBooking = async (req, res, next) => {
  try {
    const { rows: bRows } = await db.query(
      `SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = bRows[0];
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.driver_id !== req.user.id) return res.status(403).json({ success: false, error: 'Not your ride' });
    if (booking.status !== 'pending') return res.status(400).json({ success: false, error: 'Booking is not pending' });

    const otp = generateOTP();
    await db.query(`UPDATE bookings SET status = 'accepted', otp = $1 WHERE id = $2`, [otp, booking.id]);
    await db.query(`UPDATE payments SET status = 'held', held_at = NOW() WHERE booking_id = $1`, [booking.id]);

    req.app.get('io').to(`user:${booking.passenger_id}`).emit('booking:accepted', { bookingId: booking.id, otp });
    await sendPushNotification(booking.passenger_id, {
      title: 'Booking confirmed!',
      body:  `Your ride is confirmed. Show OTP ${otp} to the driver at pickup.`,
    });

    res.json({ success: true, otp });
  } catch (err) { next(err); }
};

exports.rejectBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { rows: bRows } = await db.query(
      `SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = bRows[0];
    if (!booking || booking.driver_id !== req.user.id)
      return res.status(404).json({ success: false, error: 'Booking not found' });

    await db.query(
      `UPDATE bookings SET status = 'rejected', cancelled_reason = $1, cancelled_by = $2, cancelled_at = NOW()
       WHERE id = $3`,
      [reason, req.user.id, booking.id]
    );
    await db.query(`UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE booking_id = $1`, [booking.id]);
    req.app.get('io').to(`user:${booking.passenger_id}`).emit('booking:rejected', { bookingId: booking.id, reason });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, r.departure_time, r.driver_id
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.id = $1 AND b.passenger_id = $2`,
      [req.params.id, req.user.id]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (!['pending','accepted'].includes(booking.status))
      return res.status(400).json({ success: false, error: 'Cannot cancel at this stage' });

    const hoursLeft = (new Date(booking.departure_time) - Date.now()) / 3_600_000;
    const refund    = hoursLeft > 2 ? 'full' : 'partial';

    await db.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW() WHERE id = $2`,
      [req.user.id, booking.id]
    );
    await db.query(`UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE booking_id = $1`, [booking.id]);
    req.app.get('io').to(`user:${booking.driver_id}`).emit('booking:cancelled', {
      bookingId: booking.id, passengerName: req.user.name,
    });
    res.json({ success: true, refundPolicy: refund });
  } catch (err) { next(err); }
};

exports.confirmBoarding = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const { rows } = await db.query(
      `SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = rows[0];
    if (!booking || booking.driver_id !== req.user.id)
      return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.otp !== otp)
      return res.status(400).json({ success: false, error: 'Invalid OTP' });

    await db.query(`UPDATE bookings SET boarded_at = NOW() WHERE id = $1`, [booking.id]);
    req.app.get('io').to(`user:${booking.passenger_id}`).emit('booking:boarded', { bookingId: booking.id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.myBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset       = (Number(page) - 1) * Number(limit);
    const statusClause = status ? `AND b.status = '${status}'` : '';
    const { rows } = await db.query(
      `SELECT b.*, r.origin_name, r.dest_name, r.departure_time, r.status AS ride_status,
              u.name AS driver_name, u.avatar_url AS driver_avatar,
              v.make, v.model, v.color
       FROM bookings b
       JOIN rides r    ON r.id = b.ride_id
       JOIN users u    ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
       WHERE b.passenger_id = $1 ${statusClause}
       ORDER BY r.departure_time DESC LIMIT $2 OFFSET $3`,
      [req.user.id, Number(limit), offset]
    );
    res.json({ success: true, bookings: rows });
  } catch (err) { next(err); }
};