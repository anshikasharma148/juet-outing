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

    // Allow 3 or more members (minimum 3 required for outing)
    // No maximum limit - more girls can join

    if (request.status === 'cancelled' || request.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This request is no longer active'
      });
    }

    // Add user to members
    request.members.push(req.user.id);
    const memberCount = request.members.length;
    
    // Update status based on member count
    if (memberCount >= 3) {
      request.status = 'ready';
    } else {
      request.status = 'matched';
    }

    await request.save();

    // Get socket.io instance
    const io = req.app.get('io');
    
    // Emit socket event for member joined
    io.to(`group-${request._id}`).emit('member-joined', {
      requestId: request._id,
      joinedBy: req.user.name,
      joinedById: req.user.id,
      memberCount: memberCount,
      members: request.members
    });

    // Notify ALL members (creator + other members) when someone joins
    const allMembersToNotify = [...request.members];
    
    for (const memberId of allMembersToNotify) {
      const member = await User.findById(memberId);
      if (member && member.pushToken) {
        const isCreator = memberId.toString() === request.userId.toString();
        const notificationTitle = isCreator 
          ? 'Someone Joined Your Request'
          : 'New Member Joined';
        const notificationBody = isCreator
          ? `${req.user.name} joined your outing request. You now have ${memberCount} member${memberCount !== 1 ? 's' : ''}.`
          : `${req.user.name} joined the outing group. You now have ${memberCount} member${memberCount !== 1 ? 's' : ''}.`;
        
        await sendPushNotification(
          member.pushToken,
          notificationTitle,
          notificationBody
        );
      }
    }

    // If group has 3+ members, create/update group and notify
    if (memberCount >= 3) {
      let group = await Group.findOne({ requestId: request._id });
      
      if (!group) {
        // Create new group
        group = await Group.create({
          requestId: request._id,
          members: request.members,
          outingDate: request.date,
          outingTime: request.time
        });
      } else {
        // Update existing group with new members
        group.members = request.members;
        await group.save();
      }

      // Emit socket event for group ready (additional to member-joined)
      io.to(`group-${request._id}`).emit('group-ready', {
        requestId: request._id,
        groupId: group._id,
        members: request.members,
        message: 'Group is ready for outing!'
      });

      // Notify all members that group is ready (in addition to join notification)
      for (const memberId of request.members) {
        const member = await User.findById(memberId);
        if (member && member.pushToken) {
          await sendPushNotification(
            member.pushToken,
            'Ready for Outing! 🎉',
            `Your group now has ${memberCount} members. You're ready to go out!`
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Group ready! You now have ${memberCount} members.`,
        request,
        group,
        groupReady: true
      });
    }

    // Socket event already emitted above, no need to emit again

    res.status(200).json({
      success: true,
      message: `Joined successfully. ${3 - memberCount} more member(s) needed.`,
      request,
      groupReady: false
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

    // Allow 3+ members - no limit
    const matchingRequests = await findMatchingRequests(userRequest, req.user.id);

    // Sort by number of members (prioritize requests with fewer members)
    matchingRequests.sort((a, b) => a.members.length - b.members.length);

    // Try to join requests (allow 3+ members)
    const joinedRequests = [];
    for (const match of matchingRequests) {
      // Skip if already has many members (optional: can set a limit like 5)
      if (match.members.length >= 5) continue;
      if (match.members.some(m => m._id.toString() === req.user.id.toString())) continue;

      // Join this request
      match.members.push(req.user.id);
      userRequest.members.push(match.userId);
      
      // Update status based on member count
      if (match.members.length >= 3) {
        match.status = 'ready';
      } else {
        match.status = 'matched';
      }
      
      if (userRequest.members.length >= 3) {
        userRequest.status = 'ready';
      } else {
        userRequest.status = 'matched';
      }

      await match.save();
      joinedRequests.push(match);
    }

    await userRequest.save();

    // If we have 3+ members, create/update group
    if (userRequest.members.length >= 3) {
      let group = await Group.findOne({ requestId: userRequest._id });
      
      if (!group) {
        group = await Group.create({
          requestId: userRequest._id,
          members: userRequest.members,
          outingDate: userRequest.date,
          outingTime: userRequest.time
        });
      } else {
        group.members = userRequest.members;
        await group.save();
      }

      // Emit socket event
      const io = req.app.get('io');
      io.to(`group-${userRequest._id}`).emit('group-ready', {
        requestId: userRequest._id,
        groupId: group._id,
        members: userRequest.members,
        message: 'Group is ready for outing!'
      });

      // Notify all members
      for (const memberId of userRequest.members) {
        const member = await User.findById(memberId);
        if (member && member.pushToken) {
          await sendPushNotification(
            member.pushToken,
            'Ready for Outing! 🎉',
            `Your group now has ${userRequest.members.length} members. You're ready to go out!`
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Auto-matched successfully! Group ready with ${userRequest.members.length} members.`,
        group,
        request: userRequest,
        groupReady: true
      });
    }

    res.status(200).json({
      success: true,
      message: `Auto-matched with ${joinedRequests.length} request(s). ${3 - userRequest.members.length} more member(s) needed.`,
      request: userRequest,
      joinedRequests,
      groupReady: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get active group or request (for chat - 2+ members)
// @route   GET /api/matching/active-group
// @access  Private
exports.getActiveGroup = async (req, res) => {
  try {
    // First check for active group (3 members)
    let group = await Group.findOne({
      members: req.user.id,
      status: 'active'
    })
    .populate('members', 'name year semester phone')
    .populate('requestId');

    if (group) {
      return res.status(200).json({
        success: true,
        group,
        type: 'group'
      });
    }

    // If no group, check for active request with 2+ members (for chat)
    const activeRequest = await OutingRequest.findOne({
      members: req.user.id,
      status: { $in: ['pending', 'matched', 'ready'] },
      expiresAt: { $gt: new Date() }
    })
    .populate('members', 'name year semester phone')
    .populate('userId', 'name year semester phone');

    // Double-check that user is actually in the members array (after population)
    if (activeRequest && activeRequest.members.length >= 2) {
      const userIsMember = activeRequest.members.some(m => {
        const memberId = m._id?.toString() || m.toString();
        return memberId === req.user.id.toString();
      });

      if (userIsMember) {
        // Return as a group-like object for chat compatibility
        // Use the actual request status, not 'active'
        return res.status(200).json({
          success: true,
          group: {
            _id: activeRequest._id, // Use request ID as group ID for chat
            members: activeRequest.members,
            requestId: activeRequest._id,
            outingDate: activeRequest.date,
            outingTime: activeRequest.time,
            status: activeRequest.status // Use actual request status
          },
          type: 'request'
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'No active group or request found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


