const redisService = require('../config/redis');

class RedisService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await redisService.connect();
      this.isConnected = true;
      console.log('✅ Redis service connected');
    } catch (error) {
      console.error('❌ Redis service connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await redisService.disconnect();
      this.isConnected = false;
      console.log('✅ Redis service disconnected');
    } catch (error) {
      console.error('❌ Redis service disconnect failed:', error);
      throw error;
    }
  }

  // Session Management
  async createSession(userId, sessionData, ttl = 3600) {
    try {
      const sessionId = require('crypto').randomUUID();
      const sessionKey = `session:${sessionId}`;
      
      const session = {
        sessionId,
        userId,
        ...sessionData,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      await redisService.set(sessionKey, session, ttl);
      
      // Store user session mapping
      await redisService.sadd(`user_sessions:${userId}`, sessionId);
      
      return sessionId;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async getSession(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      return await redisService.get(sessionKey);
    } catch (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  async updateSession(sessionId, updates, ttl = 3600) {
    try {
      const sessionKey = `session:${sessionId}`;
      const session = await redisService.get(sessionKey);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      const updatedSession = {
        ...session,
        ...updates,
        lastActivity: new Date().toISOString()
      };
      
      await redisService.set(sessionKey, updatedSession, ttl);
      return updatedSession;
    } catch (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  async deleteSession(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      const session = await redisService.get(sessionKey);
      
      if (session) {
        // Remove from user sessions
        await redisService.srem(`user_sessions:${session.userId}`, sessionId);
      }
      
      return await redisService.del(sessionKey);
    } catch (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async getUserSessions(userId) {
    try {
      const sessionIds = await redisService.smembers(`user_sessions:${userId}`);
      const sessions = [];
      
      for (const sessionId of sessionIds) {
        const session = await redisService.get(`session:${sessionId}`);
        if (session) {
          sessions.push(session);
        }
      }
      
      return sessions;
    } catch (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  // Caching
  async cacheDocument(documentId, documentData, ttl = 1800) {
    try {
      const cacheKey = `document:${documentId}`;
      return await redisService.set(cacheKey, documentData, ttl);
    } catch (error) {
      throw new Error(`Failed to cache document: ${error.message}`);
    }
  }

  async getCachedDocument(documentId) {
    try {
      const cacheKey = `document:${documentId}`;
      return await redisService.get(cacheKey);
    } catch (error) {
      throw new Error(`Failed to get cached document: ${error.message}`);
    }
  }

  async cacheUser(userId, userData, ttl = 3600) {
    try {
      const cacheKey = `user:${userId}`;
      return await redisService.set(cacheKey, userData, ttl);
    } catch (error) {
      throw new Error(`Failed to cache user: ${error.message}`);
    }
  }

  async getCachedUser(userId) {
    try {
      const cacheKey = `user:${userId}`;
      return await redisService.get(cacheKey);
    } catch (error) {
      throw new Error(`Failed to get cached user: ${error.message}`);
    }
  }

  async invalidateUserCache(userId) {
    try {
      const cacheKey = `user:${userId}`;
      return await redisService.del(cacheKey);
    } catch (error) {
      throw new Error(`Failed to invalidate user cache: ${error.message}`);
    }
  }

  // Rate Limiting
  async checkRateLimit(identifier, limit, window) {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await redisService.get(key);
      
      if (current === null) {
        await redisService.set(key, 1, window);
        return { allowed: true, remaining: limit - 1, resetTime: Date.now() + window * 1000 };
      }
      
      if (current >= limit) {
        return { allowed: false, remaining: 0, resetTime: Date.now() + window * 1000 };
      }
      
      await redisService.set(key, current + 1, window);
      return { allowed: true, remaining: limit - current - 1, resetTime: Date.now() + window * 1000 };
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error.message}`);
    }
  }

  async resetRateLimit(identifier) {
    try {
      const key = `rate_limit:${identifier}`;
      return await redisService.del(key);
    } catch (error) {
      throw new Error(`Failed to reset rate limit: ${error.message}`);
    }
  }

  // Job Queues
  async enqueueJob(queueName, jobData, priority = 0) {
    try {
      const jobId = require('crypto').randomUUID();
      const job = {
        id: jobId,
        data: jobData,
        priority,
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3
      };
      
      const queueKey = `queue:${queueName}`;
      await redisService.lpush(queueKey, job);
      
      return jobId;
    } catch (error) {
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }
  }

  async dequeueJob(queueName) {
    try {
      const queueKey = `queue:${queueName}`;
      return await redisService.rpop(queueKey);
    } catch (error) {
      throw new Error(`Failed to dequeue job: ${error.message}`);
    }
  }

  async getQueueLength(queueName) {
    try {
      const queueKey = `queue:${queueName}`;
      return await redisService.llen(queueKey);
    } catch (error) {
      throw new Error(`Failed to get queue length: ${error.message}`);
    }
  }

  async getQueueStats(queueName) {
    try {
      const queueKey = `queue:${queueName}`;
      const length = await redisService.llen(queueKey);
      
      return {
        queueName,
        length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }
  }

  // Background Job Processing
  async processJob(queueName, processor) {
    try {
      const job = await this.dequeueJob(queueName);
      if (!job) {
        return null;
      }
      
      try {
        const result = await processor(job.data);
        
        // Mark job as completed
        await redisService.set(`job_result:${job.id}`, {
          status: 'completed',
          result,
          completedAt: new Date().toISOString()
        }, 3600);
        
        return result;
      } catch (error) {
        // Handle job failure
        job.attempts += 1;
        
        if (job.attempts < job.maxAttempts) {
          // Retry job
          await redisService.lpush(`queue:${queueName}`, job);
        } else {
          // Mark job as failed
          await redisService.set(`job_result:${job.id}`, {
            status: 'failed',
            error: error.message,
            failedAt: new Date().toISOString()
          }, 3600);
        }
        
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to process job: ${error.message}`);
    }
  }

  // Real-time Notifications
  async publishNotification(userId, notification) {
    try {
      const channel = `notifications:${userId}`;
      const message = {
        id: require('crypto').randomUUID(),
        ...notification,
        timestamp: new Date().toISOString()
      };
      
      await redisService.lpush(`user_notifications:${userId}`, message);
      
      // Keep only last 100 notifications
      const notifications = await redisService.smembers(`user_notifications:${userId}`);
      if (notifications.length > 100) {
        // Remove oldest notifications
        for (let i = 0; i < notifications.length - 100; i++) {
          await redisService.rpop(`user_notifications:${userId}`);
        }
      }
      
      return message.id;
    } catch (error) {
      throw new Error(`Failed to publish notification: ${error.message}`);
    }
  }

  async getUserNotifications(userId, limit = 50) {
    try {
      const notifications = await redisService.smembers(`user_notifications:${userId}`);
      return notifications.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get user notifications: ${error.message}`);
    }
  }

  // Analytics and Metrics
  async trackEvent(eventName, data, ttl = 86400) {
    try {
      const eventId = require('crypto').randomUUID();
      const event = {
        id: eventId,
        name: eventName,
        data,
        timestamp: new Date().toISOString()
      };
      
      const key = `event:${eventName}:${eventId}`;
      await redisService.set(key, event, ttl);
      
      // Add to event list
      await redisService.lpush(`events:${eventName}`, event);
      
      return eventId;
    } catch (error) {
      throw new Error(`Failed to track event: ${error.message}`);
    }
  }

  async getEventStats(eventName, timeRange = 3600) {
    try {
      const events = await redisService.smembers(`events:${eventName}`);
      const now = new Date();
      const cutoff = new Date(now.getTime() - timeRange * 1000);
      
      const recentEvents = events.filter(event => 
        new Date(event.timestamp) > cutoff
      );
      
      return {
        eventName,
        totalEvents: events.length,
        recentEvents: recentEvents.length,
        timeRange: timeRange
      };
    } catch (error) {
      throw new Error(`Failed to get event stats: ${error.message}`);
    }
  }

  // Health Check
  async healthCheck() {
    try {
      return await redisService.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isConnected: false
      };
    }
  }

  // Utility Methods
  async clearUserData(userId) {
    try {
      const patterns = [
        `user:${userId}`,
        `user_sessions:${userId}`,
        `user_notifications:${userId}`,
        `rate_limit:${userId}`
      ];
      
      for (const pattern of patterns) {
        await redisService.del(pattern);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to clear user data: ${error.message}`);
    }
  }

  async getMemoryUsage() {
    try {
      const info = await redisService.getInfo();
      const lines = info.split('\r\n');
      const memoryInfo = {};
      
      for (const line of lines) {
        if (line.includes('used_memory:')) {
          memoryInfo.usedMemory = line.split(':')[1];
        } else if (line.includes('used_memory_peak:')) {
          memoryInfo.peakMemory = line.split(':')[1];
        } else if (line.includes('used_memory_rss:')) {
          memoryInfo.rssMemory = line.split(':')[1];
        }
      }
      
      return memoryInfo;
    } catch (error) {
      throw new Error(`Failed to get memory usage: ${error.message}`);
    }
  }
}

module.exports = new RedisService();

