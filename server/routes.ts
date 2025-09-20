import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { authMiddleware, optionalAuth, requireRole, adminSessionMiddleware, type AuthenticatedRequest } from "./middleware/auth";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/ai";
import { openRouterService } from "./services/openrouter";
import { onionPayService } from "./services/onionpay";
import { paymentService } from "./services/payments";
import { notificationService } from "./services/notifications";
import WebSocketManager from "./services/websocket";

// Initialize WebSocket manager instance
let webSocketManager: WebSocketManager | null = null;

// Function to initialize WebSocket manager
function initializeWebSocket(server: Server) {
  console.log('🔌 Initializing WebSocket manager with HTTP server...');
  webSocketManager = new WebSocketManager(server);
  console.log('✅ WebSocket manager initialized successfully');
  return webSocketManager;
}

// Export function to get WebSocket manager instance
export function getWebSocketManager(): WebSocketManager | null {
  return webSocketManager;
}

import {
  insertUserSchema,
  insertOrderSchema,
  orderCreateApiSchema,
  type OrderCreateApiData,
  insertPartSchema,
  insertUserAddressSchema,
  insertUserNotificationPreferencesSchema,
  insertServiceBookingSchema,
  insertProviderJobRequestSchema,
  providerJobRequests,
  supportTicketCreateSchema,
  supportTicketUpdateSchema,
  supportTicketMessageCreateSchema,
  supportCallbackRequestCreateSchema,
  supportCallbackRequestUpdateSchema,
  faqCreateSchema,
  faqUpdateSchema,
  supportAgentCreateSchema,
  supportAgentUpdateSchema,
  supportTicketRatingSchema,
  insertCouponSchema,
  insertCouponUsageSchema,
  // Service category schemas
  insertServiceCategorySchema,
  apiCreateServiceCategorySchema,
  apiUpdateServiceCategorySchema,
  insertServiceSchema,
  // Tax management schemas
  insertTaxCategorySchema,
  insertTaxSchema,
  taxes,
  taxCategories,
  // Promotional media schemas
  insertPromotionalMediaSchema,
  insertPromotionalMediaAnalyticsSchema,
  promotionalMedia,
  promotionalMediaAnalytics,
  // Verification schemas
  insertVerificationStatusTransitionSchema,
  insertPartsProviderQualityMetricsSchema,
  insertProviderResubmissionSchema,
  insertVerificationNotificationPreferencesSchema,
  // Service request schemas
  insertServiceRequestSchema,
  // SECURITY: Order lifecycle validation schemas
  orderAcceptanceSchema,
  orderDeclineSchema,
  orderStatusUpdateSchema,
  orderLocationUpdateSchema,
  orderChatMessageSchema,
  insertOrderRatingSchema
} from "@shared/schema";
import { twilioService } from "./services/twilio";
import { jwtService } from "./utils/jwt";

// Helper function to transform service data for frontend compatibility
function transformServiceForFrontend(service: any) {
  return {
    ...service,
    price: parseFloat(service.basePrice || service.base_price || '0'),
    rating: parseFloat(service.rating || '0'),
    totalBookings: service.totalBookings || service.total_bookings || 0,
    estimatedDuration: service.estimatedDuration || service.estimated_duration,
    iconType: service.iconType || service.icon_type,
    iconValue: service.iconValue || service.icon_value
  };
}

// Helper function to transform array of services
function transformServicesForFrontend(services: any[]) {
  return services.map(transformServiceForFrontend);
}

import multer from "multer";
import { validateUpload, getUploadConfig } from "./middleware/fileUpload";
import { objectStorageService, getStoredFile } from "./services/objectStorage";
import { 
  handleMultipleImageUpload,
  handleAvatarUpload,
  handleProductImageUpload,
  handleProviderDocumentUpload,
  handleCategoryImageUpload,
  handleServiceIconUpload,
  getImageDetails,
  updateImageMetadata,
  deleteImage
} from "./middleware/uploadHandlers";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Upload-specific rate limiters
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute per IP
  message: 'Too many upload requests. Please wait before uploading again.',
  standardHeaders: true,
  legacyHeaders: false,
});

