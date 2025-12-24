const express = require('express');
const router = express.Router();
const {
  joinRequest,
  getMatchingSuggestions,
  autoMatch,
  getActiveGroup
} = require('../controllers/matchingController');
const { protect } = require('../middleware/auth');

router.post('/join/:requestId', protect, joinRequest);
router.get('/suggestions', protect, getMatchingSuggestions);
router.post('/auto-match', protect, autoMatch);
router.get('/active-group', protect, getActiveGroup);

module.exports = router;


