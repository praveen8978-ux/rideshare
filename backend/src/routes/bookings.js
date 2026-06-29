const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

r.use(authenticate);
r.post('/',             ctrl.createBooking);
r.get('/my',            ctrl.myBookings);
r.patch('/:id/accept',  ctrl.acceptBooking);
r.patch('/:id/reject',  ctrl.rejectBooking);
r.patch('/:id/cancel',  ctrl.cancelBooking);
r.patch('/:id/board',   ctrl.confirmBoarding);

module.exports = r;