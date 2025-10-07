const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 20) {
            console.error('❌ Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    };
  }

  async connect() {
    try {
      this.client = redis.createClient(this.config);
      
      // Handle connection events
      this.client.on('connect', () => {
        console.log('🔄 Redis connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis connected successfully');
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('⚠️ Redis connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('✅ Redis disconnected');
      } catch (error) {
        console.error('❌ Redis disconnect error:', error);
      }
    }
  }

  async ping() {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.ping();
  }

  // Basic operations
  async get(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      throw error;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.del(key);
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.exists(key);
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key, ttl) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      throw error;
    }
  }

  // Hash operations
  async hget(key, field) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Redis HGET error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  async hset(key, field, value) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const serializedValue = JSON.stringify(value);
      return await this.client.hSet(key, field, serializedValue);
    } catch (error) {
      console.error(`❌ Redis HSET error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const hash = await this.client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error(`❌ Redis HGETALL error for key ${key}:`, error);
      throw error;
    }
  }

  async hdel(key, field) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.hDel(key, field);
    } catch (error) {
      console.error(`❌ Redis HDEL error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  // List operations
  async lpush(key, value) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const serializedValue = JSON.stringify(value);
      return await this.client.lPush(key, serializedValue);
    } catch (error) {
      console.error(`❌ Redis LPUSH error for key ${key}:`, error);
      throw error;
    }
  }

  async rpop(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const value = await this.client.rPop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Redis RPOP error for key ${key}:`, error);
      throw error;
    }
  }

  async llen(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.lLen(key);
    } catch (error) {
      console.error(`❌ Redis LLEN error for key ${key}:`, error);
      throw error;
    }
  }

  // Set operations
  async sadd(key, member) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const serializedMember = JSON.stringify(member);
      return await this.client.sAdd(key, serializedMember);
    } catch (error) {
      console.error(`❌ Redis SADD error for key ${key}:`, error);
      throw error;
    }
  }

  async smembers(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const members = await this.client.sMembers(key);
      return members.map(member => JSON.parse(member));
    } catch (error) {
      console.error(`❌ Redis SMEMBERS error for key ${key}:`, error);
      throw error;
    }
  }

  async srem(key, member) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const serializedMember = JSON.stringify(member);
      return await this.client.sRem(key, serializedMember);
    } catch (error) {
      console.error(`❌ Redis SREM error for key ${key}:`, error);
      throw error;
    }
  }

  // Pattern operations
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis KEYS error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          error: 'Not connected',
          isConnected: false
        };
      }

      const start = Date.now();
      await this.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        isConnected: true,
        latency: `${latency}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isConnected: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get Redis info
  async getInfo() {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.info();
    } catch (error) {
      console.error('❌ Redis INFO error:', error);
      throw error;
    }
  }

  // Clear all data (use with caution)
  async flushAll() {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      await this.client.flushAll();
      console.log('✅ Redis database cleared');
    } catch (error) {
      console.error('❌ Redis FLUSHALL error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;

