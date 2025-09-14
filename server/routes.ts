import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { storage } from "./storage";
import { authMiddleware, optionalAuth, requireRole, adminSessionMiddleware, type AuthenticatedRequest } from "./middleware/auth";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/ai";
import { openRouterService } from "./services/openrouter";
import { stripePaymentService } from "./services/stripe";
import { notificationService } from "./services/notifications";
import WebSocketManager from "./services/websocket";
import {
  insertUserSchema,
  insertOrderSchema,
  insertPartSchema,
  insertUserAddressSchema,
  insertUserNotificationPreferencesSchema,
  insertServiceBookingSchema,
  insertProviderJobRequestSchema,
} from "@shared/schema";
import { twilioService } from "./services/twilio";
import { jwtService } from "./utils/jwt";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Specific rate limiters for OTP endpoints
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

// Validation schemas for API routes
const loginSchema = z.object({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z.object({
    category: z.string().optional(),
    priceRange: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
});

const walletTopupSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0').max(50000, 'Amount cannot exceed ₹50,000'),
});

const paymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Payment method ID is required'),
  nickname: z.string().optional(),
  setAsDefault: z.boolean().optional().default(false),
});

const createPaymentIntentSchema = z.object({
  orderId: z.string().optional(),
  amount: z.number().min(0.5, 'Amount must be at least ₹0.50'),
  currency: z.string().default('inr'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const iconGenerationSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  category: z.string().min(1, 'Category is required'),
  style: z.string().optional(),
});

// Enhanced AI Search validation schemas
const enhancedSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  context: z.object({
    userId: z.string().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      maxDistance: z.number().optional(),
    }).optional(),
    budget: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    searchType: z.enum(['services', 'parts', 'mixed']).optional(),
  }).optional(),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
    inStockOnly: z.boolean().optional(),
    providerId: z.string().optional(),
  }).optional(),
});

const similarItemsSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  itemType: z.enum(['service', 'part'], {
    required_error: 'Item type must be either service or part',
  }),
  limit: z.number().min(1).max(20).optional(),
});

const suggestionsSchema = z.object({
  type: z.enum(['services', 'parts', 'mixed']).optional(),
  limit: z.number().min(1).max(50).optional(),
});

const searchAnalyticsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  results: z.number().min(0),
  category: z.string().optional(),
  clicked: z.boolean().optional(),
  duration: z.number().optional(),
});

// Enhanced AI validation schemas
const typeaheadSchema = z.object({
  query: z.string().min(0, 'Query can be empty for initial suggestions').max(100, 'Query too long'),
  limit: z.number().min(1).max(20).optional(),
});

const searchSuggestionsSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  limit: z.number().min(1).max(10).optional(),
  userContext: z.object({
    recentSearches: z.array(z.string()).optional(),
    location: z.string().optional(),
    preferences: z.array(z.string()).optional(),
  }).optional(),
});

// Authentication validation schemas
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
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

// Full onboarding schema for complete profile setup
const fullOnboardingSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, apostrophes, and hyphens'),
  lastName: z.string()
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Last name can only contain letters, spaces, apostrophes, and hyphens')
    .optional(),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().min(1, 'City is required'),
    pincode: z.string()
      .min(4, 'Pincode must be at least 4 characters')
      .max(10, 'Pincode cannot exceed 10 characters'),
  }),
  email: z.string()
    .email('Valid email address is required')
    .optional()
    .or(z.literal('')),
});

// Simplified onboarding schema for initial name collection (matches frontend)
const simpleOnboardingSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name should contain only letters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name should contain only letters'),
});

const emailUpdateSchema = z.object({
  email: z.string()
    .email('Valid email address is required')
    .min(1, 'Email address is required'),
});

const locationUpdateSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().min(1, 'City is required'),
    address: z.string().min(1, 'Address is required'),
    pincode: z.string().optional(),
  }),
});

// Admin validation schemas
const adminUserUpdateSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, apostrophes, and hyphens')
    .optional(),
  lastName: z.string()
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Last name can only contain letters, spaces, apostrophes, and hyphens')
    .optional(),
  email: z.string()
    .email('Valid email address is required')
    .optional(),
  phone: z.string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international format')
    .optional(),
  isActive: z.boolean().optional(),
  walletBalance: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid wallet balance format')
    .optional(),
  fixiPoints: z.number().min(0, 'FixiPoints cannot be negative').optional(),
  profileImageUrl: z.string().url('Invalid profile image URL').optional(),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().min(1, 'City is required'),
    pincode: z.string().optional(),
  }).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

const adminRoleUpdateSchema = z.object({
  role: z.enum(['user', 'service_provider', 'parts_provider', 'admin'], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role specified',
  }),
}).strict();

const adminVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Verification status is required',
    invalid_type_error: 'Status must be either approved or rejected',
  }),
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
}).strict();

const adminRefundSchema = z.object({
  amount: z.number()
    .min(1, 'Refund amount must be greater than ₹0')
    .max(100000, 'Refund amount cannot exceed ₹1,00,000')
    .multipleOf(0.01, 'Amount must be in valid currency format')
    .optional(),
  reason: z.string()
    .min(5, 'Refund reason must be at least 5 characters')
    .max(200, 'Refund reason cannot exceed 200 characters')
    .optional()
    .transform((val) => val?.trim() || 'Admin processed refund'),
}).strict();

