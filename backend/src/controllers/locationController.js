const Location = require('../models/Location');
const Group = require('../models/Group');
const calculateDistance = require('../utils/calculateDistance');
const { sendPushNotification } = require('../services/pushNotificationService');
const User = require('../models/User');

const GATE_LAT = parseFloat(process.env.GATE_LATITUDE) || 28.123456;
const GATE_LON = parseFloat(process.env.GATE_LONGITUDE) || 77.123456;
const GATE_RADIUS = parseFloat(process.env.GATE_RADIUS) || 100; // meters

// @desc    Check-in at gate
// @route   POST /api/location/checkin
// @access  Private
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, groupId } = req.body;

    if (!latitude || !longitude || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude, longitude, and groupId'
      });
    }

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.members.some(m => m.toString() === req.user.id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this group'
      });
    }

    // Calculate distance from gate
    const distance = calculateDistance(latitude, longitude, GATE_LAT, GATE_LON);
    const verified = distance <= GATE_RADIUS;

    const location = await Location.create({
      userId: req.user.id,
      groupId,
      latitude,
      longitude,
      type: 'checkin',
      verified
    });

    // Notify other group members
    const otherMembers = group.members.filter(
      m => m.toString() !== req.user.id.toString()
    );

    for (const memberId of otherMembers) {
      const member = await User.findById(memberId);
      if (member && member.pushToken) {
        await sendPushNotification(
          member.pushToken,
          'Group Member at Gate',
          `${req.user.name} has arrived at the gate`
        );
      }
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('member-checkin', {
      userId: req.user.id,
      userName: req.user.name,
      location,
      verified
    });

    res.status(201).json({
      success: true,
      message: verified ? 'Check-in successful' : 'Check-in recorded but location not verified',
      location,
      verified,
      distance: Math.round(distance)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check-out from gate
// @route   POST /api/location/checkout
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    const { latitude, longitude, groupId } = req.body;

    if (!latitude || !longitude || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude, longitude, and groupId'
      });
    }

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.members.some(m => m.toString() === req.user.id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this group'
      });
    }

    const location = await Location.create({
      userId: req.user.id,
      groupId,
      latitude,
      longitude,
      type: 'checkout',
      verified: true
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('member-checkout', {
      userId: req.user.id,
      userName: req.user.name,
      location
    });

    res.status(201).json({
      success: true,
      message: 'Check-out successful',
      location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get gate status for a group
// @route   GET /api/location/gate-status/:groupId
// @access  Private
exports.getGateStatus = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.members.some(m => m.toString() === req.user.id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this group'
      });
    }

    // Get latest check-in for each member
    const checkIns = await Location.find({
      groupId: req.params.groupId,
      type: 'checkin'
    })
    .populate('userId', 'name')
    .sort({ timestamp: -1 });

    // Get unique latest check-in per user
    const memberStatus = {};
    checkIns.forEach(checkIn => {
      const userId = checkIn.userId._id.toString();
      if (!memberStatus[userId] || checkIn.timestamp > memberStatus[userId].timestamp) {
        memberStatus[userId] = {
          userId: checkIn.userId._id,
          userName: checkIn.userId.name,
          latitude: checkIn.latitude,
          longitude: checkIn.longitude,
          verified: checkIn.verified,
          timestamp: checkIn.timestamp
        };
      }
    });

    res.status(200).json({
      success: true,
      gateStatus: Object.values(memberStatus),
      gateLocation: {
        latitude: GATE_LAT,
        longitude: GATE_LON,
        radius: GATE_RADIUS
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

