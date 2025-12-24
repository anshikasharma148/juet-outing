const OutingRequest = require('../models/OutingRequest');
const Group = require('../models/Group');
const User = require('../models/User');
const validateOutingTime = require('../utils/validateOutingTime');
const { sendPushNotification } = require('../services/pushNotificationService');

// @desc    Create outing request
// @route   POST /api/outings
// @access  Private
exports.createOutingRequest = async (req, res) => {
  try {
    const { date, time, preferences } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date and time'
      });
    }

    // Parse date properly (handle ISO string or date object)
    let outingDate;
    try {
      outingDate = new Date(date);
      if (isNaN(outingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      // Reset time to midnight to avoid timezone issues
      outingDate.setHours(0, 0, 0, 0);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Validate outing time
    const validation = validateOutingTime(outingDate, time);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Check if user has active request (as creator)
    const existingRequest = await OutingRequest.findOne({
      userId: req.user.id,
      status: { $in: ['pending', 'matched', 'ready'] },
      expiresAt: { $gt: new Date() } // Only check non-expired requests
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active outing request'
      });
    }

    // Check if user is a member of any active request (joined someone else's request)
    const memberRequest = await OutingRequest.findOne({
      members: req.user.id,
      status: { $in: ['pending', 'matched', 'ready'] },
      expiresAt: { $gt: new Date() }
    });

    if (memberRequest) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of an active outing request. Please complete or cancel it first.'
      });
    }

    // Also check if user is part of an active group
    const activeGroup = await Group.findOne({
      members: req.user.id,
      status: 'active'
    });

    if (activeGroup) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of an active outing group. Please complete or cancel it first.'
      });
    }

    // Set expiry time (end of outing window for that day)
    const dayOfWeek = outingDate.getDay();
    const expiresAt = new Date(outingDate);
    expiresAt.setHours(19, 0, 0, 0); // 7 PM

    const outingRequest = await OutingRequest.create({
      userId: req.user.id,
      date: outingDate,
      time,
      preferences: preferences || {},
      members: [req.user.id],
      expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'Outing request created successfully',
      request: outingRequest
    });
  } catch (error) {
    console.error('Error creating outing request:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create outing request. Please try again.'
    });
  }
};

