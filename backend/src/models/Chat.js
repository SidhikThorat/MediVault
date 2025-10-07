const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Chat session information
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User information
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Document reference
  documentId: {
    type: String,
    required: true,
    index: true
  },
  
  // Chat messages
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      messageId: String,
      parentMessageId: String,
      tokens: Number,
      model: String,
      temperature: Number,
      maxTokens: Number
    },
    citations: [{
      documentId: String,
      chunkId: String,
      pageNumber: Number,
      section: String,
      confidence: Number,
      text: String
    }],
    redactionFlags: {
      containsPHI: Boolean,
      redactedFields: [String],
      redactionReason: String
    }
  }],
  
  // Chat context
  context: {
    patientId: String,
    documentType: String,
    medicalContext: {
      diagnosis: [String],
      medications: [String],
      procedures: [String],
      vitalSigns: [String]
    },
    userRole: {
      type: String,
      enum: ['admin', 'doctor', 'nurse', 'patient', 'researcher']
    },
    sessionPurpose: {
      type: String,
      enum: ['general_query', 'diagnosis_help', 'medication_info', 'treatment_plan', 'lab_results', 'other']
    }
  },
  
  // AI processing information
  aiProcessing: {
    model: String,
    modelVersion: String,
    embeddingModel: String,
    vectorSearchResults: [{
      chunkId: String,
      similarity: Number,
      relevance: Number
    }],
    processingTime: Number, // in milliseconds
    totalTokens: Number,
    cost: Number // in USD
  },
  
  // Chat statistics
  statistics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    userMessages: {
      type: Number,
      default: 0
    },
    assistantMessages: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number,
    totalTokens: Number,
    totalCost: Number
  },
  
  // Session status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  
  // Privacy and security
  privacy: {
    containsPHI: Boolean,
    redactionLevel: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'partial'
    },
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'confidential', 'secret'],
      default: 'restricted'
    },
    retentionPeriod: Number // in days
  },
  
  // Quality and feedback
  quality: {
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    userFeedback: String,
    accuracyScore: Number,
    relevanceScore: Number,
    lastRated: Date
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
  
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index
  }
}, {
  timestamps: true,
  collection: 'chats'
});

// Indexes for performance
chatSchema.index({ sessionId: 1 });
chatSchema.index({ userId: 1 });
chatSchema.index({ documentId: 1 });
chatSchema.index({ 'context.userRole': 1 });
chatSchema.index({ 'context.sessionPurpose': 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ expiresAt: 1 });

// Text search index
chatSchema.index({
  'messages.content': 'text',
  'context.medicalContext.diagnosis': 'text',
  'context.medicalContext.medications': 'text'
});

// Pre-save middleware
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastMessageAt = new Date();
  
  // Update statistics
  this.statistics.totalMessages = this.messages.length;
  this.statistics.userMessages = this.messages.filter(m => m.role === 'user').length;
  this.statistics.assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
  
  // Set expiration date based on privacy settings
  if (this.privacy.retentionPeriod) {
    this.expiresAt = new Date(Date.now() + this.privacy.retentionPeriod * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Static methods
chatSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit);
};

chatSchema.statics.findByDocument = function(documentId, limit = 50) {
  return this.find({ documentId })
    .sort({ lastMessageAt: -1 })
    .limit(limit);
};

chatSchema.statics.findActiveSessions = function(userId) {
  return this.find({ userId, status: 'active' });
};

chatSchema.statics.getChatStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMessages: { $sum: '$statistics.totalMessages' },
        averageResponseTime: { $avg: '$aiProcessing.processingTime' },
        totalCost: { $sum: '$statistics.totalCost' }
      }
    }
  ]);
};

// Instance methods
chatSchema.methods.addMessage = function(role, content, metadata = {}) {
  const message = {
    role,
    content,
    timestamp: new Date(),
    metadata: {
      messageId: require('crypto').randomUUID(),
      ...metadata
    }
  };
  
  this.messages.push(message);
  return this.save();
};

chatSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

chatSchema.methods.getChatSummary = function() {
  return {
    sessionId: this.sessionId,
    documentId: this.documentId,
    totalMessages: this.statistics.totalMessages,
    lastMessageAt: this.lastMessageAt,
    status: this.status,
    userRole: this.context.userRole,
    sessionPurpose: this.context.sessionPurpose
  };
};

chatSchema.methods.rateChat = function(rating, feedback = '') {
  this.quality.userRating = rating;
  this.quality.userFeedback = feedback;
  this.quality.lastRated = new Date();
  return this.save();
};

chatSchema.methods.archiveChat = function() {
  this.status = 'archived';
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);

