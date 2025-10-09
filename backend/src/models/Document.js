const mongoose = require('mongoose');

const EncryptionSchema = new mongoose.Schema({
  encrypted: { type: Boolean, default: false },
  scheme: { type: String }, // 'AES-256-GCM'
  encryptedKey: { type: String },
  keyRef: { type: String },
  iv: { type: String },
  tag: { type: String }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String },
  description: { type: String },
  modality: { type: String, enum: ['CT', 'X-RAY', 'DICOM', 'PDF', 'REPORT'] },
  studyInstanceUID: { type: String, index: true },
  seriesInstanceUID: { type: String, index: true },
  cidOrUrl: { type: String, index: true },
  fileHash: { type: String, index: true },
  fileSize: { type: Number },
  mimeType: { type: String },
  encryption: { type: EncryptionSchema, default: () => ({}) },
  visibility: { type: String, enum: ['private', 'public', 'restricted'], default: 'private' },
  vectorMeta: { vectorId: { type: String } },
  extractedTextRef: { type: mongoose.Schema.Types.ObjectId, ref: 'TextChunk' },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
  docIdOnChain: { type: String },
  storage: { type: String, enum: ['ipfs', 's3'], default: 'ipfs' },
  version: { type: Number, default: 1 },
  supersedesDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'documents'
});

// Indexes
DocumentSchema.index({ patientId: 1, createdAt: -1 });
DocumentSchema.index({ cidOrUrl: 1 });
DocumentSchema.index({ fileHash: 1 });
DocumentSchema.index({ studyInstanceUID: 1 });
DocumentSchema.index({ seriesInstanceUID: 1 });
DocumentSchema.index({ uploaderId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', DocumentSchema);

