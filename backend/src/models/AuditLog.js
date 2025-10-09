const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'upload','request_access','approve_access','view','download','chat_query'
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  performedByWallet: { type: String },
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  timestamp: { type: Date, default: () => new Date(), index: true },
  outcome: { type: String, enum: ['success', 'fail'], default: 'success' },
  meta: {
    ip: { type: String },
    userAgent: { type: String },
    extra: { type: mongoose.Schema.Types.Mixed }
  },
  onChainProof: { type: String },
  requestId: { type: String },
  sessionId: { type: String },
  actorRole: { type: String },
  documentVersion: { type: Number }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'audit_logs'
});

// Append-only behavior should be enforced by application logic (no updates/deletes)

AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ docId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);


