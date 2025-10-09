const mongoose = require('mongoose');

const EmbeddingMapSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true, required: true },
  chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'TextChunk', index: true, required: true },
  vectorId: { type: String, required: true, index: true },
  model: { type: String, required: true },
  embeddingDim: { type: Number },
  provider: { type: String },
  indexName: { type: String },
  createdByModelVersion: { type: String }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'embedding_map'
});

EmbeddingMapSchema.index({ vectorId: 1 }, { unique: true });
EmbeddingMapSchema.index({ docId: 1, chunkId: 1, model: 1 }, { unique: true });

module.exports = mongoose.model('EmbeddingMap', EmbeddingMapSchema);


