const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

r.post('/send-otp',    ctrl.sendOtp);
r.post('/verify-otp',  ctrl.verifyOtp);
r.post('/refresh',     ctrl.refreshToken);
r.post('/logout',      authenticate, ctrl.logout);
r.post('/logout-all',  authenticate, ctrl.logoutAll);

module.exports = r;