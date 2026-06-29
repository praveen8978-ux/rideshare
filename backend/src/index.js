require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

const db     = require('./config/db');
const redis  = require('./config/redis');
const logger = require('./utils/logger');
const { initSocketHandlers } = require('./socket');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const rideRoutes         = require('./routes/rides');
const bookingRoutes      = require('./routes/bookings');
const paymentRoutes      = require('./routes/payments');
const parcelRoutes       = require('./routes/parcels');
const notificationRoutes = require('./routes/notifications');
const adminRoutes        = require('./routes/admin');

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true },
  transports: ['websocket', 'polling'],
});

app.set('io', io);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'db_down' });
  }
});

const v1 = express.Router();
v1.use('/auth',          authRoutes);
v1.use('/users',         userRoutes);
v1.use('/rides',         rideRoutes);
v1.use('/bookings',      bookingRoutes);
v1.use('/payments',      paymentRoutes);
v1.use('/parcels',       parcelRoutes);
v1.use('/notifications', notificationRoutes);
v1.use('/admin',         adminRoutes);
app.use('/api/v1', v1);

initSocketHandlers(io);

app.use((err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, async () => {
  await db.connect();
  await redis.connect();
  logger.info(`Server running on port ${PORT}`);
});

module.exports = { app, io };