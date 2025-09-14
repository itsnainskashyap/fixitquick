import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../services/firebase';
import { jwtService } from '../utils/jwt';
import { storage } from '../storage';

// Define AuthUser type to match database schema
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
  [key: string]: any;
}

// Extend Express Request type to include AuthUser
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface AuthMiddlewareOptions {
  optional?: boolean;
  requiredRole?: string | string[];
  requireVerified?: boolean;
}

// Enhanced authentication middleware supporting both JWT and Firebase tokens
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Early exit if user is already authenticated via Replit session
    if (req.user) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Unauthorized - No valid authorization header' 
      });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Unauthorized - No token provided' 
      });
    }

    // Try JWT verification first (for SMS auth users)
    try {
      const jwtPayload = await jwtService.verifyAccessToken(token);
      if (jwtPayload) {
        // Get user data from database
        const user = await storage.getUser(jwtPayload.userId);
        if (!user || !user.isActive) {
          return res.status(404).json({ 
            message: 'User not found or inactive' 
          });
        }

        // Attach user data to request in compatible format
        req.user = {
          id: user.id,
          email: user.email || undefined,
          phone: user.phone || undefined,
          role: user.role || 'user',
          isVerified: user.isVerified || false,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          walletBalance: user.walletBalance,
          fixiPoints: user.fixiPoints,
          location: user.location,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        // Update last active timestamp
        try {
          await storage.updateUser(user.id, { lastLoginAt: new Date() });
        } catch (updateError) {
          console.error('Error updating last login:', updateError);
          // Don't fail the request if we can't update last login
        }

        return next();
      }
    } catch (jwtError) {
      console.log('JWT verification failed, trying Firebase auth...');
    }

    // Fallback to Firebase authentication for existing users
    try {
      const decodedToken = await auth.verifyIdToken(token);
      
      // Get additional user data from Firestore
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      const userData = userDoc.data();
      
      // Check if user is active
      if (userData?.isActive === false) {
        return res.status(403).json({ 
          message: 'Account suspended' 
        });
      }

      // Attach user data to request
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: userData?.role || 'user',
        isVerified: userData?.isVerified || false,
        displayName: userData?.displayName,
        photoURL: userData?.photoURL,
        ...userData,
      };

      // Update last active timestamp
      try {
        await db.collection('users').doc(decodedToken.uid).update({
          lastActive: new Date(),
        });
      } catch (updateError) {
        console.error('Error updating last active:', updateError);
        // Don't fail the request if we can't update last active
      }

      next();
    } catch (firebaseError: any) {
      console.error('Firebase authentication failed:', firebaseError);
      
      if (firebaseError?.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          message: 'Token expired - Please login again' 
        });
      }
      
      if (firebaseError?.code === 'auth/id-token-revoked') {
        return res.status(401).json({ 
          message: 'Token revoked - Please login again' 
        });
      }
      
      if (firebaseError?.code === 'auth/invalid-id-token') {
        return res.status(401).json({ 
          message: 'Invalid token' 
        });
      }

      return res.status(401).json({ 
        message: 'Authentication failed' 
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      message: 'Authentication failed' 
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user data
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return next(); // Continue without user data
    }

    // Try JWT verification first
    try {
      const jwtPayload = await jwtService.verifyAccessToken(token);
      if (jwtPayload) {
        const user = await storage.getUser(jwtPayload.userId);
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role || 'user',
            isVerified: user.isVerified || false,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            walletBalance: user.walletBalance,
            fixiPoints: user.fixiPoints,
            location: user.location,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };
        }
        return next();
      }
    } catch (jwtError) {
      // Continue to Firebase auth fallback
    }

    // Fallback to Firebase authentication
    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: userData?.role || 'user',
        isVerified: userData?.isVerified || false,
        ...userData,
      };
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without user data if authentication fails
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

// Verified user middleware
export const requireVerified = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ 
      message: 'Account verification required' 
    });
  }

  next();
};

// Admin only middleware
export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Admin access required' 
    });
  }

  next();
};

// Service provider middleware
export const serviceProviderOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'service_provider') {
    return res.status(403).json({ 
      message: 'Service provider access required' 
    });
  }

  next();
};

// Parts provider middleware
export const partsProviderOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'parts_provider') {
    return res.status(403).json({ 
      message: 'Parts provider access required' 
    });
  }

  next();
};

// Rate limiting by user
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();

    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    next();
  };
};

// API key validation middleware (for external integrations)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error('API_KEY environment variable not set');
    return res.status(500).json({ 
      message: 'Server configuration error' 
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ 
      message: 'Invalid API key' 
    });
  }

  next();
};

// Webhook signature verification middleware
export const verifyWebhookSignature = (secretKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-signature'] as string;
    
    if (!signature) {
      return res.status(401).json({ 
        message: 'Missing signature' 
      });
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ 
        message: 'Invalid signature' 
      });
    }

    next();
  };
};

// CORS middleware for specific origins
export const corsForOrigins = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
};

// Request logging middleware
export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  const userId = req.user?.id || 'anonymous';
  const userRole = req.user?.role || 'none';

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - User: ${userId} (${userRole}) - IP: ${req.ip}`
    );
  });

  next();
};

// Error handling middleware for auth-related errors
export const authErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.code && error.code.startsWith('auth/')) {
    const authErrors: Record<string, { status: number; message: string }> = {
      'auth/id-token-expired': { status: 401, message: 'Token expired' },
      'auth/id-token-revoked': { status: 401, message: 'Token revoked' },
      'auth/invalid-id-token': { status: 401, message: 'Invalid token' },
      'auth/user-not-found': { status: 404, message: 'User not found' },
      'auth/user-disabled': { status: 403, message: 'User account disabled' },
    };

    const errorInfo = authErrors[error.code] || { status: 401, message: 'Authentication error' };
    
    return res.status(errorInfo.status).json({
      message: errorInfo.message,
      code: error.code,
    });
  }

  next(error);
};

// Session management utilities
export const createUserSession = async (userId: string, deviceInfo?: any) => {
  try {
    const sessionData = {
      userId,
      deviceInfo: deviceInfo || {},
      createdAt: new Date(),
      lastAccessed: new Date(),
      isActive: true,
    };

    const sessionRef = await db.collection('userSessions').add(sessionData);
    return sessionRef.id;
  } catch (error) {
    console.error('Error creating user session:', error);
    throw new Error('Failed to create session');
  }
};

export const invalidateUserSessions = async (userId: string) => {
  try {
    const sessionsSnapshot = await db.collection('userSessions')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const batch = db.batch();
    
    sessionsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        isActive: false, 
        invalidatedAt: new Date() 
      });
    });

    await batch.commit();
    console.log(`Invalidated ${sessionsSnapshot.size} sessions for user:`, userId);
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    throw new Error('Failed to invalidate sessions');
  }
};

// Export types for TypeScript support
export type { AuthenticatedRequest };
