const mongoose = require('mongoose');

// MongoDB Helper Utilities
class MongoDBHelpers {
  
  // Connection helpers
  static async connectWithRetry(uri, options = {}, maxRetries = 5) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await mongoose.connect(uri, options);
        console.log('✅ MongoDB connected successfully');
        return true;
      } catch (error) {
        retries++;
        console.error(`❌ MongoDB connection attempt ${retries} failed:`, error.message);
        
        if (retries >= maxRetries) {
          throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Schema validation helpers
  static validateObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }
    return true;
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return true;
  }

  static validateWalletAddress(address) {
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(address)) {
      throw new Error('Invalid wallet address format');
    }
    return true;
  }

  // Query helpers
  static buildSearchQuery(searchTerm, fields = []) {
    if (!searchTerm) return {};
    
    const searchConditions = fields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }));
    
    return { $or: searchConditions };
  }

  static buildDateRangeQuery(startDate, endDate, dateField = 'createdAt') {
    const query = {};
    
    if (startDate) {
      query[dateField] = { ...query[dateField], $gte: new Date(startDate) };
    }
    
    if (endDate) {
      query[dateField] = { ...query[dateField], $lte: new Date(endDate) };
    }
    
    return query;
  }

  static buildPaginationQuery(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return { skip, limit };
  }

  // Aggregation helpers
  static buildAggregationPipeline(filters = {}, sort = {}, pagination = {}) {
    const pipeline = [];
    
    // Match stage
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    
    // Sort stage
    if (Object.keys(sort).length > 0) {
      pipeline.push({ $sort: sort });
    }
    
    // Pagination
    if (pagination.skip) {
      pipeline.push({ $skip: pagination.skip });
    }
    if (pagination.limit) {
      pipeline.push({ $limit: pagination.limit });
    }
    
    return pipeline;
  }

  // Data transformation helpers
  static sanitizeDocument(doc, fieldsToExclude = []) {
    if (!doc) return null;
    
    const sanitized = doc.toObject ? doc.toObject() : doc;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'privateKey', 'secret', ...fieldsToExclude];
    sensitiveFields.forEach(field => {
      delete sanitized[field];
    });
    
    return sanitized;
  }

  static transformDocumentList(docs, transformFn = null) {
    if (!Array.isArray(docs)) return [];
    
    return docs.map(doc => {
      const transformed = this.sanitizeDocument(doc);
      return transformFn ? transformFn(transformed) : transformed;
    });
  }

  // Error handling helpers
  static handleMongoError(error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return {
        type: 'validation',
        message: 'Validation failed',
        errors
      };
    }
    
    if (error.name === 'CastError') {
      return {
        type: 'cast',
        message: 'Invalid data type',
        field: error.path,
        value: error.value
      };
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return {
        type: 'duplicate',
        message: `${field} already exists`,
        field
      };
    }
    
    return {
      type: 'unknown',
      message: error.message
    };
  }

  // Performance helpers
  static async createIndexesForModel(Model, indexes = []) {
    try {
      for (const index of indexes) {
        await Model.collection.createIndex(index.fields, index.options || {});
        console.log(`✅ Index created for ${Model.modelName}:`, index.fields);
      }
    } catch (error) {
      console.error(`❌ Failed to create indexes for ${Model.modelName}:`, error);
      throw error;
    }
  }

  static async getCollectionStats(Model) {
    try {
      const stats = await Model.collection.stats();
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes
      };
    } catch (error) {
      console.error(`❌ Failed to get collection stats for ${Model.modelName}:`, error);
      throw error;
    }
  }

  // Backup and restore helpers
  static async exportCollection(Model, query = {}) {
    try {
      const docs = await Model.find(query);
      return docs.map(doc => doc.toObject());
    } catch (error) {
      console.error(`❌ Failed to export collection ${Model.modelName}:`, error);
      throw error;
    }
  }

  static async importCollection(Model, data, options = {}) {
    try {
      if (options.clearFirst) {
        await Model.deleteMany({});
      }
      
      if (Array.isArray(data)) {
        return await Model.insertMany(data, { ordered: false });
      } else {
        return await Model.create(data);
      }
    } catch (error) {
      console.error(`❌ Failed to import collection ${Model.modelName}:`, error);
      throw error;
    }
  }

  // Health check helpers
  static async checkConnection() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      return {
        status: state === 1 ? 'healthy' : 'unhealthy',
        state: states[state],
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
    };
  }

  static async getDatabaseInfo() {
    try {
      const admin = mongoose.connection.db.admin();
      const serverStatus = await admin.serverStatus();
      const dbStats = await mongoose.connection.db.stats();
      
      return {
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes
      };
    } catch (error) {
      console.error('❌ Failed to get database info:', error);
      throw error;
    }
  }
}

module.exports = MongoDBHelpers;

