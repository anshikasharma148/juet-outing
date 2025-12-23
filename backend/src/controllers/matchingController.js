const OutingRequest = require('../models/OutingRequest');
const Group = require('../models/Group');
const User = require('../models/User');
const { sendPushNotification } = require('../services/pushNotificationService');

// Helper function to find matching requests
const findMatchingRequests = async (request, excludeUserId) => {
  const requestDate = new Date(request.date);
  const [requestHours, requestMinutes] = request.time.split(':').map(Number);
  const requestTimeMinutes = requestHours * 60 + requestMinutes;

  // Find requests within ±30 minutes
  const timeWindow = 30; // minutes
  const minTime = requestTimeMinutes - timeWindow;
  const maxTime = requestTimeMinutes + timeWindow;

  const matchingRequests = await OutingRequest.find({
    _id: { $ne: request._id },
    userId: { $ne: excludeUserId },
    date: {
      $gte: new Date(requestDate.setHours(0, 0, 0, 0)),
      $lt: new Date(requestDate.setHours(23, 59, 59, 999))
    },
    status: { $in: ['pending', 'matched'] },
    expiresAt: { $gt: new Date() }
  })
  .populate('userId', 'name year semester')
  .populate('members', 'name year semester');

  // Filter by time window and preferences
  return matchingRequests.filter(match => {
    const [matchHours, matchMinutes] = match.time.split(':').map(Number);
    const matchTimeMinutes = matchHours * 60 + matchMinutes;

    if (matchTimeMinutes < minTime || matchTimeMinutes > maxTime) {
      return false;
    }

    // Check preferences if set
    if (request.preferences && Object.keys(request.preferences).length > 0) {
      const matchUser = match.userId;
      if (request.preferences.year && request.preferences.year.length > 0) {
        if (!request.preferences.year.includes(matchUser.year)) {
          return false;
        }
      }
      if (request.preferences.semester && request.preferences.semester.length > 0) {
        if (!request.preferences.semester.includes(matchUser.semester)) {
          return false;
        }
      }
    }

    return true;
  });
};

// @desc    Join an outing request
// @route   POST /api/matching/join/:requestId
// @access  Private
exports.joinRequest = async (req, res) => {
  try {
    const request = await OutingRequest.findById(req.params.requestId)
      .populate('members', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Outing request not found'
      });
    }

    if (request.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot join your own request'
      });
    }

    if (request.members.some(m => m._id.toString() === req.user.id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this request'
      });
    }

    if (request.members.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'This request already has 3 members'
      });
    }

    if (request.status === 'cancelled' || request.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This request is no longer active'
      });
    }

    // Add user to members
    request.members.push(req.user.id);
    
    // Update status if we have 3 members
    if (request.members.length === 3) {
      request.status = 'matched';
    } else {
      request.status = 'matched';
    }

    await request.save();

    // Notify request creator
    const creator = await User.findById(request.userId);
    if (creator && creator.pushToken) {
      await sendPushNotification(
        creator.pushToken,
        'Someone Joined Your Request',
        `${req.user.name} joined your outing request`
      );
    }

    // If group is complete, create group
    if (request.members.length === 3) {
      const group = await Group.create({
        requestId: request._id,
        members: request.members,
        outingDate: request.date,
        outingTime: request.time
      });

      // Notify all members
      for (const memberId of request.members) {
        const member = await User.findById(memberId);
        if (member && member.pushToken) {
          await sendPushNotification(
            member.pushToken,
            'Group Formed!',
            'Your outing group is ready. You can now coordinate with your group members.'
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Group formed successfully!',
        request,
        group
      });
    }

    res.status(200).json({
      success: true,
      message: 'Joined request successfully',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get matching requests for automatic matching
// @route   GET /api/matching/suggestions
// @access  Private
exports.getMatchingSuggestions = async (req, res) => {
  try {
    const userRequest = await OutingRequest.findOne({
      userId: req.user.id,
      status: { $in: ['pending', 'matched'] }
    });

    if (!userRequest) {
      return res.status(404).json({
        success: false,
        message: 'You do not have an active outing request'
      });
    }

    const matchingRequests = await findMatchingRequests(userRequest, req.user.id);

    // Filter out requests where user is already a member
    const filtered = matchingRequests.filter(req => {
      return !req.members.some(m => m._id.toString() === req.user.id.toString());
    });

    res.status(200).json({
      success: true,
      count: filtered.length,
      suggestions: filtered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Auto-match users
// @route   POST /api/matching/auto-match
// @access  Private
exports.autoMatch = async (req, res) => {
  try {
    const userRequest = await OutingRequest.findOne({
      userId: req.user.id,
      status: { $in: ['pending', 'matched'] }
    });

    if (!userRequest) {
      return res.status(404).json({
        success: false,
        message: 'You do not have an active outing request'
      });
    }

    if (userRequest.members.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Your request already has 3 members'
      });
    }

    const matchingRequests = await findMatchingRequests(userRequest, req.user.id);

    // Sort by number of members (prioritize requests with fewer members)
    matchingRequests.sort((a, b) => a.members.length - b.members.length);

    // Try to join requests until we have 3 members
    const joinedRequests = [];
    for (const match of matchingRequests) {
      if (userRequest.members.length >= 3) break;
      if (match.members.length >= 3) continue;
      if (match.members.some(m => m._id.toString() === req.user.id.toString())) continue;

      // Join this request
      match.members.push(req.user.id);
      userRequest.members.push(match.userId);
      
      if (match.members.length === 3) {
        match.status = 'matched';
      }
      if (userRequest.members.length === 3) {
        userRequest.status = 'matched';
      }

      await match.save();
      joinedRequests.push(match);
    }

    await userRequest.save();

    // If we have 3 members, create group
    if (userRequest.members.length === 3) {
      const allMembers = [...userRequest.members];
      const group = await Group.create({
        requestId: userRequest._id,
        members: allMembers,
        outingDate: userRequest.date,
        outingTime: userRequest.time
      });

      // Notify all members
      for (const memberId of allMembers) {
        const member = await User.findById(memberId);
        if (member && member.pushToken) {
          await sendPushNotification(
            member.pushToken,
            'Group Formed!',
            'Your outing group is ready. You can now coordinate with your group members.'
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Auto-matched successfully! Group formed.',
        group,
        request: userRequest
      });
    }

    res.status(200).json({
      success: true,
      message: `Auto-matched with ${joinedRequests.length} request(s). Still need ${3 - userRequest.members.length} more member(s).`,
      request: userRequest,
      joinedRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get active group
// @route   GET /api/matching/active-group
// @access  Private
exports.getActiveGroup = async (req, res) => {
  try {
    const group = await Group.findOne({
      members: req.user.id,
      status: 'active'
    })
    .populate('members', 'name year semester phone')
    .populate('requestId');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'No active group found'
      });
    }

    res.status(200).json({
      success: true,
      group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