// @desc    Get all active outing requests
// @route   GET /api/outings
// @access  Private
exports.getOutingRequests = async (req, res) => {
  try {
    const { status, date, year, semester } = req.query;
    const query = {};

    // Don't show user's own requests in browse
    if (req.query.excludeOwn === 'true') {
      query.userId = { $ne: req.user.id };
    }

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['pending', 'matched'] };
    }

    // Only show today's or future requests (not expired)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query.date = { $gte: today };
    query.expiresAt = { $gt: now };

    if (date) {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: dateObj, $lt: nextDay };
    }

    const requests = await OutingRequest.find(query)
      .populate('userId', 'name year semester')
      .populate('members', 'name year semester')
      .sort({ createdAt: -1 });

    // Filter by preferences if provided
    let filteredRequests = requests;
    if (year || semester) {
      filteredRequests = requests.filter(request => {
        const user = request.userId;
        if (year && user.year !== parseInt(year)) return false;
        if (semester && user.semester !== parseInt(semester)) return false;
        return true;
      });
    }

    res.status(200).json({
      success: true,
      count: filteredRequests.length,
      requests: filteredRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's own outing requests (only active ones where user is creator or member)
// @route   GET /api/outings/my-requests
// @access  Private
exports.getMyRequests = async (req, res) => {
  try {
    // Get requests where user is creator OR member, and status is not cancelled
    const requests = await OutingRequest.find({
      $or: [
        { userId: req.user.id },
        { members: req.user.id }
      ],
      status: { $ne: 'cancelled' }
    })
    .populate('members', 'name year semester')
    .sort({ createdAt: -1 });

    // Filter to only include requests where user is actually still a member
    const filteredRequests = requests.filter(request => {
      // If user is creator, always include
      if (request.userId.toString() === req.user.id.toString()) {
        return true;
      }
      // If user is member, check they're still in members array
      return request.members.some(m => {
        const memberId = m._id?.toString() || m.toString();
        return memberId === req.user.id.toString();
      });
    });

    res.status(200).json({
      success: true,
      count: filteredRequests.length,
      requests: filteredRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single outing request
// @route   GET /api/outings/:id
// @access  Private
exports.getOutingRequest = async (req, res) => {
  try {
    const request = await OutingRequest.findById(req.params.id)
      .populate('userId', 'name year semester')
      .populate('members', 'name year semester');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Outing request not found'
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel outing request (creator or member can cancel)
// @route   PUT /api/outings/:id/cancel
// @access  Private
exports.cancelOutingRequest = async (req, res) => {
  try {
    const request = await OutingRequest.findById(req.params.id)
      .populate('members', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Outing request not found'
      });
    }

    // Check if user is creator or member
    const isCreator = request.userId.toString() === req.user.id.toString();
    const isMember = request.members.some(m => 
      m._id?.toString() === req.user.id.toString() || 
      m.toString() === req.user.id.toString()
    );

    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    // Remove user from members if they're a member (not creator)
    if (!isCreator && isMember) {
      request.members = request.members.filter(m => {
        const memberId = m._id?.toString() || m.toString();
        return memberId !== req.user.id.toString();
      });
      
      // If less than 3 members remain, update status
      if (request.members.length < 3 && request.status === 'ready') {
        request.status = request.members.length >= 2 ? 'matched' : 'pending';
      }
    } else {
      // Creator cancelled - cancel entire request
      request.status = 'cancelled';
    }
    
    await request.save();

    // Emit socket event (always, even if no group exists yet)
    const io = req.app.get('io');
    io.to(`group-${request._id}`).emit('member-left', {
      requestId: request._id,
      leftBy: req.user.name,
      leftById: req.user.id,
      isCreator: isCreator,
      remainingMembers: request.members.length,
      status: request.status
    });

    // If creator cancelled, emit cancellation event
    if (isCreator) {
      io.to(`group-${request._id}`).emit('request-cancelled', {
        requestId: request._id,
        cancelledBy: req.user.name,
        isCreator: true
      });
    }

    // If group exists, update or cancel it
    const group = await Group.findOne({ requestId: request._id });
    if (group) {
      if (request.status === 'cancelled') {
        group.status = 'cancelled';
        await group.save();
      } else if (!isCreator && isMember) {
        // Remove user from group members
        group.members = group.members.filter(m => m.toString() !== req.user.id.toString());
        // Update group members to match request
        group.members = request.members;
        if (group.members.length < 3) {
          group.status = 'cancelled';
        }
        await group.save();
      }
    }

    // Notify ALL remaining members (including creator if not the one who left/cancelled)
    const membersToNotify = request.members.filter(m => {
      const memberId = m._id?.toString() || m.toString();
      return memberId !== req.user.id.toString();
    });

    // Also notify creator if they didn't cancel
    if (!isCreator) {
      const creator = await User.findById(request.userId);
      if (creator && creator.pushToken) {
        const message = `${req.user.name} left the outing group. ${request.members.length} member${request.members.length !== 1 ? 's' : ''} remaining.`;
        await sendPushNotification(
          creator.pushToken,
          'Member Left Outing',
          message
        );
      }
    }
    
    // Notify other members
    for (const member of membersToNotify) {
      const memberId = member._id?.toString() || member.toString();
      const memberUser = await User.findById(memberId);
      if (memberUser && memberUser.pushToken) {
        const notificationTitle = isCreator 
          ? 'Outing Cancelled'
          : 'Member Left Outing';
        const notificationBody = isCreator 
          ? `${req.user.name} cancelled the outing`
          : `${req.user.name} left the outing group. ${request.members.length} member${request.members.length !== 1 ? 's' : ''} remaining.`;
        
        await sendPushNotification(
          memberUser.pushToken,
          notificationTitle,
          notificationBody
        );
      }
    }

    res.status(200).json({
      success: true,
      message: isCreator 
        ? 'Outing request cancelled successfully'
        : 'You have left the outing group',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

