const Message = require('../models/Message');
const Group = require('../models/Group');

// @desc    Get messages for a group
// @route   GET /api/messages/:groupId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    // Verify user is member of group
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
        message: 'Not authorized to view messages for this group'
      });
    }

    const messages = await Message.find({ groupId: req.params.groupId })
      .populate('senderId', 'name')
      .sort({ timestamp: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { groupId, text } = req.body;

    if (!groupId || !text) {
      return res.status(400).json({
        success: false,
        message: 'Please provide groupId and text'
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
        message: 'Not authorized to send messages to this group'
      });
    }

    const message = await Message.create({
      groupId,
      senderId: req.user.id,
      text
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name');

    // Emit socket event
    const io = req.app.get('io');
    io.to(`group-${groupId}`).emit('new-message', populatedMessage);

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

