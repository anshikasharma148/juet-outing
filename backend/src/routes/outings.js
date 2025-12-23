const express = require('express');
const router = express.Router();
const {
  createOutingRequest,
  getOutingRequests,
  getMyRequests,
  getOutingRequest,
  cancelOutingRequest
} = require('../controllers/outingController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createOutingRequest);
router.get('/', protect, getOutingRequests);
router.get('/my-requests', protect, getMyRequests);
router.get('/:id', protect, getOutingRequest);
router.put('/:id/cancel', protect, cancelOutingRequest);

module.exports = router;

