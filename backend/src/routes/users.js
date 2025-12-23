const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updatePushToken, getHistory, getStatistics } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/push-token', protect, updatePushToken);
router.get('/history', protect, getHistory);
router.get('/statistics', protect, getStatistics);

module.exports = router;

