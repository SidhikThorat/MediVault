const mongoose = require('mongoose');

const documentContentSchema = new mongoose.Schema({
  // Reference to PostgreSQL document ID
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Extracted text content
  text: {
    type: String,
    required: true
  },
  
  // Document sections (for structured medical documents)
  sections: [{
    title: String,
    content: String,
    pageNumber: Number,
    sectionType: {
      type: String,
      enum: ['diagnosis', 'treatment', 'medication', 'lab_results', 'vital_signs', 'history', 'other']
    }
  }],
  
  // Extracted medical entities
  extractedEntities: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String
    }],
    conditions: [{
      name: String,
      icd10Code: String,
      severity: String,
      status: String
    }],
    procedures: [{
      name: String,
      date: Date,
      doctor: String,
      notes: String
    }],
    vitalSigns: [{
      type: String, // blood_pressure, heart_rate, temperature, etc.
      value: String,
      unit: String,
      date: Date
    }],
    allergies: [{
      allergen: String,
      reaction: String,
      severity: String
    }]
  },
  
  // Medical metadata
  medicalMetadata: {
    patientAge: Number,
    patientGender: String,
    diagnosis: [String],
    treatment: [String],
    doctor: String,
    hospital: String,
    department: String,
    examinationDate: Date,
    followUpDate: Date,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // AI processing details
  aiProcessing: {
    extractedAt: Date,
    processedBy: String, // AI model name
    confidence: Number, // 0-1 confidence score
    language: String,
    wordCount: Number,
    readingTime: Number // in minutes
  },
  
  // Vector embeddings reference
  embeddings: {
    vectorId: String, // Reference to vector DB
    model: String, // embedding model used
    dimensions: Number,
    createdAt: Date
  },
  
  // OCR and image processing
  imageProcessing: {
    ocrText: String,
    imageQuality: Number,
    hasText: Boolean,
    extractedRegions: [{
      type: String, // 'text', 'table', 'chart', 'signature'
      coordinates: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      content: String
    }]
  },
  
  // File processing details
  fileProcessing: {
    originalFormat: String,
    processedFormat: String,
    compressionRatio: Number,
    thumbnailGenerated: Boolean,
    previewGenerated: Boolean
  },
  
  // Access and privacy
  privacy: {
    containsPHI: Boolean,
    redactedFields: [String],
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
  },
  
  lastProcessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'document_contents'
});

// Indexes for performance
documentContentSchema.index({ documentId: 1 });
documentContentSchema.index({ processingStatus: 1 });
documentContentSchema.index({ 'medicalMetadata.diagnosis': 1 });
documentContentSchema.index({ 'medicalMetadata.examinationDate': 1 });
documentContentSchema.index({ 'extractedEntities.medications.name': 1 });
documentContentSchema.index({ 'extractedEntities.conditions.name': 1 });
documentContentSchema.index({ createdAt: -1 });
documentContentSchema.index({ lastProcessedAt: -1 });

// Text search index
documentContentSchema.index({
  text: 'text',
  'sections.content': 'text',
  'extractedEntities.medications.name': 'text',
  'extractedEntities.conditions.name': 'text'
});

// Pre-save middleware
documentContentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastProcessedAt = new Date();
  next();
});

// Instance methods
documentContentSchema.methods.getSummary = function() {
  return {
    documentId: this.documentId,
    wordCount: this.aiProcessing.wordCount,
    sections: this.sections.length,
    medications: this.extractedEntities.medications.length,
    conditions: this.extractedEntities.conditions.length,
    processingStatus: this.processingStatus
  };
};

documentContentSchema.methods.getMedicalSummary = function() {
  return {
    diagnosis: this.medicalMetadata.diagnosis,
    medications: this.extractedEntities.medications,
    conditions: this.extractedEntities.conditions,
    vitalSigns: this.extractedEntities.vitalSigns,
    examinationDate: this.medicalMetadata.examinationDate
  };
};

module.exports = mongoose.model('DocumentContent', documentContentSchema);

