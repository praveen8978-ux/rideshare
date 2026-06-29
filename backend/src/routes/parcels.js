const express = require('express');
const r       = express.Router();
const { authenticate } = require('../middleware/auth');

r.use(authenticate);
r.get('/', (_req, res) => res.json({ success: true, message: 'Parcel routes — coming in Phase 3' }));

module.exports = r;