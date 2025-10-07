const mongoose = require('mongoose');

const aiVectorSchema = new mongoose.Schema({
  // Reference to PostgreSQL document ID
  documentId: {
    type: String,
    required: true,
    index: true
  },
  
  // Chunk information
  chunkId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Chunk content
  chunkText: {
    type: String,
    required: true
  },
  
  // Chunk metadata
  chunkMetadata: {
    pageNumber: Number,
    sectionTitle: String,
    sectionType: {
      type: String,
      enum: ['diagnosis', 'treatment', 'medication', 'lab_results', 'vital_signs', 'history', 'other']
    },
    wordCount: Number,
    startPosition: Number,
    endPosition: Number
  },
  
  // Vector information
  vectorInfo: {
    vectorId: {
      type: String,
      required: true,
      unique: true
    },
    dimensions: {
      type: Number,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    modelVersion: String,
    embeddingMethod: {
      type: String,
      enum: ['openai', 'huggingface', 'local', 'custom'],
      default: 'openai'
    }
  },
  
  // Vector database reference
  vectorDB: {
    namespace: String,
    collection: String,
    indexName: String
  },
  
  // Medical context
  medicalContext: {
    patientId: String,
    documentType: {
      type: String,
      enum: ['dicom', 'pdf', 'image', 'lab_report', 'prescription', 'discharge_summary', 'other']
    },
    modality: String, // for DICOM files
    bodyPart: String, // for medical images
    diagnosis: [String],
    medications: [String],
    procedures: [String]
  },
  
  // Search and retrieval
  searchMetadata: {
    tags: [String],
    keywords: [String],
    categories: [String],
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  
  // Quality metrics
  quality: {
    relevanceScore: Number, // 0-1
    completenessScore: Number, // 0-1
    accuracyScore: Number, // 0-1
    lastValidated: Date
  },
  
  // Processing information
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: Date,
    processingTime: Number, // in milliseconds
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  
  // Access control
  access: {
    allowedUsers: [String], // user IDs
    allowedRoles: [String], // role names
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'confidential', 'secret'],
      default: 'restricted'
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ai_vectors'
});

// Indexes for performance
aiVectorSchema.index({ documentId: 1 });
aiVectorSchema.index({ chunkId: 1 });
aiVectorSchema.index({ vectorId: 1 });
aiVectorSchema.index({ 'medicalContext.documentType': 1 });
aiVectorSchema.index({ 'medicalContext.diagnosis': 1 });
aiVectorSchema.index({ 'medicalContext.medications': 1 });
aiVectorSchema.index({ 'searchMetadata.tags': 1 });
aiVectorSchema.index({ 'searchMetadata.keywords': 1 });
aiVectorSchema.index({ 'processing.status': 1 });
aiVectorSchema.index({ createdAt: -1 });

// Text search index
aiVectorSchema.index({
  chunkText: 'text',
  'chunkMetadata.sectionTitle': 'text',
  'searchMetadata.keywords': 'text'
});

// Pre-save middleware
aiVectorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for search
aiVectorSchema.statics.findByDocument = function(documentId) {
  return this.find({ documentId }).sort({ 'chunkMetadata.pageNumber': 1 });
};

aiVectorSchema.statics.findByMedicalContext = function(filters) {
  const query = {};
  
  if (filters.documentType) {
    query['medicalContext.documentType'] = filters.documentType;
  }
  
  if (filters.diagnosis) {
    query['medicalContext.diagnosis'] = { $in: filters.diagnosis };
  }
  
  if (filters.medications) {
    query['medicalContext.medications'] = { $in: filters.medications };
  }
  
  if (filters.tags) {
    query['searchMetadata.tags'] = { $in: filters.tags };
  }
  
  return this.find(query);
};

aiVectorSchema.statics.findSimilarChunks = function(vectorId, limit = 10) {
  // This would typically use vector similarity search
  // For now, return chunks from the same document
  return this.find({ vectorId: { $ne: vectorId } }).limit(limit);
};

// Instance methods
aiVectorSchema.methods.getSearchContext = function() {
  return {
    chunkId: this.chunkId,
    text: this.chunkText,
    metadata: this.chunkMetadata,
    medicalContext: this.medicalContext,
    tags: this.searchMetadata.tags,
    keywords: this.searchMetadata.keywords
  };
};

aiVectorSchema.methods.updateQuality = function(scores) {
  this.quality = {
    ...this.quality,
    ...scores,
    lastValidated: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('AIVector', aiVectorSchema);

