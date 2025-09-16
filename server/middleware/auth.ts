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
    // ABSOLUTE PRIORITY 1: Check for admin token in cookies FIRST (overrides everything)
    if (req.cookies?.adminToken) {
      console.log('🍪 authMiddleware: Found admin token in secure cookie, processing with ABSOLUTE HIGHEST PRIORITY');
      try {
        const jwtPayload = await jwtService.verifyAccessToken(req.cookies.adminToken);
        if (jwtPayload) {
          console.log(`🔑 authMiddleware: Admin JWT token verified for userId: ${jwtPayload.userId}`);
          // Get user data from database
          const user = await storage.getUser(jwtPayload.userId);
          if (!user || !user.isActive) {
            console.error(`❌ authMiddleware: Admin user ${jwtPayload.userId} not found or inactive`);
            // Clear invalid cookie
            res.clearCookie('adminToken', { path: '/', httpOnly: true });
            return res.status(404).json({ 
              message: 'Admin user not found or inactive' 
            });
          }

          // Verify admin role from database
          if (user.role !== 'admin') {
            console.error(`❌ authMiddleware: User ${jwtPayload.userId} has role ${user.role}, but admin JWT cookie requires admin role`);
            // Clear cookie for non-admin user
            res.clearCookie('adminToken', { path: '/', httpOnly: true });
            return res.status(403).json({ 
              message: 'Admin access required' 
            });
          }

          // Attach admin user data to request with GUARANTEED admin role
          req.user = {
            id: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: 'admin', // FORCE admin role from JWT cookie
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
            // Mark as JWT-authenticated admin for downstream middleware
            authMethod: 'admin_jwt_cookie'
          };

          console.log(`✅ authMiddleware: ADMIN USER ${user.id} authenticated via JWT cookie with GUARANTEED admin role`);
          // Update last login timestamp for admin
          try {
            await storage.updateUser(user.id, { lastLoginAt: new Date() });
          } catch (updateError) {
            console.error('Error updating admin last login:', updateError);
            // Don't fail the request if we can't update last login
          }
          return next();
        }
      } catch (adminAuthError) {
        console.error('❌ authMiddleware: Admin cookie token expired/invalid:', adminAuthError);
        // Clear invalid/expired admin cookie and continue to session auth
        res.clearCookie('adminToken', { path: '/', httpOnly: true });
        console.log('🔄 authMiddleware: Cleared expired admin cookie, continuing to session auth...');
        // Don't return here - fall through to session authentication
      }
    }

    // Clear any other potentially expired JWT cookies to prevent blocking
    const commonJwtCookieNames = ['accessToken', 'token', 'userToken', 'authToken'];
    let clearedExpiredCookies = false;
    for (const cookieName of commonJwtCookieNames) {
      if (req.cookies?.[cookieName]) {
        try {
          await jwtService.verifyAccessToken(req.cookies[cookieName]);
        } catch (cookieJwtError) {
          console.log(`🗑️ authMiddleware: Clearing expired JWT cookie: ${cookieName}`);
          res.clearCookie(cookieName, { path: '/' });
          clearedExpiredCookies = true;
        }
      }
    }
    if (clearedExpiredCookies) {
      console.log('🧹 authMiddleware: Cleared expired JWT cookies, continuing to session auth...');
    }

    // PRIORITY 2: Handle Replit session authentication
    if (req.user) {
      // Debug session user object structure
      console.log(`🔍 authMiddleware: Existing user object:`, {
        hasId: !!req.user.id,
        hasClaims: !!req.user.claims,
        claimsSub: req.user.claims?.sub,
        userKeys: Object.keys(req.user)
      });
      
      // If user is authenticated via Replit session but needs normalization
      let userId: string | undefined;
      
      // Extract user ID from Replit session claims
      if (req.user.claims?.sub) {
        userId = req.user.claims.sub;
        console.log(`🔐 authMiddleware: Session auth detected for userId: ${userId}`);
        
        try {
          // Get user data from database to enrich session user object
          const user = await storage.getUser(userId!); // userId is guaranteed to be defined by the if check above
          if (!user || !user.isActive) {
            console.error(`❌ authMiddleware: Session user ${userId} not found or inactive`);
            return res.status(404).json({ 
              message: 'User not found or inactive' 
            });
          }

          // Normalize user object with consistent interface
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
            // Preserve original session claims for compatibility
            claims: req.user.claims
          };

          console.log(`✅ authMiddleware: Session user ${user.id} normalized with role: ${user.role}`);
          return next();
        } catch (error) {
          console.error('❌ authMiddleware: Error enriching session user:', error);
          return res.status(500).json({ 
            message: 'Authentication processing failed' 
          });
        }
      } else if (req.user.id) {
        // User object already has normalized ID (likely from JWT or previous middleware)
        console.log(`✅ authMiddleware: User already authenticated with ID: ${req.user.id}`);
        return next();
      } else {
        // User object exists but missing required identifiers - this should not happen
        // after session auth normalization, but let's be defensive
        console.error('❌ authMiddleware: Invalid user object - missing ID and claims:', {
          hasUser: !!req.user,
          hasId: !!req.user?.id,
          hasClaims: !!req.user?.claims,
          claimsSub: req.user?.claims?.sub
        });
        return res.status(401).json({ 
          message: 'Invalid authentication state' 
        });
      }
    }

    // Development mode: Check for dev-token
    if (process.env.NODE_ENV === 'development') {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer dev-token-')) {
        const tokenPart = authHeader.split('dev-token-')[1];
        const userId = tokenPart?.split('-').slice(0, -1).join('-'); // Extract everything except the timestamp
        if (userId) {
          const user = await storage.getUser(userId);
          if (user) {
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
            console.log(`🔧 Dev auth: User ${user.id} authenticated with role: ${user.role}`);
            return next();
          }
        }
      }
    }

    // PRIORITY 3: Check for JWT token in Authorization header (SMS auth)
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1]?.trim();
      console.log('📱 authMiddleware: Found token in Authorization header');
      
      // Try JWT verification first (for SMS auth users)
      try {
        const jwtPayload = await jwtService.verifyAccessToken(token);
        if (jwtPayload) {
          console.log(`🔑 authMiddleware: JWT token verified for userId: ${jwtPayload.userId}`);
          // Get user data from database
          const user = await storage.getUser(jwtPayload.userId);
          if (!user || !user.isActive) {
            console.error(`❌ authMiddleware: User ${jwtPayload.userId} not found or inactive`);
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

          console.log(`✅ authMiddleware: User ${user.id} authenticated with role: ${user.role}`);

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
        console.log('❌ authMiddleware: JWT token verification failed:', jwtError);
        // Don't return here - continue to try Firebase auth and then session fallback
      }
    }

    // Try Firebase authentication if we have a token
    if (token) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        
        // Get additional user data from Firestore
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
          console.log('❌ authMiddleware: Firebase user not found in Firestore');
          // Don't return error - continue to session fallback
        } else {
          const userData = userDoc.data();
          
          // Check if user is active
          if (userData?.isActive === false) {
            return res.status(403).json({ 
              message: 'Account suspended' 
            });
          }

          // Attach user data to request  
          req.user = {
            id: decodedToken.uid, // Firebase uses uid for user ID
            email: decodedToken.email,
            role: userData?.role || 'user',
            isVerified: userData?.isVerified || false,
            displayName: userData?.displayName,
            photoURL: userData?.photoURL,
            ...userData,
          };

          console.log(`✅ authMiddleware: Firebase user ${decodedToken.uid} authenticated`);

          // Update last active timestamp
          try {
            await db.collection('users').doc(decodedToken.uid).update({
              lastActive: new Date(),
            });
          } catch (updateError) {
            console.error('Error updating Firebase last active:', updateError);
            // Don't fail the request if we can't update last active
          }

          return next();
        }
      } catch (firebaseError: any) {
        console.log('❌ authMiddleware: Firebase authentication failed:', firebaseError.code);
        // Don't return error - continue to session fallback
      }
    }

    // FINAL FALLBACK: No valid authentication found - return 401
    console.log('❌ authMiddleware: No valid authentication method found (no session, no valid JWT, no valid Firebase token)');
    return res.status(401).json({ 
      message: 'Unauthorized - Please login to access this resource' 
    });
  } catch (error) {
    console.error('❌ authMiddleware: Unexpected authentication error:', error);
    return res.status(401).json({ 
      message: 'Authentication processing failed' 
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
      console.error('🚫 requireRole: No user found in request');
      return res.status(401).json({ 
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    console.log(`🔐 requireRole: User ${req.user.id} has role "${userRole}", required: [${roles.join(', ')}]`);

    if (!userRole || !roles.includes(userRole)) {
      console.error(`🚫 requireRole: Access denied for user ${req.user.id}. User role "${userRole}" not in required roles: [${roles.join(', ')}]`);
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}. Current role: ${userRole}` 
      });
    }

    console.log(`✅ requireRole: Access granted for user ${req.user.id} with role "${userRole}"`);
    next();
  };
};

// Composite admin middleware that handles both session and JWT auth with ABSOLUTE JWT priority
export async function adminSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(`🔒 adminSessionMiddleware: Checking admin access`);
  console.log(`🔒 adminSessionMiddleware: req.user present: ${!!req.user}`);
  console.log(`🔒 adminSessionMiddleware: adminToken cookie present: ${!!req.cookies?.adminToken}`);
  
  try {
    let userId: string | undefined;
    let authMethod: string = 'unknown';
    
    // ABSOLUTE PRIORITY 1: Check for admin JWT cookie FIRST (overrides everything)
    if (req.cookies?.adminToken) {
      console.log('🍪 adminSessionMiddleware: Found admin token in cookie, using JWT auth with ABSOLUTE PRIORITY');
      try {
        const jwtPayload = await jwtService.verifyAccessToken(req.cookies.adminToken);
        if (jwtPayload) {
          userId = jwtPayload.userId;
          authMethod = 'admin_jwt_cookie';
          console.log(`🔍 adminSessionMiddleware: Using JWT auth with ABSOLUTE PRIORITY, userId: ${userId}`);
          
          // Get user data from database
          const user = await storage.getUser(userId);
          
          if (!user || !user.isActive) {
            console.error(`❌ adminSessionMiddleware: Admin user ${userId} not found or inactive`);
            res.clearCookie('adminToken', { path: '/', httpOnly: true });
            return res.status(404).json({ message: "Admin user not found or inactive" });
          }

          // Verify admin role from database
          if (user.role !== 'admin') {
            console.error(`❌ adminSessionMiddleware: User ${userId} has role ${user.role}, but admin JWT cookie requires admin role`);
            res.clearCookie('adminToken', { path: '/', httpOnly: true });
            return res.status(403).json({ message: "Access denied. Admin role required" });
          }

          // Set normalized admin user object with GUARANTEED admin role
          req.user = {
            id: user.id,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: 'admin', // FORCE admin role from JWT cookie
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
            authMethod: 'admin_jwt_cookie'
          };
          
          console.log(`✅ adminSessionMiddleware: ADMIN USER ${user.id} authorized via JWT cookie with GUARANTEED admin role`);
          // Update last login timestamp
          try {
            await storage.updateUser(user.id, { lastLoginAt: new Date() });
          } catch (updateError) {
            console.error('Error updating admin last login:', updateError);
          }
          return next();
        }
      } catch (jwtError) {
        console.error('❌ adminSessionMiddleware: Admin JWT token invalid:', jwtError);
        res.clearCookie('adminToken', { path: '/', httpOnly: true });
        return res.status(401).json({ message: "Invalid admin token - please login again" });
      }
    }
    
    // PRIORITY 2: Check if authMiddleware already handled admin JWT authentication
    if (req.user?.authMethod === 'admin_jwt_cookie' && req.user?.role === 'admin') {
      console.log(`✅ adminSessionMiddleware: Admin ${req.user.id} already authenticated via authMiddleware with JWT cookie`);
      return next();
    }
    
    // PRIORITY 3: Fall back to session/existing user auth if no JWT
    if (req.user?.claims?.sub) {
      // Replit Auth session
      userId = req.user.claims.sub;
      authMethod = 'replit_session';
      console.log(`🔍 adminSessionMiddleware: Using session auth, userId: ${userId}`);
    } else if (req.user?.id) {
      // JWT Auth from authMiddleware (non-admin JWT)
      userId = req.user.id;
      authMethod = 'existing_auth';
      console.log(`🔍 adminSessionMiddleware: Using existing auth, userId: ${userId}`);
    } else {
      console.log('🚫 adminSessionMiddleware: No authenticated user');
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(`🔍 adminSessionMiddleware: Fetching user data for ${userId} (auth method: ${authMethod})`);
    // Get user from database to check current role
    const user = await storage.getUser(userId!); // userId is guaranteed to be defined by the checks above
    
    if (!user || !user.isActive) {
      console.log(`🚫 adminSessionMiddleware: User ${userId} not found or inactive in database`);
      return res.status(401).json({ message: "User not found or inactive" });
    }

    if (user.role !== 'admin') {
      console.log(`🚫 adminSessionMiddleware: User ${userId} has role ${user.role}, admin required`);
      return res.status(403).json({ message: "Access denied. Admin role required" });
    }

    // Set normalized user object in request for consistency
    req.user = {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role, // Use role from database
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
      authMethod: authMethod,
      // Keep session claims for compatibility
      claims: req.user?.claims
    };
    
    console.log(`✅ adminSessionMiddleware: Admin ${user.id} authorized via ${authMethod}`);
    next();
  } catch (error) {
    console.error('❌ adminSessionMiddleware error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

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

    const userLimit = userRequests.get(userId!);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId!, {
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
