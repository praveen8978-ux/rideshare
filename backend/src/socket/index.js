const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const logger = require('../utils/logger');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, name, role FROM users WHERE id = $1', [payload.userId]);
    if (!rows[0]) return next(new Error('User not found'));
    socket.user = rows[0];
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
};

const initSocketHandlers = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.id}`);
    socket.join(`user:${socket.user.id}`);

    // Driver joins ride room
    socket.on('driver:join_ride', async ({ rideId }) => {
      try {
        const { rows } = await db.query(
          'SELECT id FROM rides WHERE id = $1 AND driver_id = $2 AND status = $3',
          [rideId, socket.user.id, 'active']
        );
        if (!rows[0]) return socket.emit('error', { message: 'Ride not found' });
        socket.join(`ride:${rideId}`);
        socket.currentRideId = rideId;
        socket.to(`ride:${rideId}`).emit('driver:online', { driverId: socket.user.id });
      } catch (err) { logger.error('driver:join_ride error', { err }); }
    });

    // Driver broadcasts location
    socket.on('driver:location', async ({ rideId, lat, lng, speedKmh, heading }) => {
      try {
        if (!lat || !lng) return;
        socket.to(`ride:${rideId}`).emit('driver:location_update', {
          driverId: socket.user.id, lat, lng, speedKmh, heading, ts: Date.now(),
        });
        const now = Date.now();
        if (!socket.lastSavedAt || now - socket.lastSavedAt > 10000) {
          await db.query(
            `INSERT INTO ride_locations (ride_id, driver_id, lat, lng, speed_kmh, heading)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [rideId, socket.user.id, lat, lng, speedKmh || null, heading || null]
          );
          socket.lastSavedAt = now;
        }
      } catch (err) { logger.error('driver:location error', { err }); }
    });

    // Passenger subscribes to ride
    socket.on('passenger:subscribe_ride', async ({ rideId }) => {
      try {
        const { rows } = await db.query(
          `SELECT id FROM bookings WHERE ride_id = $1 AND passenger_id = $2 AND status = 'accepted'`,
          [rideId, socket.user.id]
        );
        if (!rows[0]) return socket.emit('error', { message: 'No active booking' });
        socket.join(`ride:${rideId}`);
        const { rows: loc } = await db.query(
          `SELECT lat, lng, speed_kmh, heading, recorded_at FROM ride_locations
           WHERE ride_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
          [rideId]
        );
        if (loc[0]) socket.emit('driver:location_update', { ...loc[0], ts: new Date(loc[0].recorded_at).getTime() });
      } catch (err) { logger.error('passenger:subscribe_ride error', { err }); }
    });

    // SOS
    socket.on('passenger:sos', async ({ rideId, lat, lng }) => {
      try {
        const { rows } = await db.query(
          `SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON r.id = b.ride_id
           WHERE b.ride_id = $1 AND b.passenger_id = $2 AND b.status = 'accepted'`,
          [rideId, socket.user.id]
        );
        if (!rows[0]) return;
        io.to(`user:${rows[0].driver_id}`).emit('sos:alert', {
          passengerName: socket.user.name, passengerId: socket.user.id, lat, lng, rideId,
        });
        io.to('admins').emit('sos:alert', { rideId, passengerId: socket.user.id, lat, lng, ts: Date.now() });
        logger.warn(`SOS from passenger ${socket.user.id} on ride ${rideId}`);
      } catch (err) { logger.error('passenger:sos error', { err }); }
    });

    // In-ride chat
    socket.on('chat:message', ({ rideId, message }) => {
      if (!message?.trim() || message.length > 500) return;
      io.to(`ride:${rideId}`).emit('chat:message', {
        from: { id: socket.user.id, name: socket.user.name },
        message: message.trim(), ts: Date.now(),
      });
    });

    socket.on('chat:typing', ({ rideId }) => {
      socket.to(`ride:${rideId}`).emit('chat:typing', { userId: socket.user.id, name: socket.user.name });
    });

    socket.on('disconnect', () => {
      if (socket.currentRideId)
        socket.to(`ride:${socket.currentRideId}`).emit('driver:offline', { driverId: socket.user.id });
      logger.info(`Socket disconnected: ${socket.user.id}`);
    });
  });
};

module.exports = { initSocketHandlers };