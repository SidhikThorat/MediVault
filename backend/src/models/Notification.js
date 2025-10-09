const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  severity: { type: String, enum: ['info', 'warning', 'error'], default: 'info' },
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  accessRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRequest' },
  expiresAt: { type: Date, index: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'notifications'
});

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);


