const mongoose = require('mongoose');

const outingRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Please provide a date']
  },
  time: {
    type: String,
    required: [true, 'Please provide a time']
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'ready', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  preferences: {
    year: [Number],
    semester: [Number]
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

// Index for efficient querying
outingRequestSchema.index({ date: 1, time: 1, status: 1 });
outingRequestSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('OutingRequest', outingRequestSchema);


