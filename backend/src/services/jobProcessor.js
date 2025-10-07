const redisService = require('./redisService');
const mongodbService = require('./mongodbService');

class JobProcessor {
  constructor() {
    this.processors = new Map();
    this.isProcessing = false;
    this.processingInterval = 5000; // 5 seconds
    this.maxConcurrentJobs = 5;
    this.activeJobs = new Set();
  }

  // Register job processor
  registerProcessor(jobType, processor) {
    this.processors.set(jobType, processor);
    console.log(`✅ Registered processor for job type: ${jobType}`);
  }

  // Start job processing
  async startProcessing() {
    if (this.isProcessing) {
      console.log('⚠️ Job processor already running');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting job processor...');

    // Process jobs in intervals
    this.processingIntervalId = setInterval(async () => {
      await this.processJobs();
    }, this.processingInterval);

    // Register default processors
    this.registerDefaultProcessors();
  }

  // Stop job processing
  async stopProcessing() {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId);
    }

    // Wait for active jobs to complete
    while (this.activeJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Job processor stopped');
  }

  // Process jobs from queues
  async processJobs() {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    try {
      // Get available job types
      const jobTypes = ['document_processing', 'ai_processing', 'notification', 'cleanup'];
      
      for (const jobType of jobTypes) {
        if (this.activeJobs.size >= this.maxConcurrentJobs) {
          break;
        }

        const job = await redisService.dequeueJob(jobType);
        if (job) {
          this.processJob(jobType, job);
        }
      }
    } catch (error) {
      console.error('❌ Job processing error:', error);
    }
  }

  // Process individual job
  async processJob(jobType, job) {
    const jobId = `${jobType}:${job.id}`;
    this.activeJobs.add(jobId);

    try {
      console.log(`🔄 Processing job: ${jobId}`);
      
      const processor = this.processors.get(jobType);
      if (!processor) {
        throw new Error(`No processor registered for job type: ${jobType}`);
      }

      const result = await processor(job.data);
      
      console.log(`✅ Job completed: ${jobId}`);
      
      // Store job result
      await redisService.set(`job_result:${job.id}`, {
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      }, 3600);

    } catch (error) {
      console.error(`❌ Job failed: ${jobId}`, error);
      
      // Handle job failure
      job.attempts = (job.attempts || 0) + 1;
      
      if (job.attempts < (job.maxAttempts || 3)) {
        // Retry job
        await redisService.enqueueJob(jobType, job.data, job.priority || 0);
        console.log(`🔄 Retrying job: ${jobId} (attempt ${job.attempts})`);
      } else {
        // Mark job as failed
        await redisService.set(`job_result:${job.id}`, {
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        }, 3600);
        console.log(`❌ Job permanently failed: ${jobId}`);
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // Register default processors
  registerDefaultProcessors() {
    // Document processing
    this.registerProcessor('document_processing', async (data) => {
      const { documentId, filePath, fileType } = data;
      
      // Update processing status in MongoDB documents
      await mongodbService.updateDocument(documentId, {
        processingStatus: 'processing'
      });

      // Simulate document processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update processing status
      await mongodbService.updateDocument(documentId, {
        processingStatus: 'completed'
      });

      return { documentId, status: 'processed' };
    });

    // AI processing
    this.registerProcessor('ai_processing', async (data) => {
      const { documentId, text, metadata } = data;
      
      // Create document content in MongoDB
      await mongodbService.createDocumentContent({
        documentId,
        text,
        metadata,
        processingStatus: 'processing'
      });

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update processing status
      await mongodbService.updateDocumentContent(documentId, {
        processingStatus: 'completed',
        aiProcessing: {
          extractedAt: new Date(),
          processedBy: 'ai-processor',
          confidence: 0.95
        }
      });

      return { documentId, status: 'ai_processed' };
    });

    // Notification processing
    this.registerProcessor('notification', async (data) => {
      const { userId, type, message, data: notificationData } = data;
      
      // Send notification
      await redisService.publishNotification(userId, {
        type,
        message,
        data: notificationData
      });

      return { userId, type, sent: true };
    });

    // Cleanup processing
    this.registerProcessor('cleanup', async (data) => {
      const { type, olderThan } = data;
      
      let cleanedCount = 0;
      
      if (type === 'sessions') {
        // Cleanup expired sessions
        const sessionStats = await redisService.getSessionStats();
        cleanedCount = sessionStats.expiredSessions;
      } else if (type === 'cache') {
        // Cleanup expired cache entries
        const keys = await redisService.keys('cache:*');
        for (const key of keys) {
          const exists = await redisService.exists(key);
          if (!exists) {
            await redisService.del(key);
            cleanedCount++;
          }
        }
      }

      return { type, cleanedCount };
    });
  }

  // Enqueue job
  async enqueueJob(jobType, data, priority = 0) {
    try {
      const jobId = await redisService.enqueueJob(jobType, data, priority);
      console.log(`📝 Job enqueued: ${jobType}:${jobId}`);
      return jobId;
    } catch (error) {
      console.error(`❌ Failed to enqueue job: ${error.message}`);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId) {
    try {
      return await redisService.get(`job_result:${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const jobTypes = ['document_processing', 'ai_processing', 'notification', 'cleanup'];
      const stats = {};

      for (const jobType of jobTypes) {
        const queueStats = await redisService.getQueueStats(jobType);
        stats[jobType] = queueStats;
      }

      return {
        queues: stats,
        activeJobs: this.activeJobs.size,
        maxConcurrentJobs: this.maxConcurrentJobs,
        isProcessing: this.isProcessing
      };
    } catch (error) {
      console.error(`❌ Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        isProcessing: this.isProcessing,
        activeJobs: this.activeJobs.size,
        maxConcurrentJobs: this.maxConcurrentJobs,
        processors: Array.from(this.processors.keys())
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const jobProcessor = new JobProcessor();

module.exports = jobProcessor;

