const mongoose = require('mongoose');

const TextChunkSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true, required: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  startOffset: { type: Number },
  endOffset: { type: Number },
  language: { type: String },
  source: { type: String, enum: ['ocr', 'pdf', 'dicom', 'other'], default: 'other' },
  textHash: { type: String }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'text_chunks'
});

TextChunkSchema.index({ docId: 1, chunkIndex: 1 }, { unique: true });
TextChunkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TextChunk', TextChunkSchema);


