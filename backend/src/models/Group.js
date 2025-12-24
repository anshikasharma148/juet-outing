const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OutingRequest',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  outingDate: {
    type: Date,
    required: true
  },
  outingTime: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Ensure at least 2 members (for chat) and at most 3 members (for outing)
groupSchema.pre('save', function(next) {
  if (this.members.length < 2 || this.members.length > 3) {
    return next(new Error('Group must have 2-3 members'));
  }
  next();
});

groupSchema.index({ members: 1, status: 1 });
groupSchema.index({ outingDate: 1, status: 1 });

module.exports = mongoose.model('Group', groupSchema);


