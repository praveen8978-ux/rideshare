const db = require('../config/db');

exports.sendPushNotification = async (userId, { title, body, type = 'push', data = {} }) => {
  await db.query(
    `INSERT INTO notifications (user_id, title, body, type, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, title, body, type, JSON.stringify(data)]
  );
  // TODO: integrate FCM — store fcm_token in users table
};