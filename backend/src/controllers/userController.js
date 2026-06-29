const db = require('../config/db');

exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, COALESCE(ur.avg_rating, 0) AS avg_rating, COALESCE(ur.total_ratings, 0) AS total_ratings
       FROM users u LEFT JOIN user_avg_ratings ur ON ur.user_id = u.id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, email, gender, avatarUrl } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET
         name       = COALESCE($1, name),
         email      = COALESCE($2, email),
         gender     = COALESCE($3, gender),
         avatar_url = COALESCE($4, avatar_url)
       WHERE id = $5 RETURNING *`,
      [name, email, gender, avatarUrl, req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
};

exports.addVehicle = async (req, res, next) => {
  try {
    const { type, make, model, year, color, plateNumber, totalSeats, acAvailable } = req.body;
    const { rows } = await db.query(
      `INSERT INTO vehicles (owner_id, type, make, model, year, color, plate_number, total_seats, ac_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, type, make, model, year, color, plateNumber, totalSeats, acAvailable || false]
    );
    await db.query(
      `UPDATE users SET role = 'both' WHERE id = $1 AND role = 'rider'`,
      [req.user.id]
    );
    res.status(201).json({ success: true, vehicle: rows[0] });
  } catch (err) { next(err); }
};

exports.getVehicles = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicles WHERE owner_id = $1', [req.user.id]);
    res.json({ success: true, vehicles: rows });
  } catch (err) { next(err); }
};

exports.rateUser = async (req, res, next) => {
  try {
    const { ratedUserId, bookingId, rating, review } = req.body;
    await db.query(
      `INSERT INTO user_ratings (rated_user_id, rated_by_id, booking_id, rating, review)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (booking_id, rated_by_id) DO NOTHING`,
      [ratedUserId, req.user.id, bookingId, rating, review]
    );
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_avg_ratings');
    res.json({ success: true });
  } catch (err) { next(err); }
};