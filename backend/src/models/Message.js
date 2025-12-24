const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ groupId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);