// Validation middleware factory
function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.errors
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Validation error' });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Setup Replit Auth
  await setupAuth(app);
  
  // Initialize essential data for production (categories and settings only)
  if (process.env.NODE_ENV !== 'production') {
    console.log("🌱 Development mode: Initializing seed data...");
    await storage.seedData();
  } else {
    console.log("🚀 Production mode: Initializing essential categories only...");
    try {
      await storage.seedData(); // Creates only categories and essential settings
    } catch (error) {
      console.error("❌ Failed to initialize production categories:", error);
    }
  }

  // Security middleware - more permissive in development
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://fixitquick.vercel.app', 'https://fixitquick.netlify.app']
      : ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
  }));
  // Note: Apply rate limiting selectively to specific routes, not globally

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (user) {
        // Add displayName field by combining firstName and lastName
        const userWithDisplayName = {
          ...user,
          displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
        };
        res.json(userWithDisplayName);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Development authentication bypass - ONLY FOR DEVELOPMENT
  // Multiple safeguards to prevent accidental production exposure
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowDevAuth = process.env.ALLOW_DEV_AUTH === 'true';
  const isDevAuthEnabled = isDevelopment && allowDevAuth;
  
  // CRITICAL: Fail-safe checks to prevent production exposure
  if (process.env.NODE_ENV === 'production' && allowDevAuth) {
    console.error('🚨 CRITICAL SECURITY ERROR: ALLOW_DEV_AUTH is enabled in production!');
    console.error('🚨 This creates a massive security vulnerability!');
    console.error('🚨 Immediately set ALLOW_DEV_AUTH=false in production!');
    throw new Error('Development authentication bypass detected in production environment');
  }
  
  if (isDevAuthEnabled) {
    // Loud warning banners when dev auth is enabled
    console.log('\n'.repeat(3));
    console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
    console.log('🚨                 DEVELOPMENT AUTH BYPASS ENABLED               🚨');
    console.log('🚨                    MAJOR SECURITY VULNERABILITY!              🚨');
    console.log('🚨                                                               🚨');
    console.log('🚨  NEVER enable this in production environments!               🚨');
    console.log('🚨  To disable: set ALLOW_DEV_AUTH=false                        🚨');
    console.log('🚨                                                               🚨');
    console.log('🚨  Dev endpoints enabled:                                       🚨');
    console.log('🚨  - POST /api/dev/login/:userId                               🚨');
    console.log('🚨  - GET /api/dev/auth/user/:userId                            🚨');
    console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
    console.log('\n'.repeat(2));
    app.post('/api/dev/login/:userId', async (req, res) => {
      try {
        // Additional runtime safety check
        if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEV_AUTH !== 'true') {
          console.warn('🚨 Blocked unauthorized dev auth attempt:', {
            NODE_ENV: process.env.NODE_ENV,
            ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          return res.status(403).json({ 
            message: 'Development authentication not enabled',
            error: 'SECURITY_VIOLATION'
          });
        }
        
        const { userId } = req.params;
        
        // Validate userId parameter
        if (!userId || typeof userId !== 'string' || userId.length === 0) {
          return res.status(400).json({ message: 'Invalid user ID provided' });
        }
        
        console.log('🔧 Dev login attempt for userId:', userId, 'from IP:', req.ip);
        
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Create a mock JWT token for development
        const mockToken = `dev-token-${userId}-${Date.now()}`;
        
        res.json({ 
          success: true, 
          user: {
            ...user,
            displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
          },
          token: mockToken,
          message: 'Development login successful',
          warning: 'DEV_AUTH_BYPASS_ACTIVE'
        });
      } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({ message: 'Development login failed' });
      }
    });

    // Development auth/user endpoint that bypasses Replit auth
    app.get('/api/dev/auth/user/:userId', async (req, res) => {
      try {
        // Additional runtime safety check
        if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEV_AUTH !== 'true') {
          console.warn('🚨 Blocked unauthorized dev auth user fetch:', {
            NODE_ENV: process.env.NODE_ENV,
            ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          return res.status(403).json({ 
            message: 'Development authentication not enabled',
            error: 'SECURITY_VIOLATION'
          });
        }
        
        const { userId } = req.params;
        
        // Validate userId parameter
        if (!userId || typeof userId !== 'string' || userId.length === 0) {
          return res.status(400).json({ message: 'Invalid user ID provided' });
        }
        
        console.log('🔧 Dev user fetch for userId:', userId, 'from IP:', req.ip);
        
        const user = await storage.getUser(userId);
        
        if (user) {
          const userWithDisplayName = {
            ...user,
            displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
          };
          res.json(userWithDisplayName);
        } else {
          res.json(null);
        }
      } catch (error) {
        console.error("Error fetching dev user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });

    console.log('🔧 Development authentication bypass ENABLED');
    console.log('🔧 Available endpoints:');
    console.log('🔧   POST /api/dev/login/:userId - Simulate user login');
    console.log('🔧   GET /api/dev/auth/user/:userId - Get user data directly');
    console.log('🔧 To disable dev auth: set ALLOW_DEV_AUTH=false');
    console.log('\n');
  } else if (isDevelopment && !allowDevAuth) {
    console.log('🔒 Development authentication bypass DISABLED (ALLOW_DEV_AUTH not set)');
    console.log('🔒 To enable dev auth in development: set ALLOW_DEV_AUTH=true');
  }

  // Cart routes
  app.get('/api/v1/cart', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // For now, return empty cart as cart is managed on frontend with localStorage
      // This can be extended to store cart in database for cross-device sync
      res.json({ items: [], subtotal: 0, tax: 0, discount: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  app.post('/api/v1/cart/add', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart addition is handled on frontend for now
      // This endpoint can be extended for server-side cart management
      res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.put('/api/v1/cart/update', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart updates are handled on frontend for now
      res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ message: 'Failed to update cart' });
    }
  });

  app.delete('/api/v1/cart/remove', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart item removal is handled on frontend for now
      res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  app.delete('/api/v1/cart/clear', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart clearing is handled on frontend for now
      res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // Development helper routes (only in development)
  if (process.env.NODE_ENV === 'development') {
    // GET /api/dev/otp-status - Development helper for OTP system status
    app.get('/api/dev/otp-status', async (req, res) => {
      try {
        const stats = await twilioService.getStatistics(24);
        const envVars = {
          TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN, 
          TWILIO_FROM_NUMBER: !!process.env.TWILIO_FROM_NUMBER,
          TWILIO_DEV_FALLBACK: process.env.TWILIO_DEV_FALLBACK,
          SKIP_OTP_RATE_LIMIT: process.env.SKIP_OTP_RATE_LIMIT,
          NODE_ENV: process.env.NODE_ENV
        };
        
        res.json({
          success: true,
          statistics: stats,
          environment: envVars,
          recommendations: {
            forTrialAccounts: 'Set TWILIO_DEV_FALLBACK=true to enable console fallback',
            forRateLimiting: 'Set SKIP_OTP_RATE_LIMIT=true to skip rate limits in development',
            phoneFormat: 'Use E.164 format: +[country code][number] (e.g., +919876543210)'
          }
        });
      } catch (error) {
        console.error('Error getting OTP status:', error);
        res.status(500).json({ success: false, message: 'Failed to get OTP status' });
      }
    });
  }

  // Authentication routes
  
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
        
        // Add development hints for common issues
        if (process.env.NODE_ENV === 'development') {
          if (result.message?.includes('unverified') || result.message?.includes('trial')) {
            enhancedMessage += ' [DEV TIP: Set TWILIO_DEV_FALLBACK=true to enable console logging fallback]';
          } else if (result.message?.includes('phone number format')) {
            enhancedMessage += ' [DEV TIP: Use format +[country code][number], e.g., +919876543210]';
          } else if (result.message?.includes('Too many requests')) {
            enhancedMessage += ' [DEV TIP: Set SKIP_OTP_RATE_LIMIT=true to skip rate limiting in development]';
          }
        }
        
        return res.status(statusCode).json({
          success: false,
          message: enhancedMessage,
          canResend: result.canResend,
          nextResendAt: result.nextResendAt,
          environment: process.env.NODE_ENV || 'development'
        });
      }

      res.json({
        success: true,
        message: result.message,
        challengeId: result.challengeId,
        canResend: result.canResend,
        nextResendAt: result.nextResendAt,
        environment: process.env.NODE_ENV || 'development'
      });

    } catch (error) {
      console.error('Error requesting OTP:', error);
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
        console.log('🚨 OTP Verification failed:', {
          message: verifyResult.message,
          remainingAttempts: verifyResult.remainingAttempts,
          isExpired: verifyResult.isExpired,
          isLocked: verifyResult.isLocked
        });
        return res.status(400).json({
          success: false,
          message: verifyResult.message,
          remainingAttempts: verifyResult.remainingAttempts,
          isExpired: verifyResult.isExpired,
          isLocked: verifyResult.isLocked
        });
      }

      // Check if user exists
      let user = await storage.getUserByPhone(phone);
      let isNewUser = false;
      let needsOnboarding = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        needsOnboarding = true;
        user = await storage.createUser({
          phone,
          role: 'user',
          isVerified: true,
          walletBalance: '0.00',
          fixiPoints: 0,
          isActive: true,
        });
      } else {
        // Update existing user verification status
        user = await storage.updateUser(user.id, { 
          isVerified: true,
          lastLoginAt: new Date()
        }) || user;
        
        // Check if user needs onboarding (missing essential info)
        needsOnboarding = !user.firstName || !user.location;
      }

      // Generate JWT token pair
      const tokenPair = await jwtService.generateTokenPair(
        user.id,
        user.phone!,
        user.role || 'user',
        { ip, userAgent }
      );

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', tokenPair.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
      });

      // Return access token and user data (NEVER refresh token in JSON)
      res.json({
        success: true,
        message: 'Phone number verified successfully',
        accessToken: tokenPair.accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          walletBalance: user.walletBalance,
          fixiPoints: user.fixiPoints,
          location: user.location,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        isNewUser,
        needsOnboarding
      });

    } catch (error) {
      console.error('Error verifying OTP - Full details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.'
      });
    }
  });

  // POST /api/v1/auth/refresh - Rotate tokens with cookie handling
  app.post('/api/v1/auth/refresh', async (req: Request, res: Response) => {
    try {
      // Debug logging for cookie parsing
      console.log('Refresh endpoint - cookies object:', req.cookies ? 'present' : 'undefined');
      console.log('Refresh endpoint - cookie count:', req.cookies ? Object.keys(req.cookies).length : 0);
      
      const refreshTokenFromCookie = req.cookies?.refreshToken;
      
      if (!refreshTokenFromCookie) {
        console.log('Refresh endpoint - No refresh token found in cookies');
        return res.status(401).json({
          success: false,
          message: 'No refresh token provided'
        });
      }

      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Refresh access token
      const refreshResult = await jwtService.refreshAccessToken(refreshTokenFromCookie, { ip, userAgent });
      
      if (!refreshResult) {
        // Clear invalid cookie
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/'
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token. Please log in again.'
        });
      }

      // Set new httpOnly cookie for new refresh token
      res.cookie('refreshToken', refreshResult.newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
      });

      // Get updated user data
      const user = await storage.getUser(refreshResult.userId);
      
      res.json({
        success: true,
        accessToken: refreshResult.accessToken,
        user: user ? {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          walletBalance: user.walletBalance,
          fixiPoints: user.fixiPoints,
          location: user.location,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        } : null
      });

    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Clear any potentially invalid cookies
      if (req.cookies?.refreshToken) {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  });

  // POST /api/v1/auth/logout - Clear httpOnly cookies
  app.post('/api/v1/auth/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refreshTokenFromCookie = req.cookies?.refreshToken;
      
      // Revoke refresh token if present
      if (refreshTokenFromCookie) {
        await jwtService.revokeRefreshToken(refreshTokenFromCookie);
      }

      // Clear httpOnly cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  });

  // GET /api/v1/auth/me - Get authenticated user
  app.get('/api/v1/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          walletBalance: user.walletBalance,
          fixiPoints: user.fixiPoints,
          location: user.location,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      });

    } catch (error) {
      console.error('Error fetching authenticated user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user information'
      });
    }
  });

  // POST /api/v1/auth/onboarding - Complete user profile after phone verification
  app.post('/api/v1/auth/onboarding', authMiddleware, validateBody(simpleOnboardingSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { firstName, lastName } = req.body;

      // Get current user to verify they exist
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user profile with onboarding data
      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });

      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update user profile'
        });
      }

      res.json({
        success: true,
        message: 'Profile completed successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          walletBalance: updatedUser.walletBalance,
          fixiPoints: updatedUser.fixiPoints,
          location: updatedUser.location,
          profileImageUrl: updatedUser.profileImageUrl,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          lastLoginAt: updatedUser.lastLoginAt
        }
      });

    } catch (error) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete profile. Please try again.'
      });
    }
  });

  // ========================================
  // COMPREHENSIVE PROFILE MANAGEMENT ENDPOINTS
  // ========================================

  // Profile update validation schema
  const profileUpdateSchema = z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
    email: z.string()
      .email('Please enter a valid email address')
      .min(1, 'Email address is required'),
  });

  // PATCH /api/v1/users/me/profile - Update user profile
  app.patch('/api/v1/users/me/profile', authMiddleware, validateBody(profileUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { firstName, lastName, email } = req.body;

      // Check if email is already used by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already in use'
          });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        email: email?.trim()
      });

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          walletBalance: updatedUser.walletBalance,
          fixiPoints: updatedUser.fixiPoints,
          location: updatedUser.location,
          profileImageUrl: updatedUser.profileImageUrl,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          lastLoginAt: updatedUser.lastLoginAt
        }
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile. Please try again.'
      });
    }
  });

  // POST /api/v1/users/me/avatar - Upload user avatar
  app.post('/api/v1/users/me/avatar', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Return 501 Not Implemented since avatar upload requires object storage integration
      return res.status(501).json({
        success: false,
        message: 'Avatar upload functionality is not yet implemented',
        note: 'This feature requires object storage integration and will be available soon'
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar. Please try again.'
      });
    }
  });

  // ========================================
  // USER ADDRESS MANAGEMENT ENDPOINTS
  // ========================================

  // GET /api/v1/users/me/addresses - Get user addresses
  app.get('/api/v1/users/me/addresses', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const addresses = await storage.getUserAddresses(userId);
      
      res.json({
        success: true,
        addresses
      });

    } catch (error) {
      console.error('Error fetching addresses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addresses'
      });
    }
  });

  // POST /api/v1/users/me/addresses - Create new address
  app.post('/api/v1/users/me/addresses', authMiddleware, validateBody(insertUserAddressSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const addressData = {
        ...req.body,
        userId
      };

      const newAddress = await storage.createUserAddress(addressData);
      
      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        address: newAddress
      });

    } catch (error) {
      console.error('Error creating address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create address'
      });
    }
  });

  // PATCH /api/v1/users/me/addresses/:addressId - Update address
  app.patch('/api/v1/users/me/addresses/:addressId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Verify address belongs to user
      const existingAddress = await storage.getUserAddress(addressId);
      if (!existingAddress || existingAddress.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const updatedAddress = await storage.updateUserAddress(addressId, req.body);
      
      if (!updatedAddress) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      res.json({
        success: true,
        message: 'Address updated successfully',
        address: updatedAddress
      });

    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update address'
      });
    }
  });

  // DELETE /api/v1/users/me/addresses/:addressId - Delete address
  app.delete('/api/v1/users/me/addresses/:addressId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Verify address belongs to user
      const existingAddress = await storage.getUserAddress(addressId);
      if (!existingAddress || existingAddress.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      await storage.deleteUserAddress(addressId);
      
      res.json({
        success: true,
        message: 'Address deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete address'
      });
    }
  });

  // PATCH /api/v1/users/me/addresses/:addressId/default - Set default address
  app.patch('/api/v1/users/me/addresses/:addressId/default', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Verify address belongs to user
      const existingAddress = await storage.getUserAddress(addressId);
      if (!existingAddress || existingAddress.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      await storage.setDefaultAddress(userId, addressId);
      
      res.json({
        success: true,
        message: 'Default address updated successfully'
      });

    } catch (error) {
      console.error('Error setting default address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set default address'
      });
    }
  });

  // ========================================
  // USER NOTIFICATION PREFERENCES ENDPOINTS
  // ========================================

  // GET /api/v1/users/me/notifications/preferences - Get notification preferences
  app.get('/api/v1/users/me/notifications/preferences', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const preferences = await storage.getUserNotificationPreferences(userId);
      
      // Return default preferences if none exist
      if (!preferences) {
        const defaultPreferences = {
          pushNotifications: true,
          emailNotifications: true,
          smsNotifications: false,
          whatsappNotifications: true,
          orderUpdates: true,
          promotions: true,
          serviceReminders: true,
          paymentAlerts: true,
          securityAlerts: true,
          newsAndUpdates: false,
          soundEnabled: true,
          vibrationEnabled: true,
          timezone: 'Asia/Kolkata'
        };
        
        res.json({
          success: true,
          preferences: defaultPreferences
        });
      } else {
        res.json({
          success: true,
          preferences
        });
      }

    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification preferences'
      });
    }
  });

  // PUT /api/v1/users/me/notifications/preferences - Update notification preferences
  app.put('/api/v1/users/me/notifications/preferences', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updatedPreferences = await storage.upsertUserNotificationPreferences(userId, req.body);
      
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: updatedPreferences
      });

    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  });

  // TODO: Implement localized content following backend guidelines
  // - Define proper schemas in shared/schema.ts first
  // - Add Zod validation schemas  
  // - Update IStorage interface with proper typing
  // - Implement methods following established patterns

  app.post('/api/v1/auth/login', validateBody(loginSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uid, email, firstName, lastName, profileImageUrl } = req.body;
      
      // Check if user exists
      let user = await storage.getUser(uid);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          profileImageUrl,
          role: 'user',
          isVerified: false,
          walletBalance: '0.00',
          fixiPoints: 0,
          isActive: true,
        });
      } else {
        // Update existing user
        user = await storage.updateUser(uid, {
          email,
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          profileImageUrl: profileImageUrl || user.profileImageUrl,
        }) || user;
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/v1/auth/user', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // WebSocket token endpoint for secure WebSocket authentication
  app.post('/api/v1/auth/ws-token', isAuthenticated, async (req: any, res: Response) => {
    try {
      console.log('🔐 WebSocket token request:', {
        isAuth: req.isAuthenticated(),
        user: req.user ? 'present' : 'missing',
        claims: req.user?.claims ? 'present' : 'missing',
        sub: req.user?.claims?.sub
      });
      
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        console.log('❌ WebSocket token: No userId found');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user exists and is active
      const user = await storage.getUser(userId);
      if (!user || !user.isActive) {
        return res.status(404).json({ message: 'User not found or inactive' });
      }

      // Generate JWT token for WebSocket authentication
      const payload = {
        userId: user.id,
        role: user.role,
        email: user.email,
        timestamp: Date.now(),
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-for-development';
      const token = jwt.sign(payload, sessionSecret);

      res.json({ 
        token,
        expiresAt: new Date(payload.exp).toISOString()
      });
    } catch (error) {
      console.error('Error generating WebSocket token:', error);
      res.status(500).json({ message: 'Failed to generate WebSocket token' });
    }
  });

  // END OF AUTHENTICATION ROUTES - All duplicates below this will be removed

  // PATCH /api/v1/users/me/email - Update user email
  app.patch('/api/v1/users/me/email', authMiddleware, validateBody(emailUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          message: 'Unauthorized' 
        });
      }

      const { email } = req.body;

      // Check if email is already used by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use'
        });
      }

      // Update user email
      const updatedUser = await storage.updateUser(userId, { email });

      if (!updatedUser) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        message: 'Email updated successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          walletBalance: updatedUser.walletBalance,
          fixiPoints: updatedUser.fixiPoints,
          location: updatedUser.location,
          profileImageUrl: updatedUser.profileImageUrl
        }
      });
    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update email' 
      });
    }
  });

  // Update user location
  app.patch('/api/v1/auth/location', authMiddleware, validateBody(locationUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          message: 'Unauthorized' 
        });
      }

      const { location } = req.body;

      // Update user location
      const updatedUser = await storage.updateUser(userId, { location });

      if (!updatedUser) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          walletBalance: updatedUser.walletBalance,
          fixiPoints: updatedUser.fixiPoints,
          location: updatedUser.location,
          profileImageUrl: updatedUser.profileImageUrl
        }
      });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update location' 
      });
    }
  });

  // AI Search routes
  app.post('/api/v1/search', authMiddleware, validateBody(searchSchema), async (req, res) => {
    try {
      const { query, filters } = req.body;
      const results = await aiService.searchServices(query, filters);
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  // Enhanced AI Search - with context awareness and database integration
  app.post('/api/v1/ai/search', validateBody(enhancedSearchSchema), async (req, res) => {
    try {
      const { query, context, filters } = req.body;
      const userId = req.user?.id; // Optional user context

      // Track search query for analytics
      if (userId || context?.userId) {
        storage.trackSearchQuery(userId || context?.userId || null, query, 0);
      }

      // Perform enhanced search with AI insights
      const searchResults = await (aiService as any).enhancedSearch(query, {
        ...context,
        userId: userId || context?.userId,
      });

      // Update search tracking with result count
      if (userId || context?.userId) {
        storage.trackSearchQuery(
          userId || context?.userId || null, 
          query, 
          searchResults.totalResults,
          context?.searchType
        );
      }

      res.json({
        success: true,
        query,
        results: searchResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Enhanced search error:', error);
      res.status(500).json({ message: 'Enhanced search failed' });
    }
  });

  // Get personalized suggestions for user
  app.get('/api/v1/ai/suggestions', optionalAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        // Return default suggestions when not authenticated
        return res.json({
          success: true,
          suggestions: [
            { query: 'AC repair', count: 156 },
            { query: 'plumbing services', count: 142 },
            { query: 'phone screen replacement', count: 98 },
            { query: 'laptop battery', count: 87 },
            { query: 'washing machine repair', count: 76 }
          ]
        });
      }

      const { type = 'mixed', limit = 10 } = req.query;

      const suggestions = await storage.getPersonalizedSuggestions(
        userId,
        type as 'services' | 'parts' | 'mixed',
        parseInt(limit as string)
      );

      res.json({
        success: true,
        suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      res.status(500).json({ message: 'Failed to get suggestions' });
    }
  });

  // Get trending items curated by AI
  app.get('/api/v1/ai/trending', async (req, res) => {
    try {
      const { type = 'mixed', limit = 10 } = req.query;

      const trending = await storage.getTrendingItems(
        type as 'services' | 'parts' | 'mixed',
        parseInt(limit as string)
      );

      res.json({
        success: true,
        trending,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting trending items:', error);
      res.status(500).json({ message: 'Failed to get trending items' });
    }
  });

  // Get similar items based on AI recommendations
  app.post('/api/v1/ai/similar', validateBody(similarItemsSchema), async (req, res) => {
    try {
      const { itemId, itemType, limit = 5 } = req.body;

      const similar = await storage.getSimilarItems(itemId, itemType, limit);

      res.json({
        success: true,
        similar,
        itemId,
        itemType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting similar items:', error);
      res.status(500).json({ message: 'Failed to get similar items' });
    }
  });

  // Get search suggestions as user types
  app.get('/api/v1/ai/search-suggestions', async (req, res) => {
    try {
      const { query, userId } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const suggestions = await storage.getSearchSuggestions(query, userId as string);

      res.json({
        success: true,
        suggestions,
        query,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      res.status(500).json({ message: 'Failed to get search suggestions' });
    }
  });

  // Get user's search history
  app.get('/api/v1/ai/search-history', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { limit = 10 } = req.query;

      const history = await storage.getUserSearchHistory(
        userId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting search history:', error);
      res.status(500).json({ message: 'Failed to get search history' });
    }
  });

  // Enhanced typeahead suggestions with AI and caching
  app.get('/api/v1/ai/typeahead', async (req, res) => {
    try {
      const query = req.query.query as string || '';
      const limit = parseInt(req.query.limit as string) || 8;

      // Validate parameters
      const validation = typeaheadSchema.safeParse({ query, limit });
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: validation.error.errors
        });
      }

      console.log(`🔍 Typeahead request: "${query}" (limit: ${limit})`);

      const result = await openRouterService.generateTypeaheadSuggestions(query, limit);

      res.json({
        success: true,
        query,
        suggestions: result.suggestions,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in typeahead endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Typeahead service temporarily unavailable'
      });
    }
  });

  // Enhanced search suggestions with contextual AI (replaces the simpler version)
  app.post('/api/v1/ai/enhanced-search-suggestions', validateBody(searchSuggestionsSchema), async (req, res) => {
    try {
      const { query, limit = 5, userContext } = req.body;

      console.log(`🎯 Enhanced search suggestions request: "${query}" with context:`, userContext);

      const result = await openRouterService.generateSearchSuggestions(query, limit, userContext);

      res.json({
        success: true,
        query,
        suggestions: result.suggestions,
        cached: result.cached,
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('Error in enhanced search suggestions endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Enhanced search suggestions temporarily unavailable'
      });
    }
  });

  // AI cache statistics for monitoring
  app.get('/api/v1/ai/cache-stats', requireRole(['admin']), async (req, res) => {
    try {
      const stats = openRouterService.getCacheStats();

      res.json({
        success: true,
        cache: {
          ...stats,
          cacheTimeout: '3 minutes',
          provider: 'OpenRouter + DeepSeek',
          model: 'deepseek/deepseek-chat-v3.1:free'
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cache statistics'
      });
    }
  });

  // Get popular search queries across all users
  app.get('/api/v1/ai/popular-searches', async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const popular = await storage.getPopularSearchQueries(
        parseInt(limit as string)
      );

      res.json({
        success: true,
        popular,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting popular searches:', error);
      res.status(500).json({ message: 'Failed to get popular searches' });
    }
  });

  // Analytics endpoint for search behavior tracking
  app.post('/api/v1/ai/search-analytics', validateBody(searchAnalyticsSchema), async (req, res) => {
    try {
      const { query, results, category, clicked, duration } = req.body;
      const userId = req.user?.id || null;

      // Track search analytics
      await storage.trackSearchQuery(userId, query, results, category);

      // Store additional analytics in app settings if needed
      const analyticsKey = `search_analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await storage.setSetting(analyticsKey, {
        userId,
        query,
        results,
        category,
        clicked,
        duration,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }, 'Search analytics tracking');

      res.json({
        success: true,
        message: 'Analytics tracked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking search analytics:', error);
      res.status(500).json({ message: 'Failed to track analytics' });
    }
  });

  app.post('/api/v1/ai/generate-icon', authMiddleware, validateBody(iconGenerationSchema), async (req, res) => {
    try {
      const { name, category, style } = req.body;
      const icon = await aiService.generateServiceIcon(name, category, style);
      res.json({ icon });
    } catch (error) {
      console.error('Icon generation error:', error);
      res.status(500).json({ message: 'Icon generation failed' });
    }
  });

  // Service routes
  app.get('/api/v1/services/categories', async (req, res) => {
    try {
      const categories = await storage.getServiceCategories(true);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // GET /api/v1/services/categories/main - Get main categories (level 0) for public use
  app.get('/api/v1/services/categories/main', async (req, res) => {
    try {
      const mainCategories = await storage.getMainCategories();
      res.json(mainCategories);
    } catch (error) {
      console.error('Error fetching main categories:', error);
      res.status(500).json({ message: 'Failed to fetch main categories' });
    }
  });

  // GET /api/v1/services/categories/:id - Get single category by ID for public use
  app.get('/api/v1/services/categories/:id', async (req, res) => {
    try {
      const categoryId = req.params.id;
      const category = await storage.getServiceCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ message: 'Failed to fetch category' });
    }
  });

  // GET /api/v1/services/categories/:categoryId/subcategories - Get subcategories for a main category
  app.get('/api/v1/services/categories/:categoryId/subcategories', async (req, res) => {
    try {
      const categoryId = req.params.categoryId;
      const subcategories = await storage.getSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  app.get('/api/v1/services', async (req, res) => {
    try {
      const { category, sortBy, priceRange } = req.query;
      
      // Get services with filters
      let services = await storage.getServices({
        categoryId: category as string,
        isActive: true
      });
      
      // Apply price filtering
      if (priceRange && priceRange !== 'all') {
        services = services.filter(service => {
          const price = parseFloat(service.basePrice);
          switch (priceRange) {
            case 'low': return price <= 100;
            case 'medium': return price > 100 && price <= 300;
            case 'high': return price > 300;
            default: return true;
          }
        });
      }
      
      // Apply sorting
      if (sortBy) {
        services.sort((a, b) => {
          switch (sortBy) {
            case 'price-low': return parseFloat(a.basePrice) - parseFloat(b.basePrice);
            case 'price-high': return parseFloat(b.basePrice) - parseFloat(a.basePrice);
            case 'rating': return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
            case 'popular': return (b.totalBookings || 0) - (a.totalBookings || 0);
            default: return 0;
          }
        });
      }
      
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  });

  app.get('/api/v1/services/suggested', optionalAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        // Return default suggested services when not authenticated
        const defaultServices = await storage.getServices({ isActive: true });
        const suggested = defaultServices.slice(0, 6);
        return res.json(suggested);
      }
      
      // Get user's recent orders for personalization
      const recentOrders = await storage.getRecentOrders(userId, 5);
      
      if (recentOrders.length === 0) {
        // If no history, return popular services
        const popularServices = await storage.getServices({ isActive: true });
        return res.json(popularServices.slice(0, 6));
      }
      
      // Extract categories from recent orders
      const recentCategories = recentOrders
        .map(order => order.items?.map((item: any) => item.categoryId) || [])
        .flat();
      
      // Get services from those categories
      let suggested = [];
      for (const categoryId of Array.from(new Set(recentCategories))) {
        const categoryServices = await storage.getServicesByCategory(categoryId);
        suggested.push(...categoryServices.slice(0, 2));
      }
      
      // Fill with general popular services if needed
      if (suggested.length < 6) {
        const popularServices = await storage.getServices({ isActive: true });
        suggested.push(...popularServices.slice(0, 6 - suggested.length));
      }
      
      res.json(suggested.slice(0, 6));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  });

  // Get individual service details
  app.get('/api/v1/services/:serviceId', async (req, res) => {
    try {
      const { serviceId } = req.params;
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      res.json(service);
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ message: 'Failed to fetch service' });
    }
  });

  // Get service providers for a specific service
  app.get('/api/v1/service-providers/:serviceId', async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // First get the service to find its category
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      // Get providers for this service category
      const providers = await storage.getServiceProviders({
        categoryId: service.categoryId ?? '',
        isVerified: true
      });
      
      // Enhance provider data with user information
      const enhancedProviders = await Promise.all(
        providers.map(async (provider) => {
          const user = await storage.getUser(provider.userId ?? '');
          return {
            ...provider,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
          };
        })
      );
      
      res.json(enhancedProviders);
    } catch (error) {
      console.error('Error fetching service providers:', error);
      res.status(500).json({ message: 'Failed to fetch service providers' });
    }
  });

  // Parts Catalog Routes (Customer-facing)
  app.get('/api/v1/parts/categories', async (req, res) => {
    try {
      const categories = await storage.getPartsCategories(true);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching parts categories:', error);
      res.status(500).json({ message: 'Failed to fetch parts categories' });
    }
  });

  app.get('/api/v1/parts', async (req, res) => {
    try {
      const { category, sortBy, priceRange, inStock, search } = req.query;
      
      // Get parts with filters
      let parts = await storage.getParts({
        categoryId: category as string,
        isActive: true
      });

      // Filter by stock availability
      if (inStock === 'true') {
        parts = parts.filter(part => (part.stock || 0) > 0);
      }

      // Apply search filtering
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        parts = parts.filter(part => 
          part.name.toLowerCase().includes(searchTerm) ||
          part.description?.toLowerCase().includes(searchTerm) ||
          JSON.stringify(part.specifications || {}).toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply price filtering
      if (priceRange && priceRange !== 'all') {
        parts = parts.filter(part => {
          const price = parseFloat(part.price);
          switch (priceRange) {
            case 'low': return price <= 500;
            case 'medium': return price > 500 && price <= 2000;
            case 'high': return price > 2000;
            default: return true;
          }
        });
      }
      
      // Apply sorting
      if (sortBy) {
        parts.sort((a, b) => {
          switch (sortBy) {
            case 'price-low': return parseFloat(a.price) - parseFloat(b.price);
            case 'price-high': return parseFloat(b.price) - parseFloat(a.price);
            case 'rating': return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
            case 'popular': return (b.totalSold || 0) - (a.totalSold || 0);
            case 'newest': return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
            default: return 0;
          }
        });
      }
      
      res.json(parts);
    } catch (error) {
      console.error('Error fetching parts:', error);
      res.status(500).json({ message: 'Failed to fetch parts' });
    }
  });

  app.get('/api/v1/parts/:partId', async (req, res) => {
    try {
      const { partId } = req.params;
      const part = await storage.getPart(partId);
      
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }

      // Check if part is active and in stock
      if (!part.isActive) {
        return res.status(404).json({ message: 'Part not available' });
      }

      // Get provider information
      let providerInfo = null;
      if (part.providerId) {
        const provider = await storage.getUser(part.providerId);
        if (provider) {
          providerInfo = {
            id: provider.id,
            name: `${provider.firstName ?? ''} ${provider.lastName ?? ''}`.trim(),
            isVerified: provider.isVerified || false,
          };
        }
      }

      // Get related parts (same category, different provider)
      const relatedParts = await storage.getParts({
        categoryId: part.categoryId ?? undefined,
        isActive: true
      });
      
      const filteredRelated = relatedParts
        .filter(p => p.id !== part.id && (p.stock || 0) > 0)
        .slice(0, 4); // Limit to 4 related parts

      res.json({
        ...part,
        provider: providerInfo,
        relatedParts: filteredRelated,
      });
    } catch (error) {
      console.error('Error fetching part:', error);
      res.status(500).json({ message: 'Failed to fetch part' });
    }
  });

  app.post('/api/v1/parts/search', authMiddleware, async (req, res) => {
    try {
      const { query, filters } = req.body;
      
      // Get all active parts
      let parts = await storage.getParts({ isActive: true });

      // Apply text search
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        parts = parts.filter(part => 
          part.name.toLowerCase().includes(searchTerm) ||
          part.description?.toLowerCase().includes(searchTerm) ||
          JSON.stringify(part.specifications || {}).toLowerCase().includes(searchTerm)
        );
      }

      // Apply filters
      if (filters) {
        if (filters.category) {
          parts = parts.filter(part => part.categoryId === filters.category);
        }
        if (filters.priceRange) {
          const [min, max] = filters.priceRange.split('-').map(Number);
          parts = parts.filter(part => {
            const price = parseFloat(part.price);
            return price >= min && (max ? price <= max : true);
          });
        }
        if (filters.inStock) {
          parts = parts.filter(part => (part.stock || 0) > 0);
        }
      }

      // Score by relevance (basic implementation)
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        parts = parts.map(part => ({
          ...part,
          _relevanceScore: (
            (part.name.toLowerCase().includes(searchTerm) ? 10 : 0) +
            (part.description?.toLowerCase().includes(searchTerm) ? 5 : 0) +
            (JSON.stringify(part.specifications || {}).toLowerCase().includes(searchTerm) ? 3 : 0)
          )
        })).sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
      }

      res.json(parts);
    } catch (error) {
      console.error('Parts search error:', error);
      res.status(500).json({ message: 'Parts search failed' });
    }
  });

  // Order routes
  app.get('/api/v1/orders', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { status } = req.query;
      
      const orders = await storage.getOrdersByUser(userId ?? '', status as string);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/v1/orders/recent', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const orders = await storage.getRecentOrders(userId ?? '', 3);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ message: 'Failed to fetch recent orders' });
    }
  });

  app.post('/api/v1/orders', authMiddleware, validateBody(insertOrderSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { items, totalAmount, ...otherOrderData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
      }

      // SECURITY: Validate inventory availability before creating order
      const inventoryValidation = await storage.validateInventoryAvailability(items);
      if (!inventoryValidation.valid) {
        return res.status(400).json({
          message: 'Inventory validation failed',
          errors: inventoryValidation.errors,
          unavailableItems: inventoryValidation.unavailableItems
        });
      }

      // SECURITY: Validate pricing to prevent fraud
      const pricingValidation = await storage.validateOrderPricing(items);
      if (!pricingValidation.valid) {
        return res.status(400).json({
          message: 'Price validation failed - prices may have changed',
          errors: pricingValidation.errors
        });
      }

      // SECURITY: Use server-calculated total, not client-provided total
      const serverCalculatedTotal = pricingValidation.calculatedTotal;
      const clientProvidedTotal = parseFloat(totalAmount);
      
      // Allow small floating-point differences (within 1 cent)
      if (Math.abs(serverCalculatedTotal - clientProvidedTotal) > 0.01) {
        return res.status(400).json({
          message: 'Total amount mismatch. Please refresh and try again.',
          serverTotal: serverCalculatedTotal.toFixed(2),
          clientTotal: clientProvidedTotal.toFixed(2)
        });
      }

      const orderData = {
        ...otherOrderData,
        items,
        totalAmount: serverCalculatedTotal.toFixed(2), // Use server-calculated amount
        userId,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
      };
      
      const order = await storage.createOrder(orderData);
      
      // Send notification to service providers
      await notificationService.notifyProviders(order);
      
      res.json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  // Get specific order details with enhanced data
  app.get('/api/v1/orders/:orderId', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrderWithDetails(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if user has permission to view this order
      const canView = 
        userRole === 'admin' || 
        order.userId === userId || 
        order.serviceProviderId === userId || 
        order.partsProviderId === userId;
      
      if (!canView) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  });

  // Update order status
  app.put('/api/v1/orders/:orderId/status', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';
      
      // Validate status
      const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions and validate status transitions
      const canUpdateStatus = await storage.validateStatusUpdate(orderId, status, userId ?? '', userRole);
      if (!canUpdateStatus.allowed) {
        return res.status(403).json({ message: canUpdateStatus.reason });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, { 
        status: status as any
      });
      
      // Send notifications on status change
      await notificationService.notifyStatusChange(updatedOrder?.userId ?? '', orderId, status);
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // Assign service provider to order
  app.put('/api/v1/orders/:orderId/assign', authMiddleware, requireRole(['admin', 'service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const { providerId } = req.body;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Auto-assignment for service providers accepting orders
      if (userRole === 'service_provider') {
        const userId = req.user?.id;
        const canAccept = await storage.canProviderAcceptOrder(orderId, userId ?? '');
        if (!canAccept.allowed) {
          return res.status(403).json({ message: canAccept.reason });
        }
        
        const updatedOrder = await storage.assignProviderToOrder(orderId, userId ?? '');
        res.json(updatedOrder);
      } else {
        // Manual assignment by admin
        const updatedOrder = await storage.assignProviderToOrder(orderId, providerId);
        res.json(updatedOrder);
      }
    } catch (error) {
      console.error('Error assigning provider:', error);
      res.status(500).json({ message: 'Failed to assign provider' });
    }
  });

  // Submit order review
  app.post('/api/v1/orders/:orderId/review', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id;
      
      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Only order customer can submit review' });
      }
      
      if (order.status !== 'completed') {
        return res.status(400).json({ message: 'Can only review completed orders' });
      }
      
      const review = await storage.createReview({
        orderId,
        reviewerId: userId,
        revieweeId: order.serviceProviderId || order.partsProviderId || '',
        rating,
        comment: comment || '',
      });
      
      // Update order with review info
      await storage.updateOrder(orderId, { 
        rating,
        review: comment || ''
      });
      
      res.json(review);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  // Cancel order
  app.delete('/api/v1/orders/:orderId', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check cancellation permissions
      const canCancel = await storage.canCancelOrder(orderId, userId ?? '', userRole);
      if (!canCancel.allowed) {
        return res.status(403).json({ message: canCancel.reason });
      }
      
      const cancelledOrder = await storage.updateOrder(orderId, {
        status: 'cancelled'
      });
      
      // Handle refunds if payment was made
      if (order.paymentStatus === 'paid') {
        if (stripePaymentService.isReady()) {
          // Try to process Stripe refund
          try {
            const dbPaymentIntent = await storage.getUserPaymentIntents(order.userId || '').then(intents => 
              intents.find(intent => intent.orderId === orderId && intent.status === 'succeeded')
            );
            
            if (dbPaymentIntent) {
              const refundIdempotencyKey = `refund_${orderId}_${Date.now()}`;
              await stripePaymentService.createRefund({
                paymentIntentId: dbPaymentIntent.stripePaymentIntentId,
                reason: 'Order cancelled',
                idempotencyKey: refundIdempotencyKey
              });
            }
          } catch (error) {
            console.error('Stripe refund failed:', error);
          }
        }
        await storage.updateOrder(orderId, { paymentStatus: 'refunded' });
      }
      
      // Send cancellation notifications
      await notificationService.notifyOrderCancellation(cancelledOrder?.userId ?? '', orderId, 'Order cancelled by user');
      
      res.json({ message: 'Order cancelled successfully', order: cancelledOrder });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  });

  // ============================================================================
  // SERVICE BOOKINGS API - Enhanced booking system with instant vs scheduled
  // ============================================================================

  // Service booking validation schemas
  const serviceBookingCreateSchema = insertServiceBookingSchema.extend({
    serviceLocation: z.object({
      type: z.enum(['current', 'alternate']),
      address: z.string().min(10, 'Address must be at least 10 characters'),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      instructions: z.string().optional(),
      landmarkDetails: z.string().optional(),
    }),
    serviceDetails: z.object({
      basePrice: z.number().min(0),
      estimatedDuration: z.number().min(1),
      workflowSteps: z.array(z.string()),
      specialRequirements: z.array(z.string()).optional(),
    }).optional(),
  });

  const providerMatchingSchema = z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    bookingType: z.enum(['instant', 'scheduled']),
    scheduledAt: z.date().optional(),
    maxDistance: z.number().min(1).max(100).default(25),
    maxProviders: z.number().min(1).max(10).default(5),
  });

  // FRONTEND COMPATIBILITY: Add alias endpoint for find-providers (frontend expects this)
  app.post('/api/v1/service-bookings/find-providers', authMiddleware, validateBody(providerMatchingSchema), async (req, res) => {
    try {
      const {
        serviceId,
        location,
        urgency,
        bookingType,
        scheduledAt,
        maxDistance,
        maxProviders
      } = req.body;

      // Get service details first
      const service = await storage.getService(serviceId);
      if (!service || !service.isActive) {
        return res.status(404).json({ message: 'Service not found or not available' });
      }

      // Check if service allows the requested booking type
      if (bookingType === 'instant' && !service.allowInstantBooking) {
        return res.status(400).json({ message: 'Instant booking not available for this service' });
      }
      if (bookingType === 'scheduled' && !service.allowScheduledBooking) {
        return res.status(400).json({ message: 'Scheduled booking not available for this service' });
      }

      // Find matching providers based on service, location, and availability
      const matchingProviders = await storage.findMatchingProviders({
        serviceId,
        location,
        urgency,
        bookingType,
        scheduledAt,
        maxDistance,
        maxProviders,
      });

      // Calculate estimated arrival times for instant bookings
      if (bookingType === 'instant') {
        for (const provider of matchingProviders) {
          const travelTime = await calculateTravelTime(
            provider.currentLocation || provider.lastKnownLocation,
            location
          );
          provider.estimatedArrival = new Date(Date.now() + travelTime * 60 * 1000);
          provider.estimatedTravelTime = travelTime;
        }
      }

      // Return providers in the format frontend expects
      res.json(matchingProviders);
    } catch (error) {
      console.error('Error finding matching providers:', error);
      res.status(500).json({ message: 'Failed to find matching providers' });
    }
  });

  // Get available providers for a service with distance and availability
  app.post('/api/v1/service-bookings/providers/match', authMiddleware, validateBody(providerMatchingSchema), async (req, res) => {
    try {
      const {
        serviceId,
        location,
        urgency,
        bookingType,
        scheduledAt,
        maxDistance,
        maxProviders
      } = req.body;

      // Get service details first
      const service = await storage.getService(serviceId);
      if (!service || !service.isActive) {
        return res.status(404).json({ message: 'Service not found or not available' });
      }

      // Check if service allows the requested booking type
      if (bookingType === 'instant' && !service.allowInstantBooking) {
        return res.status(400).json({ message: 'Instant booking not available for this service' });
      }
      if (bookingType === 'scheduled' && !service.allowScheduledBooking) {
        return res.status(400).json({ message: 'Scheduled booking not available for this service' });
      }

      // Find matching providers based on service, location, and availability
      const matchingProviders = await storage.findMatchingProviders({
        serviceId,
        location,
        urgency,
        bookingType,
        scheduledAt,
        maxDistance,
        maxProviders,
      });

      // Calculate estimated arrival times for instant bookings
      if (bookingType === 'instant') {
        for (const provider of matchingProviders) {
          const travelTime = await calculateTravelTime(
            provider.currentLocation || provider.lastKnownLocation,
            location
          );
          provider.estimatedArrival = new Date(Date.now() + travelTime * 60 * 1000);
          provider.estimatedTravelTime = travelTime;
        }
      }

      res.json({
        providers: matchingProviders,
        totalFound: matchingProviders.length,
        searchCriteria: {
          serviceId,
          location,
          urgency,
          bookingType,
          maxDistance,
        },
      });
    } catch (error) {
      console.error('Error finding matching providers:', error);
      res.status(500).json({ message: 'Failed to find matching providers' });
    }
  });

  // Create a new service booking with provider matching
  app.post('/api/v1/service-bookings', authMiddleware, validateBody(serviceBookingCreateSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      const bookingData = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get service details and validate
      const service = await storage.getService(bookingData.serviceId);
      if (!service || !service.isActive) {
        return res.status(404).json({ message: 'Service not found or not available' });
      }

      // Validate booking type against service settings
      if (bookingData.bookingType === 'instant' && !service.allowInstantBooking) {
        return res.status(400).json({ message: 'Instant booking not available for this service' });
      }
      if (bookingData.bookingType === 'scheduled' && !service.allowScheduledBooking) {
        return res.status(400).json({ message: 'Scheduled booking not available for this service' });
      }

      // Validate scheduled time for scheduled bookings
      if (bookingData.bookingType === 'scheduled') {
        if (!bookingData.scheduledAt) {
          return res.status(400).json({ message: 'Scheduled time is required for scheduled bookings' });
        }
        
        const scheduledTime = new Date(bookingData.scheduledAt);
        const now = new Date();
        const minScheduleTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        
        if (scheduledTime < minScheduleTime) {
          return res.status(400).json({ message: 'Scheduled time must be at least 1 hour from now' });
        }
        
        const maxScheduleTime = new Date(now.getTime() + (service.advanceBookingDays || 7) * 24 * 60 * 60 * 1000);
        if (scheduledTime > maxScheduleTime) {
          return res.status(400).json({ 
            message: `Cannot schedule more than ${service.advanceBookingDays || 7} days in advance` 
          });
        }
      }

      // Create service booking
      const booking = await storage.createServiceBooking({
        ...bookingData,
        userId,
        status: 'pending',
      });

      // For instant bookings, immediately start provider search
      if (bookingData.bookingType === 'instant') {
        await initiateProviderSearch(booking);
      }

      // Send booking notifications
      await notificationService.notifyNewBooking(booking);

      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating service booking:', error);
      res.status(500).json({ message: 'Failed to create service booking' });
    }
  });

  // Get user's service bookings
  app.get('/api/v1/service-bookings', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { status, bookingType, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const bookings = await storage.getUserServiceBookings(userId, {
        status: status as string,
        bookingType: bookingType as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json(bookings);
    } catch (error) {
      console.error('Error fetching service bookings:', error);
      res.status(500).json({ message: 'Failed to fetch service bookings' });
    }
  });

  // Get specific service booking details
  app.get('/api/v1/service-bookings/:bookingId', authMiddleware, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';

      const booking = await storage.getServiceBookingWithDetails(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check permissions
      const canView = 
        userRole === 'admin' || 
        booking.userId === userId || 
        booking.assignedProviderId === userId;

      if (!canView) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(booking);
    } catch (error) {
      console.error('Error fetching service booking:', error);
      res.status(500).json({ message: 'Failed to fetch service booking' });
    }
  });

  // Update service booking status
  app.put('/api/v1/service-bookings/:bookingId/status', authMiddleware, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';

      // Validate status
      const validStatuses = [
        'pending', 'provider_search', 'provider_assigned', 'provider_on_way',
        'work_in_progress', 'work_completed', 'payment_pending', 'completed',
        'cancelled', 'refunded'
      ];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const booking = await storage.getServiceBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check permissions and validate status transitions
      const canUpdateStatus = await storage.validateBookingStatusUpdate(bookingId, status, userId ?? '', userRole);
      if (!canUpdateStatus.allowed) {
        return res.status(403).json({ message: canUpdateStatus.reason });
      }

      const updatedBooking = await storage.updateServiceBooking(bookingId, {
        status,
        notes: notes || undefined,
        updatedAt: new Date(),
      });

      // Send status change notifications
      await notificationService.notifyBookingStatusChange(
        updatedBooking?.userId ?? '',
        bookingId,
        status
      );

      // Broadcast real-time update
      if (webSocketManager) {
        await webSocketManager.broadcastBookingUpdate(updatedBooking);
      }

      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  });

  // Provider accepts a job request
  app.post('/api/v1/service-bookings/:bookingId/accept', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const providerId = req.user?.id;
      const { estimatedArrival, quotedPrice, notes } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if provider has a valid job request for this booking
      const jobRequest = await storage.getProviderJobRequest(bookingId, providerId);
      if (!jobRequest || jobRequest.status !== 'sent') {
        return res.status(400).json({ message: 'No valid job request found' });
      }

      // Check if booking is still available
      const booking = await storage.getServiceBooking(bookingId);
      if (!booking || booking.status !== 'provider_search') {
        return res.status(400).json({ message: 'Booking is no longer available' });
      }

      // Accept the job (race condition handled in storage)
      const result = await storage.acceptProviderJobRequest(bookingId, providerId, {
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        quotedPrice: quotedPrice || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // Cancel other pending job requests for this booking
      await storage.cancelOtherJobRequests(bookingId, providerId);

      // Send notifications
      await notificationService.notifyProviderAssigned(booking.userId, bookingId, providerId);

      res.json({
        success: true,
        message: 'Job accepted successfully',
        booking: result.booking,
      });
    } catch (error) {
      console.error('Error accepting job request:', error);
      res.status(500).json({ message: 'Failed to accept job request' });
    }
  });

  // Provider declines a job request
  app.post('/api/v1/service-bookings/:bookingId/decline', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const providerId = req.user?.id;
      const { reason } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const result = await storage.declineProviderJobRequest(bookingId, providerId, reason);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({
        success: true,
        message: 'Job declined successfully',
      });
    } catch (error) {
      console.error('Error declining job request:', error);
      res.status(500).json({ message: 'Failed to decline job request' });
    }
  });

  // Get provider's job requests
  app.get('/api/v1/provider/job-requests', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const providerId = req.user?.id;
      const { status, limit = 20, offset = 0 } = req.query;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const jobRequests = await storage.getProviderJobRequests(providerId, {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json(jobRequests);
    } catch (error) {
      console.error('Error fetching job requests:', error);
      res.status(500).json({ message: 'Failed to fetch job requests' });
    }
  });

  // Cancel service booking
  app.delete('/api/v1/service-bookings/:bookingId', authMiddleware, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';

      const booking = await storage.getServiceBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check cancellation permissions
      const canCancel = await storage.canCancelServiceBooking(bookingId, userId ?? '', userRole);
      if (!canCancel.allowed) {
        return res.status(403).json({ message: canCancel.reason });
      }

      const cancelledBooking = await storage.updateServiceBooking(bookingId, {
        status: 'cancelled',
        updatedAt: new Date(),
      });

      // Handle refunds if payment was made
      if (booking.paymentStatus === 'paid') {
        await storage.updateServiceBooking(bookingId, { paymentStatus: 'refunded' });
        // TODO: Implement actual refund processing
      }

      // Cancel any pending job requests
      await storage.cancelAllJobRequests(bookingId);

      // Send cancellation notifications
      await notificationService.notifyBookingCancellation(
        cancelledBooking?.userId ?? '',
        bookingId,
        'Booking cancelled by customer'
      );

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        booking: cancelledBooking,
      });
    } catch (error) {
      console.error('Error cancelling service booking:', error);
      res.status(500).json({ message: 'Failed to cancel service booking' });
    }
  });

  // Helper function to initiate provider search for instant bookings
  async function initiateProviderSearch(booking: any) {
    try {
      // Find matching providers
      const providers = await storage.findMatchingProviders({
        serviceId: booking.serviceId,
        location: {
          latitude: booking.serviceLocation.latitude,
          longitude: booking.serviceLocation.longitude,
        },
        urgency: booking.urgency,
        bookingType: 'instant',
        maxDistance: 25,
        maxProviders: 5,
      });

      // Update booking status
      await storage.updateServiceBooking(booking.id, {
        status: 'provider_search',
      });

      // Send job requests to providers
      for (const provider of providers) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes to respond
        
        await storage.createProviderJobRequest({
          bookingId: booking.id,
          providerId: provider.userId,
          expiresAt,
          distanceKm: provider.distanceKm?.toString() || '0',
          estimatedTravelTime: provider.estimatedTravelTime || 0,
        });

        // Send push notification to provider
        await notificationService.notifyProviderJobRequest(provider.userId, booking.id);
      }

      // Set up timeout to handle no provider response
      setTimeout(async () => {
        const currentBooking = await storage.getServiceBooking(booking.id);
        if (currentBooking?.status === 'provider_search') {
          await handleNoProviderResponse(booking.id);
        }
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.error('Error initiating provider search:', error);
      await storage.updateServiceBooking(booking.id, {
        status: 'cancelled',
        notes: 'Failed to find available providers',
      });
    }
  }

  // Helper function to calculate travel time between two locations
  async function calculateTravelTime(from: any, to: any): Promise<number> {
    if (!from || !to) return 30; // Default 30 minutes
    
    // Simple distance calculation (this could be enhanced with actual routing API)
    const distance = calculateDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );
    
    // Assume average speed of 25 km/h in urban areas
    return Math.ceil(distance / 25 * 60);
  }

  // Helper function to calculate distance between two points
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Helper function to handle no provider response
  async function handleNoProviderResponse(bookingId: string) {
    try {
      // Update booking status
      await storage.updateServiceBooking(bookingId, {
        status: 'cancelled',
        notes: 'No providers available at this time',
      });

      // Get booking details for notification
      const booking = await storage.getServiceBooking(bookingId);
      if (booking) {
        await notificationService.notifyNoProvidersAvailable(booking.userId, bookingId);
      }
    } catch (error) {
      console.error('Error handling no provider response:', error);
    }
  }

  // Wallet routes
  app.get('/api/v1/wallet/balance', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.error('❌ Wallet balance: No user ID found in request');
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log(`🔍 Fetching wallet balance for user: ${userId}`);
      const wallet = await storage.getWalletBalance(userId);
      console.log(`✅ Wallet balance fetched: ₹${wallet.balance}, Points: ${wallet.fixiPoints}`);
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }
  });

  app.get('/api/v1/wallet/transactions', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.error('❌ Wallet transactions: No user ID found in request');
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log(`🔍 Fetching wallet transactions for user: ${userId}`);
      const transactions = await storage.getWalletTransactions(userId, 20);
      console.log(`✅ Found ${transactions.length} wallet transactions`);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/v1/wallet/topup', walletLimiter, authMiddleware, validateBody(walletTopupSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount } = req.body;
      
      // Validate amount
      if (amount < 1 || amount > 50000) {
        return res.status(400).json({ message: 'Amount must be between ₹1 and ₹50,000' });
      }

      // Create payment intent for wallet topup
      if (stripePaymentService.isReady()) {
        const idempotencyKey = `wallet_topup_${userId}_${amount}_${Date.now()}`;
        const { paymentIntent } = await stripePaymentService.createPaymentIntent({
          userId,
          amount,
          currency: 'inr',
          description: 'Wallet Top-up',
          idempotencyKey,
          metadata: {
            type: 'wallet_topup',
            amount: amount.toString(),
          },
        });

        return res.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          amount,
          currency: 'INR',
          stripePaymentIntentId: paymentIntent.id,
        });
      } else {
        // Fallback for development
        return res.json({
          success: false,
          message: 'Payment service not configured - set up Stripe API keys',
          mockMode: true,
        });
      }
    } catch (error) {
      console.error('Error creating topup order:', error);
      res.status(500).json({ message: 'Failed to create topup order' });
    }
  });

  // Confirm wallet topup (mock success for development)
  app.post('/api/v1/wallet/confirm-topup', walletLimiter, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount, paymentId } = req.body;
      
      if (!amount || !paymentId || amount < 1) {
        return res.status(400).json({ message: 'Invalid payment details' });
      }

      // Create successful transaction record
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: parseFloat(amount).toString(),
        description: 'Wallet top-up',
        category: 'topup',
        status: 'completed',
        paymentMethod: 'mock',
        reference: paymentId,
      });
      
      // Update wallet balance
      await storage.updateWalletBalance(userId, parseFloat(amount), 'credit');
      
      // Get updated balance
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        balance: walletData.balance,
        message: 'Money added successfully'
      });
    } catch (error) {
      console.error('Error confirming topup:', error);
      res.status(500).json({ message: 'Failed to confirm topup' });
    }
  });

  // DEPRECATED: Use /api/v1/orders/:orderId/pay instead (security reasons)
  app.post('/api/v1/wallet/pay', authMiddleware, async (req, res) => {
    res.status(410).json({ 
      message: 'This endpoint is deprecated for security reasons. Use POST /api/v1/orders/:orderId/pay instead.',
      deprecated: true,
      migrateToEndpoint: '/api/v1/orders/:orderId/pay'
    });
  });

  // ========================================
  // PAYMENT METHODS ENDPOINTS
  // ========================================

  // Get user's payment methods
  app.get('/api/v1/payment-methods', paymentMethodLimiter, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.json({
          success: true,
          paymentMethods: [],
          message: 'Stripe not configured - demo mode'
        });
      }

      const { paymentMethods } = await stripePaymentService.getUserPaymentMethods(userId);
      
      res.json({
        success: true,
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          nickname: pm.nickname,
          isDefault: pm.isDefault,
          cardBrand: pm.cardBrand,
          cardLast4: pm.cardLast4,
          cardExpMonth: pm.cardExpMonth,
          cardExpYear: pm.cardExpYear,
          upiId: pm.upiId,
          isActive: pm.isActive,
          lastUsedAt: pm.lastUsedAt,
          createdAt: pm.createdAt,
        }))
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch payment methods' 
      });
    }
  });

  // Save a new payment method
  app.post('/api/v1/payment-methods', paymentMethodLimiter, authMiddleware, validateBody(paymentMethodSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available - configure Stripe API keys' 
        });
      }

      const { stripePaymentMethodId, nickname, setAsDefault } = req.body;

      const paymentMethod = await stripePaymentService.savePaymentMethod({
        userId,
        stripePaymentMethodId,
        nickname,
        setAsDefault,
      });

      res.json({
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          nickname: paymentMethod.nickname,
          isDefault: paymentMethod.isDefault,
          cardBrand: paymentMethod.cardBrand,
          cardLast4: paymentMethod.cardLast4,
          cardExpMonth: paymentMethod.cardExpMonth,
          cardExpYear: paymentMethod.cardExpYear,
          upiId: paymentMethod.upiId,
        },
        message: 'Payment method saved successfully'
      });
    } catch (error) {
      console.error('Error saving payment method:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to save payment method' 
      });
    }
  });

  // Delete a payment method
  app.delete('/api/v1/payment-methods/:id', paymentMethodLimiter, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available' 
        });
      }

      const { id } = req.params;
      await stripePaymentService.deletePaymentMethod(userId, id);

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to delete payment method' 
      });
    }
  });

  // ========================================
  // PAYMENT INTENTS ENDPOINTS
  // ========================================

  // Create payment intent for order
  app.post('/api/v1/payment-intents', paymentLimiter, authMiddleware, validateBody(createPaymentIntentSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available - configure Stripe API keys' 
        });
      }

      const { orderId, amount, currency, description, metadata } = req.body;

      // Validate order exists if provided
      if (orderId) {
        const order = await storage.getOrder(orderId);
        if (!order || order.userId !== userId) {
          return res.status(404).json({ 
            success: false, 
            message: 'Order not found or access denied' 
          });
        }
      }

      const idempotencyKey = orderId ? `intent_${orderId}_${userId}_${Date.now()}` : `intent_${userId}_${Date.now()}`;
      const { paymentIntent, dbPaymentIntent } = await stripePaymentService.createPaymentIntent({
        userId,
        orderId,
        amount,
        currency,
        description,
        metadata,
        idempotencyKey,
      });

      res.json({
        success: true,
        paymentIntent: {
          id: dbPaymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: dbPaymentIntent.amount,
          currency: dbPaymentIntent.currency,
          status: paymentIntent.status,
        },
        message: 'Payment intent created successfully'
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create payment intent' 
      });
    }
  });

  // Confirm payment intent
  app.post('/api/v1/payment-intents/:id/confirm', paymentLimiter, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available' 
        });
      }

      const { id } = req.params;
      const { paymentMethodId } = req.body;

      // Verify the payment intent belongs to the user
      const dbPaymentIntent = await storage.getPaymentIntentByStripeId(id);
      if (!dbPaymentIntent || dbPaymentIntent.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: 'Payment intent not found or access denied' 
        });
      }

      const paymentIntent = await stripePaymentService.confirmPaymentIntent(id, paymentMethodId);

      res.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100, // Convert back from cents
          currency: paymentIntent.currency,
        },
        message: 'Payment intent confirmed'
      });
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to confirm payment intent' 
      });
    }
  });

  // ========================================
  // PAYMENT PROCESSING ENDPOINTS
  // ========================================

  // Process payment for order using Stripe
  app.post('/api/v1/orders/:orderId/pay-stripe', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Stripe payment not available - configure API keys' 
        });
      }

      const { orderId } = req.params;
      const { paymentMethodId } = req.body;

      // Get and validate order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ success: false, message: 'Order already paid' });
      }

      // Create payment intent for the order
      const idempotencyKey = `order_payment_${orderId}_${userId}_${Date.now()}`;
      const { paymentIntent } = await stripePaymentService.createPaymentIntent({
        userId,
        orderId,
        amount: parseFloat(order.totalAmount),
        description: `FixitQuick Order #${orderId.slice(-8)}`,
        idempotencyKey,
        metadata: {
          orderId,
          userId,
          type: 'order_payment',
        },
      });

      // If payment method is provided, confirm the payment intent
      if (paymentMethodId) {
        const confirmedIntent = await stripePaymentService.confirmPaymentIntent(
          paymentIntent.id, 
          paymentMethodId
        );

        if (confirmedIntent.status === 'succeeded') {
          // Handle successful payment
          const result = await stripePaymentService.handlePaymentSuccess(paymentIntent.id);
          
          res.json({
            success: true,
            order: result.order,
            paymentIntent: {
              id: confirmedIntent.id,
              status: confirmedIntent.status,
            },
            message: 'Payment successful'
          });
        } else {
          res.json({
            success: false,
            paymentIntent: {
              id: confirmedIntent.id,
              status: confirmedIntent.status,
            },
            message: 'Payment requires additional action'
          });
        }
      } else {
        // Return payment intent for client-side confirmation
        res.json({
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
          },
          message: 'Payment intent created'
        });
      }

    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment processing failed' 
      });
    }
  });

  // SECURE: Pay for a specific order with wallet (server validates everything)
  app.post('/api/v1/orders/:orderId/pay', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      const { idempotencyKey } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // IDEMPOTENCY: Generate or use provided idempotency key
      const finalIdempotencyKey = idempotencyKey || `pay_order_${userId}_${orderId}_${Date.now()}`;
      
      // Check if this payment was already processed
      const existingTransaction = await storage.getWalletTransactionByReference(finalIdempotencyKey);
      if (existingTransaction) {
        console.log(`⚠️ Idempotent request detected for order payment: ${orderId}`);
        const order = await storage.getOrder(orderId);
        const walletData = await storage.getWalletBalance(userId);
        return res.json({
          success: true,
          transaction: existingTransaction,
          order,
          walletBalance: walletData.balance,
          message: 'Payment already processed',
          idempotent: true
        });
      }

      // Get and validate order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Validate order ownership
      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Access denied: not your order' });
      }

      // Validate order status
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: 'Order already paid' });
      }

      if (order.status === 'cancelled') {
        return res.status(400).json({ message: 'Cannot pay for cancelled order' });
      }

      // SERVER CALCULATES AMOUNT (prevents client manipulation)
      const orderAmount = parseFloat(order.totalAmount);
      
      // Check wallet balance
      const walletData = await storage.getWalletBalance(userId);
      const currentBalance = parseFloat(walletData.balance);
      
      if (currentBalance < orderAmount) {
        return res.status(400).json({ 
          message: 'Insufficient wallet balance',
          currentBalance: currentBalance.toFixed(2),
          requiredAmount: orderAmount.toFixed(2),
          shortfall: (orderAmount - currentBalance).toFixed(2)
        });
      }

      // SECURITY: Final inventory validation just before payment (prevent race conditions)
      const finalInventoryCheck = await storage.validateInventoryAvailability(order.items || []);
      if (!finalInventoryCheck.valid) {
        return res.status(400).json({
          message: 'Inventory no longer available - order canceled',
          errors: finalInventoryCheck.errors,
          unavailableItems: finalInventoryCheck.unavailableItems
        });
      }

      // ATOMIC OPERATION: Process entire wallet payment in database transaction
      const partItems = (order.items || [])
        .filter(item => item.type === 'part')
        .map(item => ({ partId: item.id, quantity: item.quantity }));
      
      const paymentResult = await storage.processWalletPayment({
        userId,
        orderId,
        amount: orderAmount,
        description: `Payment for Order #${orderId.slice(-8)}`,
        partItems,
        idempotencyKey: finalIdempotencyKey
      });
      
      if (!paymentResult.success) {
        return res.status(400).json({
          message: 'Wallet payment failed',
          errors: paymentResult.errors
        });
      }
      
      // Get updated data
      const updatedWalletData = await storage.getWalletBalance(userId);
      const updatedOrder = await storage.getOrder(orderId);
      
      res.json({
        success: true,
        transaction: paymentResult.transaction,
        order: updatedOrder,
        walletBalance: updatedWalletData.balance,
        message: 'Payment successful',
        idempotencyKey: finalIdempotencyKey
      });
    } catch (error) {
      console.error('Error processing order payment:', error);
      res.status(500).json({ message: 'Payment processing failed' });
    }
  });

  // Process wallet refund
  app.post('/api/v1/wallet/refund', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount, orderId, reason } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid refund amount' });
      }

      // Create credit transaction for refund
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: amount,
        description: `Refund: ${reason || 'Order cancelled'}`,
        category: 'refund',
        status: 'completed',
        orderId,
      });
      
      // Add to wallet balance
      await storage.updateWalletBalance(userId, amount, 'credit');
      
      // Get updated balance
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        balance: walletData.balance,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Refund processing failed' });
    }
  });

  // Redeem FixiPoints
  app.post('/api/v1/wallet/redeem-points', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { points, for: redeemFor, idempotencyKey } = req.body;
      
      if (!points || points < 100) {
        return res.status(400).json({ message: 'Minimum 100 points required to redeem' });
      }
      
      // IDEMPOTENCY: Generate or use provided idempotency key
      const finalIdempotencyKey = idempotencyKey || `redeem_points_${userId}_${points}_${Date.now()}`;
      
      // Check if this redemption was already processed
      const existingTransaction = await storage.getWalletTransactionByReference(finalIdempotencyKey);
      if (existingTransaction) {
        console.log(`⚠️ Idempotent request detected for points redemption: ${points} points`);
        const walletData = await storage.getWalletBalance(userId);
        return res.json({
          success: true,
          transaction: existingTransaction,
          walletBalance: walletData.balance,
          fixiPoints: walletData.fixiPoints,
          message: 'Points already redeemed',
          idempotent: true
        });
      }

      // Get current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const currentPoints = user.fixiPoints || 0;
      if (currentPoints < points) {
        return res.status(400).json({ 
          message: 'Insufficient FixiPoints',
          currentPoints,
          requiredPoints: points
        });
      }

      // Calculate redemption value (10 points = ₹1)
      const redemptionValue = Math.floor(points / 10);
      
      // Update user points
      await storage.updateUser(userId, {
        fixiPoints: currentPoints - points
      });

      // Add redemption amount to wallet
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: redemptionValue.toString(),
        description: `FixiPoints redeemed: ${points} points`,
        category: 'redemption',
        status: 'completed',
        reference: finalIdempotencyKey
      });
      
      await storage.updateWalletBalance(userId, redemptionValue, 'credit');
      
      // Get updated data
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        pointsRedeemed: points,
        redemptionValue,
        remainingPoints: walletData.fixiPoints,
        balance: walletData.balance,
        message: `Successfully redeemed ${points} FixiPoints for ₹${redemptionValue}`
      });
    } catch (error) {
      console.error('Error redeeming points:', error);
      res.status(500).json({ message: 'Points redemption failed' });
    }
  });

  // Service Provider routes
  app.get('/api/v1/providers/stats/:userId', authMiddleware, requireRole(['service_provider', 'admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      // Check if user can access this provider's stats
      if (userRole !== 'admin' && currentUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const orders = await storage.getOrdersByProvider(userId);
      const completedOrders = orders.filter(order => order.status === 'completed');
      const reviews = await storage.getReviews({ revieweeId: userId });
      
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        completionRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0,
        avgRating: Number(avgRating.toFixed(1)),
        ordersCompleted: completedOrders.length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
        totalReviews: reviews.length,
        monthlyEarnings: completedOrders
          .filter(order => {
            const orderDate = new Date(order.createdAt || '');
            const now = new Date();
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          })
          .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching provider stats:', error);
      res.status(500).json({ message: 'Failed to fetch provider stats' });
    }
  });

  app.get('/api/v1/providers/orders/pending/:userId', authMiddleware, requireRole(['service_provider', 'admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      if (userRole !== 'admin' && currentUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const orders = await storage.getOrdersByProvider(userId, 'pending');
      res.json(orders);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      res.status(500).json({ message: 'Failed to fetch pending orders' });
    }
  });

  app.get('/api/v1/providers/orders/active/:userId', authMiddleware, requireRole(['service_provider', 'admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      if (userRole !== 'admin' && currentUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // TypeScript assertion since we've checked userId is not null above
      const orders = await storage.getOrdersByProvider(userId!)
        .then(orders => orders.filter(order => order.status && ['accepted', 'in_progress'].includes(order.status)));
      res.json(orders);
    } catch (error) {
      console.error('Error fetching active orders:', error);
      res.status(500).json({ message: 'Failed to fetch active orders' });
    }
  });

  // Provider availability management
  app.put('/api/v1/providers/availability', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { availability, isOnline } = req.body;
      
      const provider = await storage.getServiceProvider(userId ?? '');
      if (!provider) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }
      
      const updatedProvider = await storage.updateServiceProvider(userId ?? '', {
        availability,
        isOnline: isOnline !== undefined ? isOnline : provider.isOnline,
      });
      
      res.json({ success: true, provider: updatedProvider });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ message: 'Failed to update availability' });
    }
  });

  // Provider application
  app.post('/api/v1/providers/apply', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { categoryId, documents, serviceArea } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user already has a provider profile
      const existingProvider = await storage.getServiceProvider(userId);
      if (existingProvider) {
        return res.status(400).json({ message: 'Provider profile already exists' });
      }
      
      // Create service provider profile
      const provider = await storage.createServiceProvider({
        userId,
        categoryId,
        isVerified: false,
        rating: '0.00',
        totalCompletedOrders: 0,
        availability: {},
        serviceArea,
        documents,
        isOnline: false,
      });
      
      // Update user role
      await storage.updateUserRole(userId, 'service_provider');
      
      res.json({ success: true, provider });
    } catch (error) {
      console.error('Error creating provider application:', error);
      res.status(500).json({ message: 'Failed to create provider application' });
    }
  });

  // Parts Provider routes
  app.get('/api/v1/parts-provider/stats/:userId', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [parts, orders] = await Promise.all([
        storage.getPartsByProvider(userId),
        storage.getOrdersByProvider(userId)
      ]);
      
      const completedOrders = orders.filter(order => order.status === 'completed');
      const lowStockParts = await storage.getLowStockParts(userId, 10);
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        totalOrders: orders.length,
        activeListings: parts.length,
        lowStockItems: lowStockParts.length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching parts provider stats:', error);
      res.status(500).json({ message: 'Failed to fetch parts provider stats' });
    }
  });

  app.post('/api/v1/parts-provider/parts', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      const partData = {
        ...req.body,
        providerId: userId,
        rating: '0.00',
        totalSold: 0,
        isActive: true,
      };
      
      const part = await storage.createPart(partData);
      res.json(part);
    } catch (error) {
      console.error('Error adding part:', error);
      res.status(500).json({ message: 'Failed to add part' });
    }
  });

  app.get('/api/v1/parts-provider/inventory/:userId', authMiddleware, requireRole(['parts_provider', 'admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      if (userRole !== 'admin' && currentUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const parts = await storage.getPartsByProvider(userId);
      res.json(parts);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  app.get('/api/v1/parts-provider/orders/:userId', authMiddleware, requireRole(['parts_provider', 'admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      if (userRole !== 'admin' && currentUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const orders = await storage.getOrdersByProvider(userId);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching parts orders:', error);
      res.status(500).json({ message: 'Failed to fetch parts orders' });
    }
  });

  app.put('/api/v1/parts-provider/parts/:partId', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { partId } = req.params;
      
      const part = await storage.getPart(partId);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      
      if (part.providerId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedPart = await storage.updatePart(partId, req.body);
      res.json(updatedPart);
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({ message: 'Failed to update part' });
    }
  });

  app.put('/api/v1/parts-provider/parts/:partId/stock', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { partId } = req.params;
      const { stock } = req.body;
      
      const part = await storage.getPart(partId);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      
      if (part.providerId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedPart = await storage.updatePart(partId, { stock });
      res.json(updatedPart);
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ message: 'Failed to update stock' });
    }
  });

  app.post('/api/v1/parts-provider/orders/:orderId/accept', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.partsProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, { 
        status: 'accepted'
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error accepting order:', error);
      res.status(500).json({ message: 'Failed to accept order' });
    }
  });

  app.post('/api/v1/parts-provider/orders/:orderId/ship', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      const { trackingId } = req.body;
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.partsProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, { 
        status: 'in_progress'
      });
      
      // Store tracking info separately if needed
      if (trackingId) {
        await storage.setSetting(`tracking_${orderId}`, trackingId, 'Order tracking ID');
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error shipping order:', error);
      res.status(500).json({ message: 'Failed to ship order' });
    }
  });

  // Parts provider application
  app.post('/api/v1/parts-provider/apply', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { businessName, documents, categories } = req.body;
      
      // Update user role
      await storage.updateUserRole(userId ?? '', 'parts_provider' as 'user' | 'service_provider' | 'parts_provider' | 'admin');
      
      res.json({ success: true, message: 'Parts provider application submitted' });
    } catch (error) {
      console.error('Error creating parts provider application:', error);
      res.status(500).json({ message: 'Failed to create parts provider application' });
    }
  });

  // Admin routes
  app.get('/api/v1/admin/stats', authMiddleware, adminSessionMiddleware, async (req, res) => {
    try {
      const [totalUsers, allOrders, serviceProviders, partsProviders] = await Promise.all([
        storage.getUsersCount(),
        storage.getOrders(),
        storage.getUsersByRole('service_provider'),
        storage.getUsersByRole('parts_provider'),
      ]);
      
      const completedOrders = allOrders.filter(order => order.status === 'completed');
      const totalProviders = serviceProviders.length + partsProviders.length;
      
      const stats = {
        totalUsers,
        totalRevenue: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        totalOrders: allOrders.length,
        totalProviders,
        pendingVerifications: 0, // TODO: Implement
        activeDisputes: 0, // TODO: Implement
        monthlyGrowth: 15.5, // TODO: Calculate
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/v1/admin/users', authMiddleware, adminSessionMiddleware, async (req, res) => {
    try {
      const { search, role } = req.query;
      
      let users;
      if (search) {
        users = await storage.searchUsers(search as string, role as 'user' | 'service_provider' | 'parts_provider' | 'admin');
      } else if (role && role !== 'all') {
        users = await storage.getUsersByRole(role as 'user' | 'service_provider' | 'parts_provider' | 'admin');
      } else {
        users = await storage.getUsersByRole('user'); // Get all users
        const providers = await Promise.all([
          storage.getUsersByRole('service_provider' as 'user' | 'service_provider' | 'parts_provider' | 'admin'),
          storage.getUsersByRole('parts_provider' as 'user' | 'service_provider' | 'parts_provider' | 'admin'),
          storage.getUsersByRole('admin' as 'user' | 'service_provider' | 'parts_provider' | 'admin')
        ]);
        users = [...users, ...providers.flat()];
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/v1/admin/orders', adminSessionMiddleware, async (req, res) => {
    try {
      const orders = await storage.getOrders({ limit: 100 });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Chat and Notification routes
  app.get('/api/v1/chat/:orderId', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';
      
      // Verify user has access to this order's chat
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const hasAccess = order.userId === userId || 
                       order.serviceProviderId === userId || 
                       order.partsProviderId === userId ||
                       userRole === 'admin';
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const messages = await storage.getChatMessages(orderId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  app.post('/api/v1/chat/:orderId/messages', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { message, messageType = 'text', attachments = [] } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      // Verify user has access to this order's chat
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const hasAccess = order.userId === userId || 
                       order.serviceProviderId === userId || 
                       order.partsProviderId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Determine receiver
      let receiverId: string;
      if (order.userId === userId) {
        receiverId = order.serviceProviderId || order.partsProviderId || '';
      } else {
        receiverId = order.userId || '';
      }
      
      const chatMessage = await storage.createChatMessage({
        orderId,
        senderId: userId ?? '',
        receiverId,
        message: message.trim(),
        messageType,
        attachments,
        isRead: false
      });
      
      // Send real-time notification via WebSocket
      const wsManager = (global as any).wsManager;
      if (wsManager) {
        wsManager.broadcastToRoom(`order:${orderId}`, {
          type: 'chat_message',
          data: {
            ...chatMessage,
            senderName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Unknown User'
          }
        });
      }
      
      res.json(chatMessage);
    } catch (error) {
      console.error('Error sending chat message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/v1/notifications', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await storage.getNotifications(userId ?? '', limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/v1/notifications/:notificationId/read', authMiddleware, async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Verify notification belongs to user (security check)
      const notifications = await storage.getNotifications(userId, 1000);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // Enhanced admin user management
  app.put('/api/v1/admin/users/:userId', adminSessionMiddleware, validateBody(adminUserUpdateSchema), async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Validate userId parameter
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return res.status(400).json({ message: 'Invalid user ID provided' });
      }
      
      console.log('🔧 Admin user update:', { userId, updates, adminId: req.user?.id });
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.put('/api/v1/admin/users/:userId/role', adminSessionMiddleware, validateBody(adminRoleUpdateSchema), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validate userId parameter
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return res.status(400).json({ message: 'Invalid user ID provided' });
      }
      
      // Additional security check: prevent self-demotion from admin
      const currentUserId = req.user?.id;
      if (currentUserId === userId && role !== 'admin') {
        return res.status(403).json({ 
          message: 'Cannot demote yourself from admin role',
          error: 'SELF_DEMOTION_PREVENTED'
        });
      }
      
      console.log('🔧 Admin role update:', { userId, role, adminId: currentUserId });
      
      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        success: true,
        user: updatedUser,
        message: `User role updated to ${role} successfully`
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });

  // Admin verification management
  app.get('/api/v1/admin/verifications/pending', adminSessionMiddleware, async (req, res) => {
    try {
      // Get unverified service providers
      const serviceProviders = await storage.getServiceProviders({ isVerified: false });
      
      const verifications = await Promise.all(
        serviceProviders.map(async (provider) => {
          const user = await storage.getUser(provider.userId ?? '');
          return {
            id: provider.id,
            userId: provider.userId,
            userName: `${user?.firstName} ${user?.lastName}`,
            type: 'service_provider',
            documents: provider.documents,
            status: 'pending',
            submittedAt: provider.createdAt,
          };
        })
      );
      
      res.json(verifications);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({ message: 'Failed to fetch pending verifications' });
    }
  });

  app.post('/api/v1/admin/verifications/:verificationId', adminSessionMiddleware, validateBody(adminVerificationSchema), async (req, res) => {
    try {
      const { verificationId } = req.params;
      const { status, notes } = req.body;
      
      // Validate verificationId parameter
      if (!verificationId || typeof verificationId !== 'string' || verificationId.length === 0) {
        return res.status(400).json({ message: 'Invalid verification ID provided' });
      }
      
      console.log('🔧 Admin verification process:', { 
        verificationId, 
        status, 
        hasNotes: !!notes,
        adminId: req.user?.id 
      });
      
      // Find the service provider by verification ID (using provider ID)
      const provider = await storage.getServiceProvider(verificationId);
      if (!provider) {
        return res.status(404).json({ message: 'Verification not found' });
      }
      
      // Update verification status
      const updatedProvider = await storage.updateServiceProvider(provider.userId ?? '', {
        isVerified: status === 'approved',
      });
      
      // Create notification for the provider with enhanced messaging
      const notificationTitle = `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`;
      const notificationBody = status === 'approved' 
        ? 'Congratulations! Your service provider application has been approved. You can now start accepting service requests.'
        : `Your service provider application was not approved at this time.${notes ? ` Reason: ${notes}` : ' Please contact support for more information.'}`;
        
      await storage.createNotification({
        userId: provider.userId ?? '',
        title: notificationTitle,
        body: notificationBody,
        type: 'system',
        isRead: false,
      });
      
      res.json({ 
        success: true, 
        provider: updatedProvider,
        message: `Verification ${status} successfully`
      });
    } catch (error) {
      console.error('Error processing verification:', error);
      res.status(500).json({ message: 'Failed to process verification' });
    }
  });

  // Admin refund management
  app.post('/api/v1/admin/refund/:orderId', adminSessionMiddleware, validateBody(adminRefundSchema), async (req, res) => {
    try {
      const { orderId } = req.params;
      const { amount, reason } = req.body;
      
      // Validate orderId parameter
      if (!orderId || typeof orderId !== 'string' || orderId.length === 0) {
        return res.status(400).json({ message: 'Invalid order ID provided' });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({ 
          message: 'Order not paid, cannot refund',
          currentStatus: order.paymentStatus
        });
      }
      
      // Calculate refund amount (use provided amount or full order amount)
      const orderAmount = parseFloat(order.totalAmount);
      const refundAmount = amount || orderAmount;
      
      // Validate refund amount doesn't exceed order total
      if (refundAmount > orderAmount) {
        return res.status(400).json({ 
          message: `Refund amount ₹${refundAmount} cannot exceed order total ₹${orderAmount}`,
          maxRefundAmount: orderAmount
        });
      }
      
      const finalReason = reason || 'Admin processed refund';
      
      console.log('🔧 Admin refund process:', { 
        orderId, 
        refundAmount, 
        orderAmount,
        reason: finalReason,
        adminId: req.user?.id 
      });
      
      // Process refund
      // Process refund through Stripe if available
      if (stripePaymentService.isReady()) {
        try {
          const dbPaymentIntent = await storage.getUserPaymentIntents(order.userId || '').then(intents => 
            intents.find(intent => intent.orderId === orderId && intent.status === 'succeeded')
          );
          
          if (dbPaymentIntent) {
            const refundIdempotencyKey = `admin_refund_${orderId}_${Date.now()}`;
            await stripePaymentService.createRefund({
              paymentIntentId: dbPaymentIntent.stripePaymentIntentId,
              amount: Math.round(refundAmount * 100), // Convert to cents
              reason: finalReason,
              idempotencyKey: refundIdempotencyKey
            });
          }
        } catch (error) {
          console.error('Stripe refund failed:', error);
          // Continue with wallet refund even if Stripe refund fails
        }
      }
      
      // Update order status
      await storage.updateOrder(orderId, {
        status: 'refunded',
        paymentStatus: 'refunded'
      });
      
      // Create wallet refund transaction
      await storage.createWalletTransaction({
        userId: order.userId,
        type: 'credit',
        amount: refundAmount,
        description: `Refund: ${finalReason}`,
        category: 'refund',
        orderId,
        status: 'completed',
      });
      
      // Update wallet balance
      await storage.updateWalletBalance(order.userId ?? '', refundAmount, 'credit');
      
      // Create notification for the user
      await storage.createNotification({
        userId: order.userId ?? '',
        title: 'Refund Processed',
        body: `Your refund of ₹${refundAmount} has been processed and added to your wallet. Reason: ${finalReason}`,
        type: 'system',
        isRead: false,
      });
      
      res.json({ success: true, message: 'Refund processed successfully' });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // Admin analytics
  app.get('/api/v1/admin/analytics', adminSessionMiddleware, async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      
      const [allUsers, allOrders, serviceProviders, partsProviders] = await Promise.all([
        storage.getUsersCount(),
        storage.getOrders(),
        storage.getUsersByRole('service_provider'),
        storage.getUsersByRole('parts_provider'),
      ]);
      
      const completedOrders = allOrders.filter(order => order.status === 'completed');
      const now = new Date();
      const periodDays = parseInt(period.toString().replace('d', ''));
      const periodStart = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      
      const recentOrders = allOrders.filter(order => 
        new Date(order.createdAt || '') >= periodStart
      );
      const recentCompletedOrders = completedOrders.filter(order => 
        new Date(order.createdAt || '') >= periodStart
      );
      
      const analytics = {
        totalUsers: allUsers,
        totalOrders: allOrders.length,
        totalRevenue: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        totalProviders: serviceProviders.length + partsProviders.length,
        periodStats: {
          newOrders: recentOrders.length,
          completedOrders: recentCompletedOrders.length,
          revenue: recentCompletedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
          newUsers: allUsers, // TODO: Implement period-based user count
        },
        ordersByStatus: {
          pending: allOrders.filter(o => o.status === 'pending').length,
          accepted: allOrders.filter(o => o.status === 'accepted').length,
          in_progress: allOrders.filter(o => o.status === 'in_progress').length,
          completed: allOrders.filter(o => o.status === 'completed').length,
          cancelled: allOrders.filter(o => o.status === 'cancelled').length,
        },
        providerStats: {
          serviceProviders: serviceProviders.length,
          partsProviders: partsProviders.length,
          verifiedProviders: serviceProviders.filter(p => p.isVerified).length,
          pendingVerifications: serviceProviders.filter(p => !p.isVerified).length,
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      res.status(500).json({ message: 'Failed to fetch admin analytics' });
    }
  });

  // ============================================================================
  // ADMIN CATEGORY HIERARCHY MANAGEMENT ENDPOINTS
  // ============================================================================

  // Admin category validation schemas
  const adminCategoryCreateSchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
    description: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().nullable().optional(),
    level: z.number().int().min(0).max(5).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional().default(true),
  });

  const adminCategoryUpdateSchema = adminCategoryCreateSchema.partial();

  const adminCategoryReorderSchema = z.object({
    categoryIds: z.array(z.string().min(1)),
    startSortOrder: z.number().int().min(0).optional().default(0),
  });

  // Get all categories with hierarchy information
  app.get('/api/v1/admin/categories', adminSessionMiddleware, async (req, res) => {
    try {
      const { level, parentId, activeOnly } = req.query;
      let categories;

      if (level !== undefined) {
        categories = await storage.getServiceCategoriesByLevel(
          parseInt(level as string), 
          activeOnly !== 'false'
        );
      } else if (parentId) {
        categories = await storage.getSubCategories(
          parentId as string, 
          activeOnly !== 'false'
        );
      } else {
        categories = await storage.getCategoryHierarchy();
      }

      // Add metadata for each category
      const categoriesWithMeta = await Promise.all(
        categories.map(async (category) => {
          const subCategories = await storage.getSubCategories(category.id, false);
          const services = await storage.getServicesByCategory(category.id);
          
          return {
            ...category,
            subCategoriesCount: subCategories.length,
            servicesCount: services.length,
            hasChildren: subCategories.length > 0,
          };
        })
      );

      res.json(categoriesWithMeta);
    } catch (error) {
      console.error('Error fetching admin categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // Get category hierarchy tree
  app.get('/api/v1/admin/categories/hierarchy', adminSessionMiddleware, async (req, res) => {
    try {
      const allCategories = await storage.getCategoryHierarchy();
      
      // Build tree structure
      const categoryMap = new Map();
      const tree: any[] = [];

      // First pass: create category map
      allCategories.forEach(category => {
        categoryMap.set(category.id, {
          ...category,
          children: [],
          subCategoriesCount: 0,
          servicesCount: 0
        });
      });

      // Second pass: build tree and add metadata
      for (const category of allCategories) {
        const categoryWithChildren = categoryMap.get(category.id);
        
        // Get services count
        const services = await storage.getServicesByCategory(category.id);
        categoryWithChildren.servicesCount = services.length;

        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children.push(categoryWithChildren);
            parent.subCategoriesCount++;
          }
        } else {
          tree.push(categoryWithChildren);
        }
      }

      res.json(tree);
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
      res.status(500).json({ message: 'Failed to fetch category hierarchy' });
    }
  });

  // Get main categories (level 0)
  app.get('/api/v1/admin/categories/main', adminSessionMiddleware, async (req, res) => {
    try {
      const { activeOnly = 'true' } = req.query;
      const mainCategories = await storage.getServiceCategoriesByLevel(0, activeOnly !== 'false');
      
      // Add subcategories count
      const categoriesWithMeta = await Promise.all(
        mainCategories.map(async (category) => {
          const subCategories = await storage.getSubCategories(category.id, false);
          return {
            ...category,
            subCategoriesCount: subCategories.length,
          };
        })
      );

      res.json(categoriesWithMeta);
    } catch (error) {
      console.error('Error fetching main categories:', error);
      res.status(500).json({ message: 'Failed to fetch main categories' });
    }
  });

  // Get subcategories for a parent category
  app.get('/api/v1/admin/categories/:parentId/subcategories', adminSessionMiddleware, async (req, res) => {
    try {
      const { parentId } = req.params;
      const { activeOnly = 'true' } = req.query;
      
      const subcategories = await storage.getSubCategories(parentId, activeOnly !== 'false');
      
      // Add services count
      const categoriesWithMeta = await Promise.all(
        subcategories.map(async (category) => {
          const services = await storage.getServicesByCategory(category.id);
          return {
            ...category,
            servicesCount: services.length,
          };
        })
      );

      res.json(categoriesWithMeta);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  // Create new category
  app.post('/api/v1/admin/categories', adminSessionMiddleware, validateBody(adminCategoryCreateSchema), async (req, res) => {
    try {
      const categoryData = req.body;
      
      // Validate parent category if provided
      if (categoryData.parentId) {
        const parentCategory = await storage.getServiceCategory(categoryData.parentId);
        if (!parentCategory) {
          return res.status(400).json({ message: 'Parent category not found' });
        }
        
        // Check level limits (max 3 levels: 0, 1, 2)
        if ((parentCategory.level || 0) >= 2) {
          return res.status(400).json({ 
            message: 'Maximum category depth (3 levels) exceeded' 
          });
        }
      }

      const newCategory = await storage.createServiceCategory(categoryData);
      
      console.log('✅ Admin created category:', { 
        id: newCategory.id, 
        name: newCategory.name, 
        level: newCategory.level,
        parentId: newCategory.parentId 
      });

      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Failed to create category' });
    }
  });

  // Update category
  app.put('/api/v1/admin/categories/:categoryId', adminSessionMiddleware, validateBody(adminCategoryUpdateSchema), async (req, res) => {
    try {
      const { categoryId } = req.params;
      const updateData = req.body;
      
      // Validate category exists
      const existingCategory = await storage.getServiceCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Validate parent change doesn't create circular reference
      if (updateData.parentId && updateData.parentId !== existingCategory.parentId) {
        if (updateData.parentId === categoryId) {
          return res.status(400).json({ message: 'Category cannot be its own parent' });
        }
        
        // Check if new parent exists
        const newParent = await storage.getServiceCategory(updateData.parentId);
        if (!newParent) {
          return res.status(400).json({ message: 'New parent category not found' });
        }
        
        // Check depth limits
        if ((newParent.level || 0) >= 2) {
          return res.status(400).json({ 
            message: 'Moving category would exceed maximum depth (3 levels)' 
          });
        }
      }

      const updatedCategory = await storage.updateServiceCategory(categoryId, updateData);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      console.log('✅ Admin updated category:', { 
        id: updatedCategory.id, 
        name: updatedCategory.name,
        changes: Object.keys(updateData) 
      });

      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });

  // Delete category
  app.delete('/api/v1/admin/categories/:categoryId', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      const result = await storage.deleteServiceCategory(categoryId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      console.log('✅ Admin deleted category:', { id: categoryId });
      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });

  // Reorder categories
  app.post('/api/v1/admin/categories/reorder', adminSessionMiddleware, validateBody(adminCategoryReorderSchema), async (req, res) => {
    try {
      const { categoryIds, startSortOrder } = req.body;
      
      // Validate all categories exist
      for (const categoryId of categoryIds) {
        const category = await storage.getServiceCategory(categoryId);
        if (!category) {
          return res.status(400).json({ 
            message: `Category not found: ${categoryId}` 
          });
        }
      }

      await storage.reorderCategories(categoryIds, startSortOrder);
      
      console.log('✅ Admin reordered categories:', { 
        count: categoryIds.length, 
        startOrder: startSortOrder 
      });

      res.json({ success: true, message: 'Categories reordered successfully' });
    } catch (error) {
      console.error('Error reordering categories:', error);
      res.status(500).json({ message: 'Failed to reorder categories' });
    }
  });

  // ============================================================================
  // END ADMIN CATEGORY HIERARCHY MANAGEMENT ENDPOINTS
  // ============================================================================

  // Stripe webhook endpoint with proper signature verification
  app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      if (!stripePaymentService.isReady()) {
        console.warn('Stripe webhook received but service not configured');
        return res.status(503).json({ message: 'Stripe service not configured' });
      }

      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        console.error('Missing Stripe signature header');
        return res.status(400).json({ message: 'Missing signature header' });
      }

      // Use raw body for signature verification (crucial for webhook security)
      const rawBody = req.body.toString();
      
      // Verify webhook signature first (security critical)
      const isValid = stripePaymentService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('Invalid Stripe webhook signature - potential security issue');
        return res.status(400).json({ message: 'Invalid signature' });
      }
      
      // Parse the verified event
      let event;
      try {
        event = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('Failed to parse webhook body:', parseError);
        return res.status(400).json({ message: 'Invalid JSON payload' });
      }
      
      // Process webhook event
      const result = await stripePaymentService.processWebhook(event);
      
      if (result.success) {
        console.log(`✅ Webhook processed: ${event.type}`);
        res.json({ received: true, message: result.message, eventType: event.type });
      } else {
        console.error(`❌ Webhook processing failed: ${result.message}`);
        res.status(400).json({ received: false, message: result.message, eventType: event.type });
      }
    } catch (error) {
      console.error('Stripe webhook critical error:', error);
      res.status(500).json({ message: 'Webhook processing failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Additional webhook endpoint for payments (with proper implementation)
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      console.log('🔄 Payment webhook received, processing with Stripe webhook handler');
      
      if (!stripePaymentService.isReady()) {
        return res.status(503).json({ message: 'Payment service not configured' });
      }

      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        return res.status(400).json({ message: 'Missing signature header' });
      }

      const rawBody = req.body.toString();
      const isValid = stripePaymentService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({ message: 'Invalid signature' });
      }
      
      const event = JSON.parse(rawBody);
      const result = await stripePaymentService.processWebhook(event);
      
      res.json({ 
        received: true, 
        message: result.message, 
        eventType: event.type,
        endpoint: '/api/v1/payments/webhook'
      });
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // Deprecated webhook endpoint
  app.post('/api/v1/webhooks/payment', async (req, res) => {
    console.warn('⚠️ Deprecated webhook endpoint called - use /api/v1/webhooks/stripe or /api/v1/payments/webhook');
    res.status(410).json({ 
      message: 'This endpoint is deprecated. Use /api/v1/webhooks/stripe or /api/v1/payments/webhook instead.',
      deprecated: true,
      migrateToEndpoints: ['/api/v1/webhooks/stripe', '/api/v1/payments/webhook'],
      recommendedEndpoint: '/api/v1/webhooks/stripe'
    });
  });

  // WebSocket setup with comprehensive real-time features
  const httpServer = createServer(app);
  const wsManager = new WebSocketManager(httpServer);
  
  // Store WebSocket manager instance globally for use in routes
  (global as any).wsManager = wsManager;
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, closing WebSocket connections...');
    wsManager.cleanup();
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, closing WebSocket connections...');
    wsManager.cleanup();
  });

  return httpServer;
}
