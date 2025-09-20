import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq, and, sql, desc, count, gte } from "drizzle-orm";
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
  type InsertServiceCategory,
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
  insertPartsCategorySchema,
  insertPartsSupplierSchema,
  // Service request schemas
  insertServiceRequestSchema,
  // SECURITY: Order lifecycle validation schemas
  orderAcceptanceSchema,
  orderDeclineSchema,
  orderStatusUpdateSchema,
  orderLocationUpdateSchema,
  orderChatMessageSchema,
  insertOrderRatingSchema,
  // Database tables
  services,
  serviceCategories,
  walletTransactions,
  orders,
  serviceBookings
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
export function registerRoutes(app: Express): void {
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
  // CRITICAL: Category GET routes MUST be registered first to avoid 404s
  // ============================
  
  // GET /api/v1/service-categories - Public list of active service categories
  app.get('/api/v1/service-categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getMainCategories(true); // Only active categories
      console.log('✅ GET /api/v1/service-categories: Retrieved', categories.length, 'categories');
      res.json({ 
        success: true, 
        data: categories
      });
    } catch (error) {
      console.error('❌ GET /api/v1/service-categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch service categories: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch service categories'
      });
    }
  });

  // POST /api/v1/service-categories - Backward compatibility alias for category creation (delegates to admin logic)
  app.post('/api/v1/service-categories', authMiddleware, requireRole(['admin']), validateBody(apiCreateServiceCategorySchema), async (req: Request, res: Response) => {
    try {
      console.log('🔄 POST /api/v1/service-categories: Back-compat alias - delegating to admin create logic');
      
      // Generate slug from name (same as admin handler)
      const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Determine level based on parentId (same as admin handler)
      let level = 0;
      if (req.body.parentId) {
        level = 1;
      }
      
      const categoryData: InsertServiceCategory = {
        ...req.body,
        slug,
        level,
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive ?? true,
        serviceCount: 0
      };

      // Insert the category directly into database (same as admin handler)
      const [newCategory] = await db.insert(serviceCategories).values(categoryData).returning();
      
      console.log('✅ POST /api/v1/service-categories: Back-compat category created successfully:', newCategory.id);
      
      res.status(201).json({
        success: true, 
        data: newCategory,
        message: 'Category created successfully'
      });
    } catch (error) {
      console.error('❌ POST /api/v1/service-categories error:', error);
      res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to create category'
      });
    }
  });

  // GET /api/v1/categories/tree - Public category hierarchy tree
  app.get('/api/v1/categories/tree', async (req: Request, res: Response) => {
    try {
      // Get all categories and build tree structure
      const mainCategories = await storage.getMainCategories(true);
      const categoryTree = [];
      
      for (const mainCategory of mainCategories) {
        const subCategories = await storage.getSubCategories(mainCategory.id, true);
        categoryTree.push({
          ...mainCategory,
          subcategories: subCategories
        });
      }
      
      console.log('✅ GET /api/v1/categories/tree: Built tree with', categoryTree.length, 'main categories');
      res.json({ 
        success: true, 
        data: categoryTree
      });
    } catch (error) {
      console.error('❌ GET /api/v1/categories/tree error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch category tree: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch category tree'
      });
    }
  });

  console.log('🔧 CRITICAL: Category GET routes registered at top of function');

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

  // Suggested services endpoint - returns popular and recommended services
  app.get('/api/v1/services/suggested', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      let userLocation: { latitude: number; longitude: number } | null = null;

      // Get user location if available for location-based suggestions
      if (userId) {
        try {
          const user = await storage.getUser(userId);
          if (user?.location) {
            userLocation = {
              latitude: parseFloat(String(user.location.latitude || '0')),
              longitude: parseFloat(String(user.location.longitude || '0'))
            };
          }
        } catch (err) {
          console.warn('Could not fetch user location for suggestions:', err);
        }
      }

      // Get popular services based on booking count and ratings
      const popularServices = await db.select({
        id: services.id,
        name: services.name,
        description: services.description,
        basePrice: services.basePrice,
        estimatedDuration: services.estimatedDuration,
        icon: services.icon,
        rating: services.rating,
        totalBookings: services.totalBookings,
        categoryId: services.categoryId,
        isActive: services.isActive,
        createdAt: services.createdAt,
        // Calculate a suggestion score based on ratings and bookings
        suggestionScore: sql<number>`COALESCE(${services.rating}, 0) * 0.3 + COALESCE(${services.totalBookings}, 0) * 0.001`
      })
      .from(services)
      .where(and(
        eq(services.isActive, true),
        gte(services.rating, '3.5') // Only suggest services with good ratings
      ))
      .orderBy(sql`COALESCE(${services.rating}, 0) * 0.3 + COALESCE(${services.totalBookings}, 0) * 0.001 DESC`)
      .limit(12);

      // Get diverse category representation
      const categorizedSuggestions = await db.select({
        serviceId: services.id,
        serviceName: services.name,
        serviceDescription: services.description,
        basePrice: services.basePrice,
        estimatedDuration: services.estimatedDuration,
        icon: services.icon,
        rating: services.rating,
        totalBookings: services.totalBookings,
        categoryId: services.categoryId,
        categoryName: serviceCategories.name,
        isActive: services.isActive
      })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(
        eq(services.isActive, true),
        eq(serviceCategories.isActive, true),
        gte(services.rating, '3.0')
      ))
      .orderBy(sql`RANDOM()`)
      .limit(8);

      // Combine suggestions with priority to popular services
      const allSuggestions = [
        ...popularServices.slice(0, 8).map(service => ({
          ...service,
          suggestionReason: 'popular',
          price: parseFloat(service.basePrice || '0'),
          rating: parseFloat(service.rating || '0'),
          totalBookings: service.totalBookings || 0
        })),
        ...categorizedSuggestions.slice(0, 4).map(service => ({
          id: service.serviceId,
          name: service.serviceName,
          description: service.serviceDescription,
          basePrice: service.basePrice,
          estimatedDuration: service.estimatedDuration,
          icon: service.icon,
          rating: parseFloat(service.rating || '0'),
          totalBookings: service.totalBookings || 0,
          categoryId: service.categoryId,
          isActive: service.isActive,
          suggestionReason: 'diverse',
          categoryName: service.categoryName,
          price: parseFloat(service.basePrice || '0')
        }))
      ];

      // Remove duplicates and limit to 10 suggestions
      const uniqueSuggestions = allSuggestions
        .filter((service, index, arr) => arr.findIndex(s => s.id === service.id) === index)
        .slice(0, 10)
        .map(transformServiceForFrontend);

      res.json({ 
        success: true, 
        data: uniqueSuggestions,
        meta: {
          userLocation: userLocation ? 'available' : 'not_available',
          suggestionTypes: ['popular', 'diverse'],
          totalSuggestions: uniqueSuggestions.length
        }
      });
    } catch (error) {
      console.error('❌ /api/v1/services/suggested error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Failed to fetch suggested services: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch suggested services'
      });
    }
  });

  // Service details endpoint - uses existing getService (placed after specific routes)
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
  app.get('/api/auth/user', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // authMiddleware ensures req.user exists and is properly authenticated
      if (!req.user) {
        console.error('❌ /api/auth/user: No user in request after authMiddleware');
        return res.status(401).json({ 
          message: 'Authentication required'
        });
      }

      // Return the complete user object directly (no wrapping)
      // Frontend expects just the User object, not { success: true, data: user }
      const userResponse = {
        id: req.user.id,
        email: req.user.email || null,
        phone: req.user.phone || null,
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
        profileImageUrl: req.user.profileImageUrl || null,
        role: req.user.role || 'user',
        walletBalance: req.user.walletBalance || 0,
        fixiPoints: req.user.fixiPoints || 0,
        location: req.user.location || null,
        isActive: req.user.isActive ?? true,
        isVerified: req.user.isVerified ?? false,
        lastLoginAt: req.user.lastLoginAt || null,
        createdAt: req.user.createdAt || null,
        updatedAt: req.user.updatedAt || null
      };

      console.log(`✅ /api/auth/user: User ${req.user.id} data retrieved successfully`);
      return res.json(userResponse);

    } catch (error) {
      console.error('❌ /api/auth/user error:', error);
      return res.status(500).json({ 
        message: 'Internal server error'
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

  // /api/v1/service-categories - Get service categories with optional filters
  app.get('/api/v1/service-categories', async (req: Request, res: Response) => {
    try {
      const { level, activeOnly = 'true' } = req.query;
      const isActiveOnly = activeOnly === 'true';
      
      let categories;
      if (level !== undefined) {
        categories = await storage.getServiceCategoriesByLevel(parseInt(level as string), isActiveOnly);
      } else {
        categories = await storage.getMainCategories(isActiveOnly);
      }
      
      res.json({ 
        success: true, 
        data: categories
      });
    } catch (error) {
      console.error('❌ /api/v1/service-categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch service categories: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch service categories'
      });
    }
  });

  // /api/v1/categories/tree - Get category hierarchy tree structure
  app.get('/api/v1/categories/tree', async (req: Request, res: Response) => {
    try {
      // Get all categories and build tree structure
      const mainCategories = await storage.getMainCategories(true);
      const categoryTree = [];
      
      for (const mainCategory of mainCategories) {
        const subCategories = await storage.getSubCategories(mainCategory.id, true);
        categoryTree.push({
          ...mainCategory,
          subcategories: subCategories
        });
      }
      
      res.json({ 
        success: true, 
        data: categoryTree
      });
    } catch (error) {
      console.error('❌ /api/v1/categories/tree error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch category tree: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch category tree'
      });
    }
  });

  // /api/v1/admin/categories - Get all categories for admin management
  app.get('/api/v1/admin/categories', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // Get all categories (including inactive ones for admin)
      const allCategories = await storage.getServiceCategoriesByLevel(0, false); // Main categories
      const allSubCategories = [];
      
      // Get subcategories for each main category
      for (const category of allCategories) {
        const subCategories = await storage.getSubCategories(category.id, false);
        allSubCategories.push(...subCategories);
      }
      
      const combinedCategories = [...allCategories, ...allSubCategories];
      
      res.json({ 
        success: true, 
        data: combinedCategories
      });
    } catch (error) {
      console.error('❌ /api/v1/admin/categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch admin categories: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch admin categories'
      });
    }
  });

  // POST /api/v1/admin/categories - Create new service category (admin only)
  app.post('/api/v1/admin/categories', authMiddleware, requireRole(['admin']), validateBody(apiCreateServiceCategorySchema), async (req: Request, res: Response) => {
    try {
      // Generate slug from name
      const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Determine level based on parentId
      let level = 0;
      if (req.body.parentId) {
        // If has parentId, it's a subcategory (level 1)
        level = 1;
      }
      
      const categoryData: InsertServiceCategory = {
        ...req.body,
        slug,
        level,
        sortOrder: req.body.sortOrder || 0,
        isActive: req.body.isActive ?? true,
        serviceCount: 0
      };

      // Insert the category directly into database since createServiceCategory method doesn't exist
      const [newCategory] = await db.insert(serviceCategories).values(categoryData).returning();
      
      res.status(201).json({ 
        success: true, 
        data: newCategory,
        message: 'Category created successfully'
      });
    } catch (error) {
      console.error('❌ POST /api/v1/admin/categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to create category'
      });
    }
  });

  // PUT /api/v1/admin/categories/:categoryId - Update existing service category (admin only)
  app.put('/api/v1/admin/categories/:categoryId', authMiddleware, requireRole(['admin']), validateBody(apiUpdateServiceCategorySchema), async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      
      // Generate slug from name if name is being updated
      let updateData = { ...req.body };
      if (req.body.name) {
        updateData.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      
      // Determine level based on parentId if parentId is being updated
      if (req.body.parentId !== undefined) {
        updateData.level = req.body.parentId ? 1 : 0;
      }
      
      updateData.updatedAt = new Date();

      // Update the category directly in database
      const [updatedCategory] = await db.update(serviceCategories)
        .set(updateData)
        .where(eq(serviceCategories.id, categoryId))
        .returning();
      
      if (!updatedCategory) {
        return res.status(404).json({ 
          success: false,
          message: 'Category not found'
        });
      }
      
      res.json({ 
        success: true, 
        data: updatedCategory,
        message: 'Category updated successfully'
      });
    } catch (error) {
      console.error('❌ PUT /api/v1/admin/categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to update category'
      });
    }
  });

  // DELETE /api/v1/admin/categories/:categoryId - Delete service category (admin only)
  app.delete('/api/v1/admin/categories/:categoryId', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      
      // Soft delete by setting isActive to false
      const [deletedCategory] = await db.update(serviceCategories)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(serviceCategories.id, categoryId))
        .returning();
      
      if (!deletedCategory) {
        return res.status(404).json({ 
          success: false,
          message: 'Category not found'
        });
      }
      
      res.json({ 
        success: true, 
        data: deletedCategory,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('❌ DELETE /api/v1/admin/categories error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to delete category'
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

  // /api/v1/wallet/transactions - Get user wallet transaction history
  app.get('/api/v1/wallet/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Parse query parameters for pagination and filtering
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;
      const type = req.query.type as string; // 'credit' | 'debit'
      const category = req.query.category as string; // 'topup' | 'payment' | 'refund' etc.

      // Build where conditions
      const whereConditions = [eq(walletTransactions.userId, userId)];
      
      if (type && ['credit', 'debit'].includes(type)) {
        whereConditions.push(eq(walletTransactions.type, type as 'credit' | 'debit'));
      }
      
      if (category && ['topup', 'payment', 'refund', 'withdrawal', 'commission', 'redemption', 'penalty', 'bonus'].includes(category)) {
        whereConditions.push(eq(walletTransactions.category, category as any));
      }

      // Get transactions with pagination
      const [transactions, totalCountResult] = await Promise.all([
        db.select({
          id: walletTransactions.id,
          type: walletTransactions.type,
          amount: walletTransactions.amount,
          description: walletTransactions.description,
          category: walletTransactions.category,
          orderId: walletTransactions.orderId,
          reference: walletTransactions.reference,
          paymentMethod: walletTransactions.paymentMethod,
          status: walletTransactions.status,
          metadata: walletTransactions.metadata,
          balanceBefore: walletTransactions.balanceBefore,
          balanceAfter: walletTransactions.balanceAfter,
          createdAt: walletTransactions.createdAt,
          completedAt: walletTransactions.completedAt
        })
        .from(walletTransactions)
        .where(and(...whereConditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset),

        // Get total count for pagination
        db.select({ count: count() })
          .from(walletTransactions)
          .where(and(...whereConditions))
      ]);

      const totalCount = totalCountResult[0].count;
      const totalPages = Math.ceil(totalCount / limit);

      // Format transaction data
      const formattedTransactions = transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: parseFloat(transaction.amount || '0'),
        description: transaction.description || '',
        category: transaction.category,
        orderId: transaction.orderId,
        reference: transaction.reference,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        metadata: transaction.metadata || {},
        balanceBefore: transaction.balanceBefore ? parseFloat(transaction.balanceBefore) : null,
        balanceAfter: transaction.balanceAfter ? parseFloat(transaction.balanceAfter) : null,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        // Add display helpers
        displayAmount: transaction.type === 'credit' ? `+₹${parseFloat(transaction.amount || '0')}` : `-₹${parseFloat(transaction.amount || '0')}`,
        displayStatus: transaction.status === 'completed' ? 'Success' : 
                     transaction.status === 'pending' ? 'Pending' :
                     transaction.status === 'failed' ? 'Failed' : 'Cancelled'
      }));

      res.json({
        success: true,
        data: formattedTransactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          type: type || null,
          category: category || null
        }
      });
    } catch (error) {
      console.error('❌ /api/v1/wallet/transactions error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Failed to fetch wallet transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch wallet transactions'
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

  app.get('/api/v1/orders/recent', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Get recent orders from both orders and serviceBookings tables
      const [recentOrders, recentBookings] = await Promise.all([
        // Query recent orders
        db.select({
          id: orders.id,
          type: sql<string>`'order'`,
          userId: orders.userId,
          serviceId: orders.serviceId,
          status: orders.status,
          providerId: orders.providerId,
          acceptedAt: orders.acceptedAt,
          meta: orders.meta,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt
        })
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(10),

        // Query recent service bookings
        db.select({
          id: serviceBookings.id,
          type: sql<string>`'booking'`,
          userId: serviceBookings.userId,
          serviceId: serviceBookings.serviceId,
          status: serviceBookings.status,
          assignedProviderId: serviceBookings.assignedProviderId,
          requestedAt: serviceBookings.requestedAt,
          scheduledAt: serviceBookings.scheduledAt,
          totalAmount: serviceBookings.totalAmount,
          paymentMethod: serviceBookings.paymentMethod,
          serviceLocation: serviceBookings.serviceLocation,
          notes: serviceBookings.notes
        })
        .from(serviceBookings)
        .where(eq(serviceBookings.userId, userId))
        .orderBy(desc(serviceBookings.requestedAt))
        .limit(10)
      ]);

      // Combine and sort by date
      const combinedRecords = [
        ...recentOrders.map(order => ({
          ...order,
          displayDate: order.createdAt,
          totalAmount: order.meta?.totalAmount || 0,
          paymentStatus: order.meta?.paymentStatus || 'pending',
          location: order.meta?.location
        })),
        ...recentBookings.map(booking => ({
          ...booking,
          displayDate: booking.requestedAt,
          providerId: booking.assignedProviderId,
          totalAmount: parseFloat(booking.totalAmount || '0'),
          location: booking.serviceLocation
        }))
      ]
      .sort((a, b) => new Date(b.displayDate || 0).getTime() - new Date(a.displayDate || 0).getTime())
      .slice(0, 10);

      res.json({ 
        success: true, 
        data: combinedRecords
      });
    } catch (error) {
      console.error('❌ /api/v1/orders/recent error:', error);
      res.status(500).json({ 
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Failed to fetch recent orders: ${error instanceof Error ? error.message : 'Unknown error'}`
          : 'Failed to fetch recent orders'
      });
    }
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

  // ========================================
  // PARTS ENDPOINTS
  // ========================================

  // GET /api/v1/parts - List parts with filtering
  app.get('/api/v1/parts', async (req, res) => {
    try {
      const {
        category,
        provider,
        search,
        sortBy,
        priceRange,
        inStock,
        page = '1',
        limit = '20'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        categoryId: category as string,
        providerId: provider as string,
        search: search as string,
        sortBy: sortBy as string,
        priceRange: priceRange as string,
        inStock: inStock === 'true',
        limit: limitNum,
        offset
      };

      const result = await storage.getParts(filters);
      
      res.json({
        success: true,
        data: {
          parts: result.parts,
          pagination: {
            total: result.total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(result.total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching parts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts'
      });
    }
  });

  // ========================================
  // PARTS CATEGORIES ENDPOINTS (must be before parts/:id)
  // ========================================

  // GET /api/v1/parts/categories - List all parts categories
  app.get('/api/v1/parts/categories', async (req, res) => {
    try {
      const categories = await storage.getPartsCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching parts categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts categories'
      });
    }
  });

  // POST /api/v1/parts/categories - Create new parts category (admin only)
  app.post('/api/v1/parts/categories', authMiddleware, requireRole(['admin']), validateBody(insertPartsCategorySchema), async (req, res) => {
    try {
      const category = await storage.createPartsCategory(req.body);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error creating parts category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create parts category'
      });
    }
  });

  // GET /api/v1/parts/:id - Get single part details
  app.get('/api/v1/parts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const part = await storage.getPartById(id);

      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      res.json({
        success: true,
        data: part
      });
    } catch (error) {
      console.error('Error fetching part:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch part details'
      });
    }
  });

  // POST /api/v1/parts - Create new part (providers only)
  app.post('/api/v1/parts', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartSchema), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const partData = {
        ...req.body,
        providerId: user.id
      };

      const part = await storage.createPart(partData);

      res.status(201).json({
        success: true,
        data: part
      });
    } catch (error) {
      console.error('Error creating part:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create part'
      });
    }
  });

  // PUT /api/v1/parts/:id - Update part (providers only, own parts)
  app.put('/api/v1/parts/:id', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartSchema.partial()), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      // Check if part exists and belongs to user
      const existingPart = await storage.getPartById(id);
      if (!existingPart) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      if (existingPart.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only update your own parts'
        });
      }

      const updatedPart = await storage.updatePart(id, req.body);

      res.json({
        success: true,
        data: updatedPart
      });
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update part'
      });
    }
  });

  // DELETE /api/v1/parts/:id - Soft delete part (providers only, own parts)
  app.delete('/api/v1/parts/:id', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      // Check if part exists and belongs to user
      const existingPart = await storage.getPartById(id);
      if (!existingPart) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      if (existingPart.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only delete your own parts'
        });
      }

      const success = await storage.deletePart(id);

      if (success) {
        res.json({
          success: true,
          message: 'Part deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete part'
        });
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete part'
      });
    }
  });


  // ========================================
  // PARTS SUPPLIERS ENDPOINTS
  // ========================================

  // GET /api/v1/parts-suppliers - List parts suppliers
  app.get('/api/v1/parts-suppliers', authMiddleware, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const providerId = user.role === 'parts_provider' ? user.id : undefined;
      
      const suppliers = await storage.getPartsSuppliers(providerId);
      
      res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      console.error('Error fetching parts suppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts suppliers'
      });
    }
  });

  // POST /api/v1/parts-suppliers - Create new parts supplier (providers only)
  app.post('/api/v1/parts-suppliers', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartsSupplierSchema), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const supplierData = {
        ...req.body,
        providerId: user.id
      };

      const supplier = await storage.createPartsSupplier(supplierData);

      res.status(201).json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error creating parts supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create parts supplier'
      });
    }
  });

  // GET /api/v1/parts-suppliers/:id - Get specific parts supplier (providers only)
  app.get('/api/v1/parts-suppliers/:id', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      const supplier = await storage.getPartsSupplierById(id);
      
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      // Check if supplier belongs to the current provider
      if (supplier.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only view your own suppliers'
        });
      }

      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error fetching parts supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier'
      });
    }
  });

  // PUT /api/v1/parts-suppliers/:id - Update parts supplier (providers only)
  app.put('/api/v1/parts-suppliers/:id', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartsSupplierSchema.partial()), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      // Check if supplier exists and belongs to user
      const existingSupplier = await storage.getPartsSupplierById(id);
      if (!existingSupplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      if (existingSupplier.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only update your own suppliers'
        });
      }

      const updatedSupplier = await storage.updatePartsSupplier(id, req.body);

      res.json({
        success: true,
        data: updatedSupplier
      });
    } catch (error) {
      console.error('Error updating parts supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update supplier'
      });
    }
  });

  // DELETE /api/v1/parts-suppliers/:id - Delete parts supplier (providers only)
  app.delete('/api/v1/parts-suppliers/:id', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      // Check if supplier exists and belongs to user
      const existingSupplier = await storage.getPartsSupplierById(id);
      if (!existingSupplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      if (existingSupplier.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only delete your own suppliers'
        });
      }

      const success = await storage.deletePartsSupplier(id);

      if (success) {
        res.json({
          success: true,
          message: 'Supplier deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete supplier'
        });
      }
    } catch (error) {
      console.error('Error deleting parts supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete supplier'
      });
    }
  });

  // ========================================
  // PARTS PROVIDER DASHBOARD ENDPOINTS
  // ========================================

  // GET /api/v1/parts-provider/dashboard - Parts provider dashboard data
  app.get('/api/v1/parts-provider/dashboard', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const dashboardData = await storage.getPartsProviderDashboard(user.id);
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error fetching parts provider dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  });

  // GET /api/v1/parts-provider/orders - Parts provider orders
  app.get('/api/v1/parts-provider/orders', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { status, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        status: status as string,
        limit: limitNum,
        offset
      };

      const result = await storage.getPartsProviderOrders(user.id, filters);
      
      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            total: result.total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(result.total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching parts provider orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  });

  // GET /api/v1/parts-provider/inventory - Parts provider inventory
  app.get('/api/v1/parts-provider/inventory', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const inventory = await storage.getPartsProviderInventory(user.id);
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error fetching parts provider inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory'
      });
    }
  });

  // POST /api/v1/parts-provider/orders/:id/accept - Accept a parts order
  app.post('/api/v1/parts-provider/orders/:id/accept', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id: orderId } = req.params;

      // Get the order and validate access
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.type !== 'parts') {
        return res.status(400).json({
          success: false,
          message: 'Not a parts order'
        });
      }

      // Check if provider has parts in this order
      const hasProviderItems = order.meta?.items?.some((item: any) => item.providerId === user.id);
      if (!hasProviderItems) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: No parts from your inventory in this order'
        });
      }

      // Update order status to confirmed
      const updatedOrder = await storage.updateOrderStatus(orderId, 'confirmed', {
        acceptedBy: user.id,
        acceptedAt: new Date().toISOString()
      });

      // Send notification to customer
      if (webSocketManager) {
        webSocketManager.sendToUser(order.userId, {
          type: 'order_status_update',
          orderId: orderId,
          status: 'confirmed',
          message: 'Your parts order has been confirmed and is being processed'
        });
      }

      res.json({
        success: true,
        message: 'Parts order accepted successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error accepting parts order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept order'
      });
    }
  });

  // PUT /api/v1/parts-provider/inventory/:id - Update inventory stock
  app.put('/api/v1/parts-provider/inventory/:id', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;
      const { stock, reservedStock } = req.body;

      // Validate input
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock value'
        });
      }

      // Check if part belongs to user
      const existingPart = await storage.getPartById(id);
      if (!existingPart) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      if (existingPart.providerId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only update your own inventory'
        });
      }

      const updatedPart = await storage.updatePartsInventory(id, { stock, reservedStock });

      res.json({
        success: true,
        data: updatedPart
      });
    } catch (error) {
      console.error('Error updating parts inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory'
      });
    }
  });

  // ========================================
  // PARTS ORDERING ENDPOINTS
  // ========================================

  // POST /api/v1/parts/orders - Create new parts order (UPDATED)
  app.post('/api/v1/parts/orders', authMiddleware, validateBody(orderCreateApiSchema), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const orderData = req.body as OrderCreateApiData;

      // Validate it's a parts order
      if (orderData.type !== 'parts') {
        return res.status(400).json({
          success: false,
          message: 'Invalid order type for this endpoint'
        });
      }

      // SECURITY: Check for duplicate order using idempotency key
      const existingOrder = await storage.getOrderByIdempotencyKey(user.id, orderData.idempotencyKey);
      if (existingOrder) {
        console.log(`🔒 Idempotency key ${orderData.idempotencyKey} already used for user ${user.id}, returning existing order`);
        return res.status(200).json({
          success: true,
          data: existingOrder,
          message: 'Order already exists (idempotent response)'
        });
      }

      // Validate parts items and calculate total
      let calculatedTotal = 0;
      const processedItems = [];

      for (const item of orderData.items) {
        if (item.type === 'part' && item.partId) {
          // Get part details
          const part = await storage.getPartById(item.partId);
          if (!part) {
            return res.status(404).json({
              success: false,
              message: `Part with ID ${item.partId} not found`
            });
          }

          // Check stock availability
          if (part.stock < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${part.name}. Available: ${part.stock}, Requested: ${item.quantity}`
            });
          }

          const itemTotal = parseFloat(part.price) * item.quantity;
          calculatedTotal += itemTotal;

          processedItems.push({
            id: item.id,
            partId: item.partId,
            name: part.name,
            price: parseFloat(part.price),
            quantity: item.quantity,
            providerId: part.providerId
          });
        }
      }

      // Create order using the standard createOrder method
      const orderCreateData = {
        userId: user.id,
        type: 'parts' as const,
        totalAmount: parseFloat(orderData.totalAmount),
        paymentMethod: orderData.paymentMethod,
        idempotencyKey: orderData.idempotencyKey,
        location: orderData.location,
        notes: orderData.notes,
        items: processedItems,
        couponCode: orderData.couponCode,
        couponDiscount: orderData.couponDiscount || 0
      };

      const order = await storage.createOrder(orderCreateData);

      // Reserve stock for each part
      for (const item of processedItems) {
        await storage.updatePartsInventory(item.partId, {
          stock: await storage.getPartById(item.partId).then(p => p?.stock || 0),
          reservedStock: await storage.getPartById(item.partId).then(p => (p?.reservedStock || 0) + item.quantity)
        });
      }

      res.status(201).json({
        success: true,
        data: order,
        message: 'Parts order created successfully'
      });
    } catch (error) {
      console.error('Error creating parts order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create parts order'
      });
    }
  });

  // GET /api/v1/parts/orders/:id - Get specific parts order details
  app.get('/api/v1/parts/orders/:id', authMiddleware, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id } = req.params;

      const order = await storage.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check authorization - user must be customer or provider involved in the order
      const hasAccess = order.customerId === user.id || 
                       (order.items && order.items.some((item: any) => item.providerId === user.id));

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this order'
        });
      }

      // Only return parts orders
      if (order.type !== 'parts') {
        return res.status(404).json({
          success: false,
          message: 'Parts order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching parts order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts order'
      });
    }
  });

  // GET /api/v1/users/parts-orders - Get user's parts order history
  app.get('/api/v1/users/parts-orders', authMiddleware, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { page = '1', limit = '10', status } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        customerId: user.id,
        type: 'parts' as const,
        status: status as string,
        limit: limitNum,
        offset
      };

      const result = await storage.getOrdersByCustomer(user.id, filters);
      
      // Filter only parts orders
      const partsOrders = result.orders.filter((order: any) => order.type === 'parts');
      
      res.json({
        success: true,
        data: {
          orders: partsOrders,
          pagination: {
            total: result.total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(result.total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user parts orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts orders'
      });
    }
  });

  // POST /api/v1/parts-provider/orders/:id/reject - Reject a parts order  
  app.post('/api/v1/parts-provider/orders/:id/reject', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id: orderId } = req.params;
      const { reason } = req.body;

      // Get the order and validate access
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.type !== 'parts') {
        return res.status(400).json({
          success: false,
          message: 'Not a parts order'
        });
      }

      // Check if provider has parts in this order
      const hasProviderItems = order.meta?.items?.some((item: any) => item.providerId === user.id);
      if (!hasProviderItems) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: No parts from your inventory in this order'
        });
      }

      // Update order status to cancelled with reason
      const updatedOrder = await storage.updateOrderStatus(orderId, 'cancelled', {
        rejectedBy: user.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Provider declined the order'
      });

      // Release reserved stock
      if (order.meta?.items) {
        for (const item of order.meta.items) {
          if (item.providerId === user.id) {
            const part = await storage.getPartById(item.partId);
            if (part) {
              await storage.updatePartsInventory(item.partId, {
                stock: part.stock,
                reservedStock: Math.max(0, (part.reservedStock || 0) - item.quantity)
              });
            }
          }
        }
      }

      // Send notification to customer
      if (webSocketManager) {
        webSocketManager.sendToUser(order.userId, {
          type: 'order_status_update',
          orderId: orderId,
          status: 'cancelled',
          message: 'Your parts order has been cancelled by the provider'
        });
      }

      res.json({
        success: true,
        message: 'Parts order rejected successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error rejecting parts order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject order'
      });
    }
  });

  // PUT /api/v1/parts/orders/:id/status - Update parts order status (provider only)
  app.put('/api/v1/parts/orders/:id/status', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { id: orderId } = req.params;
      const { status, trackingNumber, estimatedDeliveryDate, notes } = req.body;

      // Validate status
      const validStatuses = ['processing', 'shipped', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: processing, shipped, delivered'
        });
      }

      // Get the order and validate access
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.type !== 'parts') {
        return res.status(400).json({
          success: false,
          message: 'Not a parts order'
        });
      }

      // Check if provider has parts in this order
      const hasProviderItems = order.meta?.items?.some((item: any) => item.providerId === user.id);
      if (!hasProviderItems) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: No parts from your inventory in this order'
        });
      }

      // Build update data
      const updateData: any = {
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: user.id,
        notes: notes
      };

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      if (estimatedDeliveryDate) {
        updateData.estimatedDeliveryDate = estimatedDeliveryDate;
      }

      // If delivered, update inventory (convert reserved to sold)
      if (status === 'delivered' && order.meta?.items) {
        for (const item of order.meta.items) {
          if (item.providerId === user.id) {
            const part = await storage.getPartById(item.partId);
            if (part) {
              await storage.updatePartsInventory(item.partId, {
                stock: part.stock,
                reservedStock: Math.max(0, (part.reservedStock || 0) - item.quantity)
              });
              
              // Create inventory movement record
              await db.insert(partsInventoryMovements).values({
                partId: item.partId,
                providerId: user.id,
                movementType: 'sold',
                quantity: -item.quantity,
                previousStock: part.stock + item.quantity,
                newStock: part.stock,
                orderId: orderId,
                reason: 'Order delivered'
              });
            }
          }
        }
      }

      // Update order status
      const updatedOrder = await storage.updateOrderStatus(orderId, status, updateData);

      // Send real-time notification to customer
      if (webSocketManager) {
        const statusMessages = {
          processing: 'Your parts order is being processed',
          shipped: trackingNumber ? 
            `Your parts order has been shipped. Tracking: ${trackingNumber}` :
            'Your parts order has been shipped',
          delivered: 'Your parts order has been delivered successfully'
        };

        webSocketManager.sendToUser(order.userId, {
          type: 'order_status_update',
          orderId: orderId,
          status: status,
          message: statusMessages[status as keyof typeof statusMessages],
          trackingNumber,
          estimatedDeliveryDate
        });
      }

      res.json({
        success: true,
        message: `Parts order status updated to ${status}`,
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating parts order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
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

  // FIXED: No longer creating duplicate server - routes registered on passed app
  console.log('✅ All routes registered successfully on provided Express app');
  console.log('🔧 Category GET endpoints should now work: /api/v1/service-categories, /api/v1/categories/tree');
}