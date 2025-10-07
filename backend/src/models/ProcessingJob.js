const mongoose = require('mongoose');

const processingJobSchema = new mongoose.Schema({
  // Job identification
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Job type
  type: {
    type: String,
    required: true,
    enum: [
      'document_upload',
      'text_extraction',
      'metadata_extraction',
      'ai_embedding',
      'image_processing',
      'dicom_processing',
      'ocr_processing',
      'medical_entity_extraction',
      'vector_indexing',
      'document_analysis',
      'chat_processing',
      'redaction_processing'
    ]
  },
  
  // Job status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'],
    default: 'pending',
    index: true
  },
  
  // Priority level
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
    index: true
  },
  
  // Document reference
  documentId: {
    type: String,
    required: true,
    index: true
  },
  
  // Input references
  inputRefs: {
    filePath: String,
    ipfsHash: String,
    s3Key: String,
    originalFileName: String,
    fileType: String,
    fileSize: Number,
    encryptionKeyId: String
  },
  
  // Output references
  outputRefs: {
    processedFilePath: String,
    extractedText: String,
    metadata: mongoose.Schema.Types.Mixed,
    vectorIds: [String],
    thumbnailPath: String,
    previewPath: String,
    errorLog: String
  },
  
  // Processing parameters
  parameters: {
    model: String,
    modelVersion: String,
    temperature: Number,
    maxTokens: Number,
    language: String,
    ocrLanguage: String,
    imageQuality: Number,
    compressionLevel: Number,
    redactionLevel: String
  },
  
  // Processing details
  processing: {
    startedAt: Date,
    completedAt: Date,
    processingTime: Number, // in milliseconds
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    lastError: String,
    errorDetails: mongoose.Schema.Types.Mixed,
    workerId: String,
    queueName: String
  },
  
  // Progress tracking
  progress: {
    currentStep: String,
    totalSteps: Number,
    completedSteps: Number,
    percentage: Number,
    estimatedTimeRemaining: Number // in seconds
  },
  
  // Dependencies
  dependencies: [{
    jobId: String,
    status: String,
    required: Boolean
  }],
  
  // Results and metrics
  results: {
    success: Boolean,
    confidence: Number, // 0-1
    accuracy: Number, // 0-1
    completeness: Number, // 0-1
    processingStats: {
      tokensProcessed: Number,
      imagesProcessed: Number,
      pagesProcessed: Number,
      entitiesExtracted: Number
    }
  },
  
  // Medical context
  medicalContext: {
    patientId: String,
    documentType: String,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    containsPHI: Boolean,
    redactionRequired: Boolean
  },
  
  // Access control
  access: {
    createdBy: String,
    allowedUsers: [String],
    allowedRoles: [String],
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'confidential', 'secret'],
      default: 'restricted'
    }
  },
  
  // Notifications
  notifications: {
    emailOnComplete: Boolean,
    emailOnError: Boolean,
    webhookUrl: String,
    notificationSent: Boolean
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  scheduledAt: {
    type: Date,
    index: true
  },
  
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index
  }
}, {
  timestamps: true,
  collection: 'processing_jobs'
});

// Indexes for performance
processingJobSchema.index({ jobId: 1 });
processingJobSchema.index({ documentId: 1 });
processingJobSchema.index({ status: 1 });
processingJobSchema.index({ priority: -1 });
processingJobSchema.index({ type: 1 });
processingJobSchema.index({ createdAt: -1 });
processingJobSchema.index({ scheduledAt: 1 });
processingJobSchema.index({ expiresAt: 1 });
processingJobSchema.index({ 'processing.workerId': 1 });

// Compound indexes
processingJobSchema.index({ status: 1, priority: -1, createdAt: 1 });
processingJobSchema.index({ status: 1, type: 1, createdAt: 1 });

// Pre-save middleware
processingJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate progress percentage
  if (this.progress.totalSteps > 0) {
    this.progress.percentage = Math.round((this.progress.completedSteps / this.progress.totalSteps) * 100);
  }
  
  // Set expiration date (default 7 days)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Static methods
processingJobSchema.statics.findByStatus = function(status, limit = 100) {
  return this.find({ status })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

processingJobSchema.statics.findByDocument = function(documentId) {
  return this.find({ documentId }).sort({ createdAt: -1 });
};

processingJobSchema.statics.findPendingJobs = function(limit = 50) {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

processingJobSchema.statics.findFailedJobs = function(limit = 50) {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit);
};

processingJobSchema.statics.getJobStatistics = function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startTime } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        averageProcessingTime: { $avg: '$processing.processingTime' }
      }
    }
  ]);
};

processingJobSchema.statics.getQueueStatus = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        averagePriority: { $avg: '$priority' }
      }
    }
  ]);
};

// Instance methods
processingJobSchema.methods.startProcessing = function(workerId) {
  this.status = 'processing';
  this.processing.startedAt = new Date();
  this.processing.workerId = workerId;
  return this.save();
};

processingJobSchema.methods.completeProcessing = function(results) {
  this.status = 'completed';
  this.processing.completedAt = new Date();
  this.processing.processingTime = Date.now() - this.processing.startedAt.getTime();
  this.results = { ...this.results, ...results };
  return this.save();
};

processingJobSchema.methods.failProcessing = function(error, errorDetails = {}) {
  this.status = 'failed';
  this.processing.lastError = error;
  this.processing.errorDetails = errorDetails;
  this.processing.completedAt = new Date();
  return this.save();
};

processingJobSchema.methods.retryJob = function() {
  if (this.processing.retryCount < this.processing.maxRetries) {
    this.status = 'retrying';
    this.processing.retryCount += 1;
    this.processing.lastError = null;
    this.processing.errorDetails = null;
    return this.save();
  }
  return Promise.reject(new Error('Max retries exceeded'));
};

processingJobSchema.methods.updateProgress = function(step, completedSteps, totalSteps) {
  this.progress.currentStep = step;
  this.progress.completedSteps = completedSteps;
  this.progress.totalSteps = totalSteps;
  return this.save();
};

processingJobSchema.methods.getJobSummary = function() {
  return {
    jobId: this.jobId,
    type: this.type,
    status: this.status,
    priority: this.priority,
    documentId: this.documentId,
    progress: this.progress,
    processingTime: this.processing.processingTime,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('ProcessingJob', processingJobSchema);

