const db = require('../config/db');
const { decodePolyline, pointOnRoute, segmentDistance } = require('../utils/geo');
const { calculateFare } = require('../services/fareEngine');

exports.createRide = async (req, res, next) => {
  try {
    const {
      vehicleId, originName, originLat, originLng,
      destName, destLat, destLng,
      routePolyline, routeDistanceKm, waypoints,
      departureTime, totalSeats, baseFare,
      womenOnly, acRide, allowsParcels, parcelFare,
      luggageAllowed, petsAllowed, smokingAllowed, notes,
    } = req.body;

    const { rows: vRows } = await db.query(
      'SELECT id, total_seats FROM vehicles WHERE id = $1 AND owner_id = $2 AND is_active = TRUE',
      [vehicleId, req.user.id]
    );
    if (!vRows[0])
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    if (totalSeats > vRows[0].total_seats)
      return res.status(400).json({ success: false, error: 'Seats exceed vehicle capacity' });

    const { rows } = await db.query(
      `INSERT INTO rides (
        driver_id, vehicle_id,
        origin_name, origin_lat, origin_lng,
        dest_name, dest_lat, dest_lng,
        route_polyline, route_distance_km, waypoints,
        departure_time, total_seats, seats_available, base_fare,
        women_only, ac_ride, allows_parcels, parcel_fare,
        luggage_allowed, pets_allowed, smoking_allowed, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,
                $15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        req.user.id, vehicleId,
        originName, originLat, originLng,
        destName, destLat, destLng,
        routePolyline, routeDistanceKm, JSON.stringify(waypoints || []),
        departureTime, totalSeats, baseFare,
        womenOnly || false, acRide || false, allowsParcels || false, parcelFare || null,
        luggageAllowed !== false, petsAllowed || false, smokingAllowed || false, notes || null,
      ]
    );

    res.status(201).json({ success: true, ride: rows[0] });
  } catch (err) { next(err); }
};

exports.searchRides = async (req, res, next) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, date, seats = 1, womenOnly = false } = req.query;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !date)
      return res.status(400).json({ success: false, error: 'pickupLat, pickupLng, dropoffLat, dropoffLng, date required' });

    const pLat = Number(pickupLat), pLng = Number(pickupLng);
    const dLat = Number(dropoffLat), dLng = Number(dropoffLng);

    const { rows: candidates } = await db.query(
      `SELECT r.*, u.name AS driver_name, u.avatar_url AS driver_avatar,
              v.make, v.model, v.color, v.plate_number, v.type AS vehicle_type, v.ac_available,
              COALESCE(ur.avg_rating, 0) AS driver_rating,
              COALESCE(ur.total_ratings, 0) AS driver_reviews
       FROM rides r
       JOIN users u    ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
       LEFT JOIN user_avg_ratings ur ON ur.user_id = r.driver_id
       WHERE r.status = 'scheduled'
         AND r.departure_time >= $1::date
         AND r.departure_time <  $1::date + INTERVAL '1 day'
         AND r.seats_available >= $2
         AND ($3 = FALSE OR r.women_only = TRUE)
         AND ST_DWithin(r.origin_point, ST_MakePoint($5,$4)::geography, 50000)
       ORDER BY r.departure_time ASC
       LIMIT 100`,
      [date, seats, womenOnly === 'true', pLat, pLng]
    );

    const TOLERANCE = 2000;
    const matched = candidates.filter((ride) => {
      const pts = decodePolyline(ride.route_polyline);
      return pointOnRoute(pts, pLat, pLng, TOLERANCE) && pointOnRoute(pts, dLat, dLng, TOLERANCE);
    });

    const enriched = matched.map((ride) => {
      const pts    = decodePolyline(ride.route_polyline);
      const distKm = segmentDistance(pts, pLat, pLng, dLat, dLng);
      const fare   = calculateFare({ distanceKm: distKm, baseFare: Number(ride.base_fare), seats: Number(seats) });
      return {
        id: ride.id,
        driver: {
          id: ride.driver_id, name: ride.driver_name,
          avatar: ride.driver_avatar, rating: Number(ride.driver_rating),
          reviews: Number(ride.driver_reviews),
        },
        vehicle: {
          make: ride.make, model: ride.model, color: ride.color,
          plate: ride.plate_number, type: ride.vehicle_type, ac: ride.ac_available,
        },
        origin:      { name: ride.origin_name, lat: ride.origin_lat, lng: ride.origin_lng },
        destination: { name: ride.dest_name,   lat: ride.dest_lat,   lng: ride.dest_lng   },
        departureTime:   ride.departure_time,
        seatsAvailable:  ride.seats_available,
        fare,
        segmentKm: Math.round(distKm * 10) / 10,
        preferences: {
          womenOnly: ride.women_only, ac: ride.ac_ride,
          luggage: ride.luggage_allowed, pets: ride.pets_allowed,
        },
        allowsParcels: ride.allows_parcels,
      };
    });

    res.json({ success: true, count: enriched.length, rides: enriched });
  } catch (err) { next(err); }
};

exports.getRide = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS driver_name, u.phone AS driver_phone, u.avatar_url,
              v.make, v.model, v.color, v.plate_number, v.type AS vehicle_type,
              COALESCE(ur.avg_rating, 0) AS driver_rating
       FROM rides r
       JOIN users u    ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
       LEFT JOIN user_avg_ratings ur ON ur.user_id = r.driver_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Ride not found' });

    const isDriver = rows[0].driver_id === req.user.id;
    let bookings   = [];
    if (isDriver) {
      const b = await db.query(
        `SELECT b.*, u.name, u.avatar_url, u.phone
         FROM bookings b JOIN users u ON u.id = b.passenger_id
         WHERE b.ride_id = $1 AND b.status NOT IN ('rejected','cancelled')`,
        [req.params.id]
      );
      bookings = b.rows;
    }

    res.json({ success: true, ride: rows[0], bookings: isDriver ? bookings : undefined });
  } catch (err) { next(err); }
};

exports.startRide = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE rides SET status = 'active'
       WHERE id = $1 AND driver_id = $2 AND status = 'scheduled' RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Ride not found or already active' });
    req.app.get('io').to(`ride:${req.params.id}`).emit('ride:started', { rideId: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.completeRide = async (req, res, next) => {
  try {
    await db.transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE rides SET status = 'completed'
         WHERE id = $1 AND driver_id = $2 AND status = 'active' RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (!rows[0]) throw Object.assign(new Error('Ride not found'), { status: 404 });
      await client.query(
        `UPDATE bookings SET status = 'completed', dropped_at = NOW()
         WHERE ride_id = $1 AND status = 'accepted'`,
        [req.params.id]
      );
    });
    req.app.get('io').to(`ride:${req.params.id}`).emit('ride:completed', { rideId: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.cancelRide = async (req, res, next) => {
  try {
    const { reason } = req.body;
    await db.transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE rides SET status = 'cancelled', cancelled_reason = $2
         WHERE id = $1 AND driver_id = $3 AND status = 'scheduled' RETURNING id`,
        [req.params.id, reason, req.user.id]
      );
      if (!rows[0]) throw Object.assign(new Error('Cannot cancel'), { status: 400 });
      await client.query(
        `UPDATE bookings SET status = 'cancelled'
         WHERE ride_id = $1 AND status IN ('pending','accepted')`,
        [req.params.id]
      );
    });
    req.app.get('io').to(`ride:${req.params.id}`).emit('ride:cancelled', { rideId: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.myRides = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset       = (Number(page) - 1) * Number(limit);
    const statusClause = status ? `AND r.status = '${status}'` : '';
    const { rows } = await db.query(
      `SELECT r.id, r.origin_name, r.dest_name, r.departure_time,
              r.status, r.seats_available, r.total_seats, r.base_fare,
              COUNT(b.id) FILTER (WHERE b.status = 'accepted') AS confirmed_pax
       FROM rides r
       LEFT JOIN bookings b ON b.ride_id = r.id
       WHERE r.driver_id = $1 ${statusClause}
       GROUP BY r.id
       ORDER BY r.departure_time DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, Number(limit), offset]
    );
    res.json({ success: true, rides: rows });
  } catch (err) { next(err); }
};