const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 avatar uploads per 15 minutes
  message: 'Too many avatar upload attempts. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific rate limiters for OTP endpoints - CRITICAL FOR WORKING OTP
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute per IP (tightened for security)
  message: 'Too many OTP requests. Please wait before requesting again.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for easier testing
    return process.env.NODE_ENV === 'development' && process.env.SKIP_OTP_RATE_LIMIT === 'true';
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 verify attempts per 15 minutes per IP (allows for typos)
  message: 'Too many verification attempts. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for easier testing
    return process.env.NODE_ENV === 'development' && process.env.SKIP_OTP_RATE_LIMIT === 'true';
  },
});

// Payment-specific rate limiters for security
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 payment attempts per hour per IP
  message: 'Too many payment attempts. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentMethodLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment method operations per 15 minutes
  message: 'Too many payment method operations. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 wallet operations per 15 minutes
  message: 'Too many wallet operations. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login rate limiter for security
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 admin login attempts per 15 minutes per IP
  message: 'Too many admin login attempts. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

// Validation schemas for API routes
const loginSchema = z.object({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

// Authentication validation schemas - CRITICAL FOR WORKING OTP
const otpRequestSchema = z.object({
  phone: z.string()
    .min(8, 'Phone number must be at least 8 digits')
    .max(16, 'Phone number cannot exceed 16 characters')
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international format: +[country code][number]')
    .refine((phone) => {
      // Additional validation using Twilio service
      return twilioService.isValidPhoneNumber(phone);
    }, 'Invalid phone number format'),
});

const otpVerifySchema = z.object({
  phone: z.string()
    .min(8, 'Phone number must be at least 8 digits')
    .max(16, 'Phone number cannot exceed 16 characters')
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international format: +[country code][number]')
    .refine((phone) => {
      // Additional validation using Twilio service
      return twilioService.isValidPhoneNumber(phone);
    }, 'Invalid phone number format'),
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

// Admin login validation schema
const adminLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').max(100, 'Email cannot exceed 100 characters'),
  password: z.string().min(1, 'Password is required'),
});

// Basic validation middleware
function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      console.error('Validation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
      });
    }
  };
}

