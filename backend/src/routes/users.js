const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

r.use(authenticate);
r.get('/me',        ctrl.getMe);
r.patch('/me',      ctrl.updateMe);
r.post('/vehicles', ctrl.addVehicle);
r.get('/vehicles',  ctrl.getVehicles);
r.post('/rate',     ctrl.rateUser);

module.exports = r;