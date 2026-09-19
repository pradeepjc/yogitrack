const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientModel: { type: String, enum: ['Instructor', 'User'], required: true },
    recipientRef: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipientModel', required: true },
    channel: { type: String, enum: ['email', 'phone'], required: true },
    messageBody: { type: String, required: true },
    relatedEntityType: {
      type: String,
      enum: ['Instructor', 'ClassSchedule'],
    },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, enum: ['sent'], default: 'sent' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
