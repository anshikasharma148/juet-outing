const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Placeholder for notification routes
// Push notifications are handled through other routes

router.get('/test', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notifications endpoint'
  });
});

module.exports = router;