// EMERGENCY FIX: Create minimal routes that only use existing storage methods
export function registerRoutes(app: Express): Server {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://fixitquick.replit.app'
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Apply general rate limiting
  app.use('/api', limiter);

  // ============================
  // WORKING OTP ENDPOINTS - PRESERVE THESE!
  // ============================

  // POST /api/v1/auth/otp/request - Send OTP with rate limiting
  app.post('/api/v1/auth/otp/request', otpRequestLimiter, validateBody(otpRequestSchema), async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');

      console.log('📱 OTP Request received:', {
        phone,
        phoneLength: phone?.length,
        phoneType: typeof phone,
        ip,
        userAgent: userAgent?.substring(0, 50)
      });

      const result = await twilioService.sendOTP(phone, ip, userAgent);
      
      if (!result.success) {
        // Enhanced error handling with development hints
        let statusCode = 400;
        let enhancedMessage = result.message;
        
        if (result.message?.includes('rate limit') || result.message?.includes('too many')) {
          statusCode = 429;
        } else if (result.message?.includes('invalid') || result.message?.includes('format')) {
          statusCode = 400;
        } else if (result.message?.includes('service') || result.message?.includes('unavailable')) {
          statusCode = 503;
        }
        
        // Add development hints for common issues
        if (process.env.NODE_ENV === 'development') {
          if (result.message?.includes('Account SID')) {
            enhancedMessage += ' (Check TWILIO_ACCOUNT_SID environment variable)';
          } else if (result.message?.includes('Auth Token')) {
            enhancedMessage += ' (Check TWILIO_AUTH_TOKEN environment variable)';
          } else if (result.message?.includes('Service SID')) {
            enhancedMessage += ' (Check TWILIO_VERIFY_SERVICE_SID environment variable)';
          }
        }
        
        return res.status(statusCode).json({
          success: false,
          message: enhancedMessage,
          // code: result.code,
        });
      }

      console.log('✅ OTP sent successfully');
      res.json({
        success: true,
        message: 'Verification code sent successfully',
      });
    } catch (error) {
      console.error('❌ OTP request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
    }
  });

  // POST /api/v1/auth/otp/verify - Verify OTP + set httpOnly cookie
  app.post('/api/v1/auth/otp/verify', otpVerifyLimiter, validateBody(otpVerifySchema), async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');

      console.log('🔐 OTP Verification attempt:', {
        phone,
        code: code?.length ? `${code.length} digits` : 'missing',
        ip,
        userAgent: userAgent?.substring(0, 50)
      });

      // Verify OTP
      const verifyResult = await twilioService.verifyOTP(phone, code, ip);
      
      console.log('🔐 OTP Verification result:', {
        success: verifyResult.success,
        message: verifyResult.message,
        isExpired: verifyResult.isExpired,
        isLocked: verifyResult.isLocked
      });

      if (!verifyResult.success) {
        let statusCode = 400;
        let enhancedMessage = verifyResult.message || 'Invalid verification code';
        
        if (verifyResult.isExpired) {
          statusCode = 410; // Gone - code expired
        } else if (verifyResult.isLocked || verifyResult.message?.includes('rate limit')) {
          statusCode = 429; // Too Many Requests
        } else if (verifyResult.message?.includes('invalid') || verifyResult.message?.includes('incorrect')) {
          statusCode = 400; // Bad Request
        } else if (verifyResult.message?.includes('service') || verifyResult.message?.includes('unavailable')) {
          statusCode = 503; // Service Unavailable
        }
        
        return res.status(statusCode).json({
          success: false,
          message: enhancedMessage,
          isExpired: verifyResult.isExpired,
          isLocked: verifyResult.isLocked,
        });
      }

      // OTP verified successfully - get or create user
      let user = await storage.getUserByPhone(phone);
      
      if (!user) {
        console.log('👤 Creating new user for phone:', phone);
        user = await storage.createUser({
          phone,
          firstName: '',
          lastName: '',
          email: null,
          profileImageUrl: null,
          role: 'user',
          isActive: true,
          // preferences: {},
          // addresses: [],
        });
        console.log('✅ New user created:', user.id);
      } else {
        console.log('👤 Existing user found:', user.id);
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = await jwtService.generateTokenPair(
        user.id,
        user.phone || '', 
        user.role || 'user'
      );

      // Generate hash for refresh token storage
      const crypto = await import('crypto');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Store refresh token in database
      await storage.createUserSession({
        sessionId: `session_${Date.now()}_${Math.random()}`,
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ip: ip || 'unknown',
        userAgent: userAgent || 'unknown',
      });

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      console.log('✅ OTP verification successful, user logged in');
      res.json({
        success: true,
        message: 'Phone number verified successfully',
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImageUrl,
          role: user.role,
          isActive: user.isActive,
        },
        accessToken,
      });

    } catch (error) {
      console.error('❌ OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.',
      });
    }
  });

  // ============================
  // BASIC WORKING ENDPOINTS - ONLY USING EXISTING STORAGE METHODS
  // ============================

  // User profile endpoint - uses existing getUserByPhone
  app.get('/api/v1/user/profile', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImageUrl,
          role: user.role,
          isActive: user.isActive,
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Services endpoint - uses existing getServices
  app.get('/api/v1/services', async (req, res) => {
    try {
      const services = await storage.getServices();
      const transformedServices = transformServicesForFrontend(services);
      res.json({ success: true, services: transformedServices });
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  });

  // Service details endpoint - uses existing getService
  app.get('/api/v1/services/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      const transformedService = transformServiceForFrontend(service);
      res.json({ success: true, service: transformedService });
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ message: 'Failed to fetch service' });
    }
  });

  // Main categories endpoint - uses existing getMainCategories
  app.get('/api/v1/categories', async (req, res) => {
    try {
      const categories = await storage.getMainCategories(true); // Only active categories
      res.json({ success: true, categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // Subcategories endpoint - uses existing getSubCategories
  app.get('/api/v1/categories/:parentId/subcategories', async (req, res) => {
    try {
      const { parentId } = req.params;
      const subcategories = await storage.getSubCategories(parentId, true); // Only active subcategories
      res.json({ success: true, subcategories });
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  // ============================
  // CORE FRONTEND API ENDPOINTS
  // ============================

  // Temporary debugging endpoint to check session state
  app.get('/api/debug/session', (req: Request, res: Response) => {
    const sessionExists = !!req.session;
    const userInReq = !!(req as any).user;
    const userData = (req as any).user || {};
    const isAuthenticated = req.isAuthenticated?.() || false;
    
    res.json({
      sessionExists,
      userInReq,
      isAuthenticated,
      hasAuthHeader: !!req.headers.authorization,
      userKeys: Object.keys(userData),
      sessionId: req.sessionID,
      userClaims: userData.claims ? {
        sub: userData.claims.sub,
        email: userData.claims.email
      } : null
    });
  });

  // /api/auth/user - Get current authenticated user
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      let user = null;

      // PRIORITY 1: Check for Replit OAuth session (via passport)
      const sessionExists = !!req.session;
      const userInReq = !!(req as any).user;
      const userData = (req as any).user || {};
      const isAuthenticated = req.isAuthenticated?.() || false;
      
      // Return debugging info if no authentication is found for troubleshooting
      if (!userInReq && !req.headers.authorization) {
        return res.status(401).json({
          message: "No authentication found",
          debug: {
            sessionExists,
            userInReq,
            isAuthenticated,
            hasAuthHeader: !!req.headers.authorization,
            userKeys: Object.keys(userData),
            sessionId: req.sessionID
          }
        });
      }
      
      if ((req as any).user) {
        const userId = (req as any).user.id || (req as any).user.claims?.sub;
        if (userId) {
          user = await storage.getUser(userId);
          
          if (user && user.isActive) {
            return res.json({
              success: true,
              data: {
                id: user.id,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImageUrl: user.profileImageUrl,
                role: user.role,
                isActive: user.isActive,
              }
            });
          } else {
            return res.status(401).json({
              message: "User not found in database or inactive",
              debug: { userId, userExists: !!user, isActive: user?.isActive }
            });
          }
        }
      }

      // PRIORITY 2: Check for JWT token in Authorization header (phone login)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = await jwtService.verifyAccessToken(token);
        
        if (decoded) {
          user = await storage.getUser(decoded.userId);
          if (user && user.isActive) {
            console.log(`✅ /api/auth/user: JWT user ${decoded.userId} authenticated successfully`);
            return res.json({
              success: true,
              data: {
                id: user.id,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImageUrl: user.profileImageUrl,
                role: user.role,
                isActive: user.isActive,
              }
            });
          }
        }
      }

      // No valid authentication found
      console.log('ℹ️ /api/auth/user: No valid authentication found');
      return res.status(401).json({ 
        message: '[REDACTED: Authentication/Payment Response - Use dev tools to inspect in dev mode]'
      });

    } catch (error) {
      console.error('❌ /api/auth/user error:', error);
      res.status(401).json({ 
        message: '[REDACTED: Authentication/Payment Response - Use dev tools to inspect in dev mode]'
      });
    }
  });

  // /api/v1/services/categories/main - Get main service categories
  app.get('/api/v1/services/categories/main', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getMainCategories(true); // Only active categories
      res.json({ 
        success: true, 
        data: categories
      });
    } catch (error) {
      console.error('❌ /api/v1/services/categories/main error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch categories'
      });
    }
  });

  // /api/v1/wallet/balance - Get user wallet balance
  app.get('/api/v1/wallet/balance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // For now, return mock wallet data since wallet functionality is not implemented
      res.json({
        success: true,
        data: {
          balance: 0,
          fixiPoints: 0
        }
      });
    } catch (error) {
      console.error('❌ /api/v1/wallet/balance error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Failed to fetch wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch wallet balance'
      });
    }
  });

  // /api/login - Remove conflicting fallback, let replitAuth.ts handle it

  // ============================
  // 501 NOT IMPLEMENTED RESPONSES FOR OTHER ENDPOINTS
  // ============================

  // Orders - EMERGENCY FIX for getOrdersByUser runtime error
  app.get('/api/v1/orders', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Orders endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.get('/api/v1/orders/recent', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Recent orders endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.get('/api/v1/orders/:id', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Order details endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Support endpoints - getSupportTicket not implemented
  app.get('/api/v1/support/tickets', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Support tickets endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.post('/api/v1/support/tickets', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Create support ticket endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // User addresses - getUserAddresses not implemented 
  app.get('/api/v1/user/addresses', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'User addresses endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.post('/api/v1/user/addresses', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Create address endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Notifications preferences - getUserNotificationPreferences not implemented
  app.get('/api/v1/user/notification-preferences', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Notification preferences endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // AI search endpoints - trackSearchQuery, getPersonalizedSuggestions not implemented
  app.post('/api/v1/search', async (req, res) => {
    res.status(501).json({ 
      message: 'Search endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.get('/api/v1/suggestions', async (req, res) => {
    res.status(501).json({ 
      message: 'Suggestions endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Chat endpoints - createChatMessage not implemented
  app.post('/api/v1/chat', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Chat endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Payment endpoints
  app.get('/api/v1/payment-methods', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Payment methods endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.post('/api/v1/payment-methods', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Add payment method endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Parts endpoints 
  app.get('/api/v1/parts', async (req, res) => {
    res.status(501).json({ 
      message: 'Parts endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  app.get('/api/v1/parts/:id', async (req, res) => {
    res.status(501).json({ 
      message: 'Part details endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Admin endpoints
  app.post('/api/v1/admin/login', adminLoginLimiter, validateBody(adminLoginSchema), async (req, res) => {
    res.status(501).json({ 
      message: 'Admin login temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Provider endpoints
  app.get('/api/v1/providers', async (req, res) => {
    res.status(501).json({ 
      message: 'Providers endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // Booking endpoints
  app.post('/api/v1/bookings', authMiddleware, async (req, res) => {
    res.status(501).json({ 
      message: 'Booking endpoint temporarily unavailable',
      error: 'Feature under maintenance' 
    });
  });

  // ========================================
  // VERIFICATION WORKFLOW ENDPOINTS
  // ========================================
  
  // Service Provider Verification Endpoints
  app.get('/api/v1/verification/service-providers', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      const providers = await storage.getServiceProvidersForVerification(
        status as any, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json({ success: true, providers });
    } catch (error) {
      console.error('Error fetching service providers for verification:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch providers' });
    }
  });
  
  app.get('/api/v1/verification/service-providers/:userId', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const provider = await storage.getServiceProviderForVerification(userId);
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }
      res.json({ success: true, provider });
    } catch (error) {
      console.error('Error fetching service provider:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch provider' });
    }
  });
  
  app.patch('/api/v1/verification/service-providers/:userId/status', 
    authMiddleware, 
    requireRole(['admin']), 
    validateBody(z.object({
      status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'suspended', 'resubmission_required']),
      reason: z.string().optional(),
      notes: z.string().optional(),
      documentsReviewed: z.array(z.object({
        documentType: z.string(),
        status: z.enum(['approved', 'rejected']),
        notes: z.string().optional()
      })).optional()
    })), 
    async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, reason, notes, documentsReviewed } = req.body;
      const adminId = (req as AuthenticatedRequest).user.id;
      
      // Update provider status
      const provider = await storage.updateServiceProviderVerificationStatus(
        userId, status, adminId, reason, notes
      );
      
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }
      
      // Create status transition record
      await storage.createVerificationStatusTransition({
        providerId: userId,
        providerType: 'service_provider',
        fromStatus: provider.verificationStatus,
        toStatus: status,
        changedBy: adminId,
        reason,
        adminNotes: notes,
        documentsReviewed,
        notificationSent: false,
        notificationMethod: 'email'
      });
      
      res.json({ success: true, provider, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating service provider status:', error);
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  });
  
  // Parts Provider Verification Endpoints
  app.get('/api/v1/verification/parts-providers', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      const providers = await storage.getPartsProvidersForVerification(
        status as string, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      res.json({ success: true, providers });
    } catch (error) {
      console.error('Error fetching parts providers for verification:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch providers' });
    }
  });
  
  app.patch('/api/v1/verification/parts-providers/:userId/status', 
    authMiddleware, 
    requireRole(['admin']), 
    validateBody(z.object({
      status: z.enum(['pending', 'documents_submitted', 'under_review', 'approved', 'rejected']),
      reason: z.string().optional(),
      notes: z.string().optional()
    })), 
    async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, reason, notes } = req.body;
      const adminId = (req as AuthenticatedRequest).user.id;
      
      const provider = await storage.updatePartsProviderVerificationStatus(
        userId, status, adminId, reason, notes
      );
      
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }
      
      res.json({ success: true, provider, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating parts provider status:', error);
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  });
  
  // Document Verification Endpoints
  app.patch('/api/v1/verification/:providerType/:providerId/documents/:documentType', 
    authMiddleware, 
    requireRole(['admin']), 
    validateBody(z.object({
      verified: z.boolean(),
      notes: z.string().optional()
    })), 
    async (req, res) => {
    try {
      const { providerType, providerId, documentType } = req.params;
      const { verified, notes } = req.body;
      const adminId = (req as AuthenticatedRequest).user.id;
      
      const result = await storage.updateDocumentVerificationStatus(
        providerId, 
        providerType as 'service_provider' | 'parts_provider',
        documentType,
        verified,
        adminId,
        notes
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error updating document verification:', error);
      res.status(500).json({ success: false, message: 'Failed to update document verification' });
    }
  });
  
  // Verification Dashboard Stats
  app.get('/api/v1/verification/dashboard/stats', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getVerificationDashboardStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error fetching verification dashboard stats:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  });
  
  // Parts Provider Quality Metrics Endpoints
  app.get('/api/v1/verification/parts-providers/:providerId/quality-metrics', 
    authMiddleware, 
    requireRole(['admin']), 
    async (req, res) => {
    try {
      const { providerId } = req.params;
      const metrics = await storage.getPartsProviderQualityMetrics(providerId);
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch quality metrics' });
    }
  });
  
  app.post('/api/v1/verification/parts-providers/:providerId/quality-metrics', 
    authMiddleware, 
    requireRole(['admin']), 
    validateBody(insertPartsProviderQualityMetricsSchema), 
    async (req, res) => {
    try {
      const { providerId } = req.params;
      const adminId = (req as AuthenticatedRequest).user.id;
      
      const metricsData = {
        ...req.body,
        providerId,
        assessedBy: adminId,
        lastAssessmentDate: new Date()
      };
      
      const metrics = await storage.createPartsProviderQualityMetrics(metricsData);
      res.json({ success: true, metrics, message: 'Quality metrics created successfully' });
    } catch (error) {
      console.error('Error creating quality metrics:', error);
      res.status(500).json({ success: false, message: 'Failed to create quality metrics' });
    }
  });
  
  // Provider Resubmission Endpoints
  app.post('/api/v1/verification/resubmissions', 
    authMiddleware, 
    requireRole(['admin']), 
    validateBody(insertProviderResubmissionSchema), 
    async (req, res) => {
    try {
      const resubmission = await storage.createProviderResubmission(req.body);
      res.json({ success: true, resubmission, message: 'Resubmission request created successfully' });
    } catch (error) {
      console.error('Error creating resubmission request:', error);
      res.status(500).json({ success: false, message: 'Failed to create resubmission request' });
    }
  });
  
  app.get('/api/v1/verification/resubmissions/:providerType/:providerId', 
    authMiddleware, 
    async (req, res) => {
    try {
      const { providerType, providerId } = req.params;
      const resubmission = await storage.getProviderResubmission(
        providerId, 
        providerType as 'service_provider' | 'parts_provider'
      );
      res.json({ success: true, resubmission });
    } catch (error) {
      console.error('Error fetching resubmission:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch resubmission' });
    }
  });
  
  // Verification Notification Preferences
  app.get('/api/v1/verification/notification-preferences', authMiddleware, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const preferences = await storage.getVerificationNotificationPreferences(userId);
      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
    }
  });
  
  app.patch('/api/v1/verification/notification-preferences', 
    authMiddleware, 
    validateBody(insertVerificationNotificationPreferencesSchema.partial()), 
    async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const preferences = await storage.updateVerificationNotificationPreferences(userId, req.body);
      res.json({ success: true, preferences, message: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
  });

  // Catch-all route REMOVED to prevent 501 errors - let specific routes handle requests

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'FixitQuick API is running (emergency maintenance mode)'
    });
  });

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(server);

  return server;
}