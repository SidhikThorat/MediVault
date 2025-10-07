const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  ipfsHash: { type: String, required: true, index: true },
  blockchainHash: { type: String },
  checksumSha256: { type: String, index: true },
  encryptionKeyId: { type: String },
  uploaderId: { type: String, required: true, index: true },
  patientId: { type: String, index: true },
  status: { type: String, enum: ['uploaded', 'processing', 'completed', 'failed'], default: 'uploaded' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  medicalMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
}, {
  timestamps: true,
  collection: 'documents'
});

documentSchema.index({ uploaderId: 1, createdAt: -1 });
documentSchema.index({ patientId: 1, createdAt: -1 });
documentSchema.index({ fileType: 1 });

documentSchema.statics.search = function(searchTerm, filters = {}, limit = 50, offset = 0) {
  const query = {};
  if (searchTerm) {
    query.$or = [
      { filename: new RegExp(searchTerm, 'i') },
      { originalName: new RegExp(searchTerm, 'i') }
    ];
  }
  if (filters.fileType) query.fileType = filters.fileType;
  if (filters.uploaderId) query.uploaderId = filters.uploaderId;
  if (filters.patientId) query.patientId = filters.patientId;
  if (filters.status) query.status = filters.status;
  return this.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
};

module.exports = mongoose.model('Document', documentSchema);

