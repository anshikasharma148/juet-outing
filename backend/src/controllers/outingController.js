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

// @desc    Get user's own outing requests
// @route   GET /api/outings/my-requests
// @access  Private
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await OutingRequest.find({
      userId: req.user.id
    })
    .populate('members', 'name year semester')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
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

// @desc    Cancel outing request
// @route   PUT /api/outings/:id/cancel
// @access  Private
exports.cancelOutingRequest = async (req, res) => {
  try {
    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Outing request not found'
      });
    }

    if (request.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    request.status = 'cancelled';
    await request.save();

    // If group exists, cancel it too
    const group = await Group.findOne({ requestId: request._id });
    if (group && group.status === 'active') {
      group.status = 'cancelled';
      await group.save();

      // Notify other members
      const otherMembers = group.members.filter(
        m => m.toString() !== req.user.id.toString()
      );
      for (const memberId of otherMembers) {
        const member = await User.findById(memberId);
        if (member && member.pushToken) {
          await sendPushNotification(
            member.pushToken,
            'Outing Cancelled',
            `${req.user.name} cancelled the outing`
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Outing request cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

