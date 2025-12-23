const User = require('../models/User');
const Group = require('../models/Group');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        year: user.year,
        semester: user.semester,
        phone: user.phone,
        emergencyContact: user.emergencyContact,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, year, semester, emergencyContact } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (year) user.year = year;
    if (semester) user.semester = semester;
    if (emergencyContact) user.emergencyContact = emergencyContact;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        year: user.year,
        semester: user.semester,
        phone: user.phone,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update push token
// @route   PUT /api/users/push-token
// @access  Private
exports.updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    const user = await User.findById(req.user.id);
    user.pushToken = pushToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get outing history
// @route   GET /api/users/history
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.id,
      status: { $in: ['completed', 'cancelled'] }
    })
    .populate('members', 'name year semester')
    .sort({ createdAt: -1 })
    .limit(50);

    res.status(200).json({
      success: true,
      count: groups.length,
      history: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/statistics
// @access  Private
exports.getStatistics = async (req, res) => {
  try {
    const totalOutings = await Group.countDocuments({
      members: req.user.id,
      status: 'completed'
    });

    const activeOutings = await Group.countDocuments({
      members: req.user.id,
      status: 'active'
    });

    // Get frequent partners
    const allGroups = await Group.find({
      members: req.user.id,
      status: 'completed'
    }).populate('members', 'name');

    const partnerCount = {};
    allGroups.forEach(group => {
      group.members.forEach(member => {
        if (member._id.toString() !== req.user.id.toString()) {
          partnerCount[member._id] = (partnerCount[member._id] || 0) + 1;
        }
      });
    });

    const frequentPartners = Object.entries(partnerCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => {
        const member = allGroups
          .flatMap(g => g.members)
          .find(m => m._id.toString() === userId);
        return { user: member, outings: count };
      });

    res.status(200).json({
      success: true,
      statistics: {
        totalOutings,
        activeOutings,
        frequentPartners
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

