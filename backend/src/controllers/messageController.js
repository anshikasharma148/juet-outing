const Message = require('../models/Message');
const Group = require('../models/Group');
const OutingRequest = require('../models/OutingRequest');

// @desc    Get messages for a group or request
// @route   GET /api/messages/:groupId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    // Check if it's a group or request
    let group = await Group.findById(req.params.groupId);
    let isRequest = false;
    
    // If not a group, check if it's a request ID
    if (!group) {
      const request = await OutingRequest.findById(req.params.groupId);
      if (request && request.members.length >= 2) {
        // Verify user is member of request
        if (!request.members.some(m => m.toString() === req.user.id.toString())) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view messages for this request'
          });
        }
        isRequest = true;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Group or request not found'
        });
      }
    } else {
      // Verify user is member of group
      if (!group.members.some(m => m.toString() === req.user.id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view messages for this group'
        });
      }
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

    // Check if it's a group or request
    let group = await Group.findById(groupId);
    let isRequest = false;
    
    // If not a group, check if it's a request ID
    if (!group) {
      const request = await OutingRequest.findById(groupId);
      if (request && request.members.length >= 2) {
        // Verify user is member of request
        if (!request.members.some(m => m.toString() === req.user.id.toString())) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to send messages to this request'
          });
        }
        isRequest = true;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Group or request not found'
        });
      }
    } else {
      // Verify user is member of group
      if (!group.members.some(m => m.toString() === req.user.id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to send messages to this group'
        });
      }
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


