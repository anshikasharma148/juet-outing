const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getGateStatus } = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.get('/gate-status/:groupId', protect, getGateStatus);

module.exports = router;

