const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/rideController');
const { authenticate, requireRole } = require('../middleware/auth');

r.use(authenticate);
r.post('/',              requireRole('driver','both'), ctrl.createRide);
r.get('/search',         ctrl.searchRides);
r.get('/my',             ctrl.myRides);
r.get('/:id',            ctrl.getRide);
r.patch('/:id/start',    requireRole('driver','both'), ctrl.startRide);
r.patch('/:id/complete', requireRole('driver','both'), ctrl.completeRide);
r.delete('/:id',         requireRole('driver','both'), ctrl.cancelRide);

module.exports = r;