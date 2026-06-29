const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) },
});

client.on('error', (err) => logger.error('Redis error', { err }));

module.exports = {
  connect: async () => {
    await client.connect();
    logger.info('Redis connected');
  },
  get:    (key) => client.get(key),
  set:    (key, value, ttlSeconds) =>
    ttlSeconds ? client.set(key, value, { EX: ttlSeconds }) : client.set(key, value),
  del:    (key) => client.del(key),
  exists: (key) => client.exists(key),
  pub:    () => client.duplicate(),
  client,
};