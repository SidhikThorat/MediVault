const redisService = require('../services/redisService');
const jwt = require('jsonwebtoken');

class SessionManager {
  constructor() {
    this.sessionConfig = {
      ttl: parseInt(process.env.SESSION_TTL) || 3600, // 1 hour
      refreshThreshold: 300, // 5 minutes before expiry
      maxSessions: 5 // Maximum sessions per user
    };
  }

  // Create session middleware
  createSessionMiddleware() {
    return async (req, res, next) => {
      try {
        // Extract session ID from various sources
        const sessionId = this.extractSessionId(req);
        
        if (!sessionId) {
          req.session = null;
          return next();
        }

        // Get session from Redis
        const session = await redisService.getSession(sessionId);
        
        if (!session) {
          req.session = null;
          return next();
        }

        // Check if session is expired
        if (this.isSessionExpired(session)) {
          await redisService.deleteSession(sessionId);
          req.session = null;
          return next();
        }

        // Update last activity
        await redisService.updateSession(sessionId, {
          lastActivity: new Date().toISOString()
        });

        req.session = session;
        req.user = { id: session.userId };
        
        next();
      } catch (error) {
        console.error('❌ Session middleware error:', error);
        req.session = null;
        next();
      }
    };
  }

  // Extract session ID from request
  extractSessionId(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.sessionId;
      } catch (error) {
        // Token is invalid, continue to other methods
      }
    }

    // Check session cookie
    if (req.cookies && req.cookies.sessionId) {
      return req.cookies.sessionId;
    }

    // Check session header
    if (req.headers['x-session-id']) {
      return req.headers['x-session-id'];
    }

    return null;
  }

  // Check if session is expired
  isSessionExpired(session) {
    const now = new Date();
    const lastActivity = new Date(session.lastActivity);
    const sessionAge = now.getTime() - lastActivity.getTime();
    
    return sessionAge > (this.sessionConfig.ttl * 1000);
  }

  // Create new session
  async createSession(userId, sessionData = {}) {
    try {
      // Check user's current sessions
      const userSessions = await redisService.getUserSessions(userId);
      
      // Remove oldest sessions if limit exceeded
      if (userSessions.length >= this.sessionConfig.maxSessions) {
        const sortedSessions = userSessions.sort((a, b) => 
          new Date(a.lastActivity) - new Date(b.lastActivity)
        );
        
        // Remove oldest sessions
        const sessionsToRemove = sortedSessions.slice(0, userSessions.length - this.sessionConfig.maxSessions + 1);
        for (const session of sessionsToRemove) {
          await redisService.deleteSession(session.sessionId);
        }
      }

      // Create new session
      const sessionId = await redisService.createSession(userId, {
        ...sessionData,
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress
      }, this.sessionConfig.ttl);

      return sessionId;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  // Refresh session
  async refreshSession(sessionId) {
    try {
      const session = await redisService.getSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      if (this.isSessionExpired(session)) {
        await redisService.deleteSession(sessionId);
        throw new Error('Session expired');
      }

      // Update session with new TTL
      await redisService.updateSession(sessionId, {
        lastActivity: new Date().toISOString()
      }, this.sessionConfig.ttl);

      return session;
    } catch (error) {
      throw new Error(`Failed to refresh session: ${error.message}`);
    }
  }

  // Destroy session
  async destroySession(sessionId) {
    try {
      return await redisService.deleteSession(sessionId);
    } catch (error) {
      throw new Error(`Failed to destroy session: ${error.message}`);
    }
  }

  // Destroy all user sessions
  async destroyUserSessions(userId) {
    try {
      const userSessions = await redisService.getUserSessions(userId);
      
      for (const session of userSessions) {
        await redisService.deleteSession(session.sessionId);
      }
      
      return userSessions.length;
    } catch (error) {
      throw new Error(`Failed to destroy user sessions: ${error.message}`);
    }
  }

  // Get user sessions
  async getUserSessions(userId) {
    try {
      return await redisService.getUserSessions(userId);
    } catch (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  // Session validation middleware
  requireSession() {
    return (req, res, next) => {
      if (!req.session) {
        return res.status(401).json({
          success: false,
          error: 'Session required',
          code: 'SESSION_REQUIRED'
        });
      }

      next();
    };
  }

  // Session validation with user check
  requireUser() {
    return (req, res, next) => {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          error: 'User session required',
          code: 'USER_SESSION_REQUIRED'
        });
      }

      next();
    };
  }

  // Admin session validation
  requireAdminSession() {
    return (req, res, next) => {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          error: 'Admin session required',
          code: 'ADMIN_SESSION_REQUIRED'
        });
      }

      // Check if user is admin (this would typically come from database)
      if (req.session.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required',
          code: 'ADMIN_REQUIRED'
        });
      }

      next();
    };
  }

  // Session cleanup (remove expired sessions)
  async cleanupExpiredSessions() {
    try {
      // This would typically be run as a cron job
      const pattern = 'session:*';
      const sessionKeys = await redisService.keys(pattern);
      let cleanedCount = 0;

      for (const key of sessionKeys) {
        const session = await redisService.get(key);
        if (session && this.isSessionExpired(session)) {
          await redisService.deleteSession(session.sessionId);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Session cleanup error:', error);
      throw error;
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      const pattern = 'session:*';
      const sessionKeys = await redisService.keys(pattern);
      const sessions = [];

      for (const key of sessionKeys) {
        const session = await redisService.get(key);
        if (session) {
          sessions.push(session);
        }
      }

      const now = new Date();
      const activeSessions = sessions.filter(session => 
        !this.isSessionExpired(session)
      );

      const stats = {
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        expiredSessions: sessions.length - activeSessions.length,
        timestamp: now.toISOString()
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get session stats: ${error.message}`);
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export middleware functions
module.exports = {
  // Session middleware
  sessionMiddleware: sessionManager.createSessionMiddleware(),
  
  // Session management
  createSession: sessionManager.createSession.bind(sessionManager),
  refreshSession: sessionManager.refreshSession.bind(sessionManager),
  destroySession: sessionManager.destroySession.bind(sessionManager),
  destroyUserSessions: sessionManager.destroyUserSessions.bind(sessionManager),
  getUserSessions: sessionManager.getUserSessions.bind(sessionManager),
  
  // Session validation
  requireSession: sessionManager.requireSession(),
  requireUser: sessionManager.requireUser(),
  requireAdminSession: sessionManager.requireAdminSession(),
  
  // Session utilities
  cleanupExpiredSessions: sessionManager.cleanupExpiredSessions.bind(sessionManager),
  getSessionStats: sessionManager.getSessionStats.bind(sessionManager)
};

