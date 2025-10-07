const redisService = require('../services/redisService');

class RateLimiter {
  constructor() {
    this.defaultLimits = {
      // API endpoints
      'auth': { limit: 5, window: 300 }, // 5 requests per 5 minutes
      'upload': { limit: 10, window: 3600 }, // 10 requests per hour
      'download': { limit: 50, window: 3600 }, // 50 requests per hour
      'chat': { limit: 100, window: 3600 }, // 100 requests per hour
      'admin': { limit: 1000, window: 3600 }, // 1000 requests per hour
      
      // General API
      'api': { limit: 100, window: 900 }, // 100 requests per 15 minutes
      
      // IP-based limits
      'ip': { limit: 1000, window: 3600 }, // 1000 requests per hour per IP
    };
  }

  // Create rate limiter middleware
  createLimiter(limitType = 'api', customLimits = null) {
    return async (req, res, next) => {
      try {
        const limits = customLimits || this.defaultLimits[limitType];
        if (!limits) {
          return next();
        }

        // Get identifier (user ID or IP)
        const identifier = this.getIdentifier(req, limitType);
        
        // Check rate limit
        const rateLimitResult = await redisService.checkRateLimit(
          identifier,
          limits.limit,
          limits.window
        );

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limits.limit,
          'X-RateLimit-Remaining': rateLimitResult.remaining,
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        });

        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('❌ Rate limiter error:', error);
        // Allow request to proceed if rate limiter fails
        next();
      }
    };
  }

  // Get identifier for rate limiting
  getIdentifier(req, limitType) {
    // For user-specific limits, use user ID
    if (req.user && req.user.id) {
      return `user:${req.user.id}:${limitType}`;
    }
    
    // For IP-based limits, use IP address
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return `ip:${ip}:${limitType}`;
  }

  // Custom rate limiter for specific endpoints
  createCustomLimiter(limit, window, identifierFn = null) {
    return async (req, res, next) => {
      try {
        const identifier = identifierFn ? identifierFn(req) : this.getIdentifier(req, 'custom');
        
        const rateLimitResult = await redisService.checkRateLimit(
          identifier,
          limit,
          window
        );

        res.set({
          'X-RateLimit-Limit': limit,
          'X-RateLimit-Remaining': rateLimitResult.remaining,
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        });

        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('❌ Custom rate limiter error:', error);
        next();
      }
    };
  }

  // Burst rate limiter (for sudden spikes)
  createBurstLimiter(baseLimit, burstLimit, window) {
    return async (req, res, next) => {
      try {
        const identifier = this.getIdentifier(req, 'burst');
        
        // Check base rate limit
        const baseResult = await redisService.checkRateLimit(
          identifier,
          baseLimit,
          window
        );

        // Check burst rate limit
        const burstResult = await redisService.checkRateLimit(
          `${identifier}:burst`,
          burstLimit,
          60 // 1 minute window for burst
        );

        const allowed = baseResult.allowed && burstResult.allowed;
        const remaining = Math.min(baseResult.remaining, burstResult.remaining);

        res.set({
          'X-RateLimit-Limit': baseLimit,
          'X-RateLimit-Remaining': remaining,
          'X-RateLimit-Burst': burstLimit,
          'X-RateLimit-Reset': new Date(baseResult.resetTime).toISOString()
        });

        if (!allowed) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded (base or burst)',
            retryAfter: Math.ceil((baseResult.resetTime - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('❌ Burst rate limiter error:', error);
        next();
      }
    };
  }

  // Sliding window rate limiter
  createSlidingWindowLimiter(limit, window) {
    return async (req, res, next) => {
      try {
        const identifier = this.getIdentifier(req, 'sliding');
        const now = Date.now();
        const windowStart = now - (window * 1000);
        
        // Get current requests in window
        const requests = await redisService.get(`${identifier}:requests`) || [];
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        
        if (validRequests.length >= limit) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded (sliding window)',
            retryAfter: Math.ceil((validRequests[0] + window * 1000 - now) / 1000)
          });
        }

        // Add current request
        validRequests.push(now);
        await redisService.set(`${identifier}:requests`, validRequests, window);

        res.set({
          'X-RateLimit-Limit': limit,
          'X-RateLimit-Remaining': limit - validRequests.length,
          'X-RateLimit-Reset': new Date(now + window * 1000).toISOString()
        });

        next();
      } catch (error) {
        console.error('❌ Sliding window rate limiter error:', error);
        next();
      }
    };
  }

  // Reset rate limit for specific identifier
  async resetRateLimit(identifier, limitType = 'api') {
    try {
      const fullIdentifier = `${identifier}:${limitType}`;
      return await redisService.resetRateLimit(fullIdentifier);
    } catch (error) {
      console.error('❌ Failed to reset rate limit:', error);
      throw error;
    }
  }

  // Get rate limit status
  async getRateLimitStatus(identifier, limitType = 'api') {
    try {
      const fullIdentifier = `${identifier}:${limitType}`;
      const limits = this.defaultLimits[limitType];
      
      if (!limits) {
        return null;
      }

      const current = await redisService.get(`rate_limit:${fullIdentifier}`);
      const remaining = Math.max(0, limits.limit - (current || 0));
      
      return {
        limit: limits.limit,
        remaining,
        resetTime: Date.now() + limits.window * 1000
      };
    } catch (error) {
      console.error('❌ Failed to get rate limit status:', error);
      return null;
    }
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Export middleware functions
module.exports = {
  // Standard rate limiters
  authLimiter: rateLimiter.createLimiter('auth'),
  uploadLimiter: rateLimiter.createLimiter('upload'),
  downloadLimiter: rateLimiter.createLimiter('download'),
  chatLimiter: rateLimiter.createLimiter('chat'),
  adminLimiter: rateLimiter.createLimiter('admin'),
  apiLimiter: rateLimiter.createLimiter('api'),
  ipLimiter: rateLimiter.createLimiter('ip'),
  
  // Custom rate limiters
  createCustomLimiter: rateLimiter.createCustomLimiter.bind(rateLimiter),
  createBurstLimiter: rateLimiter.createBurstLimiter.bind(rateLimiter),
  createSlidingWindowLimiter: rateLimiter.createSlidingWindowLimiter.bind(rateLimiter),
  
  // Utility functions
  resetRateLimit: rateLimiter.resetRateLimit.bind(rateLimiter),
  getRateLimitStatus: rateLimiter.getRateLimitStatus.bind(rateLimiter)
};
