const redisService = require('../src/services/redisService');

class RedisSetup {
  constructor() {
    this.setupComplete = false;
  }

  async setup() {
    try {
      console.log('🚀 Setting up Redis for MediVault...');
      
      // Connect to Redis
      await redisService.connect();
      
      // Test connection
      await redisService.ping();
      console.log('✅ Redis connection successful');
      
      // Create initial data structures
      await this.createInitialStructures();
      
      // Set up job queues
      await this.setupJobQueues();
      
      // Create sample data
      await this.createSampleData();
      
      this.setupComplete = true;
      console.log('✅ Redis setup completed successfully!');
      
    } catch (error) {
      console.error('❌ Redis setup failed:', error);
      throw error;
    }
  }

  async createInitialStructures() {
    try {
      console.log('📊 Creating initial Redis structures...');
      
      // Create system keys
      await redisService.set('system:startup', {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
      
      // Create rate limiting keys
      await redisService.set('rate_limits:configured', {
        auth: { limit: 5, window: 300 },
        upload: { limit: 10, window: 3600 },
        download: { limit: 50, window: 3600 },
        chat: { limit: 100, window: 3600 }
      });
      
      console.log('✅ Initial structures created');
    } catch (error) {
      console.error('❌ Failed to create initial structures:', error);
      throw error;
    }
  }

  async setupJobQueues() {
    try {
      console.log('🔄 Setting up job queues...');
      
      const jobTypes = [
        'document_processing',
        'ai_processing', 
        'notification',
        'cleanup'
      ];
      
      for (const jobType of jobTypes) {
        // Initialize empty queues
        await redisService.set(`queue:${jobType}:stats`, {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          lastProcessed: null
        });
        
        console.log(`✅ Queue initialized: ${jobType}`);
      }
      
      console.log('✅ Job queues setup completed');
    } catch (error) {
      console.error('❌ Failed to setup job queues:', error);
      throw error;
    }
  }

  async createSampleData() {
    try {
      console.log('🌱 Creating sample data...');
      
      // Create sample admin session
      const adminSessionId = await redisService.createSession('admin-user-id', {
        role: 'admin',
        permissions: ['all'],
        userAgent: 'MediVault Setup',
        ipAddress: '127.0.0.1'
      });
      
      console.log(`✅ Admin session created: ${adminSessionId}`);
      
      // Create sample notifications
      await redisService.publishNotification('admin-user-id', {
        type: 'system',
        title: 'Welcome to MediVault',
        message: 'Redis setup completed successfully',
        data: { setup: true }
      });
      
      console.log('✅ Sample data created');
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      throw error;
    }
  }

  async testRedis() {
    try {
      console.log('🧪 Testing Redis functionality...');
      
      // Test basic operations
      await redisService.set('test:key', { message: 'Hello Redis' });
      const value = await redisService.get('test:key');
      console.log('✅ Basic operations test passed');
      
      // Test session management
      const sessionId = await redisService.createSession('test-user', {
        role: 'patient',
        test: true
      });
      const session = await redisService.getSession(sessionId);
      console.log('✅ Session management test passed');
      
      // Test job queue
      const jobId = await redisService.enqueueJob('test', { message: 'Test job' });
      const job = await redisService.dequeueJob('test');
      console.log('✅ Job queue test passed');
      
      // Test rate limiting
      const rateLimitResult = await redisService.checkRateLimit('test-user', 5, 60);
      console.log('✅ Rate limiting test passed');
      
      // Cleanup test data
      await redisService.del('test:key');
      await redisService.deleteSession(sessionId);
      
      console.log('✅ All Redis tests passed');
      
    } catch (error) {
      console.error('❌ Redis test failed:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      console.log('📊 Getting Redis statistics...');
      
      const health = await redisService.healthCheck();
      const memoryUsage = await redisService.getMemoryUsage();
      
      console.log('Redis Health:', health);
      console.log('Memory Usage:', memoryUsage);
      
      return {
        health,
        memoryUsage,
        setupComplete: this.setupComplete
      };
    } catch (error) {
      console.error('❌ Failed to get Redis stats:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      console.log('🧹 Cleaning up Redis data...');
      
      // Clear all data (use with caution)
      await redisService.flushAll();
      
      console.log('✅ Redis cleanup completed');
    } catch (error) {
      console.error('❌ Redis cleanup failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const setup = new RedisSetup();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
        await setup.setup();
        break;
        
      case 'test':
        await setup.testRedis();
        break;
        
      case 'stats':
        await setup.getStats();
        break;
        
      case 'cleanup':
        await setup.cleanup();
        break;
        
      default:
        console.log('Usage: node setupRedis.js [setup|test|stats|cleanup]');
        console.log('  setup   - Set up Redis with initial data');
        console.log('  test    - Test Redis functionality');
        console.log('  stats   - Show Redis statistics');
        console.log('  cleanup - Clear all Redis data');
        break;
    }
  } catch (error) {
    console.error('❌ Redis setup script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = RedisSetup;

