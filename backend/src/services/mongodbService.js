const { DocumentContent, Document, AIVector, Chat, ProcessingJob } = require('../models');

class MongoDBService {
  constructor() {
    this.models = {
      DocumentContent,
      AIVector,
      Chat,
      ProcessingJob
    };
  }

  // Document Operations (metadata stored in MongoDB)
  async createDocument(data) {
    try {
      const doc = new Document(data);
      return await doc.save();
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocumentById(id) {
    try {
      return await Document.findById(id);
    } catch (error) {
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  async updateDocument(id, updates) {
    try {
      return await Document.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async searchDocuments(searchTerm, filters = {}, limit = 50, offset = 0) {
    try {
      return await Document.search(searchTerm, filters, limit, offset);
    } catch (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  // Document Content Operations
  async createDocumentContent(data) {
    try {
      const documentContent = new DocumentContent(data);
      return await documentContent.save();
    } catch (error) {
      throw new Error(`Failed to create document content: ${error.message}`);
    }
  }

  async getDocumentContent(documentId) {
    try {
      return await DocumentContent.findOne({ documentId });
    } catch (error) {
      throw new Error(`Failed to get document content: ${error.message}`);
    }
  }

  async updateDocumentContent(documentId, updates) {
    try {
      return await DocumentContent.findOneAndUpdate(
        { documentId },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Failed to update document content: ${error.message}`);
    }
  }

  async searchDocumentContent(query, filters = {}) {
    try {
      const searchQuery = {
        $text: { $search: query },
        ...filters
      };
      
      return await DocumentContent.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .limit(50);
    } catch (error) {
      throw new Error(`Failed to search document content: ${error.message}`);
    }
  }

  // AI Vector Operations
  async createAIVector(data) {
    try {
      const aiVector = new AIVector(data);
      return await aiVector.save();
    } catch (error) {
      throw new Error(`Failed to create AI vector: ${error.message}`);
    }
  }

  async getVectorsByDocument(documentId) {
    try {
      return await AIVector.findByDocument(documentId);
    } catch (error) {
      throw new Error(`Failed to get vectors by document: ${error.message}`);
    }
  }

  async searchVectors(filters) {
    try {
      return await AIVector.findByMedicalContext(filters);
    } catch (error) {
      throw new Error(`Failed to search vectors: ${error.message}`);
    }
  }

  async updateVectorQuality(vectorId, scores) {
    try {
      const vector = await AIVector.findOne({ vectorId });
      if (!vector) {
        throw new Error('Vector not found');
      }
      return await vector.updateQuality(scores);
    } catch (error) {
      throw new Error(`Failed to update vector quality: ${error.message}`);
    }
  }

  // Chat Operations
  async createChat(data) {
    try {
      const chat = new Chat(data);
      return await chat.save();
    } catch (error) {
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  async getChat(sessionId) {
    try {
      return await Chat.findOne({ sessionId });
    } catch (error) {
      throw new Error(`Failed to get chat: ${error.message}`);
    }
  }

  async getUserChats(userId, limit = 50) {
    try {
      return await Chat.findByUser(userId, limit);
    } catch (error) {
      throw new Error(`Failed to get user chats: ${error.message}`);
    }
  }

  async addChatMessage(sessionId, role, content, metadata = {}) {
    try {
      const chat = await Chat.findOne({ sessionId });
      if (!chat) {
        throw new Error('Chat not found');
      }
      return await chat.addMessage(role, content, metadata);
    } catch (error) {
      throw new Error(`Failed to add chat message: ${error.message}`);
    }
  }

  async getChatStatistics(userId) {
    try {
      return await Chat.getChatStatistics(userId);
    } catch (error) {
      throw new Error(`Failed to get chat statistics: ${error.message}`);
    }
  }

  // Processing Job Operations
  async createProcessingJob(data) {
    try {
      const job = new ProcessingJob(data);
      return await job.save();
    } catch (error) {
      throw new Error(`Failed to create processing job: ${error.message}`);
    }
  }

  async getProcessingJob(jobId) {
    try {
      return await ProcessingJob.findOne({ jobId });
    } catch (error) {
      throw new Error(`Failed to get processing job: ${error.message}`);
    }
  }

  async getPendingJobs(limit = 50) {
    try {
      return await ProcessingJob.findPendingJobs(limit);
    } catch (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }
  }

  async updateJobStatus(jobId, status, results = {}) {
    try {
      const job = await ProcessingJob.findOne({ jobId });
      if (!job) {
        throw new Error('Job not found');
      }

      switch (status) {
        case 'processing':
          return await job.startProcessing(results.workerId);
        case 'completed':
          return await job.completeProcessing(results);
        case 'failed':
          return await job.failProcessing(results.error, results.errorDetails);
        default:
          job.status = status;
          return await job.save();
      }
    } catch (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  async getJobStatistics(timeRange = 24) {
    try {
      return await ProcessingJob.getJobStatistics(timeRange);
    } catch (error) {
      throw new Error(`Failed to get job statistics: ${error.message}`);
    }
  }

  // Health Check
  async healthCheck() {
    try {
      const stats = await Promise.all([
        DocumentContent.countDocuments(),
        AIVector.countDocuments(),
        Chat.countDocuments(),
        ProcessingJob.countDocuments()
      ]);

      return {
        status: 'healthy',
        collections: {
          documentContent: stats[0],
          aiVectors: stats[1],
          chats: stats[2],
          processingJobs: stats[3]
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Database Operations
  async createIndexes() {
    try {
      // Create indexes for all models
      await Promise.all([
        DocumentContent.createIndexes(),
        AIVector.createIndexes(),
        Chat.createIndexes(),
        ProcessingJob.createIndexes()
      ]);
      
      console.log('✅ All MongoDB indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      throw error;
    }
  }

  async dropCollection(collectionName) {
    try {
      const model = this.models[collectionName];
      if (!model) {
        throw new Error(`Model ${collectionName} not found`);
      }
      
      await model.collection.drop();
      console.log(`✅ Collection ${collectionName} dropped successfully`);
    } catch (error) {
      console.error(`❌ Failed to drop collection ${collectionName}:`, error);
      throw error;
    }
  }

  async clearCollection(collectionName) {
    try {
      const model = this.models[collectionName];
      if (!model) {
        throw new Error(`Model ${collectionName} not found`);
      }
      
      await model.deleteMany({});
      console.log(`✅ Collection ${collectionName} cleared successfully`);
    } catch (error) {
      console.error(`❌ Failed to clear collection ${collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = new MongoDBService();

