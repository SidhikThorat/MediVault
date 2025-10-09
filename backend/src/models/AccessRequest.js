const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true, required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  requesterWallet: { type: String },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  onChainTx: { type: String },
  scope: { type: String, enum: ['read', 'download', 'share'], default: 'read' },
  messageToRequester: { type: String },
  expiresAt: { type: Date }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'access_requests'
});

AccessRequestSchema.index({ docId: 1, requesterId: 1, status: 1 });
AccessRequestSchema.index({ requesterWallet: 1 });
AccessRequestSchema.index({ reviewedAt: -1 });

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);


