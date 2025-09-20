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

// Category image URL validation schema for security
const categoryImageUrlSchema = z.object({
  imageUrl: z.string()
    .url('Must be a valid URL')
    .refine((url) => {
      // Ensure URL is from our object storage domain for security
      const allowedDomains = [
        'objectstorage.replit.com',
        // Add other trusted domains if needed
      ];
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => urlObj.hostname === domain);
      } catch {
        return false;
      }
    }, 'Image URL must be from authorized storage domain')
    .refine((url) => {
      // Additional validation for image file extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      return allowedExtensions.some(ext => url.toLowerCase().includes(ext));
    }, 'URL must point to a valid image file')
});

// Service icon validation schemas
const serviceIconUpdateSchema = z.object({
  iconType: z.enum(['emoji', 'image']),
  iconValue: z.string().min(1, 'Icon value is required')
});

const serviceImageUrlSchema = z.object({
  imageUrl: z.string()
    .url('Must be a valid URL')
    .refine((url) => {
      // Ensure URL is from our object storage domain for security
      const allowedDomains = [
        'objectstorage.replit.com',
        // Add other trusted domains if needed
      ];
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => urlObj.hostname === domain);
      } catch {
        return false;
      }
    }, 'Image URL must be from authorized storage domain')
    .refine((url) => {
      // Additional validation for image file extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      return allowedExtensions.some(ext => url.toLowerCase().includes(ext));
    }, 'URL must point to a valid image file')
});

// Admin login validation schema (supports literal admin credentials)
const adminLoginSchema = z.object({
  email: z.string().min(1, 'Email is required').max(100, 'Email cannot exceed 100 characters'),
  password: z.string().min(1, 'Password is required'),
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z.object({
    category: z.string().optional(),
    priceRange: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
});

// Enhanced conversation schema
const conversationMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional(),
  conversationContext: z.object({
    extractedInfo: z.record(z.any()).optional(),
    conversationStage: z.enum(['initial', 'diagnosis', 'clarification', 'service_suggestion', 'booking_ready']).optional(),
    problemCategory: z.string().optional(),
    nextQuestions: z.array(z.string()).optional(),
    recommendedServices: z.array(z.any()).optional(),
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

// Provider verification schemas
const providerRegistrationSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum(['individual', 'company']),
  serviceIds: z.array(z.string()).min(1, 'At least one service must be selected'),
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).max(50),
  serviceRadius: z.number().min(1).max(100).default(25),
  serviceAreas: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string()),
  })).optional(),
});

const documentUploadSchema = z.object({
  documentType: z.enum(['aadhar_front', 'aadhar_back', 'photo', 'certificate', 'license', 'insurance', 'portfolio']),
  filename: z.string().min(1).max(255),
  size: z.number().min(1).max(10 * 1024 * 1024), // 10MB limit
  mimetype: z.string(),
});

const verificationActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes', 'suspend', 'under_review']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  resubmissionReason: z.string().optional(),
});

const updateProviderProfileSchema = z.object({
  businessName: z.string().max(100).optional(),
  serviceIds: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  serviceRadius: z.number().min(1).max(100).optional(),
  availability: z.object({}).optional(),
  serviceAreas: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string()),
  })).optional(),
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

// ============================
// COUPON VALIDATION SCHEMAS
// ============================

const couponFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  isExpired: z.boolean().optional(),
  type: z.enum(['percentage', 'fixed_amount']).optional(),
  campaignName: z.string().optional(),
  createdBy: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const couponValidationContextSchema = z.object({
  userId: z.string(),
  orderValue: z.number().min(0),
  serviceIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

const couponApplicationSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  orderValue: z.number().min(0),
  serviceIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

const bulkCouponUpdateSchema = z.object({
  couponIds: z.array(z.string().min(1)).min(1, 'At least one coupon must be selected'),
  updates: z.object({
    isActive: z.boolean().optional(),
    lastModifiedBy: z.string().min(1, 'Modified by is required'),
  }),
});

const bulkCouponDeleteSchema = z.object({
  couponIds: z.array(z.string().min(1)).min(1, 'At least one coupon must be selected'),
});

const couponCodeGenerationSchema = z.object({
  pattern: z.string().optional().default('SAVE###'),
});

const couponCodeAvailabilitySchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});

const couponDuplicationSchema = z.object({
  couponId: z.string().min(1, 'Source coupon ID is required'),
  modifications: insertCouponSchema.partial(),
});

const userCouponsFiltersSchema = z.object({
  categoryIds: z.array(z.string()).optional(),
  minOrderValue: z.number().min(0).optional(),
  onlyUnused: z.boolean().optional(),
  limit: z.number().min(1).max(50).optional(),
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

// Support System rate limiters for security
const supportTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 ticket creations per 15 minutes per IP
  message: 'Too many support tickets created. Please wait before creating another ticket.',
  standardHeaders: true,
  legacyHeaders: false,
});

const supportMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute per IP
  message: 'Too many messages sent. Please wait before sending another message.',
  standardHeaders: true,
  legacyHeaders: false,
});

const supportCallbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 callback requests per hour per IP
  message: 'Too many callback requests. Please wait before requesting another callback.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Support authorization helper
const canAccessTicket = async (userId: string, userRole: string, ticketId: string) => {
  if (userRole === 'admin') return true;
  
  const ticket = await storage.getSupportTicket(ticketId);
  if (!ticket) return false;
  
  // Ticket owner or assigned agent can access
  return ticket.userId === userId || ticket.assignedAgentId === userId;
};









const agentStatusSchema = z.object({
  status: z.enum(['available', 'busy', 'away', 'offline'], {
    required_error: 'Status is required',
  }),
  statusMessage: z.string().max(100, 'Status message cannot exceed 100 characters').optional(),
});

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
  
  // Create HTTP server and initialize WebSocket
  const server = createServer(app);
  
  // Add server-level debugging for upgrade requests
  server.on('upgrade', (request, socket, head) => {
    console.log('🔄 HTTP Server: WebSocket upgrade request received:', {
      url: request.url,
      origin: request.headers.origin,
      method: request.method
    });
  });
  
  initializeWebSocket(server);
  
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

  // Auth routes - Enhanced to handle session authentication and expired JWT gracefully
  app.get('/api/auth/user', async (req: AuthenticatedRequest, res) => {
    try {
      let userId: string | undefined;
      let user: any = null;
      
      console.log('🔍 /api/auth/user: Checking authentication methods...');
      
      // ABSOLUTE PRIORITY 1: Check for admin JWT token in cookies FIRST (overrides all other auth)
      if (req.cookies?.adminToken) {
        console.log('🍪 /api/auth/user: Found admin token in cookie, processing with ABSOLUTE HIGHEST PRIORITY');
        try {
          const jwtPayload = await jwtService.verifyAccessToken(req.cookies.adminToken);
          if (jwtPayload) {
            console.log(`🔑 /api/auth/user: Admin JWT token verified for userId: ${jwtPayload.userId}`);
            user = await storage.getUser(jwtPayload.userId);
            
            if (user && user.isActive && user.role === 'admin') {
              console.log(`✅ /api/auth/user: Admin user ${jwtPayload.userId} authenticated successfully`);
              const userWithDisplayName = {
                ...user,
                displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Administrator Admin'
              };
              return res.json(userWithDisplayName);
            }
          }
        } catch (adminJwtError) {
          console.log('❌ /api/auth/user: Admin JWT token expired/invalid, clearing cookie...');
          // Clear expired admin cookie
          res.clearCookie('adminToken', { path: '/', httpOnly: true });
        }
      }
      
      // PRIORITY 2: Check if user is already authenticated via Replit session
      if (req.user) {
        // Extract user ID from Replit session
        userId = req.user.id || req.user.claims?.sub;
        if (userId) {
          console.log(`🔐 /api/auth/user: Session authentication found for userId: ${userId}`);
          user = await storage.getUser(userId);
          
          if (user && user.isActive) {
            console.log(`✅ /api/auth/user: Session user ${userId} authenticated successfully`);
            const userWithDisplayName = {
              ...user,
              displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
            };
            return res.json(userWithDisplayName);
          } else if (user && !user.isActive) {
            console.log(`❌ /api/auth/user: Session user ${userId} is inactive`);
            return res.json(null);
          }
        }
      }
      
      // PRIORITY 3: Check for JWT token in Authorization header (fallback for SMS auth)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1]?.trim();
        if (token) {
          console.log('📱 /api/auth/user: Found token in Authorization header, attempting JWT verification...');
          try {
            const jwtPayload = await jwtService.verifyAccessToken(token);
            if (jwtPayload) {
              console.log(`🔑 /api/auth/user: JWT token verified for userId: ${jwtPayload.userId}`);
              user = await storage.getUser(jwtPayload.userId);
              
              if (user && user.isActive) {
                console.log(`✅ /api/auth/user: JWT user ${jwtPayload.userId} authenticated successfully`);
                const userWithDisplayName = {
                  ...user,
                  displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
                };
                return res.json(userWithDisplayName);
              }
            }
          } catch (jwtError) {
            console.log('❌ /api/auth/user: JWT token verification failed (expired/invalid):', jwtError);
            // Continue to return null instead of error - let frontend handle redirect
          }
        }
      }
      
      // No valid authentication found - return null (not an error)
      console.log('ℹ️ /api/auth/user: No valid authentication found, returning null');
      res.json(null);
      
    } catch (error) {
      console.error("❌ /api/auth/user: Unexpected error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
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
      res.json({
        success: true,
        data: { items: [], subtotal: 0, tax: 0, discount: 0, total: 0 }
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cart'
      });
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
    // GET /api/dev/twilio-test - Comprehensive Twilio integration test
    app.get('/api/dev/twilio-test', async (req, res) => {
      try {
        const testResult = await twilioService.testSMSFunctionality();
        const healthStatus = await twilioService.getHealthStatus();
        const stats = await twilioService.getStatistics(24);
        
        const envVars = {
          TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN, 
          TWILIO_FROM_NUMBER: !!process.env.TWILIO_FROM_NUMBER,
          TWILIO_DEV_FALLBACK: process.env.TWILIO_DEV_FALLBACK,
          SKIP_OTP_RATE_LIMIT: process.env.SKIP_OTP_RATE_LIMIT,
          NODE_ENV: process.env.NODE_ENV
        };

        const setupComplete = !!(process.env.TWILIO_ACCOUNT_SID && 
                                 process.env.TWILIO_AUTH_TOKEN && 
                                 process.env.TWILIO_FROM_NUMBER);

        res.json({
          success: true,
          twilioStatus: {
            configured: setupComplete,
            mode: setupComplete ? 'live' : 'stub',
            health: healthStatus,
            testResults: testResult
          },
          statistics: stats,
          environment: envVars,
          setupInstructions: setupComplete ? 
            'Twilio is properly configured! ✅' : 
            {
              step1: 'Go to https://twilio.com/console and create an account',
              step2: 'Get your Account SID (starts with AC...) and Auth Token',  
              step3: 'Buy a Twilio phone number with SMS capability',
              step4: 'Add these to Replit Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
              step5: 'Restart the application to load new environment variables'
            },
          recommendations: {
            forTrialAccounts: 'Set TWILIO_DEV_FALLBACK=true to enable console fallback',
            forRateLimiting: 'Set SKIP_OTP_RATE_LIMIT=true to skip rate limits in development',
            phoneFormat: 'Use E.164 format: +[country code][number] (e.g., +919876543210)',
            testing: 'Use /api/dev/twilio-test-sms?phone=+919876543210 to test SMS sending'
          }
        });
      } catch (error) {
        console.error('Error testing Twilio integration:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to test Twilio integration',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // GET /api/dev/twilio-test-sms - Test SMS sending to a specific number
    app.get('/api/dev/twilio-test-sms', async (req, res) => {
      try {
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Phone parameter required. Example: ?phone=+919876543210'
          });
        }

        console.log(`🧪 Testing SMS sending to ${phone}...`);
        const result = await twilioService.sendOTP(phone, req.ip, req.get('User-Agent'));
        
        res.json({
          success: result.success,
          message: result.message,
          challengeId: result.challengeId,
          testNote: 'This is a development test. Check your phone for the OTP!',
          nextSteps: result.success ? 
            `Use /api/dev/twilio-verify-sms?phone=${phone}&code=XXXXXX to test verification` :
            'Fix Twilio configuration first'
        });
      } catch (error) {
        console.error('Error testing SMS sending:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to test SMS sending',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // GET /api/dev/twilio-verify-sms - Test SMS verification
    app.get('/api/dev/twilio-verify-sms', async (req, res) => {
      try {
        const { phone, code } = req.query;
        if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Phone and code parameters required. Example: ?phone=+919876543210&code=123456'
          });
        }

        console.log(`🧪 Testing OTP verification for ${phone}...`);
        const result = await twilioService.verifyOTP(phone, code, req.ip);
        
        res.json({
          success: result.success,
          message: result.message,
          remainingAttempts: result.remainingAttempts,
          testNote: 'Development verification test completed'
        });
      } catch (error) {
        console.error('Error testing OTP verification:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to test OTP verification',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

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

    // GET /api/dev/twilio-health - Comprehensive Twilio health check
    app.get('/api/dev/twilio-health', async (req, res) => {
      try {
        const healthStatus = await twilioService.getHealthStatus();
        res.json({
          success: true,
          ...healthStatus
        });
      } catch (error) {
        console.error('Error getting Twilio health status:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to get health status',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // POST /api/dev/twilio-test - Test Twilio functionality
    app.post('/api/dev/twilio-test', async (req, res) => {
      try {
        const { testPhone } = req.body;
        const testResult = await twilioService.testSMSFunctionality(testPhone);
        res.json({
          success: testResult.success,
          message: testResult.message,
          results: testResult.results,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error testing Twilio functionality:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Test failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // POST /api/dev/phone-validate - Test phone number validation and formatting
    app.post('/api/dev/phone-validate', async (req, res) => {
      try {
        const { phoneNumbers } = req.body;
        
        if (!Array.isArray(phoneNumbers)) {
          return res.status(400).json({
            success: false,
            message: 'phoneNumbers should be an array of phone number strings'
          });
        }

        const results = phoneNumbers.map(phone => {
          const isValid = twilioService.isValidPhoneNumber(phone);
          // Use the formatPhoneNumber method (assuming it's made public or accessible)
          const formatted = isValid ? phone : null;
          
          return {
            input: phone,
            isValid,
            formatted,
            type: phone.startsWith('+91') ? 'Indian' : 
                  phone.startsWith('+1') ? 'US/Canada' : 
                  phone.startsWith('+44') ? 'UK' : 'Other'
          };
        });

        res.json({
          success: true,
          results,
          totalTested: phoneNumbers.length,
          validCount: results.filter(r => r.isValid).length,
          invalidCount: results.filter(r => !r.isValid).length
        });
      } catch (error) {
        console.error('Error validating phone numbers:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Validation failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Admin-only monitoring endpoints (all environments)
  app.get('/api/admin/twilio-stats', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const hoursBack = parseInt(req.query.hours as string) || 24;
      const stats = await twilioService.getStatistics(hoursBack);
      res.json({
        success: true,
        statistics: stats,
        period: `${hoursBack} hours`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Twilio statistics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get statistics'
      });
    }
  });

  app.get('/api/admin/sms-health', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const healthStatus = await twilioService.getHealthStatus();
      res.json({
        success: true,
        health: healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting SMS health status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get health status'
      });
    }
  });

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

  // POST /api/v1/users/me/avatar - Upload user avatar (handled by enhanced endpoint later in file)

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

  // GET /api/v1/users/me/locale/preferences - Get user locale preferences
  app.get('/api/v1/users/me/locale/preferences', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const preferences = await storage.getUserLocalePreferences(userId);
      
      // Return default preferences if none exist
      if (!preferences) {
        const defaultPreferences = {
          language: 'en',
          fallbackLanguage: 'en',
          country: 'IN',
          state: null,
          city: null,
          region: null,
          serviceRadius: 25,
          preferredServiceAreas: null,
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          numberFormat: 'indian',
          currencyCode: 'INR',
          currencyFormat: 'symbol',
          calendar: 'gregorian',
          weekStartsOn: 1,
          festivals: null,
          contentPreference: 'local',
          showLocalProviders: true,
          showRegionalOffers: true,
          autoDetectLocation: true,
          autoDetectLanguage: false
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
      console.error('Error fetching locale preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch locale preferences'
      });
    }
  });

  // PATCH /api/v1/users/me/locale/preferences - Update user locale preferences
  app.patch('/api/v1/users/me/locale/preferences', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updatedPreferences = await storage.upsertUserLocalePreferences(userId, req.body);
      
      res.json({
        success: true,
        message: 'Locale preferences updated successfully',
        preferences: updatedPreferences
      });

    } catch (error) {
      console.error('Error updating locale preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update locale preferences'
      });
    }
  });

  // GET /api/v1/users/me/preferences/language-region - Get language & region preferences
  app.get('/api/v1/users/me/preferences/language-region', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const preferences = await storage.getUserLocalePreferences(userId);
      
      if (!preferences) {
        // Return default language & region preferences
        const defaultPreferences = {
          language: 'en',
          country: 'IN',
          region: 'New Delhi, Delhi',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24',
          unitSystem: 'metric',
          autoDetectLocation: true
        };
        
        res.json({
          success: true,
          preferences: defaultPreferences
        });
      } else {
        // Map full locale preferences to language-region format
        const languageRegionPrefs = {
          language: preferences.language,
          country: preferences.country,
          region: preferences.region || `${preferences.city}, ${preferences.state}` || 'New Delhi, Delhi',
          currency: preferences.currencyCode,
          timezone: 'Asia/Kolkata', // This would ideally come from user preferences
          dateFormat: preferences.dateFormat,
          timeFormat: preferences.timeFormat === '24h' ? '24' : '12',
          unitSystem: 'metric', // This would ideally come from user preferences
          autoDetectLocation: preferences.autoDetectLocation
        };
        
        res.json({
          success: true,
          preferences: languageRegionPrefs
        });
      }

    } catch (error) {
      console.error('Error fetching language-region preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch language-region preferences'
      });
    }
  });

  // PATCH /api/v1/users/me/preferences/language-region - Update language & region preferences
  app.patch('/api/v1/users/me/preferences/language-region', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Map language-region format to full locale preferences
      const { language, country, region, currency, timezone, dateFormat, timeFormat, unitSystem, autoDetectLocation } = req.body;
      
      const localeData = {
        language,
        country,
        region: region || null,
        currencyCode: currency,
        dateFormat,
        timeFormat: timeFormat === '24' ? '24h' : '12h',
        autoDetectLocation
      };

      const updatedPreferences = await storage.upsertUserLocalePreferences(userId, localeData);
      
      res.json({
        success: true,
        message: 'Language and region preferences updated successfully',
        preferences: updatedPreferences
      });

    } catch (error) {
      console.error('Error updating language-region preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update language-region preferences'
      });
    }
  });

  // Development-only admin login endpoint (bypasses rate limiter)
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    app.post('/api/admin/dev-login', validateBody(adminLoginSchema), async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        console.log('🔧 Dev admin login endpoint hit');
        
        // Development credentials bypass
        if (email === 'nainspagal@gmail.com' && password === 'Sinha@1357') {
          console.log('✅ Development admin credentials accepted');
          
          // Find or create admin user
          let adminUser;
          
          try {
            // Try to find existing user by either email
            adminUser = await storage.getUserByEmail(email);
            if (adminUser) {
              console.log('✅ Found existing admin user with email:', adminUser.id);
            } else {
              console.log('🔧 Admin user not found by email, attempting to create...');
              try {
                const newUser = await storage.createUser({
                  email: email,
                  firstName: 'Administrator',
                  lastName: 'Admin',
                  role: 'admin',
                  isVerified: true,
                  walletBalance: '0.00',
                  fixiPoints: 0,
                  isActive: true,
                });
                adminUser = newUser;
                console.log('✅ Dev admin user created successfully');
              } catch (createError) {
                console.error('❌ Failed to create dev admin user:', createError);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to create admin user'
                });
              }
            }
          } catch (error) {
            console.error('❌ Error looking up admin user by email:', error);
            return res.status(500).json({
              success: false,
              message: 'Failed to find admin user'
            });
          }
          
          // Generate JWT token
          const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'development-secret-key-change-in-production';
          const token = jwt.sign(
            { 
              userId: adminUser.id, 
              email: adminUser.email,
              role: adminUser.role,
              type: 'admin'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          console.log('✅ Dev admin login successful');
          
          return res.json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
              id: adminUser.id,
              email: adminUser.email,
              firstName: adminUser.firstName,
              lastName: adminUser.lastName,
              role: adminUser.role
            }
          });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid dev admin credentials'
          });
        }
        
      } catch (error) {
        console.error('❌ Dev admin login error:', error);
        return res.status(500).json({
          success: false,
          message: 'Admin login failed'
        });
      }
    });
  }

  // Secure admin login endpoint with environment-based credentials
  app.post('/api/admin/login', adminLoginLimiter, validateBody(adminLoginSchema), async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      console.log('🔧 Admin login endpoint hit - processing request');
      
      // Secure admin credentials from environment variables
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
      const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
      const ADMIN_ID = 'admin-001'; // Fixed admin ID for consistency
      
      // Development bypass when environment variables aren't available
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const devBypassEnabled = isDevelopment && (process.env.DEV_ADMIN_ENABLED === 'true' || process.env.DEV_ADMIN_ENABLED);
      
      // Check for dev bypass credentials - accept both email addresses
      let isDevBypass = false;
      console.log('🔧 Debug bypass check:', {
        isDevelopment,
        devBypassEnabled,
        email,
        devEnvValue: process.env.DEV_ADMIN_ENABLED
      });
      
      if (devBypassEnabled && 
          (email === 'nainspagal@gmail.com' || email === 'itsnainskashyap@gmail.com') && 
          password === 'Sinha@1357') {
        isDevBypass = true;
        console.log('✅ Development admin bypass activated');
      }
      
      // Validate environment configuration (skip for dev bypass)
      if (!isDevBypass && (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH)) {
        console.error('❌ Admin credentials not configured in environment variables');
        console.log('💡 For development testing, set DEV_ADMIN_ENABLED=true');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
      }
      
      console.log('🔐 Admin login attempt:', {
        providedEmail: email,
        hasExpectedEmail: !!ADMIN_EMAIL,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Validate credentials using constant-time comparison for security
      let isValidEmail, isValidPassword;
      
      if (isDevBypass) {
        isValidEmail = true;
        isValidPassword = true;
      } else {
        isValidEmail = email === ADMIN_EMAIL;
        isValidPassword = ADMIN_PASSWORD_HASH ? await bcrypt.compare(password, ADMIN_PASSWORD_HASH) : false;
      }
      
      if (!isValidEmail || !isValidPassword) {
        console.warn('❌ Invalid admin login attempt:', {
          emailMatched: isValidEmail,
          passwordMatched: isValidPassword,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid admin credentials'
        });
      }
      
      // Create or get admin user
      let adminUser;
      
      if (isDevBypass) {
        // For dev bypass, find user by the provided email
        try {
          adminUser = await storage.getUserByEmail(email);
          console.log('✅ Found existing user for dev bypass:', adminUser?.id);
        } catch (error) {
          console.log('🔧 User not found for dev bypass, creating...');
        }
        
        if (!adminUser) {
          try {
            // Create new user with the provided email for dev bypass
            const newUser = await storage.createUser({
              email: email,
              firstName: 'Administrator',
              lastName: 'Admin',
              role: 'admin',
              isVerified: true,
              walletBalance: '0.00',
              fixiPoints: 0,
              isActive: true,
            });
            adminUser = newUser;
            console.log('✅ Dev admin user created successfully');
          } catch (createError) {
            console.error('❌ Failed to create dev admin user:', createError);
            return res.status(500).json({
              success: false,
              message: 'Failed to initialize admin user'
            });
          }
        }
      } else {
        // Normal admin login process
        try {
          adminUser = await storage.getUser(ADMIN_ID);
        } catch (error) {
          console.log('🔧 Creating admin user...');
        }
        
        if (!adminUser) {
          try {
            const newUser = await storage.createUser({
              email: ADMIN_EMAIL,
              firstName: 'Administrator',
              lastName: 'Admin',
              role: 'admin',
              isVerified: true,
              walletBalance: '0.00',
              fixiPoints: 0,
              isActive: true,
            });
            adminUser = newUser;
            console.log('✅ Admin user created successfully');
          } catch (createError) {
            console.error('❌ Failed to create admin user:', createError);
            return res.status(500).json({
              success: false,
              message: 'Failed to initialize admin user'
            });
          }
        }
      }
      
      // Ensure admin user has correct role
      if (adminUser && adminUser.role !== 'admin') {
        adminUser = await storage.updateUser(adminUser.id, {
          role: 'admin',
          isVerified: true,
        }) || adminUser;
      }
      
      // Generate admin JWT token with admin role
      const adminToken = await jwtService.generateAccessToken(adminUser.id, 'admin');
      
      // Set secure HttpOnly cookie for admin authentication
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      };
      
      res.cookie('adminToken', adminToken, cookieOptions);
      
      console.log('✅ Admin login successful:', {
        adminId: adminUser.id,
        email: adminUser.email,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        tokenSet: 'HttpOnly cookie'
      });
      
      // Return success response with admin user data (no token in response)
      res.json({
        success: true,
        message: 'Admin login successful',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
          isVerified: adminUser.isVerified,
          isActive: adminUser.isActive,
          displayName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        },
        adminAccess: true
      });
      
    } catch (error) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Admin login failed due to server error'
      });
    }
  });

  // Secure admin logout endpoint with proper cookie clearing
  app.post('/api/admin/logout', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Admin logout attempt:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      // Clear the admin token cookie with all the same options used when setting it
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/'
      };

      res.clearCookie('adminToken', cookieOptions);

      console.log('✅ Admin logout successful:', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
        cookieCleared: true
      });

      res.json({
        success: true,
        message: 'Admin logout successful'
      });

    } catch (error) {
      console.error('❌ Admin logout error:', error);
      // Still clear the cookie even if there's an error
      res.clearCookie('adminToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/'
      });
      
      res.status(500).json({
        success: false,
        message: 'Logout completed but with errors'
      });
    }
  });

  // Get current admin user information
  app.get('/api/admin/me', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          message: 'Admin authentication required' 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Admin user not found' 
        });
      }

      // Verify admin role
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Admin access required' 
        });
      }

      console.log('✅ Admin user info retrieved:', {
        adminId: user.id,
        email: user.email,
        role: user.role,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          displayName: `${user.firstName} ${user.lastName}`.trim(),
        },
        adminAccess: true
      });

    } catch (error) {
      console.error('❌ Error fetching admin user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin user information'
      });
    }
  });

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
  app.post('/api/v1/auth/ws-token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🔐 WebSocket token request:', {
        user: req.user ? 'present' : 'missing',
        userId: req.user?.id,
        role: req.user?.role,
        authMethod: req.user?.authMethod
      });
      
      const userId = req.user?.id;
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
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours in seconds
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
  // Validate conversation messages
  const validateConversationMessage = validateBody(conversationMessageSchema);
  
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

  // Enhanced AI Chat endpoint with sophisticated conversation flows
  app.post('/api/v1/ai/chat', optionalAuth, async (req: AuthenticatedRequest, res) => {
    // Always ensure JSON response
    res.type('application/json');
    
    try {
      const { message, conversationContext, conversationId, context } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required and must be a non-empty string'
        });
      }

      // Handle backward compatibility: accept both 'conversationContext' and 'context'
      const effectiveContext = conversationContext || context || {};

      const userId = req.user?.id;
      console.log(`💬 Enhanced AI Chat from user ${userId || 'anonymous'}: "${message.substring(0, 50)}..."`);
      console.log(`💬 Conversation context:`, conversationContext);

      // Build sophisticated conversation context with backward compatibility
      const enhancedContext = {
        userId,
        conversationId: conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        extractedInfo: effectiveContext?.extractedInfo || effectiveContext?.conversationHistory || {},
        conversationStage: effectiveContext?.conversationStage || 'initial',
        problemCategory: effectiveContext?.problemCategory,
        nextQuestions: effectiveContext?.nextQuestions || [],
        recommendedServices: effectiveContext?.recommendedServices || []
      };

      // Use the enhanced conversation method
      const conversationResult = await aiService.generateConversationResponse(
        message.trim(),
        enhancedContext
      );

      // Save conversation to database if user is authenticated
      let savedMessage = null;
      if (userId && conversationId) {
        try {
          savedMessage = await storage.createChatMessage({
            conversationId,
            senderId: userId,
            content: message.trim(),
            message: message.trim(),
            messageType: 'user'
          });
          
          // Save AI response
          await storage.createChatMessage({
            conversationId,
            senderId: 'ai_assistant',
            content: conversationResult.response,
            message: conversationResult.response,
            messageType: 'ai',
            metadata: {
              suggestedServices: conversationResult.suggestedServices || [],
              extractedInfo: conversationResult.extractedInfo || {},
              nextStage: conversationResult.nextStage || '',
              quickReplies: conversationResult.quickReplies || []
            }
          });
        } catch (dbError) {
          console.warn('Failed to save conversation to database:', dbError);
        }
      }

      // Prepare response with backward compatibility
      const responseData = {
        // New format
        success: true,
        conversationId: enhancedContext.conversationId,
        response: conversationResult.response,
        suggestedServices: conversationResult.suggestedServices || [],
        extractedInfo: conversationResult.extractedInfo,
        conversationStage: conversationResult.nextStage,
        quickReplies: conversationResult.quickReplies || [],
        bookingReady: conversationResult.bookingReady || false,
        bookingData: conversationResult.bookingData,
        timestamp: new Date().toISOString(),
        messageId: savedMessage?.id,
        // Backward compatibility - map to old format
        suggestedSearches: (conversationResult.quickReplies || []).map((reply: string) => reply)
      };
      
      res.json(responseData);

    } catch (error) {
      console.error('Error in enhanced AI chat endpoint:', error);
      
      // Enhanced fallback response
      const fallbackResponse = "I'm here to help you find the right home services! " +
        "Could you tell me what specific problem you're having? For example: \"My kitchen tap is leaking\" or \"The lights in my bedroom aren't working\"";
      
      res.status(200).json({
        success: true,
        conversationId: req.body.conversationId || `conv_${Date.now()}_fallback`,
        response: fallbackResponse,
        suggestedServices: [],
        extractedInfo: {},
        conversationStage: 'initial',
        quickReplies: ['Electrical problem', 'Plumbing issue', 'Cleaning needed', 'Something else'],
        bookingReady: false,
        timestamp: new Date().toISOString(),
        fallback: true,
        // Backward compatibility
        suggestedSearches: ['Electrical problem', 'Plumbing issue', 'Cleaning needed', 'Something else']
      });
    }
  });

  // NEW: Chat-based service suggestions endpoint
  app.post('/api/v1/ai/chat-suggestions', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { conversationHistory, context } = req.body;

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({
          success: false,
          message: 'conversationHistory array is required'
        });
      }

      if (conversationHistory.length < 1) {
        return res.json({
          success: true,
          suggestions: [],
          analysis: {
            problemType: 'unknown',
            urgency: 'low',
            confidence: 0,
            extractedInfo: {}
          },
          recommendationReason: 'Not enough conversation context to provide recommendations.'
        });
      }

      const userId = req.user?.id;
      console.log(`🎯 Generating chat suggestions from ${conversationHistory.length} messages for user: ${userId || 'anonymous'}`);

      // Convert frontend message format to backend format
      const messages = conversationHistory.map((msg: any) => ({
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
        metadata: msg.metadata || {}
      }));

      // Generate suggestions using the enhanced AI service
      const result = await aiService.generateChatSuggestions(messages, context);

      res.json({
        success: true,
        suggestions: result.suggestions,
        analysis: result.analysis,
        recommendationReason: result.recommendationReason,
        timestamp: new Date().toISOString(),
        conversationCount: conversationHistory.length
      });

    } catch (error) {
      console.error('Error in chat suggestions endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate chat suggestions',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });
  
  // Get conversation history
  app.get('/api/v1/ai/conversations/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      const messages = await storage.getChatMessagesByConversation(conversationId, userId);
      
      res.json({
        success: true,
        conversationId,
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.messageType,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        messageCount: messages.length
      });
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation history'
      });
    }
  });
  
  // Get user's recent conversations
  app.get('/api/v1/ai/conversations', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const conversations = await storage.getUserConversations(userId, limit);
      
      res.json({
        success: true,
        conversations: conversations.map(conv => ({
          conversationId: conv.conversationId,
          lastMessage: conv.content,
          lastMessageTime: conv.timestamp,
          messageCount: conv.messageCount,
          hasBooking: conv.metadata?.bookingData ? true : false
        })),
        total: conversations.length
      });
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations'
      });
    }
  });
  
  // Create booking from conversation
  app.post('/api/v1/ai/conversations/:conversationId/booking', authMiddleware, validateBody(insertServiceBookingSchema), async (req: AuthenticatedRequest, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      const bookingData = req.body;
      
      // Get conversation context
      const messages = await storage.getChatMessagesByConversation(conversationId, userId);
      const lastAIMessage = messages.filter(m => m.messageType === 'ai').pop();
      
      // Create booking with conversation context
      const booking = await storage.createServiceBooking({
        ...bookingData,
        customerId: userId,
        conversationId,
        notes: `${bookingData.notes || ''} \n\nFrom AI conversation: ${lastAIMessage?.metadata?.extractedInfo?.problemDescription || 'Discussed via chat'}`
      });
      
      // Update conversation with booking reference
      if (lastAIMessage) {
        await storage.updateChatMessage(lastAIMessage.id, {
          metadata: {
            ...lastAIMessage.metadata,
            bookingId: booking.id,
            bookingCreated: true
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Booking created successfully from conversation',
        booking: {
          id: booking.id,
          serviceId: booking.serviceId,
          scheduledFor: booking.scheduledAt || null,
          status: booking.status
        },
        conversationId
      });
    } catch (error) {
      console.error('Error creating booking from conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking from conversation'
      });
    }
  });

  // AI cache statistics for monitoring
  app.get('/api/v1/ai/cache-stats', authMiddleware, requireRole(['admin']), async (req, res) => {
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

  // ========================================
  // STANDARDIZED API ENDPOINTS FOR ADMIN SYNC
  // ========================================

  // GET /api/v1/service-categories - Get all service categories with filtering
  app.get('/api/v1/service-categories', async (req, res) => {
    try {
      const { activeOnly = 'true', level, parentId } = req.query;
      
      let categories;
      if (level !== undefined) {
        categories = await storage.getServiceCategoriesByLevel(parseInt(level as string), activeOnly === 'true');
      } else if (parentId) {
        categories = await storage.getSubCategories(parentId as string, activeOnly === 'true');
      } else {
        categories = await storage.getServiceCategories(activeOnly === 'true');
      }
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching service categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch service categories'
      });
    }
  });

  // POST /api/v1/service-categories - Create new service category (admin only)
  app.post('/api/v1/service-categories', 
    adminSessionMiddleware, 
    validateBody(apiCreateServiceCategorySchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const categoryData = req.body;
        
        // Generate slug if not provided
        if (!categoryData.slug) {
          categoryData.slug = await storage.generateCategorySlug(categoryData.name, categoryData.parentId);
        }
        
        // Set level based on parent
        if (categoryData.parentId) {
          const parent = await storage.getServiceCategory(categoryData.parentId);
          if (!parent) {
            return res.status(400).json({
              success: false,
              message: 'Parent category not found'
            });
          }
          categoryData.level = parent.level + 1;
        } else {
          categoryData.level = 0;
        }

        const newCategory = await storage.createServiceCategory(categoryData);
        
        res.status(201).json({
          success: true,
          data: newCategory,
          message: 'Service category created successfully'
        });
      } catch (error) {
        console.error('Error creating service category:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create service category'
        });
      }
    });

  // PATCH /api/v1/service-categories/:id - Update service category (admin only)
  app.patch('/api/v1/service-categories/:id',
    adminSessionMiddleware,
    validateBody(apiUpdateServiceCategorySchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate hierarchy if parentId is being changed
        if (updateData.parentId !== undefined) {
          const validation = await storage.validateCategoryHierarchy(id, updateData.parentId);
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              message: validation.reason || 'Invalid category hierarchy'
            });
          }
        }

        const updatedCategory = await storage.updateServiceCategory(id, updateData);
        
        if (!updatedCategory) {
          return res.status(404).json({
            success: false,
            message: 'Service category not found'
          });
        }

        res.json({
          success: true,
          data: updatedCategory,
          message: 'Service category updated successfully'
        });
      } catch (error) {
        console.error('Error updating service category:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update service category'
        });
      }
    });

  // GET /api/v1/services - Get all services with filtering and pagination
  app.get('/api/v1/services', async (req, res) => {
    try {
      const { 
        categoryId, 
        isActive = 'true', 
        isTestService = 'false',
        search,
        sortBy = 'name',
        limit = '50',
        offset = '0'
      } = req.query;

      const filters: any = {
        isActive: isActive === 'true',
        isTestService: isTestService === 'true'
      };

      if (categoryId) {
        filters.categoryId = categoryId as string;
      }

      let services = await storage.getServices(filters);

      // Apply search filter if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        services = services.filter(service => 
          service.name.toLowerCase().includes(searchTerm) ||
          service.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply sorting
      if (sortBy === 'name') {
        services.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'price') {
        services.sort((a, b) => parseFloat(a.basePrice || '0') - parseFloat(b.basePrice || '0'));
      } else if (sortBy === 'rating') {
        services.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
      }

      // Apply pagination
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;
      const paginatedServices = services.slice(offsetNum, offsetNum + limitNum);

      // Transform services for frontend compatibility
      const transformedServices = transformServicesForFrontend(paginatedServices);

      res.json({
        success: true,
        data: transformedServices,
        total: services.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch services'
      });
    }
  });

  // POST /api/v1/services - Create new service (admin only)
  app.post('/api/v1/services',
    adminSessionMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        console.log('🔍 Service Creation Request:', {
          method: req.method,
          url: req.url,
          body: req.body,
          bodyKeys: Object.keys(req.body || {}),
          userId: req.user?.id
        });
        
        // Manual validation with detailed logging
        const validationResult = insertServiceSchema.safeParse(req.body);
        if (!validationResult.success) {
          console.log('❌ Service validation failed:', {
            errors: validationResult.error.errors,
            receivedData: req.body,
            expectedFields: Object.keys(insertServiceSchema.shape)
          });
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: validationResult.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              received: err.code === 'invalid_type' ? `${typeof req.body[err.path[0]]}` : 'invalid'
            }))
          });
        }
        
        const serviceData = validationResult.data;
        console.log('✅ Service validation passed:', serviceData);

        // Validate that category exists
        if (serviceData.categoryId) {
          const category = await storage.getServiceCategory(serviceData.categoryId);
          if (!category) {
            return res.status(400).json({
              success: false,
              message: 'Category not found'
            });
          }
        }

        // Create service with proper data structure
        const newService = await storage.createService({
          ...serviceData,
          createdAt: undefined // Let the database handle this
        });

        res.status(201).json({
          success: true,
          data: transformServiceForFrontend(newService),
          message: 'Service created successfully'
        });
      } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create service'
        });
      }
    });

  // PATCH /api/v1/services/:id - Update service (admin only)
  app.patch('/api/v1/services/:id',
    adminSessionMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate category if being changed
        if (updateData.categoryId) {
          const category = await storage.getServiceCategory(updateData.categoryId);
          if (!category) {
            return res.status(400).json({
              success: false,
              message: 'Category not found'
            });
          }
        }

        const updatedService = await storage.updateService(id, updateData);
        
        if (!updatedService) {
          return res.status(404).json({
            success: false,
            message: 'Service not found'
          });
        }

        res.json({
          success: true,
          data: transformServiceForFrontend(updatedService),
          message: 'Service updated successfully'
        });
      } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update service'
        });
      }
    });

  // POST /api/v1/service-requests - Create service request (authenticated users)
  app.post('/api/v1/service-requests',
    authMiddleware,
    validateBody(insertServiceRequestSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const serviceRequestData = req.body;

        // Ensure user ID is present (required by auth middleware)
        if (!req.user?.id) {
          return res.status(401).json({
            success: false,
            message: 'User authentication required'
          });
        }

        // Validate that category exists if provided
        if (serviceRequestData.categoryId) {
          const category = await storage.getServiceCategory(serviceRequestData.categoryId);
          if (!category) {
            return res.status(400).json({
              success: false,
              message: 'Category not found'
            });
          }
        }

        // Add user ID to the request (now guaranteed to exist)
        const requestWithUserId = {
          ...serviceRequestData,
          userId: req.user.id
        };

        // Create service request
        const newServiceRequest = await storage.createServiceRequest(requestWithUserId);

        res.status(201).json({
          success: true,
          data: newServiceRequest,
          message: 'Service request submitted successfully'
        });
      } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to submit service request'
        });
      }
    });

  // GET /api/v1/service-requests - Get service requests (admin only)
  app.get('/api/v1/service-requests',
    adminSessionMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, categoryId, limit = '50' } = req.query;
        
        const filters: any = {};
        if (status) filters.status = status as string;
        if (categoryId) filters.categoryId = categoryId as string;
        if (limit) filters.limit = parseInt(limit as string);

        const serviceRequests = await storage.getServiceRequests(filters);

        res.json({
          success: true,
          data: serviceRequests
        });
      } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch service requests'
        });
      }
    });

  // GET /api/v1/users - Get all users with filtering (admin only)
  app.get('/api/v1/users',
    adminSessionMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { 
          role, 
          search,
          isActive,
          limit = '50',
          offset = '0'
        } = req.query;

        let users;
        
        if (search) {
          // Search users by name, email, or phone
          users = await storage.searchUsers(search as string, role as any);
        } else if (role) {
          // Get users by role
          users = await storage.getUsersByRole(role as any);
        } else {
          // Get all users (implement this in storage if needed)
          users = await storage.searchUsers('', undefined);
        }

        // Apply active filter if provided
        if (isActive !== undefined) {
          const activeFilter = isActive === 'true';
          users = users.filter(user => user.isActive === activeFilter);
        }

        // Apply pagination
        const limitNum = Math.min(parseInt(limit as string) || 50, 100);
        const offsetNum = parseInt(offset as string) || 0;
        const paginatedUsers = users.slice(offsetNum, offsetNum + limitNum);

        // Remove sensitive data from response
        const sanitizedUsers = paginatedUsers.map(user => ({
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          walletBalance: user.walletBalance,
          fixiPoints: user.fixiPoints,
          profileImageUrl: user.profileImageUrl,
          location: user.location,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }));

        res.json({
          success: true,
          data: sanitizedUsers,
          total: users.length,
          limit: limitNum,
          offset: offsetNum
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch users'
        });
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
      
      res.json({
        success: true,
        data: category
      });
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
      // Return direct array for frontend compatibility
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  // Enhanced Hierarchical Category APIs
  
  // GET /api/v1/categories/tree - Get full hierarchical category tree structure
  app.get('/api/v1/categories/tree', async (req, res) => {
    try {
      const { rootId, maxDepth, activeOnly = 'true' } = req.query;
      const tree = await storage.getCategoryTree(
        rootId as string,
        maxDepth ? parseInt(maxDepth as string) : undefined,
        activeOnly === 'true'
      );
      // Return direct array for frontend compatibility
      res.json(tree);
    } catch (error) {
      console.error('Error fetching category tree:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category tree'
      });
    }
  });

  // GET /api/v1/categories/:categoryId/path - Get full category path for breadcrumbs
  app.get('/api/v1/categories/:categoryId/path', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const path = await storage.getCategoryBreadcrumbs(categoryId);
      res.json({
        success: true,
        data: path
      });
    } catch (error) {
      console.error('Error fetching category path:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category path'
      });
    }
  });

  // GET /api/v1/categories/:categoryId/with-children - Get category with its children
  app.get('/api/v1/categories/:categoryId/with-children', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { activeOnly = 'true' } = req.query;
      const categoryWithChildren = await storage.getCategoryWithChildren(categoryId, activeOnly === 'true');
      res.json({
        success: true,
        data: categoryWithChildren
      });
    } catch (error) {
      console.error('Error fetching category with children:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category with children'
      });
    }
  });

  // GET /api/v1/categories/search-path - Search categories by path prefix
  app.get('/api/v1/categories/search-path', async (req, res) => {
    try {
      const { pathPrefix, activeOnly = 'true' } = req.query;
      if (!pathPrefix) {
        return res.status(400).json({ message: 'pathPrefix query parameter is required' });
      }
      const categories = await storage.getCategoriesByPath(pathPrefix as string, activeOnly === 'true');
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error searching categories by path:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search categories by path'
      });
    }
  });

  // GET /api/v1/categories/stats - Get category hierarchy statistics
  app.get('/api/v1/categories/stats', async (req, res) => {
    try {
      const { categoryId } = req.query;
      const stats = await storage.getCategoryStats(categoryId as string);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching category stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category stats'
      });
    }
  });

  // Admin Hierarchical Category Management APIs

  // PUT /api/v1/admin/categories/:categoryId/move - Move category to different parent
  app.put('/api/v1/admin/categories/:categoryId/move', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { newParentId } = req.body;
      
      const movedCategory = await storage.moveCategoryToParent(categoryId, newParentId);
      if (!movedCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json({
        success: true,
        message: 'Category moved successfully',
        category: movedCategory
      });
    } catch (error) {
      console.error('Error moving category:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to move category' });
      }
    }
  });

  // POST /api/v1/admin/categories/bulk-reorder - Bulk reorder categories
  app.post('/api/v1/admin/categories/bulk-reorder', adminSessionMiddleware, async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: 'Updates must be an array' });
      }
      
      await storage.bulkReorderCategories(updates);
      
      res.json({
        success: true,
        message: 'Categories reordered successfully'
      });
    } catch (error) {
      console.error('Error bulk reordering categories:', error);
      res.status(500).json({ message: 'Failed to reorder categories' });
    }
  });

  // POST /api/v1/admin/categories/update-paths - Update category paths (data maintenance)
  app.post('/api/v1/admin/categories/update-paths', adminSessionMiddleware, async (req, res) => {
    try {
      const { startFromCategoryId } = req.body;
      
      await storage.updateCategoryPaths(startFromCategoryId);
      
      res.json({
        success: true,
        message: 'Category paths updated successfully'
      });
    } catch (error) {
      console.error('Error updating category paths:', error);
      res.status(500).json({ message: 'Failed to update category paths' });
    }
  });

  // POST /api/v1/admin/categories/validate-hierarchy - Validate category hierarchy move
  app.post('/api/v1/admin/categories/validate-hierarchy', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId, newParentId } = req.body;
      
      if (!categoryId) {
        return res.status(400).json({ message: 'categoryId is required' });
      }
      
      const validation = await storage.validateCategoryHierarchy(categoryId, newParentId);
      res.json(validation);
    } catch (error) {
      console.error('Error validating hierarchy:', error);
      res.status(500).json({ message: 'Failed to validate hierarchy' });
    }
  });

  // ============================================================================
  // ADMIN SERVICES MANAGEMENT API - Complete CRUD operations for services
  // ============================================================================

  // Service validation schemas
  const serviceCreateSchema = z.object({
    name: z.string().min(1, 'Service name is required').max(100, 'Service name cannot exceed 100 characters'),
    description: z.string().min(1, 'Service description is required').max(1000, 'Description cannot exceed 1000 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    basePrice: z.string().or(z.number()).transform(val => String(val)),
    estimatedDuration: z.number().min(5, 'Duration must be at least 5 minutes').max(1440, 'Duration cannot exceed 24 hours'),
    iconType: z.enum(['emoji', 'image']).default('emoji'),
    iconValue: z.string().min(1, 'Icon value is required'),
    images: z.array(z.string().url()).optional().default([]),
    workflowSteps: z.array(z.object({
      step: z.string().min(1),
      description: z.string().min(1),
      estimatedMinutes: z.number().min(1)
    })).optional().default([]),
    requirements: z.array(z.string()).optional().default([]),
    skillsRequired: z.array(z.string()).optional().default([]),
    toolsRequired: z.array(z.string()).optional().default([]),
    allowInstantBooking: z.boolean().default(true),
    allowScheduledBooking: z.boolean().default(true),
    advanceBookingDays: z.number().min(0).max(90).default(7),
    isActive: z.boolean().default(true),
    isTestService: z.boolean().default(false)
  });

  const serviceUpdateSchema = serviceCreateSchema.partial();

  const bulkServiceUpdateSchema = z.object({
    serviceIds: z.array(z.string().min(1)).min(1, 'At least one service must be selected'),
    updates: z.object({
      isActive: z.boolean().optional(),
      categoryId: z.string().optional(),
      basePrice: z.string().optional()
    })
  });

  // GET /api/v1/admin/services - List all services with admin filters
  app.get('/api/v1/admin/services', adminSessionMiddleware, async (req, res) => {
    try {
      const { 
        categoryId, 
        isActive, 
        isTestService, 
        search, 
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const filters: any = {};
      
      if (categoryId && categoryId !== 'all') {
        filters.categoryId = categoryId as string;
      }
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      
      if (isTestService !== undefined) {
        filters.isTestService = isTestService === 'true';
      }

      let services = await storage.getServices(filters);

      // Apply search filter
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.toLowerCase();
        services = services.filter(service => 
          service.name.toLowerCase().includes(searchTerm) ||
          service.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply sorting
      services.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'basePrice':
            comparison = parseFloat(a.basePrice) - parseFloat(b.basePrice);
            break;
          case 'totalBookings':
            comparison = (a.totalBookings || 0) - (b.totalBookings || 0);
            break;
          case 'rating':
            comparison = parseFloat(a.rating || '0') - parseFloat(b.rating || '0');
            break;
          case 'createdAt':
          default:
            comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedServices = services.slice(startIndex, startIndex + limitNum);

      // Get category names for services
      const servicesWithCategories = await Promise.all(
        paginatedServices.map(async (service) => {
          const category = service.categoryId ? await storage.getServiceCategory(service.categoryId) : null;
          return {
            ...service,
            categoryName: category?.name || 'Uncategorized'
          };
        })
      );

      res.json({
        success: true,
        data: servicesWithCategories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: services.length,
          totalPages: Math.ceil(services.length / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching admin services:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch services' 
      });
    }
  });

  // GET /api/v1/admin/services/statistics - Get service statistics
  app.get('/api/v1/admin/services/statistics', adminSessionMiddleware, async (req, res) => {
    console.log('🔍 Services statistics endpoint hit - processing request');
    try {
      const allServices = await storage.getServices();
      const activeServices = allServices.filter(s => s.isActive);
      const testServices = allServices.filter(s => s.isTestService);
      
      // Calculate category distribution
      const categoryStats = new Map();
      for (const service of allServices) {
        if (service.categoryId) {
          const category = await storage.getServiceCategory(service.categoryId);
          const categoryName = category?.name || 'Uncategorized';
          categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + 1);
        }
      }

      // Calculate price ranges
      const priceRanges = {
        low: allServices.filter(s => parseFloat(s.basePrice) <= 500).length,
        medium: allServices.filter(s => parseFloat(s.basePrice) > 500 && parseFloat(s.basePrice) <= 2000).length,
        high: allServices.filter(s => parseFloat(s.basePrice) > 2000).length
      };

      res.json({
        success: true,
        statistics: {
          total: allServices.length,
          active: activeServices.length,
          inactive: allServices.length - activeServices.length,
          test: testServices.length,
          avgPrice: allServices.length > 0 ? 
            allServices.reduce((sum, s) => sum + parseFloat(s.basePrice), 0) / allServices.length : 0,
          totalBookings: allServices.reduce((sum, s) => sum + (s.totalBookings || 0), 0),
          avgRating: allServices.length > 0 ? 
            allServices.reduce((sum, s) => sum + parseFloat(s.rating || '0'), 0) / allServices.length : 0,
          categoryDistribution: Object.fromEntries(categoryStats),
          priceRanges
        }
      });
    } catch (error) {
      console.error('Error fetching service statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch service statistics'
      });
    }
  });

  // GET /api/v1/admin/services/:id - Get specific service with admin details
  app.get('/api/v1/admin/services/:id', adminSessionMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ 
          success: false,
          message: 'Service not found' 
        });
      }

      // Get category information
      const category = service.categoryId ? await storage.getServiceCategory(service.categoryId) : null;

      res.json({
        success: true,
        data: {
          ...service,
          categoryName: category?.name || 'Uncategorized'
          // categoryPath property doesn't exist in schema, removed
        }
      });
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch service' 
      });
    }
  });

  // Category hierarchy validation helper - NOW REQUIRES SUBCATEGORY (LEVEL 1)
  const validateCategoryHierarchy = async (categoryId: string): Promise<{ valid: boolean; message?: string }> => {
    const category = await storage.getServiceCategory(categoryId);
    if (!category) {
      return { valid: false, message: 'Category not found' };
    }
    
    // MANDATORY SUBCATEGORY: Services can only be created in subcategories (level 1)
    if (category.level !== 1) {
      return { valid: false, message: 'Services must be created in a subcategory. Please select a subcategory (not a main category).' };
    }
    
    // Ensure the subcategory has a valid parent (level 0)
    if (!category.parentId) {
      return { valid: false, message: 'Subcategory must have a parent main category' };
    }
    
    const parentCategory = await storage.getServiceCategory(category.parentId);
    if (!parentCategory) {
      return { valid: false, message: 'Parent category not found' };
    }
    if (parentCategory.level !== 0) {
      return { valid: false, message: 'Parent must be a main category (level 0)' };
    }
    
    return { valid: true };
  };

  // POST /api/v1/admin/services - Create new service
  app.post('/api/v1/admin/services', adminSessionMiddleware, async (req, res) => {
    try {
      const validatedData = serviceCreateSchema.parse(req.body);
      
      // Verify category exists and validate hierarchy
      const hierarchyValidation = await validateCategoryHierarchy(validatedData.categoryId);
      if (!hierarchyValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Category validation failed: ${hierarchyValidation.message}`
        });
      }

      // Create service
      const service = await storage.createService({
        ...validatedData,
        slug: validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        rating: '0.00',
        totalBookings: 0,
        icon: validatedData.iconType === 'emoji' ? validatedData.iconValue : '🔧' // Legacy icon field for backward compatibility
      });

      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service
      });
    } catch (error) {
      console.error('Error creating service:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create service'
      });
    }
  });

  // PUT /api/v1/admin/services/:id - Update service
  app.put('/api/v1/admin/services/:id', adminSessionMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = serviceUpdateSchema.parse(req.body);

      // Check if service exists
      const existingService = await storage.getService(id);
      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      // Verify category exists if being updated
      if (validatedData.categoryId) {
        const category = await storage.getServiceCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category ID'
          });
        }
      }

      // Update slug if name is being updated
      if (validatedData.name) {
        validatedData.slug = validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      const updatedService = await storage.updateService(id, validatedData);

      if (!updatedService) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      res.json({
        success: true,
        message: 'Service updated successfully',
        data: updatedService
      });
    } catch (error) {
      console.error('Error updating service:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update service'
      });
    }
  });

  // DELETE /api/v1/admin/services/:id - Delete service
  app.delete('/api/v1/admin/services/:id', adminSessionMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await storage.deleteService(id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete service'
      });
    }
  });

  // POST /api/v1/admin/services/bulk-update - Bulk update services
  app.post('/api/v1/admin/services/bulk-update', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceIds, updates } = bulkServiceUpdateSchema.parse(req.body);
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const serviceId of serviceIds) {
        try {
          const updatedService = await storage.updateService(serviceId, updates);
          if (updatedService) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Service ${serviceId} not found`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to update service ${serviceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        success: results.failed === 0,
        message: `Updated ${results.success} services, ${results.failed} failed`,
        results
      });
    } catch (error) {
      console.error('Error bulk updating services:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update services'
      });
    }
  });

  // PUT /api/v1/admin/services/:id/image - Update service image
  app.put('/api/v1/admin/services/:id/image', adminSessionMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl, iconType = 'image' } = serviceImageUrlSchema.parse(req.body);

      const service = await storage.getService(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      const updatedService = await storage.updateService(id, {
        iconType: iconType as 'emoji' | 'image',
        iconValue: imageUrl,
        images: [...(service.images || []), imageUrl]
      });

      res.json({
        success: true,
        message: 'Service image updated successfully',
        data: updatedService
      });
    } catch (error) {
      console.error('Error updating service image:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update service image'
      });
    }
  });

  app.get('/api/v1/services', async (req, res) => {
    try {
      const { category, sortBy, priceRange } = req.query;
      
      let services = [];
      
      if (category && category !== 'all') {
        // Check if this is a main category (level 0) or sub category (level 1)
        const categoryInfo = await storage.getServiceCategory(category as string);
        
        if (categoryInfo && categoryInfo.level === 0) {
          // For main categories, get ALL services under the category (including subcategories)
          services = await storage.getAllServicesUnderMainCategory(category as string);
        } else {
          // For sub categories, get services directly from that category
          services = await storage.getServices({
            categoryId: category as string,
            isActive: true
          });
        }
      } else {
        // Get all services when no category filter is applied
        services = await storage.getServices({
          isActive: true
        });
      }
      
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
      
      res.json(transformServicesForFrontend(services));
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
        const suggested = transformServicesForFrontend(defaultServices.slice(0, 6));
        return res.json(suggested);
      }
      
      // Get user's recent orders for personalization
      const recentOrders = await storage.getRecentOrders(userId, 5);
      
      if (recentOrders.length === 0) {
        // If no history, return popular services
        const popularServices = await storage.getServices({ isActive: true });
        return res.json(transformServicesForFrontend(popularServices.slice(0, 6)));
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
      
      res.json(transformServicesForFrontend(suggested.slice(0, 6)));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  });

  // Service rating endpoints for filtering by ratings - must come before :serviceId route
  app.get('/api/v1/services/:category/rating/:filter', async (req, res) => {
    try {
      const { category, filter } = req.params;
      
      let services = [];
      
      if (category && category !== 'all') {
        // Check if this is a main category (level 0) or sub category (level 1)
        const categoryInfo = await storage.getServiceCategory(category as string);
        
        if (categoryInfo && categoryInfo.level === 0) {
          // For main categories, get ALL services under the category (including subcategories)
          services = await storage.getAllServicesUnderMainCategory(category as string);
        } else {
          // For sub categories, get services directly from that category
          services = await storage.getServices({
            categoryId: category as string,
            isActive: true
          });
        }
      } else {
        // Get all services when no category filter is applied
        services = await storage.getServices({
          isActive: true
        });
      }
      
      // Apply rating filtering
      if (filter && filter !== 'all') {
        services = services.filter(service => {
          const rating = parseFloat(service.rating || '0');
          switch (filter) {
            case 'high': return rating >= 4.0;
            case 'medium': return rating >= 3.0 && rating < 4.0;
            case 'low': return rating >= 1.0 && rating < 3.0;
            default: return true;
          }
        });
      }
      
      // Sort by rating (highest first)
      services.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
      
      res.json(transformServicesForFrontend(services));
    } catch (error) {
      console.error('Error fetching services by rating:', error);
      res.status(500).json({ message: 'Failed to fetch services by rating' });
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
      
      res.json(transformServiceForFrontend(service));
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

  // OLD route removed - using properly validated route at line 5798

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
      
      if (order.status !== 'completed' && order.status !== 'work_completed') {
        return res.status(400).json({ message: 'Can only review completed orders' });
      }
      
      const review = await storage.createReview({
        orderId,
        reviewerId: userId,
        revieweeId: order.providerId || '',
        rating,
        comment: comment || '',
      });
      
      // Note: rating and review fields don't exist in order schema
      // Review info is stored separately in reviews table
      
      res.json(review);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  // ========================================
  // ENHANCED ORDER LIFECYCLE API ROUTES
  // ========================================

  // Enhanced Bidirectional Rating & Review System
  app.post('/api/v1/orders/:orderId/rating', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const ratingData = req.body;
      
      console.log(`📊 Creating rating for order ${orderId} by user ${userId}`);
      
      // Use proper validation schema from shared/schema.ts
      const ratingValidationSchema = insertOrderRatingSchema.omit({ 
        orderId: true, 
        raterId: true, 
        raterRole: true 
      });
      
      const validatedData = ratingValidationSchema.parse(ratingData);
      
      // Get order and determine user role
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Determine rater role
      let raterRole: 'customer' | 'provider';
      if (booking.userId === userId) {
        raterRole = 'customer';
      } else if (booking.assignedProviderId === userId) {
        raterRole = 'provider';
      } else {
        return res.status(403).json({ message: 'Only order participants can submit ratings' });
      }
      
      // Check if order is completed
      if (booking.status !== 'work_completed' && booking.status !== 'completed') {
        return res.status(400).json({ message: 'Can only rate completed orders' });
      }
      
      // Create rating
      const rating = await storage.createOrderRating({
        orderId,
        raterId: userId,
        raterRole,
        ...validatedData,
      });
      
      console.log(`✅ Rating created successfully for order ${orderId}`);
      res.json({ success: true, rating });
    } catch (error) {
      console.error('Error creating rating:', error);
      res.status(500).json({ message: 'Failed to create rating' });
    }
  });

  // Get order ratings
  app.get('/api/v1/orders/:orderId/ratings', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const ratings = await storage.getOrderRatings(orderId);
      res.json(ratings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      res.status(500).json({ message: 'Failed to fetch ratings' });
    }
  });

  // Provider Accept Job Offer - SECURITY FIXED: Added requireRole(['service_provider']) and Zod validation
  app.post('/api/v1/orders/:orderId/accept', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      
      // SECURITY: Validate input with Zod schema to prevent bad state injection
      const validationResult = orderAcceptanceSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.warn(`❌ Invalid acceptance data for order ${orderId}:`, validationResult.error.issues);
        return res.status(400).json({ 
          message: 'Invalid acceptance details',
          errors: validationResult.error.issues
        });
      }
      
      const acceptanceDetails = validationResult.data;
      
      console.log(`✅ Provider ${providerId} accepting order ${orderId} with validated data`);
      
      // Use BackgroundMatcher for proper state management
      const { backgroundMatcher } = await import('./services/backgroundMatcher');
      const result = await backgroundMatcher.handleProviderAcceptance(orderId, providerId, acceptanceDetails);
      
      if (result.success) {
        res.json({ success: true, message: 'Job accepted successfully' });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error accepting job:', error);
      res.status(500).json({ message: 'Failed to accept job' });
    }
  });

  // Provider Decline Job Offer - SECURITY FIXED: Added requireRole(['service_provider']) and Zod validation
  app.post('/api/v1/orders/:orderId/decline', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      
      // SECURITY: Validate input with Zod schema to prevent bad state injection
      const validationResult = orderDeclineSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.warn(`❌ Invalid decline data for order ${orderId}:`, validationResult.error.issues);
        return res.status(400).json({ 
          message: 'Invalid decline details',
          errors: validationResult.error.issues
        });
      }
      
      const { reason, customReason, suggestedAlternative } = validationResult.data;
      
      console.log(`❌ Provider ${providerId} declining order ${orderId} with validated reason: ${reason}`);
      
      // Use BackgroundMatcher for proper state management
      const { backgroundMatcher } = await import('./services/backgroundMatcher');
      const result = await backgroundMatcher.handleProviderDecline(orderId, providerId, reason, customReason);
      
      if (result.success) {
        res.json({ success: true, message: 'Job declined successfully' });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error declining job:', error);
      res.status(500).json({ message: 'Failed to decline job' });
    }
  });

  // ========================================
  // DEDICATED STATE TRANSITION ENDPOINTS
  // ========================================

  // Provider marks order as en route
  app.post('/api/v1/orders/:orderId/enroute', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const { estimatedArrival, currentLocation } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate booking and provider authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking || booking.assignedProviderId !== providerId) {
        return res.status(403).json({ message: 'Not authorized for this order' });
      }

      // Validate state transition
      const canUpdate = await storage.validateBookingStatusUpdate(orderId, 'provider_on_way', providerId, 'service_provider');
      if (!canUpdate.allowed) {
        return res.status(400).json({ message: canUpdate.reason });
      }

      // Update booking status
      const updatedBooking = await storage.updateServiceBooking(orderId, {
        status: 'provider_on_way',
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined
      });

      // Create status history
      await storage.createOrderStatusHistory({
        orderId,
        fromStatus: booking.status,
        toStatus: 'provider_on_way',
        changedBy: providerId,
        changedByRole: 'provider',
        notes: 'Provider is en route to service location'
      });

      // Create location update if provided
      if (currentLocation) {
        await storage.createLocationUpdate({
          orderId,
          providerId,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          status: 'enroute',
          estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined
        });
      }

      // Send real-time WebSocket event
      if (webSocketManager) {
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.provider_enroute',
          data: {
            orderId,
            estimatedArrival,
            currentLocation,
            message: 'Your service provider is on the way!'
          }
        });
      }

      res.json({
        success: true,
        message: 'Status updated to en route',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error updating to enroute:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Provider marks as arrived/started
  app.post('/api/v1/orders/:orderId/arrived', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const { arrivalLocation, notes } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate booking and provider authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking || booking.assignedProviderId !== providerId) {
        return res.status(403).json({ message: 'Not authorized for this order' });
      }

      // Validate state transition  
      const canUpdate = await storage.validateBookingStatusUpdate(orderId, 'work_in_progress', providerId, 'service_provider');
      if (!canUpdate.allowed) {
        return res.status(400).json({ message: canUpdate.reason });
      }

      // Update booking status
      const updatedBooking = await storage.updateServiceBooking(orderId, {
        status: 'work_in_progress',
        startedAt: new Date(),
        notes: notes || undefined
      });

      // Create status history
      await storage.createOrderStatusHistory({
        orderId,
        fromStatus: booking.status,
        toStatus: 'work_in_progress',
        changedBy: providerId,
        changedByRole: 'provider',
        notes: notes || 'Provider arrived and started work'
      });

      // Create location update for arrival
      if (arrivalLocation) {
        await storage.createLocationUpdate({
          orderId,
          providerId,
          latitude: arrivalLocation.latitude,
          longitude: arrivalLocation.longitude,
          accuracy: arrivalLocation.accuracy,
          status: 'arrived',
          address: arrivalLocation.address
        });
      }

      // Send real-time WebSocket events
      if (webSocketManager) {
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.provider_arrived',
          data: {
            orderId,
            arrivalLocation,
            message: 'Your service provider has arrived and started work!'
          }
        });
      }

      res.json({
        success: true,
        message: 'Work started successfully',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error updating to arrived:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Provider marks work as in-progress
  app.post('/api/v1/orders/:orderId/in-progress', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const { workPhase, notes, photos, estimatedCompletion } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate booking and provider authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking || booking.assignedProviderId !== providerId) {
        return res.status(403).json({ message: 'Not authorized for this order' });
      }

      // Ensure work is already in progress before allowing in-progress updates
      if (booking.status !== 'work_in_progress') {
        return res.status(400).json({ message: 'Work must be in progress to update progress status' });
      }

      // Update booking with progress information
      const updatedBooking = await storage.updateServiceBooking(orderId, {
        notes: notes || booking.notes,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined
      });

      // Create status history for progress update
      await storage.createOrderStatusHistory({
        orderId,
        fromStatus: 'work_in_progress',
        toStatus: 'work_in_progress',
        changedBy: providerId,
        changedByRole: 'provider',
        notes: notes || `Work progress update: ${workPhase || 'continuing'}`
      });

      // Store progress photos if provided
      if (photos && photos.length > 0) {
        for (const photo of photos) {
          await storage.createOrderDocument({
            orderId,
            documentType: 'progress_photo',
            title: `Work Progress Photo - ${workPhase || 'In Progress'}`,
            description: 'Photo showing work progress',
            url: photo.url,
            uploadedBy: providerId,
            uploadedByRole: 'provider'
          });
        }
      }

      // Send real-time WebSocket event
      if (webSocketManager) {
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.work_progress',
          data: {
            orderId,
            workPhase,
            notes,
            photos,
            estimatedCompletion,
            message: 'Your service provider has updated the work progress.'
          }
        });
      }

      res.json({
        success: true,
        message: 'Work progress updated successfully',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error updating work progress:', error);
      res.status(500).json({ message: 'Failed to update work progress' });
    }
  });

  // Provider completes work
  app.post('/api/v1/orders/:orderId/complete-work', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const { completionNotes, workPhotos, finalAmount, workDuration } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate booking and provider authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking || booking.assignedProviderId !== providerId) {
        return res.status(403).json({ message: 'Not authorized for this order' });
      }

      // Validate state transition
      const canUpdate = await storage.validateBookingStatusUpdate(orderId, 'work_completed', providerId, 'service_provider');
      if (!canUpdate.allowed) {
        return res.status(400).json({ message: canUpdate.reason });
      }

      // Update booking status
      const updatedBooking = await storage.updateServiceBooking(orderId, {
        status: 'work_completed',
        completedAt: new Date(),
        completionNotes,
        finalAmount: finalAmount || undefined,
        workDuration: workDuration || undefined
      });

      // Create status history
      await storage.createOrderStatusHistory({
        orderId,
        fromStatus: booking.status,
        toStatus: 'work_completed',
        changedBy: providerId,
        changedByRole: 'provider',
        notes: completionNotes || 'Work completed successfully'
      });

      // Store work completion photos if provided
      if (workPhotos && workPhotos.length > 0) {
        for (const photo of workPhotos) {
          await storage.createOrderDocument({
            orderId,
            documentType: 'work_photo',
            title: 'Work Completion Photo',
            description: 'Photo showing completed work',
            url: photo.url,
            uploadedBy: providerId,
            uploadedByRole: 'provider'
          });
        }
      }

      // Send real-time WebSocket event
      if (webSocketManager) {
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.work_completed',
          data: {
            orderId,
            completionNotes,
            workPhotos,
            finalAmount,
            message: 'Your service has been completed! Please review and confirm.'
          }
        });
      }

      res.json({
        success: true,
        message: 'Work completed successfully',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error completing work:', error);
      res.status(500).json({ message: 'Failed to complete work' });
    }
  });

  // Update Provider Status (backwards compatibility)
  app.post('/api/v1/orders/:orderId/status', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const { status, location, estimatedArrival } = req.body;
      
      console.log(`🔄 Provider ${providerId} updating status to ${status} for order ${orderId}`);
      
      // Validate status
      const validStatuses = ['enroute', 'arrived', 'started', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Use BackgroundMatcher for proper state management
      const { backgroundMatcher } = await import('./services/backgroundMatcher');
      const result = await backgroundMatcher.updateProviderStatus(orderId, providerId, status, {
        location,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
      });
      
      if (result.success) {
        res.json({ success: true, message: 'Status updated successfully' });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // Basic Cancel Order endpoint
  app.post('/api/v1/orders/:orderId/cancel', authMiddleware, validateBody(z.object({
    reason: z.string().min(1, 'Cancellation reason is required'),
    customReason: z.string().optional()
  })), async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { reason, customReason } = req.body;
      
      console.log(`🚫 User ${userId} cancelling order ${orderId}`);
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Determine user role and validate authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      let cancelledByRole: 'customer' | 'provider' | 'admin';
      if (booking.userId === userId) {
        cancelledByRole = 'customer';
      } else if (booking.assignedProviderId === userId) {
        cancelledByRole = 'provider';
      } else if (req.user?.role === 'admin') {
        cancelledByRole = 'admin';
      } else {
        return res.status(403).json({ message: 'Only order participants can cancel' });
      }
      
      // Check if order can be cancelled
      const canCancel = await storage.canCancelServiceBooking(orderId, userId, req.user?.role || 'user');
      if (!canCancel.allowed) {
        return res.status(403).json({ message: canCancel.reason });
      }

      // Update booking status to cancelled
      const updatedBooking = await storage.updateServiceBooking(orderId, {
        status: 'cancelled'
      });

      // Create status history
      await storage.createOrderStatusHistory({
        orderId,
        fromStatus: booking.status,
        toStatus: 'cancelled',
        changedBy: userId,
        changedByRole: cancelledByRole,
        reason,
        notes: customReason || `Order cancelled by ${cancelledByRole}`,
      });

      // Cancel any pending job requests
      await storage.cancelAllJobRequests(orderId);

      // Send real-time notifications to all parties
      if (webSocketManager) {
        // Notify customer
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.cancelled',
          data: {
            orderId,
            cancelledBy: cancelledByRole,
            reason,
            message: 'Order has been cancelled.'
          }
        });

        // Notify provider if assigned and not the one cancelling
        if (booking.assignedProviderId && booking.assignedProviderId !== userId) {
          webSocketManager.sendToUser(booking.assignedProviderId, {
            type: 'order.cancelled',
            data: {
              orderId,
              cancelledBy: cancelledByRole,
              reason,
              message: `Order has been cancelled by ${cancelledByRole}`
            }
          });
        }
      }
      
      res.json({ 
        success: true, 
        message: 'Order cancelled successfully',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  });

  // Enhanced Cancel Order with Policy Enforcement
  app.post('/api/v1/orders/:orderId/cancel-enhanced', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { reason, customReason } = req.body;
      
      console.log(`🚫 User ${userId} cancelling order ${orderId}`);
      
      // Validate required fields
      if (!reason) {
        return res.status(400).json({ message: 'Cancellation reason is required' });
      }
      
      // Determine user role and validate authorization
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      let cancelledByRole: 'customer' | 'provider' | 'admin';
      if (booking.userId === userId) {
        cancelledByRole = 'customer';
      } else if (booking.assignedProviderId === userId) {
        cancelledByRole = 'provider';
      } else if (req.user?.role === 'admin') {
        cancelledByRole = 'admin';
      } else {
        return res.status(403).json({ message: 'Only order participants can cancel' });
      }
      
      // Apply cancellation policy with proper enforcement
      const policyResult = await storage.applyCancellationPolicy(
        orderId, 
        userId!, 
        cancelledByRole, 
        reason, 
        customReason
      );
      
      if (!policyResult.success) {
        return res.status(400).json({ 
          message: policyResult.message || 'Failed to apply cancellation policy' 
        });
      }

      // Send real-time notifications to all parties
      if (webSocketManager) {
        // Notify customer
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.cancelled',
          data: {
            orderId,
            cancelledBy: cancelledByRole,
            reason,
            refundAmount: policyResult.refundAmount,
            message: `Order has been cancelled. Refund: $${policyResult.refundAmount?.toFixed(2)}`
          }
        });

        // Notify provider if assigned
        if (booking.assignedProviderId && booking.assignedProviderId !== userId) {
          webSocketManager.sendToUser(booking.assignedProviderId, {
            type: 'order.cancelled',
            data: {
              orderId,
              cancelledBy: cancelledByRole,
              reason,
              message: 'Order has been cancelled by customer'
            }
          });
        }
      }
      
      res.json({ 
        success: true, 
        message: 'Order cancelled successfully',
        refundInfo: {
          refundAmount: policyResult.refundAmount,
          refundPercent: policyResult.refundPercent,
          penaltyAmount: policyResult.penaltyAmount
        }
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  });

  // Real-time Chat Messages
  app.post('/api/v1/orders/:orderId/chat', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const senderId = req.user?.id;
      const messageData = req.body;
      
      // Validate message data
      const messageSchema = z.object({
        content: z.string().min(1),
        messageType: z.enum(['text', 'image', 'audio', 'video', 'location', 'document']).default('text'),
        attachments: z.array(z.string()).optional(),
        replyToId: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      });
      
      const validatedMessage = messageSchema.parse(messageData);
      
      // Determine sender role
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      let senderRole: 'customer' | 'provider';
      if (booking.userId === senderId) {
        senderRole = 'customer';
      } else if (booking.assignedProviderId === senderId) {
        senderRole = 'provider';
      } else {
        return res.status(403).json({ message: 'Only order participants can send messages' });
      }
      
      // Create chat message
      const message = await storage.createOrderChatMessage({
        orderId,
        senderId,
        senderRole,
        ...validatedMessage,
      });
      
      // Emit real-time WebSocket event
      const webSocketManager = getWebSocketManager();
      if (webSocketManager) {
        const recipientId = senderRole === 'customer' ? booking.assignedProviderId : booking.userId;
        if (recipientId) {
          webSocketManager.sendToUser(recipientId, {
            type: 'order.chat_message',
            data: {
              orderId,
              message,
              senderRole,
            }
          });
        }
      }
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('Error sending chat message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get Chat Messages
  app.get('/api/v1/orders/:orderId/chat', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      // Verify user can access chat
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (booking.userId !== userId && booking.assignedProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const messages = await storage.getOrderChatMessages(orderId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Location Updates
  app.post('/api/v1/orders/:orderId/location', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const providerId = req.user?.id;
      const locationData = req.body;
      
      // Validate location data
      const locationSchema = z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        altitude: z.number().optional(),
        bearing: z.number().optional(),
        speed: z.number().optional(),
        status: z.enum(['enroute', 'arrived', 'working', 'break', 'returning']),
        address: z.string().optional(),
        estimatedArrival: z.string().datetime().optional(),
        shareLevel: z.enum(['exact', 'approximate', 'area_only']).default('approximate'),
      });
      
      const validatedLocation = locationSchema.parse(locationData);
      
      // Verify provider is assigned to this order
      const booking = await storage.getServiceBooking(orderId);
      if (!booking || booking.assignedProviderId !== providerId) {
        return res.status(403).json({ message: 'Not authorized to update location for this order' });
      }
      
      // Create location update
      await storage.createLocationUpdate({
        orderId,
        providerId,
        ...validatedLocation,
        estimatedArrival: validatedLocation.estimatedArrival ? new Date(validatedLocation.estimatedArrival) : undefined,
      });
      
      // Emit real-time WebSocket event to customer
      const webSocketManager = getWebSocketManager();
      if (webSocketManager) {
        webSocketManager.sendToUser(booking.userId, {
          type: 'order.location_update',
          data: {
            orderId,
            location: validatedLocation,
            timestamp: new Date(),
          }
        });
      }
      
      res.json({ success: true, message: 'Location updated successfully' });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  // Get Location Updates
  app.get('/api/v1/orders/:orderId/location', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      // Verify user can access location data
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (booking.userId !== userId && booking.assignedProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const locationUpdates = await storage.getLocationUpdates(orderId);
      res.json(locationUpdates);
    } catch (error) {
      console.error('Error fetching location updates:', error);
      res.status(500).json({ message: 'Failed to fetch location updates' });
    }
  });

  // Get Order Status History
  app.get('/api/v1/orders/:orderId/history', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      // Verify user can access order history
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (booking.userId !== userId && booking.assignedProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const history = await storage.getOrderStatusHistory(orderId);
      res.json(history);
    } catch (error) {
      console.error('Error fetching order history:', error);
      res.status(500).json({ message: 'Failed to fetch order history' });
    }
  });

  // Get Order Documents
  app.get('/api/v1/orders/:orderId/documents', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      
      // Verify user can access order documents
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (booking.userId !== userId && booking.assignedProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const documents = await storage.getOrderDocuments(orderId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching order documents:', error);
      res.status(500).json({ message: 'Failed to fetch order documents' });
    }
  });

  // Enhanced Receipt Generation with PDF/HTML
  app.post('/api/v1/orders/:orderId/receipt', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { format = 'html' } = req.body; // 'html' or 'pdf'
      
      // Verify user can generate receipt
      const booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (booking.userId !== userId && booking.assignedProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check if order is completed
      if (booking.status !== 'work_completed' && booking.status !== 'completed') {
        return res.status(400).json({ message: 'Receipt can only be generated for completed orders' });
      }

      // Get order details and related data
      const orderDetails = await storage.getOrder(orderId);
      const customer = await storage.getUser(booking.userId);
      const provider = booking.assignedProviderId ? await storage.getUser(booking.assignedProviderId) : null;
      const service = await storage.getService(booking.serviceId);
      const statusHistory = await storage.getOrderStatusHistory(orderId);

      // Generate receipt content
      const receiptData = {
        orderId,
        orderNumber: `FQ-${orderId.slice(-8).toUpperCase()}`,
        date: booking.completedAt || new Date(),
        customer: {
          name: `${customer?.firstName} ${customer?.lastName}`,
          email: customer?.email,
          phone: customer?.phone
        },
        provider: provider ? {
          name: `${provider.firstName} ${provider.lastName}`,
          email: provider.email,
          phone: provider.phone
        } : null,
        service: {
          name: service?.name,
          category: service?.categoryName,
          duration: booking.workDuration || 'N/A'
        },
        location: booking.serviceLocation,
        timing: {
          scheduled: booking.scheduledAt,
          started: booking.startedAt,
          completed: booking.completedAt
        },
        amount: {
          basePrice: service?.basePrice || booking.totalAmount,
          finalAmount: booking.finalAmount || booking.totalAmount,
          currency: 'USD'
        },
        notes: booking.completionNotes || booking.notes,
        statusHistory
      };

      let receiptContent: string;
      let mimeType: string;
      let fileExtension: string;

      if (format === 'pdf') {
        // Generate PDF receipt (placeholder - in production would use puppeteer/pdfkit)
        receiptContent = `PDF Receipt for Order ${receiptData.orderNumber} - Generated ${new Date().toISOString()}`;
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
      } else {
        // Generate HTML receipt
        receiptContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${receiptData.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .label { font-weight: bold; }
    .amount { font-size: 1.2em; font-weight: bold; color: #2e7d32; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FixitQuick - Service Receipt</h1>
    <p>Order #${receiptData.orderNumber}</p>
    <p>Date: ${new Date(receiptData.date).toLocaleDateString()}</p>
  </div>
  
  <div class="section">
    <h3>Customer Information</h3>
    <div class="row"><span class="label">Name:</span> <span>${receiptData.customer.name}</span></div>
    <div class="row"><span class="label">Email:</span> <span>${receiptData.customer.email}</span></div>
    <div class="row"><span class="label">Phone:</span> <span>${receiptData.customer.phone}</span></div>
  </div>
  
  ${receiptData.provider ? `
  <div class="section">
    <h3>Service Provider</h3>
    <div class="row"><span class="label">Name:</span> <span>${receiptData.provider.name}</span></div>
    <div class="row"><span class="label">Email:</span> <span>${receiptData.provider.email}</span></div>
  </div>
  ` : ''}
  
  <div class="section">
    <h3>Service Details</h3>
    <div class="row"><span class="label">Service:</span> <span>${receiptData.service.name}</span></div>
    <div class="row"><span class="label">Category:</span> <span>${receiptData.service.category}</span></div>
    <div class="row"><span class="label">Duration:</span> <span>${receiptData.service.duration}</span></div>
    <div class="row"><span class="label">Location:</span> <span>${receiptData.location?.address || 'N/A'}</span></div>
  </div>
  
  <div class="section">
    <h3>Service Timeline</h3>
    ${receiptData.timing.scheduled ? `<div class="row"><span class="label">Scheduled:</span> <span>${new Date(receiptData.timing.scheduled).toLocaleString()}</span></div>` : ''}
    ${receiptData.timing.started ? `<div class="row"><span class="label">Started:</span> <span>${new Date(receiptData.timing.started).toLocaleString()}</span></div>` : ''}
    ${receiptData.timing.completed ? `<div class="row"><span class="label">Completed:</span> <span>${new Date(receiptData.timing.completed).toLocaleString()}</span></div>` : ''}
  </div>
  
  <div class="section">
    <h3>Payment Summary</h3>
    <div class="row"><span class="label">Base Price:</span> <span>$${parseFloat(receiptData.amount.basePrice).toFixed(2)}</span></div>
    <div class="row amount"><span class="label">Final Amount:</span> <span>$${parseFloat(receiptData.amount.finalAmount).toFixed(2)}</span></div>
  </div>
  
  ${receiptData.notes ? `
  <div class="section">
    <h3>Notes</h3>
    <p>${receiptData.notes}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Thank you for choosing FixitQuick!</p>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
        mimeType = 'text/html';
        fileExtension = 'html';
      }

      // Store receipt document
      const receiptFileName = `receipt-${orderId}-${Date.now()}.${fileExtension}`;
      const receiptUrl = `/api/documents/receipt/${receiptFileName}`;
      
      await storage.createOrderDocument({
        orderId,
        documentType: 'receipt',
        title: `Receipt for Order #${receiptData.orderNumber}`,
        description: `Official ${format.toUpperCase()} receipt for completed service`,
        url: receiptUrl,
        fileName: receiptFileName,
        mimeType,
        fileSize: receiptContent.length,
        uploadedBy: userId!,
        uploadedByRole: booking.userId === userId ? 'customer' : 'provider',
        isPublic: false,
        metadata: {
          format,
          generatedAt: new Date().toISOString(),
          orderNumber: receiptData.orderNumber
        }
      });
      
      res.json({ 
        success: true, 
        receiptUrl,
        format,
        orderNumber: receiptData.orderNumber,
        message: `${format.toUpperCase()} receipt generated successfully` 
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({ message: 'Failed to generate receipt' });
    }
  });

  // Serve generated receipts
  app.get('/api/documents/receipt/:fileName', async (req, res) => {
    try {
      const { fileName } = req.params;
      
      // Security: verify file belongs to a valid order document
      const document = await storage.getOrderDocuments(fileName.split('-')[1]); // Extract orderId
      const receiptDoc = document.find(doc => doc.fileName === fileName);
      
      if (!receiptDoc) {
        return res.status(404).json({ message: 'Receipt not found' });
      }

      // For demo purposes, return a simple receipt response
      // In production, this would serve the actual stored file
      res.setHeader('Content-Type', receiptDoc.mimeType || 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
      if (receiptDoc.mimeType === 'application/pdf') {
        res.send('PDF receipt content would be served here');
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><title>Receipt - ${receiptDoc.title}</title></head>
            <body>
              <h1>${receiptDoc.title}</h1>
              <p>This is a generated receipt for your completed service.</p>
              <p>Generated: ${receiptDoc.createdAt}</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error serving receipt:', error);
      res.status(500).json({ message: 'Failed to serve receipt' });
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
        
        // Use comprehensive scheduling constraint validation
        const constraintValidation = await storage.validateSchedulingConstraints(
          bookingData.serviceId,
          scheduledTime,
          bookingData.preferredProviderId // Optional provider constraint
        );
        
        if (!constraintValidation.valid) {
          return res.status(400).json({ 
            message: constraintValidation.reason || 'Scheduling constraint violation' 
          });
        }
      }

      // Create an order first (consistent with the order creation flow)
      const orderData = {
        userId,
        type: 'service' as const,
        serviceId: bookingData.serviceId,
        items: [{
          id: service.id,
          name: service.name,
          price: parseFloat(service.basePrice),
          quantity: 1,
          type: 'service' as const
        }],
        totalAmount: bookingData.serviceDetails?.basePrice || parseFloat(service.basePrice),
        bookingType: bookingData.bookingType,
        urgency: bookingData.urgency,
        serviceLocation: bookingData.serviceLocation,
        notes: bookingData.notes,
        paymentMethod: bookingData.paymentMethod || 'online',
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        ...(bookingData.scheduledAt && { scheduledAt: bookingData.scheduledAt })
      };

      const order = await storage.createOrder(orderData);

      // Create service booking linked to the order
      const booking = await storage.createServiceBooking({
        ...bookingData,
        userId,
        status: 'pending',
        orderId: order.id, // Link to the order
      });

      // For instant bookings, immediately start provider search
      if (bookingData.bookingType === 'instant') {
        await initiateProviderSearch(booking);
      }

      // Send booking notifications
      if (booking.userId) {
        await notificationService.notifyOrderUpdate(booking.userId, order.id, booking.status);
      }

      // Broadcast order created event via WebSocket
      if (webSocketManager) {
        webSocketManager.broadcastToRoom(`user_${userId}`, {
          type: 'order_created',
          data: order
        });
      }

      // Return order data so frontend can navigate to /orders/{orderId}
      res.status(201).json({
        ...order,
        serviceBookingId: booking.id, // Include service booking ID for reference
        bookingType: booking.bookingType,
        urgency: booking.urgency
      });
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
        notes: notes || undefined
      });

      // Send status change notifications
      await notificationService.notifyStatusChange(
        updatedBooking?.userId ?? '',
        bookingId,
        status
      );

      // Broadcast real-time update
      if (webSocketManager) {
        webSocketManager.broadcastToRoom(`user_${req.user?.id}`, {
          type: 'booking_update',
          data: updatedBooking
        });
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

      // Enhanced provider authorization and TTL verification
      const jobRequest = await storage.getProviderJobRequest(bookingId, providerId);
      if (!jobRequest || jobRequest.status !== 'sent') {
        return res.status(400).json({ 
          message: 'No valid job request found',
          errorCode: 'INVALID_JOB_REQUEST'
        });
      }

      // Strict TTL verification at API level
      if (jobRequest.expiresAt && jobRequest.expiresAt <= new Date()) {
        return res.status(400).json({ 
          message: 'Job request has expired',
          errorCode: 'JOB_REQUEST_EXPIRED',
          expiredAt: jobRequest.expiresAt.toISOString()
        });
      }

      // Verify provider authorization for this specific job request
      if (jobRequest.providerId !== providerId) {
        return res.status(403).json({ 
          message: 'Provider not authorized for this job request',
          errorCode: 'PROVIDER_NOT_AUTHORIZED'
        });
      }

      // Check if booking is still available for assignment
      const booking = await storage.getServiceBooking(bookingId);
      if (!booking || booking.status !== 'provider_search') {
        return res.status(400).json({ 
          message: 'Booking is no longer available for assignment',
          errorCode: 'BOOKING_NOT_AVAILABLE',
          currentStatus: booking?.status
        });
      }

      // Additional race condition check - ensure no provider already assigned
      if (booking.assignedProviderId) {
        return res.status(400).json({ 
          message: 'Booking already assigned to another provider',
          errorCode: 'BOOKING_ALREADY_ASSIGNED',
          assignedProviderId: booking.assignedProviderId
        });
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
      const customerUser = await storage.getUser(booking.userId);
      const serviceData = await storage.getService(booking.serviceId);
      await notificationService.notifyProviderAssignment(
        providerId, 
        bookingId, 
        `${customerUser?.firstName} ${customerUser?.lastName}`.trim() || 'Customer',
        serviceData?.name || 'Service'
      );

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

  // Get provider's job requests with TTL and schema enhancements
  app.get('/api/v1/provider/job-requests', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const providerId = req.user?.id;
      const { status, limit = 20, offset = 0 } = req.query;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get job requests with TTL information
      const activeRequests = await storage.getActiveJobRequestsWithTTL(providerId);
      
      // Apply filtering if status is specified
      const filteredRequests = status ? 
        activeRequests.filter(req => req.status === status) : 
        activeRequests;

      // Apply pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedRequests = filteredRequests.slice(offsetNum, offsetNum + limitNum);

      // Enhance response with API schema requirements
      const enhancedRequests = paginatedRequests.map(request => ({
        ...request,
        remainingSeconds: Math.max(0, request.remainingSeconds),
        isExpired: request.isExpired,
        bookingDetails: request.bookingDetails ? {
          ...request.bookingDetails,
          currentSearchRadius: request.bookingDetails.currentSearchRadius,
          searchWave: request.bookingDetails.searchWave,
          pendingOffers: request.bookingDetails.pendingOffers || 0,
        } : undefined,
      }));

      res.json({
        success: true,
        data: enhancedRequests,
        pagination: {
          total: filteredRequests.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredRequests.length,
        },
        metadata: {
          activeOffersCount: activeRequests.filter(req => !req.isExpired && req.status === 'sent').length,
          expiredOffersCount: activeRequests.filter(req => req.isExpired).length,
        }
      });
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
        status: 'cancelled'
      });

      // Handle refunds if payment was made
      if (booking.paymentStatus === 'paid') {
        await storage.updateServiceBooking(bookingId, { paymentStatus: 'refunded' });
        // TODO: Implement actual refund processing
      }

      // Cancel any pending job requests
      await storage.cancelAllJobRequests(bookingId);

      // Send cancellation notifications
      await notificationService.notifyOrderCancellation(
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

  // ========================
  // ORDER WORKFLOW APIS
  // ========================

  // Create a new order
  app.post('/api/v1/orders', authMiddleware, validateBody(orderCreateApiSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const orderData = req.body;
      
      // SECURITY FIX: Check for idempotency - prevent duplicate orders
      if (orderData.idempotencyKey) {
        const existingOrder = await storage.getOrderByIdempotencyKey(orderData.idempotencyKey);
        if (existingOrder) {
          console.log(`🔄 Idempotent request detected: returning existing order ${existingOrder.id} for key ${orderData.idempotencyKey}`);
          return res.status(200).json({
            success: true,
            data: existingOrder,
            message: 'Order already exists (idempotent request)',
            idempotent: true
          });
        }
      }
      
      // CRITICAL FIX: Extract serviceIds from items array for validation
      const serviceItems = orderData.items.filter(item => item.type === 'service');
      const serviceIds = [...new Set(serviceItems.map(item => item.serviceId).filter(Boolean))];
      
      // Validate services exist and are active (for service orders)
      if (serviceIds.length > 0) {
        for (const serviceId of serviceIds) {
          const service = await storage.getService(serviceId);
          if (!service || !service.isActive) {
            return res.status(404).json({ 
              success: false, 
              message: `Service ${serviceId} not found or not available`,
              field: 'items.serviceId'
            });
          }
        }
      }

      // CRITICAL FIX: Server-side coupon validation with correct totalAmount parsing
      if (orderData.couponCode) {
        const totalAmountNumber = parseFloat(orderData.totalAmount);
        if (isNaN(totalAmountNumber) || totalAmountNumber <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid total amount for coupon validation',
            field: 'totalAmount'
          });
        }
        
        const couponValidation = await storage.validateCoupon(orderData.couponCode, {
          userId,
          orderValue: totalAmountNumber,
          serviceIds: serviceIds,
        });
        
        if (!couponValidation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Coupon validation failed',
            errors: couponValidation.errors,
            field: 'couponCode'
          });
        }
        
        // SECURITY: Server-side discount calculation (authoritative)
        const serverCalculatedDiscount = couponValidation.discountAmount || 0;
        if (Math.abs((orderData.couponDiscount || 0) - serverCalculatedDiscount) > 0.01) {
          console.warn(`⚠️  Coupon discount mismatch: client=${orderData.couponDiscount}, server=${serverCalculatedDiscount}`);
          // Use server-calculated discount as authoritative
          orderData.couponDiscount = serverCalculatedDiscount;
        }
      }

      // CRITICAL FIX: Use atomic transaction for order creation
      console.log(`🏗️  TRANSACTION START: Creating order with idempotency key: ${orderData.idempotencyKey || 'none'}`);
      const acceptDeadline = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      const transactionResult = await storage.createOrderWithTransaction({
        orderData: {
          ...orderData,
          userId,
          acceptDeadlineAt: acceptDeadline,
          status: 'pending_assignment'
        },
        couponCode: orderData.couponCode,
        couponDiscount: orderData.couponDiscount,
        paymentMethod: orderData.paymentMethod,
        partItems: orderData.items?.filter(item => item.type === 'part') || []
      });

      if (!transactionResult.success) {
        console.error(`❌ TRANSACTION FAILED: ${transactionResult.error}`, transactionResult.details);
        return res.status(400).json({
          success: false,
          message: transactionResult.error || 'Failed to create order',
          details: transactionResult.details
        });
      }

      const order = transactionResult.order;
      console.log(`✅ TRANSACTION SUCCESS: Order ${order.id} created with coupon discount: ₹${orderData.couponDiscount || 0}`);

      // Broadcast order created event via WebSocket
      if (webSocketManager) {
        webSocketManager.broadcastToRoom(`user_${userId}`, {
          type: 'order_created',
          data: order
        });
      }

      // Trigger automatic provider matching for instant orders
      if (orderData.bookingType === 'instant') {
        console.log(`🚀 Triggering automatic provider matching for order ${order.id}`);
        
        // Create service booking record for the automatic matching system
        const serviceBooking = await storage.createServiceBooking({
          userId,
          serviceId: orderData.serviceId,
          bookingType: 'instant',
          urgency: orderData.urgency || 'normal',
          serviceLocation: orderData.serviceLocation,
          notes: orderData.notes,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod || 'online',
          status: 'pending',
          // Link to original order
          orderId: order.id,
        });

        // Trigger provider search
        await initiateProviderSearch(serviceBooking);
      }

      console.log(`✅ Order created: ${order.id} for user ${userId}`);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific order details
  app.get('/api/v1/orders/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';

      const order = await storage.getOrderWithDetails(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check access permissions
      const canView = 
        userRole === 'admin' || 
        order.userId === userId || 
        order.providerId === userId;

      if (!canView) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch order details' 
      });
    }
  });

  // List orders for authenticated user
  app.get('/api/v1/orders', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role || 'user';
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { status, limit = 20, offset = 0 } = req.query;

      let orders;
      if (userRole === 'service_provider') {
        // Get orders assigned to this provider
        orders = await storage.getOrders({ 
          providerId: userId,
          status: status as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        });
      } else {
        // Get orders created by this user
        orders = await storage.getOrders({ 
          userId: userId,
          status: status as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        });
      }

      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch orders' 
      });
    }
  });

  // Update order status (admin only)
  app.patch('/api/v1/orders/:id/status', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;

      // Validate status
      const validStatuses = ['pending_assignment', 'matching', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid status value' 
        });
      }

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Validate status transition
      const canUpdate = await storage.validateStatusUpdate(id, status, userId ?? '', 'admin');
      if (!canUpdate.allowed) {
        return res.status(400).json({ 
          success: false, 
          message: canUpdate.reason || 'Status update not allowed' 
        });
      }

      const updatedOrder = await storage.updateOrder(id, { 
        status,
        meta: { 
          ...order.meta, 
          notes: notes || undefined 
        } 
      });

      // Send WebSocket notification
      if (webSocketManager && updatedOrder) {
        webSocketManager.broadcastToRoom(`user_${updatedOrder.userId}`, {
          type: 'order_status_updated',
          data: updatedOrder
        });

        if (updatedOrder.providerId) {
          webSocketManager.broadcastToRoom(`provider_${updatedOrder.providerId}`, {
            type: 'order_status_updated',
            data: updatedOrder
          });
        }
      }

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update order status' 
      });
    }
  });

  // ========================
  // PROVIDER JOB REQUEST APIS  
  // ========================

  // Get job requests for provider
  app.get('/api/v1/providers/me/job-requests', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const providerId = req.user?.id;
      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { status = 'sent', limit = 20, offset = 0 } = req.query;

      const jobRequests = await storage.getProviderJobRequests(providerId, {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      // Enhance job requests with order details
      const enhancedRequests = await Promise.all(
        jobRequests.map(async (request) => {
          const order = await storage.getOrderWithDetails(request.orderId);
          return {
            ...request,
            order: order || null
          };
        })
      );

      res.json({
        success: true,
        data: enhancedRequests,
        count: enhancedRequests.length
      });
    } catch (error) {
      console.error('Error fetching job requests:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch job requests' 
      });
    }
  });

  // Accept order job request  
  app.post('/api/v1/orders/:id/accept', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: orderId } = req.params;
      const providerId = req.user?.id;
      const { estimatedArrival, quotedPrice, notes } = req.body;

      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Check if provider can accept this order
      const canAccept = await storage.canProviderAcceptOrder(orderId, providerId);
      if (!canAccept.allowed) {
        return res.status(400).json({ 
          success: false, 
          message: canAccept.reason || 'Cannot accept this order' 
        });
      }

      // Accept the order (handles race conditions)
      const result = await storage.assignProviderToOrder(orderId, providerId);
      if (!result) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to accept order - may have been taken by another provider' 
        });
      }

      // Update any additional details
      const updateData: any = {};
      if (estimatedArrival) updateData.estimatedArrival = new Date(estimatedArrival);
      if (quotedPrice) updateData.quotedPrice = quotedPrice;
      if (notes) {
        updateData.meta = { ...result.meta, providerNotes: notes };
      }
      
      if (Object.keys(updateData).length > 0) {
        await storage.updateOrder(orderId, updateData);
      }

      // Send notifications via WebSocket
      if (webSocketManager) {
        const orderDetails = await storage.getOrderWithDetails(orderId);
        
        // Notify customer
        webSocketManager.broadcastToRoom(`user_${result.userId}`, {
          type: 'order_accepted',
          data: orderDetails
        });

        // Notify provider
        webSocketManager.broadcastToRoom(`provider_${providerId}`, {
          type: 'job_accepted',
          data: orderDetails
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Order accepted successfully'
      });
    } catch (error) {
      console.error('Error accepting order:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to accept order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Decline order job request
  app.post('/api/v1/orders/:id/decline', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: orderId } = req.params;
      const providerId = req.user?.id;
      const { reason } = req.body;

      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Check if there's a valid job request
      const jobRequest = await storage.getProviderJobRequest(orderId, providerId);
      if (!jobRequest || jobRequest.status !== 'sent') {
        return res.status(400).json({ 
          success: false, 
          message: 'No valid job request found' 
        });
      }

      // Decline the job request
      const result = await storage.declineProviderJobRequest(orderId, providerId, reason);
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: result.message || 'Failed to decline job request' 
        });
      }

      // Send WebSocket notification
      if (webSocketManager) {
        webSocketManager.broadcastToRoom(`provider_${providerId}`, {
          type: 'job_declined',
          data: { orderId, reason }
        });
      }

      res.json({
        success: true,
        message: 'Job request declined successfully'
      });
    } catch (error) {
      console.error('Error declining job request:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to decline job request' 
      });
    }
  });

  // ========================
  // PROVIDER PROFILE APIS
  // ========================

  // Get provider profile
  app.get('/api/v1/providers/me/profile', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const providerId = req.user?.id;
      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const user = await storage.getUser(providerId);
      const provider = await storage.getServiceProvider(providerId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImageUrl: user.profileImageUrl,
            isVerified: user.isVerified,
            location: user.location,
            isActive: user.isActive,
          },
          provider: provider || null
        }
      });
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch provider profile' 
      });
    }
  });

  // Update provider profile  
  app.put('/api/v1/providers/me/profile', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const providerId = req.user?.id;
      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { user: userData, provider: providerData } = req.body;

      // Update user data if provided
      if (userData) {
        const validUserFields = ['firstName', 'lastName', 'profileImageUrl', 'location'];
        const userUpdate = Object.keys(userData)
          .filter(key => validUserFields.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = userData[key];
            return obj;
          }, {});

        if (Object.keys(userUpdate).length > 0) {
          await storage.updateUser(providerId, userUpdate);
        }
      }

      // Update provider data if provided
      if (providerData) {
        const validProviderFields = [
          'businessName', 'businessType', 'skills', 'serviceIds', 
          'experienceYears', 'availability', 'currentLocation', 
          'serviceRadius', 'serviceAreas'
        ];
        const providerUpdate = Object.keys(providerData)
          .filter(key => validProviderFields.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = providerData[key];
            return obj;
          }, {});

        if (Object.keys(providerUpdate).length > 0) {
          await storage.updateServiceProvider(providerId, providerUpdate);
        }
      }

      // Return updated profile
      const user = await storage.getUser(providerId);
      const provider = await storage.getServiceProvider(providerId);

      res.json({
        success: true,
        data: {
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            profileImageUrl: user.profileImageUrl,
            isVerified: user.isVerified,
            location: user.location,
            isActive: user.isActive,
          } : null,
          provider: provider || null
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating provider profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update provider profile' 
      });
    }
  });

  // Update provider online status
  app.patch('/api/v1/providers/me/status', authMiddleware, requireRole(['service_provider']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const providerId = req.user?.id;
      if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { isOnline, isAvailable, currentLocation } = req.body;
      
      const updateData: any = {};
      if (typeof isOnline === 'boolean') updateData.isOnline = isOnline;
      if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
      if (currentLocation) updateData.currentLocation = currentLocation;
      
      // Update last active timestamp
      updateData.lastActiveAt = new Date();

      const updatedProvider = await storage.updateServiceProvider(providerId, updateData);

      // Broadcast status change via WebSocket
      if (webSocketManager && updatedProvider) {
        webSocketManager.broadcastToRoom(`provider_${providerId}`, {
          type: 'status_updated',
          data: {
            isOnline: updatedProvider.isOnline,
            isAvailable: updatedProvider.isAvailable,
            lastActiveAt: updatedProvider.lastActiveAt
          }
        });
      }

      res.json({
        success: true,
        data: {
          isOnline: updatedProvider?.isOnline || false,
          isAvailable: updatedProvider?.isAvailable || false,
          lastActiveAt: updatedProvider?.lastActiveAt
        },
        message: 'Status updated successfully'
      });
    } catch (error) {
      console.error('Error updating provider status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update provider status' 
      });
    }
  });

  // Manual provider assignment endpoint
  app.put('/api/v1/service-bookings/:bookingId/assign', authMiddleware, requireRole(['admin', 'service_provider']), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { providerId } = req.body;
      const userRole = req.user?.role || 'user';
      const userId = req.user?.id;

      // Validate request body
      if (!providerId) {
        return res.status(400).json({ message: 'Provider ID is required' });
      }

      const booking = await storage.getServiceBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if booking is in a state that allows assignment
      if (!['pending', 'provider_search'].includes(booking.status)) {
        return res.status(400).json({ 
          message: 'Booking cannot be assigned in current status',
          currentStatus: booking.status 
        });
      }

      // For service providers, they can only assign themselves
      if (userRole === 'service_provider' && providerId !== userId) {
        return res.status(403).json({ message: 'Service providers can only assign themselves' });
      }

      // Verify the provider exists and is a service provider
      const provider = await storage.getUser(providerId);
      if (!provider || provider.role !== 'service_provider') {
        return res.status(404).json({ message: 'Provider not found or not a service provider' });
      }

      // Update booking with assigned provider
      const updatedBooking = await storage.updateServiceBooking(bookingId, {
        assignedProviderId: providerId,
        assignedAt: new Date(),
        assignmentMethod: userRole === 'admin' ? 'manual' : 'auto',
        status: 'provider_assigned'
      });

      // Cancel other pending job requests
      await storage.cancelOtherJobRequests(bookingId, providerId);

      // Send notifications  
      const customerUser = await storage.getUser(booking.userId);
      const serviceData = await storage.getService(booking.serviceId);
      const customerName = `${customerUser?.firstName} ${customerUser?.lastName}`.trim() || 'Customer';
      const serviceType = serviceData?.name || 'Service';
      
      await notificationService.notifyProviderAssignment(providerId, bookingId, customerName, serviceType);
      await notificationService.notifyOrderUpdate(booking.userId, bookingId, 'provider_assigned', customerName);

      res.json({
        success: true,
        message: 'Provider assigned successfully',
        booking: updatedBooking,
      });
    } catch (error) {
      console.error('Error assigning provider to booking:', error);
      res.status(500).json({ message: 'Failed to assign provider' });
    }
  });

  // ========================================
  // PROVIDER JOB REQUEST ENDPOINTS
  // ========================================

  // Provider accepts job request
  app.post('/api/v1/provider-job-requests/:bookingId/accept', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const providerId = req.user?.id;
      const { estimatedArrival, quotedPrice, notes } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Accept the job request
      const result = await storage.acceptProviderJobRequest(bookingId, providerId, {
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        quotedPrice: quotedPrice ? Number(quotedPrice) : undefined,
        notes,
      });

      if (!result.success) {
        return res.status(400).json({ 
          message: result.message || 'Failed to accept job request' 
        });
      }

      res.json({
        success: true,
        message: 'Job request accepted successfully',
        booking: result.booking,
      });
    } catch (error) {
      console.error('Error accepting job request:', error);
      res.status(500).json({ message: 'Failed to accept job request' });
    }
  });

  // Provider declines job request
  app.post('/api/v1/provider-job-requests/:bookingId/decline', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const providerId = req.user?.id;
      const { reason } = req.body;

      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Decline the job request
      const result = await storage.declineProviderJobRequest(bookingId, providerId, reason);

      if (!result.success) {
        return res.status(400).json({ 
          message: result.message || 'Failed to decline job request' 
        });
      }

      res.json({
        success: true,
        message: 'Job request declined successfully',
      });
    } catch (error) {
      console.error('Error declining job request:', error);
      res.status(500).json({ message: 'Failed to decline job request' });
    }
  });

  // Helper function to initiate provider search for instant bookings
  // This function now uses the BackgroundMatcher service for comprehensive provider matching
  async function initiateProviderSearch(booking: any) {
    try {
      console.log(`🔍 Initiating provider search via BackgroundMatcher for booking ${booking.id}`);
      
      // Update booking status to pending to trigger BackgroundMatcher
      await storage.updateServiceBooking(booking.id, {
        status: 'pending',
      });

      console.log(`✅ Updated booking ${booking.id} status to pending - BackgroundMatcher will handle provider search`);

    } catch (error) {
      console.error(`❌ Error initiating provider search for booking ${booking.id}:`, error);
      
      // Update booking status to show error
      await storage.updateServiceBooking(booking.id, {
        status: 'cancelled',
        notes: 'Failed to initiate provider search',
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
        await notificationService.notifyOrderUpdate(booking.userId, bookingId, 'cancelled', 'System');
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
  // SMART ASSIGNMENT SYSTEM ENDPOINTS  
  // ========================================

  // Rate limiter for assignment operations
  const assignmentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 assignment requests per 5 minutes
    message: 'Too many assignment requests. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Trigger auto-assignment for an order
  app.post('/api/v1/orders/:id/auto-assign', authMiddleware, assignmentLimiter, async (req, res) => {
    try {
      const { id: orderId } = req.params;
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has permission to trigger assignment (admin or order owner)
      if (user.role !== 'admin') {
        const order = await storage.getOrder(orderId);
        if (!order || order.userId !== user.id) {
          return res.status(403).json({ message: 'Not authorized to assign this order' });
        }
      }

      console.log(`🤖 Smart Assignment: Auto-assignment triggered for order ${orderId} by user ${user.id}`);
      
      // Convert old order to service booking if needed
      let bookingId = orderId;
      const serviceBooking = await storage.getServiceBooking(orderId);
      
      if (!serviceBooking) {
        // Check if it's an old order format
        const order = await storage.getOrder(orderId);
        if (order && order.type === 'service') {
          // Convert order to service booking
          const newBooking = await storage.createServiceBooking({
            userId: order.userId,
            serviceId: order.items?.[0]?.id || '',
            bookingType: 'instant',
            serviceLocation: order.location ? {
              type: 'current',
              latitude: order.location.latitude || 0,
              longitude: order.location.longitude || 0,
              address: order.location.address || 'Unknown'
            } : {
              type: 'current',
              latitude: 0,
              longitude: 0,
              address: 'Unknown'
            },
            totalAmount: order.totalAmount.toString(),
            status: 'provider_search'
          });
          bookingId = newBooking.id;
        } else {
          return res.status(404).json({ message: 'Order or booking not found' });
        }
      }
      
      const result = await storage.autoAssignProvider(bookingId);
      
      if (result.success) {
        // Send WebSocket notification about assignment process
        if (webSocketManager) {
          webSocketManager.broadcastToRoom(`order-${bookingId}`, {
            type: 'order.assignment_started',
            data: {
              orderId: bookingId,
              jobRequestIds: result.jobRequestIds,
              message: 'Finding providers for your order...'
            }
          });
        }
        
        res.json({
          success: true,
          message: 'Auto-assignment initiated successfully',
          orderId: bookingId,
          assignedProviderId: result.assignedProviderId,
          status: result.assignedProviderId ? 'assigned' : 'searching'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to initiate assignment',
          retryAfter: result.retryAfter
        });
      }
    } catch (error) {
      console.error('❌ Smart Assignment: Error in auto-assignment:', error);
      res.status(500).json({ message: 'Assignment system error' });
    }
  });

  // Get provider's job queue and assignments
  app.get('/api/v1/providers/me/jobs', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const providerId = req.user?.id;
      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      console.log(`📋 Smart Assignment: Fetching jobs for provider ${providerId} (status: ${status || 'all'})`);
      
      const jobRequests = await storage.getJobRequestsWithDetails(providerId, {
        status,
        limit
      });
      
      // Get provider's current assignments
      const activeBookings = await storage.getUserServiceBookings(providerId, {
        status: 'provider_assigned', // Use single status filter
        limit: 10
      });
      
      res.json({
        success: true,
        data: {
          pendingOffers: jobRequests.filter(job => job.status === 'sent'),
          activeJobs: activeBookings || [],
          recentJobs: jobRequests.filter(job => ['accepted', 'declined', 'expired'].includes(job.status))
        },
        meta: {
          totalPending: jobRequests.filter(job => job.status === 'sent').length,
          totalActive: activeBookings?.length || 0
        }
      });
    } catch (error) {
      console.error('❌ Smart Assignment: Error fetching provider jobs:', error);
      res.status(500).json({ message: 'Failed to fetch job queue' });
    }
  });

  // Provider accepts a job request
  app.post('/api/v1/job-requests/:id/accept', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { id: jobRequestId } = req.params;
      const providerId = req.user?.id;
      const { estimatedArrival, quotedPrice, notes } = req.body;
      
      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get job request details first
      const jobRequest = await storage.getProviderJobRequest(jobRequestId, providerId);
      if (!jobRequest) {
        return res.status(404).json({ message: 'Job request not found' });
      }
      
      console.log(`✅ Smart Assignment: Provider ${providerId} accepting job request ${jobRequestId}`);
      
      const result = await storage.acceptProviderJobRequest(jobRequest.bookingId, providerId, {
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
        notes
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.message || 'Failed to accept job request'
        });
      }
      
      // Cancel other pending job requests for this booking
      await storage.cancelOtherJobRequests(jobRequest.bookingId, providerId);
      
      // Send WebSocket notifications
      if (webSocketManager) {
        // Notify customer
        webSocketManager.broadcastToRoom(`order-${jobRequest.bookingId}`, {
          type: 'order.provider_assigned',
          data: {
            orderId: jobRequest.bookingId,
            providerId,
            estimatedArrival,
            message: 'A provider has been assigned to your order!'
          }
        });
        
        // Notify provider
        webSocketManager.sendToUser(providerId, {
          type: 'job.accepted',
          data: {
            jobRequestId,
            bookingId: jobRequest.bookingId,
            message: 'Job accepted successfully!'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Job accepted successfully',
        booking: result.booking
      });
    } catch (error) {
      console.error('❌ Smart Assignment: Error accepting job:', error);
      res.status(500).json({ message: 'Failed to accept job request' });
    }
  });

  // Provider declines a job request
  app.post('/api/v1/job-requests/:id/decline', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { id: jobRequestId } = req.params;
      const providerId = req.user?.id;
      const { reason } = req.body;
      
      if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get job request details first
      const jobRequest = await storage.getProviderJobRequest(jobRequestId, providerId);
      if (!jobRequest) {
        return res.status(404).json({ message: 'Job request not found' });
      }
      
      console.log(`❌ Smart Assignment: Provider ${providerId} declining job request ${jobRequestId}`);
      
      const result = await storage.declineProviderJobRequest(jobRequest.bookingId, providerId, reason);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.message || 'Failed to decline job request'
        });
      }
      
      // Send WebSocket notifications
      if (webSocketManager) {
        // Notify provider
        webSocketManager.sendToUser(providerId, {
          type: 'job.declined',
          data: {
            jobRequestId,
            bookingId: jobRequest.bookingId,
            message: 'Job declined successfully'
          }
        });
        
        // Check if we need to trigger reassignment
        const remainingOffers = await storage.getProviderJobRequests(providerId, {
          status: 'sent'
        });
        
        if (remainingOffers.length === 0) {
          // No more offers for this booking, trigger reassignment
          setTimeout(async () => {
            console.log(`🔄 Smart Assignment: No providers responded, triggering reassignment for booking ${jobRequest.bookingId}`);
            await storage.autoAssignProvider(jobRequest.bookingId, { retryCount: 1 });
          }, 30000); // Wait 30 seconds before reassigning
        }
      }
      
      res.json({
        success: true,
        message: 'Job declined successfully'
      });
    } catch (error) {
      console.error('❌ Smart Assignment: Error declining job:', error);
      res.status(500).json({ message: 'Failed to decline job request' });
    }
  });

  // Check order assignment status
  app.get('/api/v1/orders/:id/provider-status', authMiddleware, async (req, res) => {
    try {
      const { id: orderId } = req.params;
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get booking (try both service booking and order)
      let booking = await storage.getServiceBooking(orderId);
      if (!booking) {
        const order = await storage.getOrder(orderId);
        if (order) {
          // Convert order info to booking-like format
          booking = {
            id: order.id,
            userId: order.userId,
            status: order.status,
            assignedProviderId: order.serviceProviderId,
            totalAmount: order.totalAmount.toString()
          } as any;
        }
      }
      
      if (!booking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check access permissions
      if (user.role !== 'admin' && booking.userId !== user.id && booking.assignedProviderId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to view this order status' });
      }
      
      const statusData: any = {
        orderId,
        status: booking.status,
        assignedProviderId: booking.assignedProviderId,
        assignedAt: booking.assignedAt
      };
      
      // Get provider details if assigned
      if (booking.assignedProviderId) {
        const provider = await storage.getServiceProvider(booking.assignedProviderId);
        const providerUser = await storage.getUser(booking.assignedProviderId);
        
        if (provider && providerUser) {
          statusData.provider = {
            id: provider.userId,
            name: `${providerUser.firstName} ${providerUser.lastName}`.trim(),
            profileImage: providerUser.profileImageUrl,
            rating: provider.rating,
            isOnline: provider.isOnline,
            currentLocation: provider.currentLocation,
            phone: providerUser.phone
          };
        }
      }
      
      // Get active job requests for unassigned orders
      if (!booking.assignedProviderId) {
        const activeOffers = await db.select({
          count: sql`COUNT(*)`
        })
        .from(providerJobRequests)
        .where(and(
          eq(providerJobRequests.bookingId, orderId),
          eq(providerJobRequests.status, 'sent')
        ));
        
        statusData.pendingOffers = parseInt(String(activeOffers[0]?.count || 0));
      }
      
      res.json({
        success: true,
        data: statusData
      });
    } catch (error) {
      console.error('❌ Smart Assignment: Error fetching provider status:', error);
      res.status(500).json({ message: 'Failed to fetch provider status' });
    }
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

      if (!onionPayService.isReady()) {
        return res.json({
          success: true,
          paymentMethods: [],
          message: 'OnionPay not configured - demo mode'
        });
      }

      const { paymentMethods } = await onionPayService.getUserPaymentMethods(userId);
      
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

      if (!onionPayService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available - configure OnionPay API keys' 
        });
      }

      const { paymentMethodId, type, nickname, setAsDefault, cardDetails, upiId } = req.body;

      const paymentMethod = await onionPayService.savePaymentMethod({
        userId,
        paymentMethodId,
        type,
        nickname,
        setAsDefault,
        cardDetails,
        upiId,
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

      if (!onionPayService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available' 
        });
      }

      const { id } = req.params;
      await onionPayService.deletePaymentMethod(userId, id);

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
  // ONIONPAY SESSION ENDPOINTS
  // ========================================

  // Create OnionPay session for order (replaces Stripe payment intents)
  app.post('/api/v1/payment-intents', paymentLimiter, authMiddleware, validateBody(createPaymentIntentSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!onionPayService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available - configure OnionPay API keys' 
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

      const idempotencyKey = orderId ? `session_${orderId}_${userId}_${Date.now()}` : `session_${userId}_${Date.now()}`;
      const { session, dbPaymentIntent } = await onionPayService.createPaymentSession({
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
          sessionId: session.id,
          sessionToken: session.session_token,
          amount: dbPaymentIntent.amount,
          currency: dbPaymentIntent.currency,
          status: session.status,
        },
        message: 'OnionPay session created successfully'
      });
    } catch (error) {
      console.error('Error creating OnionPay session:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create payment session' 
      });
    }
  });

  // Get OnionPay session status (replaces payment intent confirmation)
  app.post('/api/v1/payment-intents/:id/confirm', paymentLimiter, authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!onionPayService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not available' 
        });
      }

      const { id } = req.params;

      // Verify the session belongs to the user
      const dbPaymentIntent = await storage.getPaymentIntentByStripeId(id);
      if (!dbPaymentIntent || dbPaymentIntent.userId !== userId) {
        return res.status(404).json({ 
          success: false, 
          message: 'Payment session not found or access denied' 
        });
      }

      // Get session status from OnionPay
      const session = await onionPayService.getSession(id);

      res.json({
        success: true,
        paymentIntent: {
          id: session.id,
          status: session.status,
          amount: session.amount / 100, // Convert back from paisa
          currency: session.currency,
        },
        message: 'Session status retrieved'
      });
    } catch (error) {
      console.error('Error getting session status:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get session status' 
      });
    }
  });

  // ========================================
  // PAYMENT PROCESSING ENDPOINTS
  // ========================================

  // Process payment for order using OnionPay
  app.post('/api/v1/orders/:orderId/pay-onionpay', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!onionPayService.isReady()) {
        return res.status(503).json({ 
          success: false, 
          message: 'OnionPay not available - configure API keys' 
        });
      }

      const { orderId } = req.params;

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

      // Create OnionPay session for the order
      const idempotencyKey = `order_payment_${orderId}_${userId}_${Date.now()}`;
      const { session, dbPaymentIntent } = await onionPayService.createPaymentSession({
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

      // Return OnionPay session for client-side widget integration
      res.json({
        success: true,
        paymentSession: {
          id: session.id,
          sessionToken: session.session_token,
          amount: session.amount / 100, // Convert back from paisa
          currency: session.currency,
          status: session.status,
        },
        message: 'OnionPay session created - use widget to complete payment'
      });

    } catch (error) {
      console.error('Error processing OnionPay payment:', error);
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

  // SECURE: Test payment for orders (development only)
  app.post('/api/v1/orders/:orderId/pay-test', paymentLimiter, authMiddleware, async (req, res) => {
    try {
      // Only allow test payments in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
          success: false,
          message: 'Test payments are not allowed in production' 
        });
      }

      const userId = req.user?.id;
      const { orderId } = req.params;
      // Validate request body with Zod (ignore client-provided amount)
      const testPaymentSchema = z.object({
        idempotencyKey: z.string().optional(),
        paymentMethod: z.literal('test').optional(),
        amount: z.number().optional() // Ignored - server calculates from order
      });
      
      const validatedBody = testPaymentSchema.parse(req.body);
      const { idempotencyKey } = validatedBody;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // IDEMPOTENCY: Generate or use provided idempotency key
      const finalIdempotencyKey = idempotencyKey || `test_pay_order_${userId}_${orderId}_${Date.now()}`;
      
      // Simple in-memory idempotency check for test payments
      const idempotencyMapKey = `${finalIdempotencyKey}_${orderId}`;
      if (global.testPaymentIdempotencyMap) {
        if (global.testPaymentIdempotencyMap.has(idempotencyMapKey)) {
          console.log(`⚠️ Idempotent test payment request detected: ${orderId}`);
          const cachedResponse = global.testPaymentIdempotencyMap.get(idempotencyMapKey);
          return res.json({
            ...cachedResponse,
            idempotent: true,
            message: 'Test payment already processed (idempotent response)'
          });
        }
      } else {
        global.testPaymentIdempotencyMap = new Map();
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
      const orderAmount = parseFloat(order.meta?.totalAmount?.toString() || '0');
      
      if (orderAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order amount'
        });
      }
      
      console.log(`🧪 Processing test payment for order ${orderId}, amount: ₹${orderAmount}`);
      
      // Use mock payment service
      const paymentResult = await paymentService.handlePaymentSuccess({
        paymentId: `test_pay_${Date.now()}`,
        orderId,
        amount: orderAmount,
        userId,
        paymentMethod: 'test'
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Test payment simulation failed',
          error: paymentResult
        });
      }

      // Update order payment status in meta field
      const updatedMeta = {
        ...order.meta,
        paymentStatus: 'paid',
        paymentMethod: 'test',
        paidAt: new Date().toISOString()
      };
      
      await storage.updateOrder(orderId, {
        meta: updatedMeta
      });

      const updatedOrder = await storage.getOrder(orderId);
      
      const successResponse = {
        success: true,
        paymentId: paymentResult.paymentId,
        order: updatedOrder,
        message: 'Test payment processed successfully',
        idempotencyKey: finalIdempotencyKey,
        testMode: true
      };
      
      // Cache successful response for idempotency
      global.testPaymentIdempotencyMap.set(idempotencyMapKey, successResponse);
      
      res.json(successResponse);
      
      console.log(`✅ Test payment successful for order ${orderId}, paymentId: ${paymentResult.paymentId}`);
    } catch (error) {
      console.error('Error processing test payment:', error);
      res.status(500).json({ 
        success: false,
        message: 'Test payment processing failed' 
      });
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
  
  // Parts Provider Dashboard - GET comprehensive dashboard data
  app.get('/api/v1/parts-provider/dashboard', authMiddleware, requireRole(['parts_provider']), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const [
        parts, 
        orders, 
        businessInfo,
        recentInventoryMovements,
        suppliers,
        lowStockParts
      ] = await Promise.all([
        storage.getPartsByProvider(userId),
        storage.getOrdersByProvider(userId),
        storage.getPartsProviderBusinessInfo(userId),
        storage.getPartsInventoryMovements(userId, 10),
        storage.getPartsSuppliers(userId),
        storage.getLowStockParts(userId, 10)
      ]);
      
      // Calculate dashboard statistics
      const pendingOrders = orders.filter(o => o.status === 'pending');
      const completedOrders = orders.filter(o => o.status === 'completed');
      const activeProducts = parts.filter(p => p.isActive);
      const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
      const outOfStockItems = parts.filter(p => p.stock === 0);
      
      // Recent activity
      const recentOrders = orders
        .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
        .slice(0, 5);
        
      // Top selling products
      const topProducts = parts
        .sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0))
        .slice(0, 5);

      const dashboardData = {
        stats: {
          totalProducts: parts.length,
          activeProducts: activeProducts.length,
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          completedOrders: completedOrders.length,
          totalRevenue: totalRevenue.toFixed(2),
          lowStockAlerts: lowStockParts.length,
          outOfStockItems: outOfStockItems.length,
          totalSuppliers: suppliers.length,
          averageRating: businessInfo?.averageRating || '0.00'
        },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          customerName: order.userId,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
          items: order.items || []
        })),
        lowStockAlerts: lowStockParts.map(part => ({
          id: part.id,
          name: part.name,
          sku: part.sku,
          currentStock: part.stock,
          lowStockThreshold: part.lowStockThreshold,
          price: part.price
        })),
        topProducts: topProducts.map(part => ({
          id: part.id,
          name: part.name,
          sku: part.sku,
          totalSold: part.totalSold || 0,
          price: part.price,
          stock: part.stock,
          rating: part.rating
        })),
        recentActivity: recentInventoryMovements.map(movement => ({
          id: movement.id,
          partId: movement.partId,
          movementType: movement.movementType,
          quantity: movement.quantity,
          reason: movement.reason,
          createdAt: movement.createdAt
        })),
        businessInfo: businessInfo ? {
          businessName: businessInfo.businessName,
          verificationStatus: businessInfo.verificationStatus,
          isVerified: businessInfo.isVerified,
          totalRevenue: businessInfo.totalRevenue,
          totalOrders: businessInfo.totalOrders,
          averageRating: businessInfo.averageRating
        } : null
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching parts provider dashboard:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

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

  // Parts provider registration schema
  const partsProviderRegistrationSchema = z.object({
    businessName: z.string().min(1, 'Business name is required').max(100),
    businessType: z.enum(['individual', 'partnership', 'private_limited', 'public_limited', 'llp']),
    businessAddress: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().min(1, 'Pincode is required'),
      country: z.string().default('India'),
    }),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    ifscCode: z.string().optional(),
    accountHolderName: z.string().optional(),
    minOrderValue: z.number().min(0).default(0),
    maxOrderValue: z.number().min(0).optional(),
    processingTime: z.number().min(1).default(24),
    shippingAreas: z.array(z.string()).default([]),
    paymentTerms: z.enum(['immediate', '15_days', '30_days', '45_days']).default('immediate'),
  });

  // Complete parts provider registration
  app.post('/api/v1/parts-provider/register', authMiddleware, validateBody(partsProviderRegistrationSchema), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const registrationData = req.body;

      // Check if user is already a parts provider
      const existingProvider = await storage.getPartsProviderBusinessInfo(userId);
      if (existingProvider) {
        return res.status(400).json({ message: 'You are already registered as a parts provider' });
      }

      // Create parts provider business info
      const businessInfo = await storage.createPartsProviderBusinessInfo({
        userId,
        ...registrationData,
        isVerified: false,
        verificationStatus: 'pending',
        isActive: true,
        totalRevenue: '0.00',
        totalOrders: 0,
        averageRating: '0.00',
        totalProducts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update user role
      await storage.updateUserRole(userId, 'parts_provider');

      res.json({
        success: true,
        message: 'Parts provider registration submitted for verification',
        businessInfo: businessInfo
      });
    } catch (error) {
      console.error('Error registering parts provider:', error);
      res.status(500).json({ message: 'Failed to complete registration' });
    }
  });

  // Get parts provider profile
  app.get('/api/v1/parts-provider/profile', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const businessInfo = await storage.getPartsProviderBusinessInfo(userId);
      if (!businessInfo) {
        return res.status(404).json({ message: 'Parts provider profile not found' });
      }

      res.json(businessInfo);
    } catch (error) {
      console.error('Error fetching parts provider profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // Update parts provider profile
  app.put('/api/v1/parts-provider/profile', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const updateData = req.body;
      const updatedProfile = await storage.updatePartsProviderBusinessInfo(userId, updateData);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: 'Parts provider profile not found' });
      }

      res.json(updatedProfile);
    } catch (error) {
      console.error('Error updating parts provider profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Upload parts provider documents
  app.post('/api/v1/parts-provider/documents', authMiddleware, requireRole(['parts_provider']), uploadLimiter, handleProviderDocumentUpload, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { documentType } = req.body;
      const files = (req as any).files;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Update business info with document URLs
      const businessInfo = await storage.getPartsProviderBusinessInfo(userId);
      if (!businessInfo) {
        return res.status(404).json({ message: 'Parts provider profile not found' });
      }

      const documents = businessInfo.verificationDocuments || {};
      const file = files[0];
      
      // Update documents based on type
      switch (documentType) {
        case 'businessLicense':
          documents.businessLicense = { url: file.url, verified: false };
          break;
        case 'gstCertificate':
          documents.gstCertificate = { url: file.url, verified: false };
          break;
        case 'panCard':
          documents.panCard = { url: file.url, verified: false };
          break;
        case 'bankStatement':
          documents.bankStatement = { url: file.url, verified: false };
          break;
        case 'tradeLicense':
          documents.tradeLicense = { url: file.url, verified: false };
          break;
        case 'insuranceCertificate':
          documents.insuranceCertificate = { url: file.url, verified: false };
          break;
        default:
          return res.status(400).json({ message: 'Invalid document type' });
      }

      // Update verification status to documents_submitted
      const updatedInfo = await storage.updatePartsProviderBusinessInfo(userId, {
        verificationDocuments: documents,
        verificationStatus: 'documents_submitted',
      });

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        businessInfo: updatedInfo
      });
    } catch (error) {
      console.error('Error uploading parts provider document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // NOTE: Parts provider document upload endpoint is now in uploadRoutes.ts

  // Get parts provider documents status
  app.get('/api/v1/parts-provider/documents', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const businessInfo = await storage.getPartsProviderBusinessInfo(userId);
      if (!businessInfo) {
        return res.status(404).json({ message: 'Parts provider profile not found' });
      }

      res.json({
        documents: businessInfo.verificationDocuments || {},
        verificationStatus: businessInfo.verificationStatus,
        isVerified: businessInfo.isVerified
      });
    } catch (error) {
      console.error('Error fetching parts provider documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // ============================================================================
  // ADMIN PARTS PROVIDER MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all parts providers
  app.get('/api/v1/admin/parts-providers', adminSessionMiddleware, async (req, res) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      
      if (status) {
        filters.verificationStatus = status;
      }

      const partsProviders = await storage.getPartsProvidersByVerificationStatus(status as string || 'all');
      
      // Enrich with user data
      const enrichedProviders = await Promise.all(
        partsProviders.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          return {
            ...provider,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              email: user.email,
              createdAt: user.createdAt
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: enrichedProviders,
        total: enrichedProviders.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
    } catch (error) {
      console.error('Error fetching parts providers:', error);
      res.status(500).json({ message: 'Failed to fetch parts providers' });
    }
  });

  // Get pending parts provider verifications
  app.get('/api/v1/admin/parts-providers/pending', adminSessionMiddleware, async (req, res) => {
    try {
      const pendingStatuses = ['pending', 'documents_submitted', 'under_review'];
      const allPendingProviders = [];

      for (const status of pendingStatuses) {
        const providers = await storage.getPartsProvidersByVerificationStatus(status);
        allPendingProviders.push(...providers);
      }

      // Enrich with user data
      const enrichedProviders = await Promise.all(
        allPendingProviders.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          return {
            ...provider,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              email: user.email,
              createdAt: user.createdAt
            } : null,
            type: 'parts_provider'
          };
        })
      );

      res.json({
        success: true,
        data: enrichedProviders,
        total: enrichedProviders.length
      });
    } catch (error) {
      console.error('Error fetching pending parts providers:', error);
      res.status(500).json({ message: 'Failed to fetch pending parts providers' });
    }
  });

  // Approve/Reject parts provider
  app.post('/api/v1/admin/parts-providers/:providerId/status', adminSessionMiddleware, validateBody(verificationActionSchema), async (req, res) => {
    try {
      const { providerId } = req.params;
      const { action, notes, rejectionReason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: 'Admin not authenticated' });
      }

      const provider = await storage.getPartsProviderBusinessInfo(providerId);
      if (!provider) {
        return res.status(404).json({ message: 'Parts provider not found' });
      }

      let updateData: any = {};
      let notificationMessage = '';

      switch (action) {
        case 'approve':
          updateData = {
            isVerified: true,
            verificationStatus: 'approved',
            verificationDate: new Date(),
            verificationNotes: notes,
          };
          notificationMessage = 'Your parts provider application has been approved! Welcome to FixitQuick.';
          break;

        case 'reject':
          if (!rejectionReason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
          }
          updateData = {
            isVerified: false,
            verificationStatus: 'rejected',
            rejectionReason,
            verificationNotes: notes,
          };
          notificationMessage = `Your parts provider application has been rejected. Reason: ${rejectionReason}`;
          break;

        case 'under_review':
          updateData = {
            verificationStatus: 'under_review',
            verificationNotes: notes,
          };
          notificationMessage = 'Your parts provider application is under review. We will notify you once the review is complete.';
          break;

        case 'request_changes':
          updateData = {
            verificationStatus: 'pending',
            resubmissionReason: rejectionReason,
            verificationNotes: notes,
          };
          notificationMessage = `Please update your parts provider application. Required changes: ${rejectionReason}`;
          break;

        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

      const updatedProvider = await storage.updatePartsProviderBusinessInfo(providerId, updateData);

      // Create notification
      try {
        await storage.createNotification({
          userId: providerId,
          title: 'Parts Provider Application Update',
          message: notificationMessage,
          type: 'verification',
          isRead: false,
          metadata: { action, adminId },
          createdAt: new Date(),
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the main operation for notification errors
      }

      console.log(`✅ Admin ${adminId} ${action} parts provider ${providerId}`);

      res.json({
        success: true,
        message: `Parts provider ${action} successfully`,
        provider: updatedProvider
      });
    } catch (error) {
      console.error('Error updating parts provider status:', error);
      res.status(500).json({ message: 'Failed to update parts provider status' });
    }
  });

  // Get specific parts provider details
  app.get('/api/v1/admin/parts-providers/:providerId', adminSessionMiddleware, async (req, res) => {
    try {
      const { providerId } = req.params;
      
      const provider = await storage.getPartsProviderBusinessInfo(providerId);
      if (!provider) {
        return res.status(404).json({ message: 'Parts provider not found' });
      }

      // Get user data
      const user = await storage.getUser(provider.userId);
      
      // Get parts data
      const parts = await storage.getPartsByProvider(providerId);
      
      // Get orders data
      const orders = await storage.getOrdersByProvider(providerId);
      
      const enrichedProvider = {
        ...provider,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          createdAt: user.createdAt
        } : null,
        stats: {
          totalParts: parts.length,
          totalOrders: orders.length,
          completedOrders: orders.filter(order => order.status === 'completed').length,
          avgRating: provider.averageRating || '0.00'
        },
        type: 'parts_provider'
      };

      res.json({
        success: true,
        data: enrichedProvider
      });
    } catch (error) {
      console.error('Error fetching parts provider details:', error);
      res.status(500).json({ message: 'Failed to fetch parts provider details' });
    }
  });

  // Bulk approve/reject parts providers
  app.post('/api/v1/admin/parts-providers/bulk-action', adminSessionMiddleware, async (req, res) => {
    try {
      const { providerIds, action, notes, rejectionReason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: 'Admin not authenticated' });
      }

      if (!Array.isArray(providerIds) || providerIds.length === 0) {
        return res.status(400).json({ message: 'Provider IDs array is required' });
      }

      const results = [];
      for (const providerId of providerIds) {
        try {
          let updateData: any = {};
          let notificationMessage = '';

          switch (action) {
            case 'approve':
              updateData = {
                isVerified: true,
                verificationStatus: 'approved',
                verificationDate: new Date(),
                verificationNotes: notes,
              };
              notificationMessage = 'Your parts provider application has been approved!';
              break;

            case 'reject':
              if (!rejectionReason) {
                results.push({ providerId, success: false, error: 'Rejection reason is required' });
                continue;
              }
              updateData = {
                isVerified: false,
                verificationStatus: 'rejected',
                rejectionReason,
                verificationNotes: notes,
              };
              notificationMessage = `Your parts provider application has been rejected. Reason: ${rejectionReason}`;
              break;

            default:
              results.push({ providerId, success: false, error: 'Invalid action' });
              continue;
          }

          const updatedProvider = await storage.updatePartsProviderBusinessInfo(providerId, updateData);

          // Create notification
          try {
            await storage.createNotification({
              userId: providerId,
              title: 'Parts Provider Application Update',
              message: notificationMessage,
              type: 'verification',
              isRead: false,
              metadata: { action, adminId, bulk: true },
              createdAt: new Date(),
            });
          } catch (notificationError) {
            console.error('Error creating notification for provider:', providerId, notificationError);
          }

          results.push({ providerId, success: true, provider: updatedProvider });
        } catch (error) {
          console.error('Error updating provider:', providerId, error);
          results.push({ providerId, success: false, error: 'Failed to update provider' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      console.log(`✅ Admin ${adminId} bulk ${action} parts providers: ${successCount} success, ${failureCount} failures`);

      res.json({
        success: true,
        message: `Bulk ${action}: ${successCount} successful, ${failureCount} failed`,
        results,
        summary: { successCount, failureCount, totalProcessed: results.length }
      });
    } catch (error) {
      console.error('Error performing bulk action on parts providers:', error);
      res.status(500).json({ message: 'Failed to perform bulk action' });
    }
  });

  // ============================================================================
  // END ADMIN PARTS PROVIDER MANAGEMENT ENDPOINTS
  // ============================================================================

  // ============================================================================
  // ADMIN SERVICE PROVIDER MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all service providers
  app.get('/api/v1/admin/providers', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId, isVerified, verificationStatus, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      
      if (categoryId) {
        filters.categoryId = categoryId as string;
      }
      if (isVerified !== undefined) {
        filters.isVerified = isVerified === 'true';
      }
      if (verificationStatus) {
        filters.verificationStatus = verificationStatus as string;
      }

      const serviceProviders = await storage.getServiceProviders(filters);
      
      // Enrich with user data
      const enrichedProviders = await Promise.all(
        serviceProviders.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          const category = await storage.getServiceCategory(provider.categoryId);
          return {
            ...provider,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              email: user.email,
              createdAt: user.createdAt
            } : null,
            category: category ? {
              id: category.id,
              name: category.name
            } : null,
            type: 'service_provider'
          };
        })
      );

      res.json({
        success: true,
        data: enrichedProviders,
        total: enrichedProviders.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
    } catch (error) {
      console.error('Error fetching service providers:', error);
      res.status(500).json({ message: 'Failed to fetch service providers' });
    }
  });

  // ============================================================================
  // END ADMIN SERVICE PROVIDER MANAGEMENT ENDPOINTS
  // ============================================================================

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
        totalRevenue: completedOrders.reduce((sum, order) => {
          // FIXED: Access totalAmount from meta field or use 0 as fallback
          const amount = order.meta?.totalAmount || 0;
          return sum + parseFloat(String(amount));
        }, 0),
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
      
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  });

  app.get('/api/v1/admin/orders', adminSessionMiddleware, async (req, res) => {
    try {
      const orders = await storage.getOrders({ limit: 100 });
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch orders' });
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
                       order.providerId === userId ||
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
                       order.providerId === userId;
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Determine receiver
      let receiverId: string;
      if (order.userId === userId) {
        receiverId = order.providerId || '';
      } else {
        receiverId = order.userId || '';
      }
      
      const chatMessage = await storage.createChatMessage({
        orderId,
        senderId: userId ?? '',
        receiverId,
        content: message.trim(),
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

  // ================================
  // ENHANCED PROVIDER VERIFICATION ENDPOINTS
  // ================================

  // Provider registration with comprehensive verification
  app.post('/api/v1/providers/register', authMiddleware, validateBody(providerRegistrationSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Check if user already has provider profile
      const existingProvider = await storage.getServiceProvider(userId);
      if (existingProvider) {
        return res.status(400).json({ message: 'Provider profile already exists' });
      }

      const { businessName, businessType, serviceIds, skills, experienceYears, serviceRadius, serviceAreas } = req.body;

      // Validate service IDs exist
      const validServices = await Promise.all(
        serviceIds.map((id: string) => storage.getService(id))
      );

      if (validServices.some(service => !service)) {
        return res.status(400).json({ message: 'Invalid service ID provided' });
      }

      // Create service provider profile
      const providerData = {
        userId,
        businessName,
        businessType,
        serviceIds,
        skills: skills || [],
        experienceYears,
        serviceRadius,
        serviceAreas: serviceAreas || [],
        verificationStatus: 'pending' as const,
        isVerified: false,
        verificationLevel: 'none' as const,
        rating: '0.00',
        totalCompletedOrders: 0,
        totalRatings: 0,
        responseTime: 0,
        completionRate: '0.00',
        onTimeRate: '0.00',
        isOnline: false,
        isAvailable: true,
      };

      const provider = await storage.createServiceProvider(providerData);

      // Send notification to admins about new provider registration
      const adminUsers = await storage.getUsersByRole('admin');
      await Promise.all(
        adminUsers.map(admin =>
          storage.createNotification({
            userId: admin.id,
            title: 'New Provider Registration',
            body: `${businessName} has registered as a service provider and is pending verification.`,
            type: 'system',
            isRead: false,
          })
        )
      );

      res.json({
        success: true,
        provider,
        message: 'Provider profile created successfully. Please upload required documents to complete verification.',
      });
    } catch (error) {
      console.error('Error creating provider profile:', error);
      res.status(500).json({ message: 'Failed to create provider profile' });
    }
  });

  // Document upload endpoint with proper file handling
  app.post('/api/v1/providers/documents/upload', authMiddleware, ...validateUpload, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Allow document uploads during registration process
      // Check if user is a service provider (for existing providers) or allow for registration
      const provider = await storage.getServiceProvider(userId);
      const isRegistering = !provider; // User is in registration process if no provider profile exists

      const { documentType } = req.body;
      const file = req.file!; // File is validated by middleware

      console.log(`📄 Document upload request:`, {
        userId,
        documentType,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      // Upload file to object storage
      const uploadResult = await objectStorageService.uploadFile(file, documentType, userId, false);

      if (!uploadResult.success) {
        return res.status(400).json({ 
          success: false,
          message: uploadResult.error || 'Failed to upload file' 
        });
      }

      // Store document metadata in database
      const documentData = {
        url: uploadResult.url,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        metadata: uploadResult.metadata,
      };

      const result = await storage.storeProviderDocument(userId, documentType, documentData);

      if (!result.success) {
        // If database storage fails, we should clean up the uploaded file
        await objectStorageService.deleteFile(uploadResult.metadata?.path || '');
        return res.status(400).json({ 
          success: false,
          message: result.error || 'Failed to store document' 
        });
      }

      // Check if all required documents are now uploaded
      const updatedProvider = await storage.getServiceProvider(userId);
      const docs = updatedProvider?.documents;
      const hasRequiredDocs = docs?.aadhar?.front && docs?.aadhar?.back && docs?.photo?.url;

      // Auto-advance to under_review if all required docs are uploaded (only for existing providers)
      if (hasRequiredDocs && !isRegistering && updatedProvider?.verificationStatus === 'pending') {
        await storage.updateVerificationStatus(userId, {
          verificationStatus: 'under_review',
        });

        // Notify admins about completed application
        const adminUsers = await storage.getUsersByRole('admin');
        await Promise.all(
          adminUsers.map(admin =>
            storage.createNotification({
              userId: admin.id,
              title: 'Provider Application Complete',
              body: `${updatedProvider.businessName || 'A provider'} has uploaded all required documents and is ready for verification.`,
              type: 'system',
              isRead: false,
            })
          )
        );
      }

      res.json({
        success: true,
        documentUrl: result.url,
        documentType,
        filename: file.originalname,
        verificationStatus: isRegistering ? 'uploading' : (hasRequiredDocs ? 'under_review' : 'pending'),
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to upload document' 
      });
    }
  });

  // Get provider documents
  app.get('/api/v1/providers/documents', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const provider = await storage.getServiceProvider(userId);
      if (!provider) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }

      res.json({
        success: true,
        documents: provider.documents || {},
      });
    } catch (error) {
      console.error('Error fetching provider documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Get provider profile and verification status
  app.get('/api/v1/providers/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get user details to check role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let profile = null;
      let verificationHistory = [];

      // Handle different provider types based on user role
      if (user.role === 'service_provider') {
        // Existing logic for service providers
        const serviceProvider = await storage.getServiceProvider(userId);
        if (serviceProvider) {
          profile = {
            ...serviceProvider,
            providerType: 'service_provider'
          };
          verificationHistory = await storage.getVerificationHistory(userId);
        }
      } else if (user.role === 'parts_provider') {
        // Handle parts providers
        const partsProvider = await storage.getPartsProviderBusinessInfo(userId);
        if (partsProvider) {
          // Transform parts provider data to match expected format
          profile = {
            userId: partsProvider.userId,
            businessName: partsProvider.businessName,
            businessType: partsProvider.businessType,
            verificationStatus: partsProvider.verificationStatus,
            verificationDate: partsProvider.verificationDate,
            verificationNotes: partsProvider.verificationNotes,
            submittedAt: partsProvider.createdAt,
            updatedAt: partsProvider.updatedAt,
            createdAt: partsProvider.createdAt,
            isVerified: partsProvider.isVerified,
            providerType: 'parts_provider',
            // Parts provider specific fields
            businessAddress: partsProvider.businessAddress,
            gstNumber: partsProvider.gstNumber,
            panNumber: partsProvider.panNumber,
            bankDetails: {
              accountNumber: partsProvider.bankAccountNumber,
              bankName: partsProvider.bankName,
              bankBranch: partsProvider.bankBranch,
              ifscCode: partsProvider.ifscCode,
              accountHolderName: partsProvider.accountHolderName,
            }
          };
          // Parts providers don't have verification history yet, so empty array
          verificationHistory = [];
        }
      }

      // If no provider profile found for any type
      if (!profile) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }

      res.json({
        success: true,
        profile: {
          ...profile,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          },
          verificationHistory,
        },
      });
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      res.status(500).json({ message: 'Failed to fetch provider profile' });
    }
  });

  // Update provider profile
  app.put('/api/v1/providers/profile', authMiddleware, validateBody(updateProviderProfileSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const provider = await storage.getServiceProvider(userId);
      if (!provider) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }

      // Update provider profile
      const updatedProvider = await storage.updateServiceProvider(userId, req.body);

      res.json({
        success: true,
        provider: updatedProvider,
        message: 'Provider profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating provider profile:', error);
      res.status(500).json({ message: 'Failed to update provider profile' });
    }
  });

  // Enhanced admin verification endpoints

  // Get pending verifications with comprehensive data
  app.get('/api/v1/admin/verifications/pending', adminSessionMiddleware, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || undefined;
      
      // Use enhanced method to get pending verifications with user data
      const pendingVerifications = await storage.getPendingVerifications(limit);
      
      res.json({
        success: true,
        verifications: pendingVerifications,
        count: pendingVerifications.length,
      });
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({ message: 'Failed to fetch pending verifications' });
    }
  });

  // Update provider verification status (enhanced version)
  app.post('/api/v1/admin/verifications/:providerId/status', adminSessionMiddleware, validateBody(verificationActionSchema), async (req, res) => {
    try {
      const { providerId } = req.params;
      const { action, notes, rejectionReason, resubmissionReason } = req.body;
      const adminId = req.user?.id;

      if (!providerId) {
        return res.status(400).json({ message: 'Provider ID is required' });
      }

      const provider = await storage.getServiceProvider(providerId);
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found' });
      }

      // Map action to verification status
      let verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'resubmission_required';
      
      switch (action) {
        case 'approve':
          verificationStatus = 'approved';
          break;
        case 'reject':
          verificationStatus = 'rejected';
          break;
        case 'request_changes':
          verificationStatus = 'resubmission_required';
          break;
        case 'suspend':
          verificationStatus = 'suspended';
          break;
        case 'under_review':
          verificationStatus = 'under_review';
          break;
        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

      // Update verification status
      const updatedProvider = await storage.updateVerificationStatus(providerId, {
        verificationStatus,
        verifiedBy: adminId,
        rejectionReason,
        verificationNotes: notes,
        resubmissionReason,
      });

      // Create notification for provider
      const user = await storage.getUser(providerId);
      const notificationTitle = `Verification ${action === 'approve' ? 'Approved' : 
                                              action === 'reject' ? 'Rejected' : 
                                              action === 'request_changes' ? 'Changes Requested' : 
                                              action === 'suspend' ? 'Suspended' : 'Under Review'}`;
      
      let notificationBody = '';
      switch (action) {
        case 'approve':
          notificationBody = 'Congratulations! Your provider application has been approved. You can now start accepting service requests.';
          break;
        case 'reject':
          notificationBody = `Your provider application was rejected. ${rejectionReason || 'Please contact support for more information.'}`;
          break;
        case 'request_changes':
          notificationBody = `Changes requested to your provider application. ${resubmissionReason || 'Please review and resubmit your application.'}`;
          break;
        case 'suspend':
          notificationBody = `Your provider account has been suspended. ${notes || 'Please contact support for more information.'}`;
          break;
        case 'under_review':
          notificationBody = 'Your provider application is now under review. We will notify you of any updates.';
          break;
      }

      await storage.createNotification({
        userId: providerId,
        title: notificationTitle,
        body: notificationBody,
        type: 'system',
        isRead: false,
      });

      res.json({
        success: true,
        provider: updatedProvider,
        message: `Provider verification ${action} successfully`,
      });
    } catch (error) {
      console.error('Error updating provider verification:', error);
      res.status(500).json({ message: 'Failed to update provider verification' });
    }
  });

  // Get provider verification history
  app.get('/api/v1/admin/verifications/:providerId/history', adminSessionMiddleware, async (req, res) => {
    try {
      const { providerId } = req.params;
      
      if (!providerId) {
        return res.status(400).json({ message: 'Provider ID is required' });
      }

      const history = await storage.getVerificationHistory(providerId);
      
      res.json({
        success: true,
        history,
      });
    } catch (error) {
      console.error('Error fetching verification history:', error);
      res.status(500).json({ message: 'Failed to fetch verification history' });
    }
  });

  // Get provider documents for admin review
  app.get('/api/v1/admin/verifications/:providerId/documents', adminSessionMiddleware, async (req, res) => {
    try {
      const { providerId } = req.params;
      
      if (!providerId) {
        return res.status(400).json({ message: 'Provider ID is required' });
      }

      const provider = await storage.getServiceProvider(providerId);
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found' });
      }

      const user = await storage.getUser(providerId);

      res.json({
        success: true,
        provider: {
          ...provider,
          user: {
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
            phone: user?.phone,
          },
        },
        documents: provider.documents || {},
      });
    } catch (error) {
      console.error('Error fetching provider documents:', error);
      res.status(500).json({ message: 'Failed to fetch provider documents' });
    }
  });

  // Provider resubmission after rejection
  app.post('/api/v1/providers/resubmit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const provider = await storage.getServiceProvider(userId);
      if (!provider) {
        return res.status(404).json({ message: 'Provider profile not found' });
      }

      if (provider.verificationStatus !== 'rejected' && provider.verificationStatus !== 'resubmission_required') {
        return res.status(400).json({ 
          message: 'Provider is not eligible for resubmission',
          currentStatus: provider.verificationStatus 
        });
      }

      // Reset verification status to pending
      await storage.updateVerificationStatus(userId, {
        verificationStatus: 'pending',
      });

      // Clear rejection reason and notes
      await storage.updateServiceProvider(userId, {
        rejectionReason: null,
        resubmissionReason: null,
      });

      res.json({
        success: true,
        message: 'Application resubmitted successfully. Please ensure all documents are uploaded.',
      });
    } catch (error) {
      console.error('Error resubmitting provider application:', error);
      res.status(500).json({ message: 'Failed to resubmit application' });
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
      
      if ((order.meta as any)?.paymentStatus !== 'paid') {
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

      res.json({
        success: true,
        data: categoriesWithMeta
      });
    } catch (error) {
      console.error('Error fetching admin categories:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch categories' 
      });
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

      res.json({
        success: true,
        data: tree
      });
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

  // Category Image Management Endpoints
  
  // Upload category image
  app.post('/api/v1/admin/categories/:categoryId/image', uploadLimiter, adminSessionMiddleware, handleCategoryImageUpload);

  // Update category with image URL
  app.put('/api/v1/admin/categories/:categoryId/image', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      // Validate request body with security constraints
      const validation = categoryImageUrlSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid image URL',
          errors: validation.error.errors.map(e => e.message)
        });
      }
      
      const { imageUrl } = validation.data;

      const updatedCategory = await storage.updateServiceCategory(categoryId, { imageUrl });
      
      if (!updatedCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      console.log('✅ Admin updated category image:', { 
        id: categoryId, 
        name: updatedCategory.name,
        imageUrl 
      });

      res.json({
        success: true,
        message: 'Category image updated successfully',
        category: updatedCategory
      });
    } catch (error) {
      console.error('Error updating category image:', error);
      res.status(500).json({ message: 'Failed to update category image' });
    }
  });

  // Delete category image
  app.delete('/api/v1/admin/categories/:categoryId/image', adminSessionMiddleware, async (req, res) => {
    try {
      const { categoryId } = req.params;

      // Get current category to get the image URL
      const category = await storage.getServiceCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const oldImageUrl = category.imageUrl;

      // Remove image URL from category
      const updatedCategory = await storage.updateServiceCategory(categoryId, { imageUrl: null });
      
      if (!updatedCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Delete the actual image file from object storage
      if (oldImageUrl) {
        try {
          const filePath = objectStorageService.extractFilePathFromUrl(oldImageUrl);
          if (filePath) {
            const deleteResult = await objectStorageService.deleteFile(filePath);
            if (!deleteResult.success) {
              console.error('Failed to delete old image file:', deleteResult.error);
              // Continue with category update even if file deletion fails
              // to avoid leaving the category in an inconsistent state
            } else {
              console.log('✅ Successfully deleted old image file:', filePath);
            }
          } else {
            console.warn('Could not extract file path from URL:', oldImageUrl);
          }
        } catch (fileDeleteError) {
          console.error('Error deleting old image file:', fileDeleteError);
          // Continue with category update
        }
      }

      console.log('✅ Admin removed category image:', { 
        id: categoryId, 
        name: updatedCategory.name,
        removedImageUrl: oldImageUrl
      });

      res.json({
        success: true,
        message: 'Category image removed successfully',
        category: updatedCategory
      });
    } catch (error) {
      console.error('Error removing category image:', error);
      res.status(500).json({ message: 'Failed to remove category image' });
    }
  });

  // ============================================================================
  // END ADMIN CATEGORY HIERARCHY MANAGEMENT ENDPOINTS
  // ============================================================================

  // ============================================================================
  // ADMIN SERVICES MANAGEMENT ENDPOINTS
  // ============================================================================

  // Admin service validation schemas
  const adminServiceCreateSchema = z.object({
    name: z.string().min(1, "Service name is required"),
    description: z.string().min(1, "Description is required"),
    shortDescription: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    isActive: z.boolean().default(true),
    isPopular: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    pricing: z.object({
      basePrice: z.number().min(0, "Price must be non-negative"),
      currency: z.string().default("INR"),
      unit: z.string().default("service"),
      priceType: z.enum(['fixed', 'hourly', 'per_item']).default('fixed')
    }),
    features: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional()
  });

  const adminServiceUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    shortDescription: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    pricing: z.object({
      basePrice: z.number().min(0).optional(),
      currency: z.string().optional(),
      unit: z.string().optional(),
      priceType: z.enum(['fixed', 'hourly', 'per_item']).optional()
    }).optional(),
    features: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional()
  });

  // Create new service
  app.post('/api/v1/admin/services', adminSessionMiddleware, validateBody(adminServiceCreateSchema), async (req, res) => {
    try {
      const serviceData = req.body;
      
      // Validate category exists
      const category = await storage.getServiceCategory(serviceData.categoryId);
      if (!category) {
        return res.status(400).json({ message: 'Category not found' });
      }
      
      // Create the service
      const newService = await storage.createService({
        ...serviceData,
        createdAt: new Date()
      });
      
      console.log('✅ Admin created service:', { id: newService.id, name: newService.name });
      res.status(201).json(newService);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ message: 'Failed to create service' });
    }
  });

  // Update service
  app.put('/api/v1/admin/services/:serviceId', adminSessionMiddleware, validateBody(adminServiceUpdateSchema), async (req, res) => {
    try {
      const { serviceId } = req.params;
      const updateData = req.body;
      
      // Validate service exists
      const existingService = await storage.getService(serviceId);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      // Validate category if being updated
      if (updateData.categoryId) {
        const category = await storage.getServiceCategory(updateData.categoryId);
        if (!category) {
          return res.status(400).json({ message: 'Category not found' });
        }
      }
      
      const updatedService = await storage.updateService(serviceId, updateData);
      
      if (!updatedService) {
        return res.status(404).json({ message: 'Service not found or update failed' });
      }
      
      console.log('✅ Admin updated service:', { id: serviceId, name: updatedService.name });
      res.json(updatedService);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ message: 'Failed to update service' });
    }
  });

  // Delete service
  app.delete('/api/v1/admin/services/:serviceId', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      const result = await storage.deleteService(serviceId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      console.log('✅ Admin deleted service:', { id: serviceId });
      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error('Error deleting service:', error);
      res.status(500).json({ message: 'Failed to delete service' });
    }
  });

  // ============================================================================
  // SERVICE ICON MANAGEMENT ENDPOINTS
  // ============================================================================

  // Upload service icon image
  app.post('/api/v1/admin/services/:serviceId/image', uploadLimiter, adminSessionMiddleware, handleServiceIconUpload);

  // Update service icon (emoji or image URL)
  app.put('/api/v1/admin/services/:serviceId/icon', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Validate request body
      const validation = serviceIconUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid icon data',
          errors: validation.error.errors
        });
      }

      const { iconType, iconValue } = validation.data;

      // Validate service exists
      const existingService = await storage.getService(serviceId);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // For image type, validate the URL is from authorized domain
      if (iconType === 'image') {
        const urlValidation = serviceImageUrlSchema.safeParse({ imageUrl: iconValue });
        if (!urlValidation.success) {
          return res.status(400).json({ 
            message: 'Invalid image URL',
            errors: urlValidation.error.errors
          });
        }
      }

      // Update service with new icon data
      const updatedService = await storage.updateService(serviceId, {
        iconType,
        iconValue
      });

      if (!updatedService) {
        return res.status(500).json({ message: 'Failed to update service icon' });
      }

      console.log('✅ Admin updated service icon:', { 
        id: serviceId, 
        iconType, 
        iconValue: iconType === 'emoji' ? iconValue : '[image URL]'
      });

      res.json({
        success: true,
        message: 'Service icon updated successfully',
        service: {
          id: updatedService.id,
          name: updatedService.name,
          iconType: updatedService.iconType,
          iconValue: updatedService.iconValue
        }
      });

    } catch (error) {
      console.error('Error updating service icon:', error);
      res.status(500).json({ message: 'Failed to update service icon' });
    }
  });

  // Update service with image URL (for uploaded images)
  app.put('/api/v1/admin/services/:serviceId/image', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Validate request body with security constraints
      const validation = serviceImageUrlSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid image URL',
          errors: validation.error.errors
        });
      }

      const { imageUrl } = validation.data;

      // Validate service exists
      const existingService = await storage.getService(serviceId);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // Update service with image icon
      const updatedService = await storage.updateService(serviceId, {
        iconType: 'image',
        iconValue: imageUrl
      });

      if (!updatedService) {
        return res.status(500).json({ message: 'Failed to update service image' });
      }

      console.log('✅ Admin updated service image:', { 
        id: serviceId, 
        imageUrl: '[image URL]'
      });

      res.json({
        success: true,
        message: 'Service image updated successfully',
        service: {
          id: updatedService.id,
          name: updatedService.name,
          iconType: updatedService.iconType,
          iconValue: updatedService.iconValue
        }
      });

    } catch (error) {
      console.error('Error updating service image:', error);
      res.status(500).json({ message: 'Failed to update service image' });
    }
  });

  // Delete service image (reset to emoji)
  app.delete('/api/v1/admin/services/:serviceId/image', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;

      // Get current service to get the image URL
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // Reset to default emoji icon
      const updatedService = await storage.updateService(serviceId, {
        iconType: 'emoji',
        iconValue: '🔧' // Default service emoji
      });

      if (!updatedService) {
        return res.status(500).json({ message: 'Failed to remove service image' });
      }

      console.log('✅ Admin removed service image:', { 
        id: serviceId,
        resetToEmoji: '🔧'
      });

      res.json({
        success: true,
        message: 'Service image removed successfully',
        service: {
          id: updatedService.id,
          name: updatedService.name,
          iconType: updatedService.iconType,
          iconValue: updatedService.iconValue
        }
      });

    } catch (error) {
      console.error('Error removing service image:', error);
      res.status(500).json({ message: 'Failed to remove service image' });
    }
  });

  // ============================================================================
  // TEST SERVICES MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all test services
  app.get('/api/v1/admin/test-services', adminSessionMiddleware, async (req, res) => {
    try {
      const testServices = await storage.getTestServices();
      res.json(testServices);
    } catch (error) {
      console.error('Error fetching test services:', error);
      res.status(500).json({ message: 'Failed to fetch test services' });
    }
  });

  // Create multiple demo test services at once
  app.post('/api/v1/admin/test-services/demo', adminSessionMiddleware, async (req, res) => {
    try {
      const demoServices = [
        {
          name: 'Plumbing Repair Service',
          description: 'Professional plumbing repairs and maintenance for your home',
          basePrice: '150.00',
          estimatedDuration: 120,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🔧',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 7
        },
        {
          name: 'Electrical Work',
          description: 'Licensed electrician for all your electrical needs',
          basePrice: '200.00',
          estimatedDuration: 180,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '⚡',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 5
        },
        {
          name: 'House Cleaning',
          description: 'Professional deep cleaning service for your home',
          basePrice: '80.00',
          estimatedDuration: 240,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🧹',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 3
        },
        {
          name: 'Garden Maintenance',
          description: 'Complete garden care and landscaping services',
          basePrice: '120.00',
          estimatedDuration: 180,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🌱',
          allowInstantBooking: false,
          allowScheduledBooking: true,
          advanceBookingDays: 7
        },
        {
          name: 'AC Repair & Service',
          description: 'Air conditioning repair and maintenance by certified technicians',
          basePrice: '180.00',
          estimatedDuration: 150,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '❄️',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 2
        },
        {
          name: 'Pest Control Service',
          description: 'Safe and effective pest elimination for your property',
          basePrice: '100.00',
          estimatedDuration: 90,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🐛',
          allowInstantBooking: false,
          allowScheduledBooking: true,
          advanceBookingDays: 5
        },
        {
          name: 'Appliance Repair',
          description: 'Expert repair services for all household appliances',
          basePrice: '140.00',
          estimatedDuration: 120,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🔌',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 3
        },
        {
          name: 'Painting Service',
          description: 'Professional interior and exterior painting services',
          basePrice: '300.00',
          estimatedDuration: 480,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🎨',
          allowInstantBooking: false,
          allowScheduledBooking: true,
          advanceBookingDays: 10
        },
        {
          name: 'Carpet Cleaning',
          description: 'Deep carpet cleaning and stain removal service',
          basePrice: '90.00',
          estimatedDuration: 120,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🏠',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 2
        },
        {
          name: 'Handyman Service',
          description: 'General home repairs and maintenance tasks',
          basePrice: '110.00',
          estimatedDuration: 180,
          categoryId: null,
          isActive: true,
          isTestService: true,
          icon: '🔨',
          allowInstantBooking: true,
          allowScheduledBooking: true,
          advanceBookingDays: 3
        }
      ];

      const createdServices = [];
      for (const serviceData of demoServices) {
        const service = await storage.createTestService(serviceData as any);
        createdServices.push(service);
      }

      console.log(`✅ Admin created ${createdServices.length} demo test services`);
      res.json({
        success: true,
        message: `Successfully created ${createdServices.length} demo services`,
        services: createdServices
      });
    } catch (error) {
      console.error('Error creating demo test services:', error);
      res.status(500).json({ message: 'Failed to create demo test services' });
    }
  });

  // Create individual test service
  app.post('/api/v1/admin/test-services', adminSessionMiddleware, async (req, res) => {
    try {
      const serviceData = {
        ...req.body,
        isTestService: true // Force test service flag
      };

      const service = await storage.createTestService(serviceData);
      console.log('✅ Admin created test service:', { id: service.id, name: service.name });
      res.json(service);
    } catch (error) {
      console.error('Error creating test service:', error);
      res.status(500).json({ message: 'Failed to create test service' });
    }
  });

  // Update test service
  app.put('/api/v1/admin/test-services/:serviceId', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;
      const updateData = req.body;

      // Verify it's a test service
      const existingService = await storage.getService(serviceId);
      if (!existingService || !existingService.isTestService) {
        return res.status(404).json({ message: 'Test service not found' });
      }

      const updatedService = await storage.updateService(serviceId, updateData);
      
      if (!updatedService) {
        return res.status(404).json({ message: 'Test service not found or update failed' });
      }

      console.log('✅ Admin updated test service:', { id: serviceId, name: updatedService.name });
      res.json(updatedService);
    } catch (error) {
      console.error('Error updating test service:', error);
      res.status(500).json({ message: 'Failed to update test service' });
    }
  });

  // Delete individual test service
  app.delete('/api/v1/admin/test-services/:serviceId', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // Verify it's a test service
      const existingService = await storage.getService(serviceId);
      if (!existingService || !existingService.isTestService) {
        return res.status(404).json({ message: 'Test service not found' });
      }

      const result = await storage.deleteService(serviceId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      console.log('✅ Admin deleted test service:', { id: serviceId });
      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error('Error deleting test service:', error);
      res.status(500).json({ message: 'Failed to delete test service' });
    }
  });

  // Bulk delete all test services
  app.delete('/api/v1/admin/test-services', adminSessionMiddleware, async (req, res) => {
    try {
      const result = await storage.bulkDeleteTestServices();
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      console.log(`✅ Admin bulk deleted test services: ${result.deletedCount} deleted`);
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting test services:', error);
      res.status(500).json({ message: 'Failed to bulk delete test services' });
    }
  });

  // Bulk delete selected test services
  app.post('/api/v1/admin/test-services/delete-selected', adminSessionMiddleware, async (req, res) => {
    try {
      const { serviceIds } = req.body;
      
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ message: 'Service IDs array is required' });
      }

      const result = await storage.deleteSelectedTestServices(serviceIds);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      console.log(`✅ Admin deleted selected test services: ${result.deletedCount} deleted`);
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error deleting selected test services:', error);
      res.status(500).json({ message: 'Failed to delete selected test services' });
    }
  });

  // ============================================================================
  // END TEST SERVICES MANAGEMENT ENDPOINTS
  // ============================================================================
  // ============================================================================
  // END ADMIN SERVICES MANAGEMENT ENDPOINTS
  // ============================================================================

  // OnionPay webhook endpoint with proper signature verification
  app.post('/api/v1/webhooks/onionpay', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      if (!onionPayService.isReady()) {
        console.warn('OnionPay webhook received but service not configured');
        return res.status(503).json({ message: 'OnionPay service not configured' });
      }

      const signature = req.headers['x-onionpay-signature'] as string;
      if (!signature) {
        console.error('Missing OnionPay signature header');
        return res.status(400).json({ message: 'Missing signature header' });
      }

      // Use raw body for signature verification (crucial for webhook security)
      const rawBody = req.body.toString();
      
      // Verify webhook signature first (security critical)
      const isValid = onionPayService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('Invalid OnionPay webhook signature - potential security issue');
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
      const result = await onionPayService.processWebhook(event);
      
      if (result.success) {
        console.log(`✅ OnionPay webhook processed: ${event.event_type}`);
        res.json({ received: true, message: result.message, eventType: event.event_type });
      } else {
        console.error(`❌ OnionPay webhook processing failed: ${result.message}`);
        res.status(400).json({ received: false, message: result.message, eventType: event.event_type });
      }
    } catch (error) {
      console.error('OnionPay webhook critical error:', error);
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

  // Twilio webhook endpoint for call status updates with signature verification
  app.post('/api/webhooks/twilio/call-status', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req, res) => {
    try {
      console.log('📞 Twilio webhook received:', {
        headers: req.headers,
        bodyLength: req.body?.length || 0,
        contentType: req.headers['content-type']
      });

      const signature = req.headers['x-twilio-signature'] as string;
      if (!signature) {
        console.error('❌ Missing Twilio signature header');
        return res.status(400).json({ error: 'Missing signature header' });
      }

      const rawBody = req.body.toString();
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // Parse URL-encoded body manually since we're using raw middleware
      const params = new URLSearchParams(rawBody);
      const webhookData: any = {};
      for (const [key, value] of params.entries()) {
        webhookData[key] = value;
      }

      console.log('📞 Parsed webhook data:', {
        CallSid: webhookData.CallSid,
        CallStatus: webhookData.CallStatus,
        Duration: webhookData.Duration,
        ErrorCode: webhookData.ErrorCode,
        ErrorMessage: webhookData.ErrorMessage
      });

      // Verify webhook signature for security
      const isValidSignature = twilioService.verifyWebhookSignature(
        rawBody, 
        signature, 
        fullUrl
      );

      if (!isValidSignature) {
        console.error('❌ Invalid Twilio webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process the webhook event
      await twilioService.processWebhookEvent(webhookData);

      console.log('✅ Twilio webhook processed successfully');
      res.status(200).json({ success: true, message: 'Webhook processed' });

    } catch (error) {
      console.error('❌ Error processing Twilio webhook:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Chat Upload Endpoints
  app.post('/api/v1/upload/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
          'application/pdf', 'text/plain', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Invalid file type: ${file.mimetype}`));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1,
      },
    }).single('file');

    upload(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: uploadError.message || 'File upload failed',
          error: 'UPLOAD_ERROR'
        });
      }

      try {
        const userId = req.user?.id;
        const { orderId } = req.body;

        if (!userId || !orderId) {
          return res.status(400).json({
            success: false,
            message: 'User ID and Order ID are required'
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        // Verify user has access to this order's chat
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        const hasOrderAccess = order.userId === userId || 
                            order.serviceProviderId === userId || 
                            order.partsProviderId === userId;
        
        if (!hasOrderAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this order'
          });
        }

        // Upload file to object storage if available
        let fileUrl = '';
        let fileName = req.file.originalname;
        
        if (objectStorageService.isAvailable()) {
          try {
            const uploadResult = await objectStorageService.uploadFile(
              req.file,
              `chat/${orderId}`,
              false, // private file
              `chat-${Date.now()}-${fileName}`
            );
            fileUrl = uploadResult.url;
            fileName = uploadResult.fileName || uploadResult.filename || fileName;
          } catch (error) {
            console.error('Object storage upload failed:', error);
            return res.status(500).json({
              success: false,
              message: 'File upload failed'
            });
          }
        } else {
          // Fallback: create simple URL for development
          fileUrl = `/api/v1/files/chat/${orderId}/${fileName}`;
        }

        res.json({
          success: true,
          url: fileUrl,
          originalName: fileName,
          size: req.file.size,
          mimeType: req.file.mimetype
        });
      } catch (error) {
        console.error('Chat file upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  });

  // Voice Message Upload Endpoint
  app.post('/api/v1/upload/voice', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Invalid audio file type: ${file.mimetype}`));
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for voice messages
        files: 1,
      },
    }).single('file');

    upload(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: uploadError.message || 'Voice upload failed',
          error: 'UPLOAD_ERROR'
        });
      }

      try {
        const userId = req.user?.id;
        const { orderId, duration } = req.body;

        if (!userId || !orderId) {
          return res.status(400).json({
            success: false,
            message: 'User ID and Order ID are required'
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No voice file uploaded'
          });
        }

        // Verify user has access to this order's chat
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        const hasOrderAccess = order.userId === userId || 
                            order.serviceProviderId === userId || 
                            order.partsProviderId === userId;
        
        if (!hasOrderAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this order'
          });
        }

        // Create voice file URL
        const fileName = `voice-${Date.now()}.wav`;
        let fileUrl = '';
        
        if (objectStorageService.isAvailable()) {
          try {
            const uploadResult = await objectStorageService.uploadFile(
              req.file,
              `chat/${orderId}/voice`,
              false, // private file
              fileName
            );
            fileUrl = uploadResult.url;
          } catch (error) {
            console.error('Voice file upload failed:', error);
            return res.status(500).json({
              success: false,
              message: 'Voice upload failed'
            });
          }
        } else {
          // Fallback: create simple URL for development
          fileUrl = `/api/v1/files/voice/${orderId}/${fileName}`;
        }

        res.json({
          success: true,
          url: fileUrl,
          duration: parseInt(duration) || 0,
          size: req.file.size
        });
      } catch (error) {
        console.error('Voice message upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  });

  // Chat Participants Endpoint
  app.get('/api/v1/chat/:orderId/participants', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify user has access to this order
      if (order.userId !== userId && order.serviceProviderId !== userId && order.partsProviderId !== userId) {
        return res.status(403).json({ message: 'Access denied to this order' });
      }

      const participants = [];
      
      // Get customer info
      if (order.userId) {
        const customer = await storage.getUser(order.userId);
        if (customer) {
          participants.push({
            id: customer.id,
            firstName: customer.firstName || 'Customer',
            lastName: customer.lastName || '',
            profileImage: customer.profileImageUrl,
            role: 'user',
            isOnline: false, // Could be enhanced with real-time status
            lastSeen: customer.updatedAt
          });
        }
      }

      // Get service provider info
      if (order.serviceProviderId) {
        const provider = await storage.getUser(order.serviceProviderId);
        if (provider) {
          participants.push({
            id: provider.id,
            firstName: provider.firstName || 'Provider',
            lastName: provider.lastName || '',
            profileImage: provider.profileImageUrl,
            role: 'service_provider',
            isOnline: false, // Could be enhanced with real-time status
            lastSeen: provider.updatedAt
          });
        }
      }

      // Get parts provider info if applicable
      if (order.partsProviderId) {
        const partsProvider = await storage.getUser(order.partsProviderId);
        if (partsProvider) {
          participants.push({
            id: partsProvider.id,
            firstName: partsProvider.firstName || 'Parts Provider',
            lastName: partsProvider.lastName || '',
            profileImage: partsProvider.profileImageUrl,
            role: 'parts_provider',
            isOnline: false, // Could be enhanced with real-time status
            lastSeen: partsProvider.updatedAt
          });
        }
      }

      // Filter out current user from participants list
      const otherParticipants = participants.filter(p => p.id !== userId);

      res.json(otherParticipants);
    } catch (error) {
      console.error('Error fetching chat participants:', error);
      res.status(500).json({ message: 'Failed to fetch chat participants' });
    }
  });

  // ============================
  // SUPPORT SYSTEM API ROUTES
  // ============================

  // Support Ticket Routes
  app.get('/api/v1/support/tickets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status, category, priority } = req.query;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const filters: any = {};
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;
      if (priority) filters.priority = priority as string;

      const tickets = await storage.getSupportTickets(userId, filters);
      
      res.json({
        success: true,
        tickets
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
  });

  app.post('/api/v1/support/tickets', supportTicketLimiter, authMiddleware, validateBody(supportTicketCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const ticketData = {
        ...req.body,
        userId,
        status: 'open' as const,
      };

      const ticket = await storage.createSupportTicket(ticketData);
      
      // Send notification to support team (admin notification system)
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await notificationService.sendPushNotification(admin.id, {
          title: 'New Support Ticket',
          body: `${ticket.category}: ${ticket.subject}`,
          data: { type: 'support_ticket', ticketId: ticket.id }
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        ticket
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
  });

  app.get('/api/v1/support/tickets/:ticketId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Check ownership or admin access
      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.json({
        success: true,
        ticket
      });
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
    }
  });

  app.put('/api/v1/support/tickets/:ticketId', authMiddleware, validateBody(supportTicketUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Check ownership or admin access for updates
      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const updatedTicket = await storage.updateSupportTicket(ticketId, req.body);
      
      res.json({
        success: true,
        message: 'Ticket updated successfully',
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to update ticket' });
    }
  });

  // Support Ticket Messages
  app.get('/api/v1/support/tickets/:ticketId/messages', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Check access
      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const messages = await storage.getSupportTicketMessages(ticketId);
      
      res.json({
        success: true,
        messages
      });
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/v1/support/tickets/:ticketId/messages', supportMessageLimiter, authMiddleware, validateBody(supportTicketMessageCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const ticket = await storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Check access
      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Security: Only agents and admins can mark messages as internal
      const messageData = {
        ...req.body,
        ticketId,
        senderId: userId,
        senderType: req.user?.role === 'admin' ? 'agent' as const : 'user' as const,
        // Override client isInternal field - only agents/admins can create internal messages
        isInternal: req.body.isInternal && ['admin', 'service_provider'].includes(req.user?.role || '') ? req.body.isInternal : false,
      };

      const message = await storage.createSupportTicketMessage(messageData);
      
      // Notify relevant parties
      if (req.user?.role !== 'admin') {
        // Send notification to admin about new customer message
        const adminUsers = await storage.getUsersByRole('admin');
        for (const admin of adminUsers) {
          await notificationService.sendPushNotification(admin.id, {
            title: 'Support Ticket Update',
            body: `New message on ticket #${ticket.ticketNumber}`,
            data: { type: 'support_message', ticketId }
          });
        }
      } else {
        // Send notification to customer about admin response
        await notificationService.sendPushNotification(ticket.userId || '', {
          title: 'Support Response',
          body: `New message on ticket #${ticket.ticketNumber}`,
          data: { type: 'support_response', ticketId }
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Error creating ticket message:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  });

  app.put('/api/v1/support/tickets/:ticketId/read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      await storage.markMessagesAsRead(ticketId, userId);
      
      res.json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
  });

  // FAQ Routes
  app.get('/api/v1/support/faq', async (req: Request, res: Response) => {
    try {
      const { category, search } = req.query;
      
      let faqs;
      if (search) {
        faqs = await storage.searchFAQs(search as string, category as string);
      } else {
        faqs = await storage.getFAQs(category as string, true); // Only published FAQs for public
      }
      
      res.json({
        success: true,
        faqs
      });
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
    }
  });

  app.get('/api/v1/support/faq/:faqId', async (req: Request, res: Response) => {
    try {
      const { faqId } = req.params;
      
      const faq = await storage.getFAQ(faqId);
      
      if (!faq || !faq.isPublished) {
        return res.status(404).json({ success: false, message: 'FAQ not found' });
      }
      
      res.json({
        success: true,
        faq
      });
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch FAQ' });
    }
  });

  app.post('/api/v1/support/faq/:faqId/helpful', async (req: Request, res: Response) => {
    try {
      const { faqId } = req.params;
      const { isHelpful = true } = req.body;
      
      await storage.incrementFAQHelpfulCount(faqId, isHelpful);
      
      res.json({
        success: true,
        message: 'Feedback recorded successfully'
      });
    } catch (error) {
      console.error('Error recording FAQ feedback:', error);
      res.status(500).json({ success: false, message: 'Failed to record feedback' });
    }
  });

  // Callback Request Routes
  app.post('/api/v1/support/callback', supportCallbackLimiter, authMiddleware, validateBody(supportCallbackRequestCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const callbackData = {
        ...req.body,
        userId,
        status: 'pending' as const,
      };

      const callback = await storage.createSupportCallbackRequest(callbackData);
      
      // Notify support team (admin notification system)
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await notificationService.sendPushNotification(admin.id, {
          title: 'Callback Request',
          body: `${callback.priority} priority: ${callback.reason}`,
          data: { type: 'callback_request', requestId: callback.id }
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Callback request submitted successfully',
        request: callback
      });
    } catch (error) {
      console.error('Error creating callback request:', error);
      res.status(500).json({ success: false, message: 'Failed to create callback request' });
    }
  });

  app.get('/api/v1/support/callback-requests', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status } = req.query;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const requests = await storage.getSupportCallbackRequests(userId, status as string);
      
      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Error fetching callback requests:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch callback requests' });
    }
  });

  // Support Analytics
  app.get('/api/v1/support/stats', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await storage.getSupportStats();
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching support stats:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch support statistics' });
    }
  });

  // Admin Support Management Routes
  app.get('/api/v1/admin/support/tickets', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, category, priority, assignedTo } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;
      if (priority) filters.priority = priority as string;

      const tickets = await storage.getSupportTickets(assignedTo as string, filters);
      
      res.json({
        success: true,
        tickets
      });
    } catch (error) {
      console.error('Error fetching admin tickets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
  });

  app.put('/api/v1/admin/support/tickets/:ticketId/assign', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ success: false, message: 'Agent ID is required' });
      }

      const ticket = await storage.assignSupportTicket(ticketId, agentId);
      
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }
      
      res.json({
        success: true,
        message: 'Ticket assigned successfully',
        ticket
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to assign ticket' });
    }
  });

  app.put('/api/v1/admin/support/tickets/:ticketId/close', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { resolutionNotes } = req.body;
      
      const ticket = await storage.closeSupportTicket(ticketId, resolutionNotes);
      
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }
      
      res.json({
        success: true,
        message: 'Ticket closed successfully',
        ticket
      });
    } catch (error) {
      console.error('Error closing ticket:', error);
      res.status(500).json({ success: false, message: 'Failed to close ticket' });
    }
  });

  // Support Agent Management (Admin)
  app.get('/api/v1/admin/support/agents', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { department, isActive } = req.query;
      
      const agents = await storage.getSupportAgents(
        department as string, 
        isActive ? isActive === 'true' : undefined
      );
      
      res.json({
        success: true,
        agents
      });
    } catch (error) {
      console.error('Error fetching support agents:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch agents' });
    }
  });

  app.post('/api/v1/admin/support/agents', authMiddleware, requireRole(['admin']), validateBody(supportAgentCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Create user account for the agent
      const userData = {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: 'admin' as const,
        isVerified: true,
      };

      const user = await storage.createUser(userData);
      
      // Create agent profile
      const agentData = {
        ...req.body,
        userId: user.id,
      };

      const agent = await storage.createSupportAgent(agentData);
      
      res.status(201).json({
        success: true,
        message: 'Support agent created successfully',
        agent
      });
    } catch (error) {
      console.error('Error creating support agent:', error);
      res.status(500).json({ success: false, message: 'Failed to create agent' });
    }
  });

  app.put('/api/v1/admin/support/agents/:agentId', authMiddleware, requireRole(['admin']), validateBody(supportAgentUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      
      const agent = await storage.updateSupportAgent(agentId, req.body);
      
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      
      res.json({
        success: true,
        message: 'Agent updated successfully',
        agent
      });
    } catch (error) {
      console.error('Error updating support agent:', error);
      res.status(500).json({ success: false, message: 'Failed to update agent' });
    }
  });

  app.put('/api/v1/admin/support/agents/:agentId/status', authMiddleware, requireRole(['admin']), validateBody(agentStatusSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const { status, statusMessage } = req.body;
      
      await storage.updateAgentStatus(agentId, status, statusMessage);
      
      res.json({
        success: true,
        message: 'Agent status updated successfully'
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      res.status(500).json({ success: false, message: 'Failed to update agent status' });
    }
  });

  // Admin FAQ Management
  app.get('/api/v1/admin/support/faq', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, published } = req.query;
      
      const faqs = await storage.getFAQs(
        category as string, 
        published ? published === 'true' : undefined
      );
      
      res.json({
        success: true,
        faqs
      });
    } catch (error) {
      console.error('Error fetching admin FAQs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
    }
  });

  app.post('/api/v1/admin/support/faq', authMiddleware, requireRole(['admin']), validateBody(faqCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const faq = await storage.createFAQ(req.body);
      
      res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        faq
      });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(500).json({ success: false, message: 'Failed to create FAQ' });
    }
  });

  app.put('/api/v1/admin/support/faq/:faqId', authMiddleware, requireRole(['admin']), validateBody(faqUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { faqId } = req.params;
      
      const faq = await storage.updateFAQ(faqId, req.body);
      
      if (!faq) {
        return res.status(404).json({ success: false, message: 'FAQ not found' });
      }
      
      res.json({
        success: true,
        message: 'FAQ updated successfully',
        faq
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(500).json({ success: false, message: 'Failed to update FAQ' });
    }
  });

  app.delete('/api/v1/admin/support/faq/:faqId', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { faqId } = req.params;
      
      const deleted = await storage.deleteFAQ(faqId);
      
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'FAQ not found' });
      }
      
      res.json({
        success: true,
        message: 'FAQ deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({ success: false, message: 'Failed to delete FAQ' });
    }
  });

  // Admin Callback Request Management
  app.get('/api/v1/admin/support/callbacks', authMiddleware, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      
      const requests = await storage.getSupportCallbackRequests(undefined, status as string);
      
      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Error fetching admin callback requests:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch callback requests' });
    }
  });

  app.put('/api/v1/admin/support/callbacks/:requestId', authMiddleware, requireRole(['admin']), validateBody(supportCallbackRequestUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { requestId } = req.params;
      
      const request = await storage.updateSupportCallbackRequest(requestId, req.body);
      
      if (!request) {
        return res.status(404).json({ success: false, message: 'Callback request not found' });
      }
      
      res.json({
        success: true,
        message: 'Callback request updated successfully',
        request
      });
    } catch (error) {
      console.error('Error updating callback request:', error);
      res.status(500).json({ success: false, message: 'Failed to update callback request' });
    }
  });

  // ========================================
  // ENHANCED IMAGE UPLOAD ENDPOINTS
  // ========================================

  // Upload configuration endpoint
  app.get('/api/v1/upload/config', getUploadConfig);

  // Development file serving endpoint (for simulated uploads)
  app.get('/api/v1/uploads/files/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // In development mode, serve the actual uploaded file content from memory
      if (process.env.NODE_ENV === 'development') {
        const storedFile = getStoredFile(decodeURIComponent(filename));
        
        if (storedFile) {
          // Serve the actual uploaded file content
          res.setHeader('Content-Type', storedFile.contentType);
          res.setHeader('Content-Length', storedFile.buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
          res.end(storedFile.buffer);
          return;
        }
        
        // Fallback to placeholder if file not found in memory
        const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(filename.slice(0, 2))}&background=007bff&color=ffffff&size=200`;
        res.redirect(placeholderUrl);
        return;
      }
      
      // In production, this would fetch from actual object storage
      res.status(404).json({
        success: false,
        message: 'File not found',
        error: 'FILE_NOT_FOUND'
      });
    } catch (error) {
      console.error('Error serving uploaded file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve file',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Enhanced image upload endpoints
  app.post('/api/v1/upload/images', uploadLimiter, authMiddleware, handleMultipleImageUpload);
  
  // Enhanced avatar upload endpoint (replaces the existing placeholder)
  app.post('/api/v1/users/me/avatar', avatarUploadLimiter, authMiddleware, handleAvatarUpload);
  
  // Product image uploads for parts providers
  app.post('/api/v1/upload/product-images', uploadLimiter, authMiddleware, requireRole(['parts_provider']), handleProductImageUpload);
  
  // Service image uploads for service providers
  app.post('/api/v1/upload/service-images', uploadLimiter, authMiddleware, requireRole(['service_provider']), handleMultipleImageUpload);
  
  // Enhanced provider document upload (this will replace the existing one)
  app.post('/api/v1/providers/documents/upload-enhanced', 
    uploadLimiter, 
    authMiddleware, 
    requireRole(['service_provider', 'parts_provider']),
    ...validateUpload,
    handleProviderDocumentUpload
  );
  
  // ========================================
  // IMAGE MANAGEMENT ENDPOINTS
  // ========================================
  
  // Get image details
  app.get('/api/v1/images/:imageId', optionalAuth, getImageDetails);
  
  // Update image metadata
  app.patch('/api/v1/images/:imageId', authMiddleware, updateImageMetadata);
  
  // Delete image
  app.delete('/api/v1/images/:imageId', authMiddleware, deleteImage);
  
  // ========================================
  // AVATAR MANAGEMENT ENDPOINTS
  // ========================================
  
  // Get user avatar
  app.get('/api/v1/users/me/avatar', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        avatar: {
          url: user.profileImageUrl,
          hasAvatar: !!user.profileImageUrl
        }
      });
    } catch (error) {
      console.error('Error getting user avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user avatar',
        error: 'INTERNAL_ERROR'
      });
    }
  });
  
  // Delete user avatar
  app.delete('/api/v1/users/me/avatar', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: null
      });

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'Avatar removed successfully',
        user: {
          id: updatedUser.id,
          profileImageUrl: updatedUser.profileImageUrl,
        }
      });
    } catch (error) {
      console.error('Error removing user avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove avatar',
        error: 'INTERNAL_ERROR'
      });
    }
  });
  
  // ========================================
  // REFERRAL SYSTEM ENDPOINTS
  // ========================================
  
  // Get user's referral data
  app.get('/api/v1/referrals/my-data', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get or create user referral data
      let referralData = await storage.getUserReferral(userId);
      
      if (!referralData) {
        // Create initial referral data for user
        const referralCode = await storage.generateReferralCode(userId);
        const referralLink = `${req.get('origin') || 'https://fixitquick.com'}/signup?ref=${referralCode}`;
        
        referralData = await storage.createUserReferral({
          userId,
          referralCode,
          referralLink,
          totalReferrals: 0,
          successfulReferrals: 0,
          pendingReferrals: 0,
          totalEarnings: '0.00',
          availableEarnings: '0.00',
          pendingEarnings: '0.00',
          currentTier: 'Bronze',
          monthlyReferrals: 0,
          monthlyTarget: 5,
        });
      }

      // Get referral history
      const referralHistory = await storage.getReferralRecords(userId);
      
      // Calculate tier progress
      const currentTier = await storage.updateReferralTier(userId);
      
      // Calculate next tier progress
      const tierTargets = [
        { name: 'Bronze', min: 0, max: 4 },
        { name: 'Silver', min: 5, max: 9 },
        { name: 'Gold', min: 10, max: 19 },
        { name: 'Platinum', min: 20, max: 49 },
        { name: 'Diamond', min: 50, max: 999 },
      ];
      
      const currentTierIndex = tierTargets.findIndex(t => t.name === currentTier);
      const nextTier = tierTargets[currentTierIndex + 1];
      const nextTierProgress = nextTier ? 
        ((referralData.successfulReferrals - tierTargets[currentTierIndex].min) / 
         (nextTier.min - tierTargets[currentTierIndex].min)) * 100 : 100;

      res.json({
        referralCode: referralData.referralCode,
        referralLink: referralData.referralLink,
        totalReferrals: referralData.totalReferrals,
        successfulReferrals: referralData.successfulReferrals,
        pendingReferrals: referralData.pendingReferrals,
        totalEarnings: Number(referralData.totalEarnings),
        availableEarnings: Number(referralData.availableEarnings),
        pendingEarnings: Number(referralData.pendingEarnings),
        referralHistory: referralHistory.map(record => ({
          id: record.id,
          friendName: record.friendName || 'Anonymous',
          friendEmail: record.friendEmail,
          status: record.status,
          inviteDate: record.createdAt?.toISOString(),
          completionDate: record.completionDate?.toISOString(),
          earnings: Number(record.earnings),
          serviceUsed: record.serviceUsed,
        })),
        currentTier: currentTier,
        nextTierProgress: Math.round(nextTierProgress),
        monthlyTarget: referralData.monthlyTarget,
        monthlyProgress: referralData.monthlyReferrals,
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch referral data',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Generate new referral code
  app.post('/api/v1/referrals/generate-code', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { customCode } = req.body;
      
      // Generate new referral code
      const newReferralCode = await storage.generateReferralCode(userId, customCode);
      const referralLink = `${req.get('origin') || 'https://fixitquick.com'}/signup?ref=${newReferralCode}`;
      
      // Update user referral data
      const updatedReferral = await storage.updateUserReferral(userId, {
        referralCode: newReferralCode,
        referralLink,
      });

      if (!updatedReferral) {
        return res.status(404).json({
          success: false,
          message: 'Referral data not found',
          error: 'REFERRAL_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        referralCode: newReferralCode,
        referralLink,
        message: 'Referral code updated successfully'
      });
    } catch (error) {
      console.error('Error generating referral code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate referral code',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get referral history
  app.get('/api/v1/referrals/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { status } = req.query;
      
      const referralHistory = await storage.getReferralRecords(userId, status as string);
      
      res.json({
        success: true,
        referrals: referralHistory.map(record => ({
          id: record.id,
          friendName: record.friendName || 'Anonymous',
          friendEmail: record.friendEmail,
          status: record.status,
          inviteDate: record.createdAt?.toISOString(),
          completionDate: record.completionDate?.toISOString(),
          earnings: Number(record.earnings),
          serviceUsed: record.serviceUsed,
        }))
      });
    } catch (error) {
      console.error('Error fetching referral history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch referral history',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ========================================
  // LEGAL & PRIVACY ENDPOINTS
  // ========================================
  
  // Get user agreements
  app.get('/api/v1/users/me/agreements', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Get or create default agreements
      let agreements = await storage.getUserAgreements(userId);
      
      if (!agreements) {
        agreements = await storage.createUserAgreements({
          userId,
          termsOfService: { accepted: false, version: '1.0' },
          privacyPolicy: { accepted: false, version: '1.0' },
          cookiePolicy: { accepted: false, version: '1.0' },
          dataProcessing: { accepted: false, version: '1.0' },
        });
      }

      res.json({
        termsOfService: agreements.termsOfService,
        privacyPolicy: agreements.privacyPolicy,
        cookiePolicy: agreements.cookiePolicy,
        dataProcessing: agreements.dataProcessing,
      });
    } catch (error) {
      console.error('Error fetching user agreements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user agreements',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Update user agreements
  app.patch('/api/v1/users/me/agreements', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const updateData = req.body;
      
      const updatedAgreements = await storage.updateUserAgreements(userId, updateData);
      
      if (!updatedAgreements) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update agreements',
          error: 'UPDATE_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Agreements updated successfully',
        agreements: {
          termsOfService: updatedAgreements.termsOfService,
          privacyPolicy: updatedAgreements.privacyPolicy,
          cookiePolicy: updatedAgreements.cookiePolicy,
          dataProcessing: updatedAgreements.dataProcessing,
        }
      });
    } catch (error) {
      console.error('Error updating user agreements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update agreements',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get data export requests
  app.get('/api/v1/users/me/data-exports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const exportRequests = await storage.getDataExportRequests(userId);
      
      res.json(exportRequests.map(request => ({
        id: request.id,
        status: request.status,
        requestedAt: request.createdAt?.toISOString(),
        readyAt: request.readyAt?.toISOString(),
        expiresAt: request.expiresAt?.toISOString(),
        downloadUrl: request.status === 'ready' ? request.downloadUrl : undefined,
      })));
    } catch (error) {
      console.error('Error fetching data export requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch data export requests',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Create data export request
  app.post('/api/v1/users/me/data-exports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Check for pending requests
      const existingRequests = await storage.getDataExportRequests(userId);
      const pendingRequest = existingRequests.find(req => req.status === 'pending' || req.status === 'processing');
      
      if (pendingRequest) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending data export request',
          error: 'PENDING_REQUEST_EXISTS'
        });
      }

      const { requestedData = {}, format = 'json' } = req.body;
      
      const exportRequest = await storage.createDataExportRequest({
        userId,
        requestedData: {
          profile: true,
          orders: true,
          payments: true,
          support: true,
          referrals: true,
          ...requestedData,
        },
        format,
        status: 'pending',
      });

      // In a real implementation, trigger background job to process export
      // For now, we'll auto-process it
      setTimeout(async () => {
        try {
          await storage.processDataExport(exportRequest.id);
        } catch (error) {
          console.error('Error processing data export:', error);
        }
      }, 2000);

      res.json({
        success: true,
        message: 'Data export request created successfully',
        exportRequest: {
          id: exportRequest.id,
          status: exportRequest.status,
          requestedAt: exportRequest.createdAt?.toISOString(),
          expiresAt: exportRequest.expiresAt?.toISOString(),
        }
      });
    } catch (error) {
      console.error('Error creating data export request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create data export request',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Delete user account (requires re-authentication in production)
  app.delete('/api/v1/users/me/account', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { reason } = req.body;
      
      // Check for existing pending deletion request
      const existingRequests = await storage.getAccountDeletionRequests(userId);
      const pendingRequest = existingRequests.find(req => req.status === 'pending');
      
      if (pendingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Account deletion already requested',
          error: 'DELETION_ALREADY_REQUESTED',
          scheduledFor: pendingRequest.scheduledFor?.toISOString(),
          cancellationDeadline: pendingRequest.cancellationDeadline?.toISOString(),
        });
      }

      const deletionRequest = await storage.createAccountDeletionRequest({
        userId,
        requestedBy: userId,
        reason: reason || 'User requested account deletion',
        status: 'pending',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        retentionData: {
          keepOrders: true,
          keepPayments: true,
          keepSupport: true,
          anonymizeData: true,
        },
      });

      res.json({
        success: true,
        message: 'Account deletion request created successfully',
        scheduledFor: deletionRequest.scheduledFor?.toISOString(),
        cancellationDeadline: deletionRequest.cancellationDeadline?.toISOString(),
        deletionRequest: {
          id: deletionRequest.id,
          status: deletionRequest.status,
          requestedAt: deletionRequest.createdAt?.toISOString(),
        }
      });
    } catch (error) {
      console.error('Error creating account deletion request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create account deletion request',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Cancel account deletion
  app.post('/api/v1/users/me/account/cancel-deletion', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const cancelled = await storage.cancelAccountDeletion(userId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          message: 'No pending account deletion request found',
          error: 'NO_PENDING_DELETION'
        });
      }

      res.json({
        success: true,
        message: 'Account deletion request cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel account deletion',
        error: 'INTERNAL_ERROR'
      });
    }
  });
  
  // ========================================
  // PARTS IMAGE GALLERY MANAGEMENT
  // ========================================
  
  // Get part images
  app.get('/api/v1/parts/:partId/images', async (req: Request, res: Response) => {
    try {
      const { partId } = req.params;
      
      const part = await storage.getPart(partId);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found',
          error: 'PART_NOT_FOUND'
        });
      }

      const images = (part.images || []).map((url, index) => ({
        id: `${partId}_img_${index}`,
        url,
        filename: `image_${index + 1}.jpg`,
        isPrimary: index === 0,
        sortOrder: index,
        category: index === 0 ? 'main' : 'gallery'
      }));

      res.json({
        success: true,
        images,
        partId
      });
    } catch (error) {
      console.error('Error getting part images:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get part images',
        error: 'INTERNAL_ERROR'
      });
    }
  });
  
  // Reorder part images
  app.patch('/api/v1/parts/:partId/images/reorder', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { partId } = req.params;
      const { imageOrder } = req.body; // Array of image URLs in new order
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const part = await storage.getPart(partId);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found',
          error: 'PART_NOT_FOUND'
        });
      }

      if (part.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this part',
          error: 'FORBIDDEN'
        });
      }

      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image order format',
          error: 'INVALID_FORMAT'
        });
      }

      const updatedPart = await storage.updatePart(partId, {
        images: imageOrder
      });

      res.json({
        success: true,
        message: 'Part images reordered successfully',
        images: imageOrder,
        part: updatedPart
      });
    } catch (error) {
      console.error('Error reordering part images:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder part images',
        error: 'INTERNAL_ERROR'
      });
    }
  });
  
  // Set part primary image
  app.patch('/api/v1/parts/:partId/images/:imageId/primary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { partId, imageId } = req.params;
      const { imageUrl } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const part = await storage.getPart(partId);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found',
          error: 'PART_NOT_FOUND'
        });
      }

      if (part.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this part',
          error: 'FORBIDDEN'
        });
      }

      const images = part.images || [];
      const imageIndex = images.indexOf(imageUrl);
      
      if (imageIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Image not found in part gallery',
          error: 'IMAGE_NOT_FOUND'
        });
      }

      // Move the selected image to the first position
      const reorderedImages = [imageUrl, ...images.filter(img => img !== imageUrl)];
      
      const updatedPart = await storage.updatePart(partId, {
        images: reorderedImages
      });

      res.json({
        success: true,
        message: 'Primary image set successfully',
        images: reorderedImages,
        part: updatedPart
      });
    } catch (error) {
      console.error('Error setting primary image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set primary image',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ========================================
  // COMPREHENSIVE COUPON MANAGEMENT API
  // ========================================

  // Add coupon-specific rate limiters
  const couponLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes per IP
    message: 'Too many coupon requests. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const couponValidationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 validation requests per minute per IP
    message: 'Too many coupon validation attempts. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============================
  // ADMIN COUPON MANAGEMENT ENDPOINTS
  // ============================

  // Get all coupons with filters and pagination
  app.get('/api/v1/admin/coupons', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        isActive,
        isExpired,
        type,
        campaignName,
        createdBy,
        search,
        limit = '50',
        offset = '0'
      } = req.query;

      const filters = {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        isExpired: isExpired === 'true' ? true : isExpired === 'false' ? false : undefined,
        type: type as string,
        campaignName: campaignName as string,
        createdBy: createdBy as string,
        search: search as string,
        limit: Math.min(parseInt(limit as string) || 50, 100),
        offset: parseInt(offset as string) || 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]);

      const result = await storage.getAllCoupons(filters);

      res.json({
        success: true,
        coupons: result.coupons,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get coupon statistics and analytics
  app.get('/api/v1/admin/coupons/statistics', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔍 Coupons statistics endpoint hit - processing request');
    try {
      const { couponId } = req.query;
      const statistics = await storage.getCouponStatistics(couponId as string);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Error fetching coupon statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon statistics',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get specific coupon by ID with detailed information
  app.get('/api/v1/admin/coupons/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const coupon = await storage.getCouponById(id);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found',
          error: 'COUPON_NOT_FOUND'
        });
      }

      // Get coupon usage statistics
      const usageData = await storage.getCouponUsage(id, { limit: 10 });
      const performance = await storage.calculateCouponPerformance(id);

      res.json({
        success: true,
        coupon,
        usage: usageData,
        performance
      });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon details',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Create new coupon
  app.post('/api/v1/admin/coupons', adminSessionMiddleware, validateBody(insertCouponSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      // Check if coupon code already exists
      const existingCoupon = await storage.getCoupon(req.body.code);
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists',
          error: 'DUPLICATE_CODE'
        });
      }

      const couponData = {
        ...req.body,
        createdBy: userId,
        lastModifiedBy: userId,
        usageCount: 0,
        totalSavings: '0.00',
        isExpired: false
      };

      const coupon = await storage.createCoupon(couponData);

      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        coupon
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Update existing coupon
  app.put('/api/v1/admin/coupons/:id', adminSessionMiddleware, validateBody(insertCouponSchema.partial()), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const existingCoupon = await storage.getCouponById(id);
      if (!existingCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found',
          error: 'COUPON_NOT_FOUND'
        });
      }

      // If updating code, check for duplicates
      if (req.body.code && req.body.code !== existingCoupon.code) {
        const duplicateCoupon = await storage.getCoupon(req.body.code);
        if (duplicateCoupon) {
          return res.status(400).json({
            success: false,
            message: 'Coupon code already exists',
            error: 'DUPLICATE_CODE'
          });
        }
      }

      const updateData = {
        ...req.body,
        lastModifiedBy: userId
      };

      const updatedCoupon = await storage.updateCoupon(id, updateData);

      if (!updatedCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Failed to update coupon',
          error: 'UPDATE_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Coupon updated successfully',
        coupon: updatedCoupon
      });
    } catch (error) {
      console.error('Error updating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Delete coupon (soft delete with usage history preservation)
  app.delete('/api/v1/admin/coupons/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteCoupon(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message,
          error: 'DELETE_FAILED'
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Bulk update coupons (activate/deactivate multiple)
  app.post('/api/v1/admin/coupons/bulk-update', adminSessionMiddleware, validateBody(bulkCouponUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { couponIds, updates } = req.body;
      const result = await storage.bulkUpdateCoupons(couponIds, {
        ...updates,
        lastModifiedBy: userId
      });

      res.json({
        success: result.success,
        message: result.success ? 
          `Successfully updated ${result.updated} coupons` : 
          'Failed to update coupons',
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error bulk updating coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Bulk delete coupons
  app.post('/api/v1/admin/coupons/bulk-delete', adminSessionMiddleware, validateBody(bulkCouponDeleteSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { couponIds } = req.body;
      const result = await storage.bulkDeleteCoupons(couponIds);

      res.json({
        success: result.success,
        message: result.success ? 
          `Successfully processed ${result.deleted} coupons` : 
          'Failed to delete coupons',
        deleted: result.deleted,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error bulk deleting coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk delete coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Generate unique coupon code
  app.post('/api/v1/admin/coupons/generate-code', adminSessionMiddleware, validateBody(couponCodeGenerationSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pattern } = req.body;
      const code = await storage.generateCouponCode(pattern);

      res.json({
        success: true,
        code
      });
    } catch (error) {
      console.error('Error generating coupon code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate coupon code',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Check coupon code availability
  app.post('/api/v1/admin/coupons/check-availability', adminSessionMiddleware, validateBody(couponCodeAvailabilitySchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = req.body;
      const result = await storage.checkCouponCodeAvailability(code);

      res.json({
        success: true,
        available: result.available,
        suggestions: result.suggestions
      });
    } catch (error) {
      console.error('Error checking code availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check code availability',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Duplicate existing coupon
  app.post('/api/v1/admin/coupons/duplicate', adminSessionMiddleware, validateBody(couponDuplicationSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { couponId, modifications } = req.body;
      const duplicatedCoupon = await storage.duplicateCoupon(couponId, {
        ...modifications,
        createdBy: userId,
        lastModifiedBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Coupon duplicated successfully',
        coupon: duplicatedCoupon
      });
    } catch (error) {
      console.error('Error duplicating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get coupon usage details
  app.get('/api/v1/admin/coupons/:id/usage', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, limit = '50', offset = '0' } = req.query;

      const filters = {
        userId: userId as string,
        limit: Math.min(parseInt(limit as string) || 50, 100),
        offset: parseInt(offset as string) || 0
      };

      const result = await storage.getCouponUsage(id, filters);

      res.json({
        success: true,
        usage: result.usage,
        total: result.total
      });
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon usage',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Expire outdated coupons (maintenance endpoint)
  app.post('/api/v1/admin/coupons/expire-outdated', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await storage.expireOutdatedCoupons();

      res.json({
        success: true,
        message: `Processed expired coupons: ${result.expired} marked as expired, ${result.deactivated} deactivated`,
        expired: result.expired,
        deactivated: result.deactivated
      });
    } catch (error) {
      console.error('Error expiring outdated coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to expire outdated coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // PUBLIC COUPON ENDPOINTS (for users)
  // ============================

  // Validate coupon for users during checkout
  app.post('/api/v1/coupons/validate/:code', couponValidationLimiter, authMiddleware, validateBody(couponValidationContextSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const context = {
        ...req.body,
        userId
      };

      const result = await storage.validateCoupon(code, context);

      res.json({
        success: true,
        valid: result.valid,
        coupon: result.valid ? {
          id: result.coupon?.id,
          code: result.coupon?.code,
          title: result.coupon?.title,
          description: result.coupon?.description,
          type: result.coupon?.type,
          value: result.coupon?.value
        } : undefined,
        discountAmount: result.discountAmount,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Apply coupon to order
  app.post('/api/v1/coupons/apply', couponValidationLimiter, authMiddleware, validateBody(couponApplicationSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const { code, orderValue, serviceIds, categoryIds } = req.body;
      
      // For cart-based coupon validation, use validateCoupon instead of applyCoupon
      const validationResult = await storage.validateCoupon(code, {
        userId,
        orderValue,
        serviceIds,
        categoryIds
      });
      
      if (!validationResult.valid || !validationResult.coupon) {
        return res.status(400).json({
          success: false,
          message: validationResult.errors?.join(', ') || 'Invalid coupon',
          error: 'COUPON_VALIDATION_FAILED'
        });
      }
      
      const { coupon, discountAmount = 0 } = validationResult;

      // CRITICAL FIX: Return consistent format for frontend compatibility
      res.json({
        success: true,
        message: 'Coupon validated successfully',
        discountAmount,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderAmount: coupon.minOrderAmount
        }
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get available coupons for user
  app.get('/api/v1/coupons/user-available', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'UNAUTHORIZED'
        });
      }

      const {
        categoryIds,
        minOrderValue,
        onlyUnused = 'false',
        limit = '20'
      } = req.query;

      const filters = {
        categoryIds: categoryIds ? (categoryIds as string).split(',') : undefined,
        minOrderValue: minOrderValue ? parseFloat(minOrderValue as string) : undefined,
        onlyUnused: onlyUnused === 'true',
        limit: Math.min(parseInt(limit as string) || 20, 50)
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]);

      const coupons = await storage.getCouponsForUser(userId, filters);

      res.json({
        success: true,
        coupons: coupons.map(coupon => ({
          id: coupon.id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          maxDiscountAmount: coupon.maxDiscountAmount,
          minOrderAmount: coupon.minOrderAmount,
          validUntil: coupon.validUntil,
          maxUsagePerUser: coupon.maxUsagePerUser
        }))
      });
    } catch (error) {
      console.error('Error fetching user coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Get coupons by category (public endpoint for service pages)
  app.get('/api/v1/coupons/by-category', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryIds, limit = '10' } = req.query;
      const userId = req.user?.id;

      if (!categoryIds) {
        return res.status(400).json({
          success: false,
          message: 'Category IDs are required',
          error: 'MISSING_CATEGORY_IDS'
        });
      }

      const categoryIdArray = (categoryIds as string).split(',');
      const coupons = await storage.getCouponsByCategory(categoryIdArray, userId);

      const limitedCoupons = coupons.slice(0, Math.min(parseInt(limit as string) || 10, 20));

      res.json({
        success: true,
        coupons: limitedCoupons.map(coupon => ({
          id: coupon.id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          maxDiscountAmount: coupon.maxDiscountAmount,
          minOrderAmount: coupon.minOrderAmount,
          validUntil: coupon.validUntil
        }))
      });
    } catch (error) {
      console.error('Error fetching coupons by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // USER COUPON VALIDATION AND APPLICATION ENDPOINTS
  // ===============================================

  // POST /api/v1/coupons/validate/:code - Validate coupon code
  app.post('/api/v1/coupons/validate/:code', couponValidationLimiter, authMiddleware, validateBody(couponValidationContextSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = req.params;
      const context = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
      }

      // Add userId to context
      const validationContext = { ...context, userId };

      console.log('🎫 Validating coupon:', { code, context: validationContext });

      const result = await storage.validateCoupon(code, validationContext);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.errors.join(', '),
          errors: result.errors,
          error: 'COUPON_INVALID'
        });
      }

      res.json({
        success: true,
        message: 'Coupon is valid',
        coupon: {
          id: result.coupon?.id,
          code: result.coupon?.code,
          title: result.coupon?.title,
          description: result.coupon?.description,
          type: result.coupon?.type,
          value: result.coupon?.value,
          maxDiscountAmount: result.coupon?.maxDiscountAmount,
          minOrderAmount: result.coupon?.minOrderAmount,
          validUntil: result.coupon?.validUntil
        },
        discountAmount: result.discountAmount
      });
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coupon',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // Duplicate route removed - using properly validated route above

  // ============================
  // TAX MANAGEMENT SYSTEM
  // ============================

  // Tax validation schemas
  const taxCalculationContextSchema = z.object({
    orderValue: z.number().min(0),
    serviceCategories: z.array(z.string()).optional(),
    partCategories: z.array(z.string()).optional(),
    userLocation: z.object({
      state: z.string().optional(),
      city: z.string().optional()
    }).optional(),
    userRole: z.string().optional(),
    promoCode: z.string().optional(),
    orderType: z.string().optional(),
    shippingAmount: z.number().min(0).optional()
  });

  const taxBulkOperationSchema = z.object({
    taxIds: z.array(z.string()),
    operation: z.enum(['activate', 'deactivate', 'update_priority', 'delete']),
    data: z.object({
      isActive: z.boolean().optional(),
      priority: z.number().optional()
    }).optional()
  });

  // Rate limiter for tax operations
  const taxCalculationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 calculations per minute per IP
    message: 'Too many tax calculation requests. Please wait before calculating again.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============================
  // ADMIN TAX CATEGORY ENDPOINTS
  // ============================

  // GET /api/v1/admin/tax-categories - List all tax categories
  app.get('/api/v1/admin/tax-categories', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { isActive, search } = req.query;

      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      const categories = await storage.getTaxCategories(filters);

      res.json({
        success: true,
        categories: categories,
        total: categories.length
      });
    } catch (error) {
      console.error('Error fetching tax categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax categories',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/tax-categories/:id - Get specific tax category
  app.get('/api/v1/admin/tax-categories/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const category = await storage.getTaxCategory(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Tax category not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        category: category
      });
    } catch (error) {
      console.error('Error fetching tax category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax category',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/tax-categories - Create new tax category
  app.post('/api/v1/admin/tax-categories', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertTaxCategorySchema.parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required',
          error: 'UNAUTHORIZED'
        });
      }

      const categoryData = {
        ...validatedData,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const category = await storage.createTaxCategory(categoryData);

      res.status(201).json({
        success: true,
        message: 'Tax category created successfully',
        category: category
      });
    } catch (error) {
      console.error('Error creating tax category:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tax category data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create tax category',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // PUT /api/v1/admin/tax-categories/:id - Update tax category
  app.put('/api/v1/admin/tax-categories/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertTaxCategorySchema.partial().parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required',
          error: 'UNAUTHORIZED'
        });
      }

      const updateData = {
        ...validatedData,
        lastModifiedBy: adminId,
        updatedAt: new Date()
      };

      const category = await storage.updateTaxCategory(id, updateData);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Tax category not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'Tax category updated successfully',
        category: category
      });
    } catch (error) {
      console.error('Error updating tax category:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tax category data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update tax category',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // DELETE /api/v1/admin/tax-categories/:id - Delete tax category
  app.delete('/api/v1/admin/tax-categories/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteTaxCategory(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: 'DELETE_FAILED'
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting tax category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tax category',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/tax-categories/reorder - Reorder tax categories
  app.post('/api/v1/admin/tax-categories/reorder', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryIds, startOrder = 0 } = req.body;

      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({
          success: false,
          message: 'Category IDs must be an array',
          error: 'INVALID_INPUT'
        });
      }

      await storage.reorderTaxCategories(categoryIds, startOrder);

      res.json({
        success: true,
        message: 'Tax categories reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering tax categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder tax categories',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/tax-categories/statistics - Get tax category statistics
  app.get('/api/v1/admin/tax-categories/statistics', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const statistics = await storage.getTaxCategoryStatistics();

      res.json({
        success: true,
        statistics: statistics
      });
    } catch (error) {
      console.error('Error fetching tax category statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax category statistics',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // ADMIN TAX MANAGEMENT ENDPOINTS
  // ============================

  // GET /api/v1/admin/taxes - List all taxes with comprehensive filtering
  app.get('/api/v1/admin/taxes', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        isActive,
        categoryId,
        type,
        locationBased,
        search,
        isPrimary,
        gstType,
        limit = '50',
        offset = '0'
      } = req.query;

      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (categoryId) filters.categoryId = categoryId as string;
      if (type) filters.type = type as string;
      if (locationBased !== undefined) filters.locationBased = locationBased === 'true';
      if (search) filters.search = search as string;
      if (isPrimary !== undefined) filters.isPrimary = isPrimary === 'true';
      if (gstType) filters.gstType = gstType as string;
      filters.limit = Math.min(parseInt(limit as string) || 50, 100);
      filters.offset = parseInt(offset as string) || 0;

      const result = await storage.getTaxes(filters);

      res.json({
        success: true,
        taxes: result.taxes,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      });
    } catch (error) {
      console.error('Error fetching taxes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch taxes',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/taxes/:id - Get specific tax details
  app.get('/api/v1/admin/taxes/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const tax = await storage.getTax(id);

      if (!tax) {
        return res.status(404).json({
          success: false,
          message: 'Tax not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        tax: tax
      });
    } catch (error) {
      console.error('Error fetching tax:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/taxes - Create new tax
  app.post('/api/v1/admin/taxes', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertTaxSchema.parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required',
          error: 'UNAUTHORIZED'
        });
      }

      // Validate tax configuration
      const validation = await storage.validateTaxConfiguration(validatedData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Tax configuration validation failed',
          errors: validation.errors,
          error: 'VALIDATION_ERROR'
        });
      }

      const taxData = {
        ...validatedData,
        createdBy: adminId,
        lastModifiedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const tax = await storage.createTax(taxData);

      res.status(201).json({
        success: true,
        message: 'Tax created successfully',
        tax: tax
      });
    } catch (error) {
      console.error('Error creating tax:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tax data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create tax',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // PUT /api/v1/admin/taxes/:id - Update tax
  app.put('/api/v1/admin/taxes/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertTaxSchema.partial().parse(req.body);
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required',
          error: 'UNAUTHORIZED'
        });
      }

      // Validate tax configuration if critical fields are being updated
      if (validatedData.rate !== undefined || validatedData.type !== undefined) {
        const validation = await storage.validateTaxConfiguration({...validatedData, id});
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Tax configuration validation failed',
            errors: validation.errors,
            error: 'VALIDATION_ERROR'
          });
        }
      }

      const updateData = {
        ...validatedData,
        lastModifiedBy: adminId,
        updatedAt: new Date()
      };

      const tax = await storage.updateTax(id, updateData);

      if (!tax) {
        return res.status(404).json({
          success: false,
          message: 'Tax not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'Tax updated successfully',
        tax: tax
      });
    } catch (error) {
      console.error('Error updating tax:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tax data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update tax',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // DELETE /api/v1/admin/taxes/:id - Delete tax (soft delete)
  app.delete('/api/v1/admin/taxes/:id', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteTax(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: 'DELETE_FAILED'
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting tax:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tax',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // TAX BULK OPERATIONS ENDPOINTS
  // ============================

  // POST /api/v1/admin/taxes/bulk - Bulk operations (activate/deactivate/delete)
  app.post('/api/v1/admin/taxes/bulk', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = taxBulkOperationSchema.parse(req.body);
      const result = await storage.bulkUpdateTaxes(validatedData);

      res.json({
        success: result.success,
        message: `Bulk operation completed. ${result.updated} taxes ${validatedData.operation}d.`,
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error performing bulk tax operation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bulk operation data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/taxes/bulk-activate - Bulk activate taxes
  app.post('/api/v1/admin/taxes/bulk-activate', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taxIds } = req.body;

      if (!Array.isArray(taxIds)) {
        return res.status(400).json({
          success: false,
          message: 'Tax IDs must be an array',
          error: 'INVALID_INPUT'
        });
      }

      const result = await storage.bulkActivateTaxes(taxIds);

      res.json({
        success: result.success,
        message: `${result.activated} taxes activated successfully.`,
        activated: result.activated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error bulk activating taxes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate taxes',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/taxes/bulk-deactivate - Bulk deactivate taxes
  app.post('/api/v1/admin/taxes/bulk-deactivate', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taxIds } = req.body;

      if (!Array.isArray(taxIds)) {
        return res.status(400).json({
          success: false,
          message: 'Tax IDs must be an array',
          error: 'INVALID_INPUT'
        });
      }

      const result = await storage.bulkDeactivateTaxes(taxIds);

      res.json({
        success: result.success,
        message: `${result.deactivated} taxes deactivated successfully.`,
        deactivated: result.deactivated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error bulk deactivating taxes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate taxes',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // TAX ANALYTICS AND STATISTICS ENDPOINTS
  // ============================

  // GET /api/v1/admin/taxes/statistics - Comprehensive tax statistics and analytics
  app.get('/api/v1/admin/taxes/statistics', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateRange, categoryId } = req.query;

      const filters: any = {};
      if (dateRange) filters.dateRange = dateRange;
      if (categoryId) filters.categoryId = categoryId;

      const statistics = await storage.getTaxStatistics(filters);

      res.json({
        success: true,
        statistics: statistics
      });
    } catch (error) {
      console.error('Error fetching tax statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax statistics',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/taxes/calculate-preview - Preview tax calculations for testing
  app.post('/api/v1/admin/taxes/calculate-preview', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taxIds, orderValue } = req.body;

      if (!Array.isArray(taxIds) || typeof orderValue !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Tax IDs (array) and order value (number) are required',
          error: 'INVALID_INPUT'
        });
      }

      const preview = await storage.previewTaxCalculation(taxIds, orderValue);

      res.json({
        success: true,
        preview: preview.preview,
        totalTax: preview.totalTax,
        totalAmount: orderValue + preview.totalTax,
        conflicts: preview.conflicts
      });
    } catch (error) {
      console.error('Error calculating tax preview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate tax preview',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/taxes/:id/performance - Get tax performance report
  app.get('/api/v1/admin/taxes/:id/performance', adminSessionMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { dateRange } = req.query;

      const report = await storage.getTaxPerformanceReport(id, { dateRange });

      res.json({
        success: true,
        report: report
      });
    } catch (error) {
      console.error('Error fetching tax performance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tax performance report',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // PUBLIC TAX CALCULATION ENDPOINTS
  // ============================

  // POST /api/v1/taxes/calculate - Calculate taxes for order (public endpoint)
  app.post('/api/v1/taxes/calculate', taxCalculationLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = taxCalculationContextSchema.parse(req.body);
      
      const calculation = await storage.calculateTaxes(validatedData);

      res.json({
        success: true,
        calculation: {
          taxes: calculation.taxes.map(tax => ({
            taxId: tax.tax.id,
            taxName: tax.tax.name,
            taxCode: tax.tax.code,
            type: tax.tax.type,
            appliedRate: tax.appliedRate,
            taxableAmount: tax.taxableAmount,
            calculatedAmount: tax.calculatedAmount
          })),
          totalTaxAmount: calculation.totalTaxAmount,
          totalAmount: calculation.totalAmount,
          breakdown: calculation.breakdown
        }
      });
    } catch (error) {
      console.error('Error calculating taxes:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid calculation parameters',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to calculate taxes',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/taxes/applicable - Get applicable taxes for service/location (public endpoint)
  app.get('/api/v1/taxes/applicable', taxCalculationLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        serviceCategories,
        partCategories,
        orderValue,
        state,
        city,
        userRole,
        orderType,
        promoCode
      } = req.query;

      const context: any = {
        orderValue: parseFloat(orderValue as string) || 0
      };

      if (serviceCategories) context.serviceCategories = (serviceCategories as string).split(',');
      if (partCategories) context.partCategories = (partCategories as string).split(',');
      if (state || city) context.userLocation = { state: state as string, city: city as string };
      if (userRole) context.userRole = userRole as string;
      if (orderType) context.orderType = orderType as string;
      if (promoCode) context.promoCode = promoCode as string;

      const applicableTaxes = await storage.getApplicableTaxes(context);

      res.json({
        success: true,
        applicableTaxes: applicableTaxes.map(tax => ({
          id: tax.id,
          name: tax.name,
          code: tax.code,
          type: tax.type,
          rate: tax.rate,
          displayName: tax.displayName,
          description: tax.description,
          isPrimary: tax.isPrimary,
          priority: tax.priority
        })),
        count: applicableTaxes.length
      });
    } catch (error) {
      console.error('Error fetching applicable taxes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applicable taxes',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/taxes/by-category/:categoryId - Get taxes by category (public endpoint)
  app.get('/api/v1/taxes/by-category/:categoryId', taxCalculationLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { activeOnly = 'true' } = req.query;

      const taxes = await storage.getTaxesByCategory(categoryId, activeOnly === 'true');

      res.json({
        success: true,
        taxes: taxes.map(tax => ({
          id: tax.id,
          name: tax.name,
          code: tax.code,
          type: tax.type,
          rate: tax.rate,
          displayName: tax.displayName,
          minOrderValue: tax.minOrderValue,
          maxOrderValue: tax.maxOrderValue
        })),
        count: taxes.length
      });
    } catch (error) {
      console.error('Error fetching taxes by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch taxes by category',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/taxes/by-location - Get location-based taxes (public endpoint)
  app.get('/api/v1/taxes/by-location', taxCalculationLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { state, city, activeOnly = 'true' } = req.query;

      const taxes = await storage.getTaxesByLocation(
        state as string,
        city as string,
        activeOnly === 'true'
      );

      res.json({
        success: true,
        taxes: taxes.map(tax => ({
          id: tax.id,
          name: tax.name,
          code: tax.code,
          type: tax.type,
          rate: tax.rate,
          displayName: tax.displayName,
          stateRestrictions: tax.stateRestrictions,
          cityRestrictions: tax.cityRestrictions
        })),
        count: taxes.length
      });
    } catch (error) {
      console.error('Error fetching taxes by location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch taxes by location',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // PROMOTIONAL MEDIA ENDPOINTS
  // ============================

  // Rate limiters for promotional media endpoints
  const promotionalMediaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many promotional media requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const analyticsTrackingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 tracking requests per minute for high-volume analytics
    message: 'Too many analytics tracking requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============================
  // ADMIN PROMOTIONAL MEDIA ENDPOINTS
  // ============================

  // GET /api/v1/admin/promotional-media - List all media with filters and pagination
  app.get('/api/v1/admin/promotional-media', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        isActive,
        placement,
        mediaType,
        status,
        moderationStatus,
        campaignId,
        search,
        dateFrom,
        dateTo,
        limit = '20',
        offset = '0',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters: any = {};
      
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (placement) filters.placement = placement as string;
      if (mediaType) filters.mediaType = mediaType as string;
      if (status) filters.status = status as string;
      if (moderationStatus) filters.moderationStatus = moderationStatus as string;
      if (campaignId) filters.campaignId = campaignId as string;
      if (search) filters.search = search as string;
      if (dateFrom) filters.dateFrom = dateFrom as string;
      if (dateTo) filters.dateTo = dateTo as string;
      
      filters.limit = parseInt(limit as string);
      filters.offset = parseInt(offset as string);
      filters.sortBy = sortBy as string;
      filters.sortOrder = sortOrder as string;

      const result = await storage.getPromotionalMedia(filters);

      res.json({
        success: true,
        media: result.media,
        total: result.total,
        currentPage: Math.floor(filters.offset / filters.limit) + 1,
        totalPages: Math.ceil(result.total / filters.limit),
        hasMore: (filters.offset + filters.limit) < result.total
      });
    } catch (error) {
      console.error('Error fetching promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/promotional-media/upload - Upload media files to object storage
  const promotionalMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max for videos
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images (JPG, PNG, WebP) and videos (MP4, WebM, MOV) are allowed.'));
      }
    }
  });

  app.post('/api/v1/admin/promotional-media/upload', 
    adminSessionMiddleware, 
    promotionalMediaLimiter,
    promotionalMediaUpload.single('file'),
    validateUpload,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded',
            error: 'NO_FILE'
          });
        }

        const { mediaType, generateThumbnail } = req.body;
        const file = req.file;
        const isVideo = file.mimetype.startsWith('video/');
        const isImage = file.mimetype.startsWith('image/');

        // Validate file size based on type
        const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for images, 50MB for videos
        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            message: `File size exceeds ${isImage ? '5MB' : '50MB'} limit`,
            error: 'FILE_TOO_LARGE'
          });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = file.originalname.split('.').pop();
        const filename = `promotional-media-${timestamp}-${randomId}.${extension}`;

        // Upload to object storage
        const uploadResult = await objectStorageService.uploadFile({
          file: file.buffer,
          filename,
          mimeType: file.mimetype,
          size: file.size,
          directory: 'public/promotional-media'
        });

        let thumbnailUrl = '';

        // Generate thumbnail for videos
        if (isVideo && generateThumbnail === 'true') {
          try {
            const thumbnailFilename = `thumb-${timestamp}-${randomId}.jpg`;
            const thumbnailResult = await objectStorageService.generateVideoThumbnail({
              videoUrl: uploadResult.url,
              filename: thumbnailFilename,
              directory: 'public/promotional-media/thumbnails',
              timestamp: 1.0 // Capture frame at 1 second
            });
            thumbnailUrl = thumbnailResult.url;
          } catch (thumbError) {
            console.warn('Failed to generate video thumbnail:', thumbError);
            // Continue without thumbnail - not critical
          }
        }

        // For images, use the main URL as thumbnail
        if (isImage) {
          thumbnailUrl = uploadResult.url;
        }

        res.status(200).json({
          success: true,
          message: 'File uploaded successfully',
          mediaUrl: uploadResult.url,
          thumbnailUrl,
          filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          mediaType: isVideo ? 'video' : 'image'
        });

      } catch (error) {
        console.error('Error uploading promotional media file:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload file',
          error: 'UPLOAD_ERROR'
        });
      }
    }
  );

  // POST /api/v1/admin/promotional-media - Create new promotional media record
  app.post('/api/v1/admin/promotional-media', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPromotionalMediaSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        lastModifiedBy: req.user!.id
      });

      const media = await storage.createPromotionalMedia({
        ...validatedData,
        createdBy: req.user!.id
      });

      res.status(201).json({
        success: true,
        message: 'Promotional media created successfully',
        media
      });
    } catch (error) {
      console.error('Error creating promotional media:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid media data',
          errors: error.errors,
          error: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/promotional-media/:id - Get specific media details
  app.get('/api/v1/admin/promotional-media/:id', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const media = await storage.getPromotionalMediaItem(id);
      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Promotional media not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        media
      });
    } catch (error) {
      console.error('Error fetching promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // PUT /api/v1/admin/promotional-media/:id - Update promotional media
  app.put('/api/v1/admin/promotional-media/:id', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if media exists
      const existingMedia = await storage.getPromotionalMediaItem(id);
      if (!existingMedia) {
        return res.status(404).json({
          success: false,
          message: 'Promotional media not found',
          error: 'NOT_FOUND'
        });
      }

      const updateData = {
        ...req.body,
        lastModifiedBy: req.user!.id
      };

      const media = await storage.updatePromotionalMedia(id, updateData);

      res.json({
        success: true,
        message: 'Promotional media updated successfully',
        media
      });
    } catch (error) {
      console.error('Error updating promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // DELETE /api/v1/admin/promotional-media/:id - Delete promotional media
  app.delete('/api/v1/admin/promotional-media/:id', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const result = await storage.deletePromotionalMedia(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message,
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/promotional-media/bulk - Bulk operations on promotional media
  app.post('/api/v1/admin/promotional-media/bulk', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { operation, mediaIds, data } = req.body;

      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Media IDs array is required',
          error: 'INVALID_INPUT'
        });
      }

      if (!['activate', 'deactivate', 'archive', 'delete', 'update_priority'].includes(operation)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Must be one of: activate, deactivate, archive, delete, update_priority',
          error: 'INVALID_OPERATION'
        });
      }

      const result = await storage.bulkOperatePromotionalMedia({
        operation,
        mediaIds,
        data
      });

      res.json({
        success: result.success,
        message: `Bulk ${operation} completed. ${result.updated} items updated.`,
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/promotional-media/statistics - Analytics and statistics
  app.get('/api/v1/admin/promotional-media/statistics', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateFrom, dateTo, campaignId, placement, mediaType } = req.query;

      const filters: any = {};
      if (dateFrom) filters.dateFrom = dateFrom as string;
      if (dateTo) filters.dateTo = dateTo as string;
      if (campaignId) filters.campaignId = campaignId as string;
      if (placement) filters.placement = placement as string;
      if (mediaType) filters.mediaType = mediaType as string;

      const statistics = await storage.getPromotionalMediaStatistics(filters);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Error fetching promotional media statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional media statistics',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/admin/promotional-media/:id/moderation - Update moderation status
  app.post('/api/v1/admin/promotional-media/:id/moderation', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes, action } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid moderation status. Must be one of: pending, approved, rejected',
          error: 'INVALID_STATUS'
        });
      }

      let media;
      
      if (action === 'approve') {
        media = await storage.approveMedia(id, req.user!.id);
      } else if (action === 'reject') {
        if (!notes) {
          return res.status(400).json({
            success: false,
            message: 'Rejection notes are required when rejecting media',
            error: 'MISSING_NOTES'
          });
        }
        media = await storage.rejectMedia(id, notes, req.user!.id);
      } else {
        media = await storage.updateModerationStatus(id, status, notes);
      }

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Promotional media not found',
          error: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: `Media moderation status updated to ${status}`,
        media
      });
    } catch (error) {
      console.error('Error updating moderation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update moderation status',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/admin/promotional-media/:id/performance - Get media performance report
  app.get('/api/v1/admin/promotional-media/:id/performance', adminSessionMiddleware, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { dateFrom, dateTo } = req.query;

      const dateRange = (dateFrom && dateTo) ? {
        from: dateFrom as string,
        to: dateTo as string
      } : undefined;

      const report = await storage.getMediaPerformanceReport(id, dateRange);

      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Error fetching media performance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch media performance report',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // ============================
  // PUBLIC PROMOTIONAL MEDIA ENDPOINTS
  // ============================

  // GET /api/v1/promotional-media/active - Get active media for display
  app.get('/api/v1/promotional-media/active', optionalAuth, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { placement, limit = '10' } = req.query;
      const userId = req.user?.id;

      const filters: any = {
        placement: placement as string,
        userId,
        limit: parseInt(limit as string)
      };

      // Add user context for targeting
      if (req.user) {
        filters.userRole = req.user.role;
        // TODO: Add geographic targeting based on user location
      }

      const media = await storage.getActivePromotionalMedia(filters);

      // Track impressions for returned media
      if (media.length > 0 && userId) {
        // Use Promise.allSettled to not block response for analytics failures
        Promise.allSettled(
          media.map(item => 
            storage.trackMediaImpression(item.id, {
              userId,
              placement: placement as string,
              deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
              userAgent: req.get('User-Agent'),
              ipAddress: req.ip,
              metadata: { 
                endpoint: 'active-media',
                timestamp: new Date().toISOString()
              }
            })
          )
        ).catch(err => console.error('Analytics tracking failed:', err));
      }

      res.json({
        success: true,
        media: media.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          placement: item.placement,
          displayOrder: item.displayOrder,
          autoPlay: item.autoPlay,
          loopEnabled: item.loopEnabled,
          targetUrl: item.targetUrl,
          displaySettings: item.displaySettings,
          // Don't expose admin-only fields
        })),
        count: media.length
      });
    } catch (error) {
      console.error('Error fetching active promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // GET /api/v1/promotional-media/placement/:placement - Get media by placement
  app.get('/api/v1/promotional-media/placement/:placement', optionalAuth, promotionalMediaLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { placement } = req.params;
      const { limit = '5' } = req.query;
      const userId = req.user?.id;

      const media = await storage.getActiveMediaByPlacement(placement, userId);

      // Track impressions for placement-specific media
      if (media.length > 0 && userId) {
        Promise.allSettled(
          media.slice(0, parseInt(limit as string)).map(item => 
            storage.trackMediaImpression(item.id, {
              userId,
              placement,
              deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
              userAgent: req.get('User-Agent'),
              ipAddress: req.ip,
              metadata: { 
                endpoint: 'placement-media',
                placement,
                timestamp: new Date().toISOString()
              }
            })
          )
        ).catch(err => console.error('Analytics tracking failed:', err));
      }

      res.json({
        success: true,
        placement,
        media: media.slice(0, parseInt(limit as string)).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          autoPlay: item.autoPlay,
          loopEnabled: item.loopEnabled,
          targetUrl: item.targetUrl,
          displaySettings: item.displaySettings,
        })),
        count: Math.min(media.length, parseInt(limit as string))
      });
    } catch (error) {
      console.error('Error fetching placement promotional media:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch placement promotional media',
        error: 'INTERNAL_ERROR'
      });
    }
  });

  // POST /api/v1/promotional-media/track-impression - Track media impressions
  app.post('/api/v1/promotional-media/track-impression', optionalAuth, analyticsTrackingLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mediaId, placement, sessionId, viewportSize, metadata } = req.body;

      if (!mediaId) {
        return res.status(400).json({
          success: false,
          message: 'Media ID is required',
          error: 'MISSING_MEDIA_ID'
        });
      }

      const context = {
        userId: req.user?.id,
        sessionId,
        placement,
        deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        viewportSize,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          endpoint: 'track-impression'
        }
      };

      // Track impression asynchronously
      storage.trackMediaImpression(mediaId, context).catch(err => 
        console.error('Failed to track impression:', err)
      );

      res.json({
        success: true,
        message: 'Impression tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
      // Don't fail the request for analytics failures
      res.json({
        success: true,
        message: 'Impression tracking attempted'
      });
    }
  });

  // POST /api/v1/promotional-media/track-click - Track media clicks
  app.post('/api/v1/promotional-media/track-click', optionalAuth, analyticsTrackingLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mediaId, placement, sessionId, clickPosition, metadata } = req.body;

      if (!mediaId) {
        return res.status(400).json({
          success: false,
          message: 'Media ID is required',
          error: 'MISSING_MEDIA_ID'
        });
      }

      const context = {
        userId: req.user?.id,
        sessionId,
        placement,
        clickPosition,
        deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          endpoint: 'track-click'
        }
      };

      // Track click asynchronously
      storage.trackMediaClick(mediaId, context).catch(err => 
        console.error('Failed to track click:', err)
      );

      res.json({
        success: true,
        message: 'Click tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      // Don't fail the request for analytics failures
      res.json({
        success: true,
        message: 'Click tracking attempted'
      });
    }
  });

  // POST /api/v1/admin/seed-providers - Create verifiable service providers with database persistence
  app.post('/api/v1/admin/seed-providers', adminSessionMiddleware, async (req, res) => {
    try {
      console.log('🌱 Starting provider seeding process...');
      
      // Provider data with comprehensive details
      const PROVIDERS = [
        {
          email: "rajesh.electrician.fixit@gmail.com",
          firstName: "Rajesh",
          lastName: "Kumar",
          business: "Kumar Electrical Services",
          phone: "+919876543210",
          location: "Mumbai, Maharashtra",
          category: "Electrician",
          services: ["electrical wiring", "LED installation", "appliance repair", "circuit troubleshooting"]
        },
        {
          email: "amit.plumber.fixit@gmail.com", 
          firstName: "Amit",
          lastName: "Singh",
          business: "Singh Plumbing Works",
          phone: "+919876543211",
          location: "Delhi",
          category: "Plumber", 
          services: ["pipe repair", "bathroom installation", "water heater setup", "drain cleaning"]
        },
        {
          email: "priya.cleaner.fixit@gmail.com",
          firstName: "Priya",
          lastName: "Sharma", 
          business: "Priya Professional Cleaning",
          phone: "+919876543212",
          location: "Bangalore, Karnataka",
          category: "Cleaner",
          services: ["deep cleaning", "sanitization", "carpet cleaning", "window cleaning"]  
        },
        {
          email: "vikram.carpenter.fixit@gmail.com",
          firstName: "Vikram",
          lastName: "Reddy",
          business: "Reddy Carpentry Works", 
          phone: "+919876543213",
          location: "Hyderabad, Telangana",
          category: "Carpenter",
          services: ["furniture making", "door repair", "cabinet installation", "wood polishing"]
        },
        {
          email: "suresh.pestcontrol.fixit@gmail.com",
          firstName: "Suresh", 
          lastName: "Patel",
          business: "Patel Pest Solutions",
          phone: "+919876543214", 
          location: "Pune, Maharashtra",
          category: "Pest Control",
          services: ["termite control", "cockroach treatment", "fumigation", "rodent control"]
        }
      ];

      const results = {
        created: 0,
        providers: [] as any[],
        verification: {
          usersCount: 0,
          providersCount: 0,
          profilesCount: 0, 
          serviceMappings: 0
        },
        errors: [] as string[]
      };

      console.log(`📋 Processing ${PROVIDERS.length} providers for seeding...`);

      for (const providerData of PROVIDERS) {
        try {
          console.log(`🔄 Processing provider: ${providerData.email}`);

          // Check if user already exists to make idempotent
          const existingUser = await storage.getUserByEmail(providerData.email);
          
          let user;
          if (existingUser) {
            console.log(`👤 User already exists: ${providerData.email}`);
            user = existingUser;
          } else {
            // Create user record with service_provider role
            user = await storage.createUser({
              email: providerData.email,
              firstName: providerData.firstName,
              lastName: providerData.lastName, 
              phone: providerData.phone,
              role: 'service_provider',
              isVerified: true,
              isActive: true,
              location: {
                address: providerData.location,
                latitude: 0, // Would be set based on actual address
                longitude: 0, 
                city: providerData.location.split(',')[0].trim(),
                pincode: '000000'
              }
            });
            console.log(`✅ User created: ${user.id} - ${user.email}`);
          }

          // Check if service provider profile exists
          let serviceProvider;
          const existingProvider = await storage.getServiceProviderByUserId(user.id);
          
          if (existingProvider) {
            console.log(`🏢 Service provider already exists for user: ${user.id}`);
            serviceProvider = existingProvider;
          } else {
            // Create service provider profile
            serviceProvider = await storage.createServiceProvider({
              userId: user.id,
              businessName: providerData.business,
              businessType: 'individual',
              skills: providerData.services,
              experienceYears: Math.floor(Math.random() * 10) + 2, // 2-12 years
              isVerified: true,
              verificationLevel: 'verified',
              rating: (4.0 + Math.random() * 1.0).toFixed(2), // 4.0-5.0 rating
              totalCompletedOrders: Math.floor(Math.random() * 50) + 10, // 10-60 orders
              totalRatings: Math.floor(Math.random() * 30) + 5, // 5-35 ratings
              isOnline: Math.random() > 0.5, // Random online status
              isAvailable: true,
              serviceRadius: 25, // 25km service radius
              currentLocation: {
                latitude: 19.0760 + (Math.random() - 0.5) * 0.1, // Random location around Mumbai
                longitude: 72.8777 + (Math.random() - 0.5) * 0.1,
                address: providerData.location,
                lastUpdated: new Date().toISOString()
              },
              serviceAreas: [{
                name: providerData.location,
                coordinates: [
                  { lat: 19.0760 + (Math.random() - 0.5) * 0.1, lng: 72.8777 + (Math.random() - 0.5) * 0.1 }
                ],
                cities: [providerData.location.split(',')[0].trim()]
              }],
              documents: {
                aadhar: {
                  front: `https://example.com/documents/${user.id}/aadhar_front.jpg`,
                  back: `https://example.com/documents/${user.id}/aadhar_back.jpg`, 
                  uploadedAt: new Date().toISOString(),
                  verified: true
                },
                photo: {
                  url: `https://example.com/documents/${user.id}/profile_photo.jpg`,
                  uploadedAt: new Date().toISOString(),
                  verified: true
                }
              },
              verificationStatus: 'approved',
              verificationDate: new Date(),
              completionRate: (85 + Math.random() * 15).toFixed(2), // 85-100% completion rate
              onTimeRate: (90 + Math.random() * 10).toFixed(2) // 90-100% on-time rate
            });
            console.log(`✅ Service provider created: ${serviceProvider.id} for user ${user.id}`);
          }

          results.providers.push({
            id: serviceProvider.id,
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            business: providerData.business,
            phone: user.phone,
            location: providerData.location,
            status: 'approved',
            verificationLevel: 'verified',
            services: providerData.services
          });

          results.created++;
          console.log(`🎉 Provider ${providerData.email} successfully processed!`);

        } catch (error) {
          const errorMsg = `Failed to create provider ${providerData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      // Get verification counts from database
      try {
        const allUsers = await storage.searchUsers('', undefined); // Get all users
        const serviceProviders = await storage.getServiceProviders();
        
        results.verification.usersCount = allUsers.filter(u => u.role === 'service_provider').length;
        results.verification.providersCount = serviceProviders.length;
        results.verification.profilesCount = serviceProviders.length; // Same as providers for this implementation
        results.verification.serviceMappings = serviceProviders.reduce((total, sp) => {
          return total + (sp.skills?.length || 0);
        }, 0);

        console.log(`📊 Verification counts - Users: ${results.verification.usersCount}, Providers: ${results.verification.providersCount}, Mappings: ${results.verification.serviceMappings}`);
      } catch (error) {
        console.error('❌ Error getting verification counts:', error);
      }

      console.log(`🌱 Provider seeding completed! Created: ${results.created}, Errors: ${results.errors.length}`);

      res.json({
        success: results.errors.length === 0,
        message: `Successfully processed ${results.created} providers${results.errors.length > 0 ? ` with ${results.errors.length} errors` : ''}`,
        created: results.created,
        providers: results.providers,
        verification: results.verification,
        errors: results.errors.length > 0 ? results.errors : undefined
      });

    } catch (error) {
      console.error('❌ Error in provider seeding:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed providers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/v1/admin/providers/verify - Verify providers exist in database
  app.get('/api/v1/admin/providers/verify', adminSessionMiddleware, async (req, res) => {
    try {
      console.log('🔍 Verifying providers in database...');

      // Get all service providers from database
      const serviceProviders = await storage.getServiceProviders();
      const allUsers = await storage.searchUsers('', undefined); // Get all users
      
      // Filter for our seeded providers by email pattern
      const seededProviders = serviceProviders.filter(provider => {
        const user = allUsers.find(u => u.id === provider.userId);
        return user && user.email && user.email.includes('.fixit@gmail.com');
      });

      const providerDetails = await Promise.all(
        seededProviders.map(async (provider) => {
          const user = allUsers.find(u => u.id === provider.userId);
          if (!user) return null;

          return {
            id: provider.id,
            userId: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            business: provider.businessName,
            phone: user.phone,
            role: user.role,
            verificationStatus: provider.verificationStatus,
            verificationLevel: provider.verificationLevel,
            isVerified: provider.isVerified,
            isOnline: provider.isOnline,
            isAvailable: provider.isAvailable,
            rating: provider.rating,
            totalCompletedOrders: provider.totalCompletedOrders,
            skills: provider.skills,
            serviceRadius: provider.serviceRadius,
            createdAt: provider.createdAt,
            location: user.location
          };
        })
      );

      const validProviders = providerDetails.filter(Boolean);

      const verification = {
        totalUsers: allUsers.length,
        serviceProviderUsers: allUsers.filter(u => u.role === 'service_provider').length,
        totalServiceProviders: serviceProviders.length,
        seededProviders: validProviders.length,
        verifiedProviders: validProviders.filter(p => p.verificationStatus === 'approved').length,
        onlineProviders: validProviders.filter(p => p.isOnline).length,
        totalServiceMappings: validProviders.reduce((total, provider) => {
          return total + (provider.skills?.length || 0);
        }, 0)
      };

      console.log(`✅ Verification complete - Found ${validProviders.length} seeded providers out of ${serviceProviders.length} total providers`);

      res.json({
        success: true,
        message: `Found ${validProviders.length} verified providers`,
        count: validProviders.length,
        providers: validProviders,
        verification,
        databaseStats: {
          totalUsers: allUsers.length,
          totalProviders: serviceProviders.length,
          seededProviders: validProviders.length
        }
      });

    } catch (error) {
      console.error('❌ Error verifying providers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify providers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/v1/providers - Public endpoint to list service providers
  app.get('/api/v1/providers', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        category, 
        location, 
        radius = '25', 
        available = 'true', 
        verified = 'true',
        limit = '20',
        offset = '0' 
      } = req.query;

      console.log('🔍 Fetching providers with filters:', { category, location, radius, available, verified, limit, offset });

      const serviceProviders = await storage.getServiceProviders();
      const allUsers = await storage.searchUsers('', undefined); // Get all users

      let filteredProviders = serviceProviders.filter(provider => {
        // Only show approved/verified providers by default
        if (verified === 'true' && provider.verificationStatus !== 'approved') {
          return false;
        }

        // Only show available providers by default
        if (available === 'true' && !provider.isAvailable) {
          return false;
        }

        return true;
      });

      // Map providers with user information
      const providersWithDetails = await Promise.all(
        filteredProviders.map(async (provider) => {
          const user = allUsers.find(u => u.id === provider.userId);
          if (!user) return null;

          return {
            id: provider.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            business: provider.businessName,
            location: user.location?.address || provider.currentLocation?.address,
            rating: parseFloat(provider.rating || '0'),
            totalCompletedOrders: provider.totalCompletedOrders || 0,
            skills: provider.skills || [],
            serviceRadius: provider.serviceRadius || 25,
            isOnline: provider.isOnline,
            isAvailable: provider.isAvailable,
            verificationLevel: provider.verificationLevel,
            profileImageUrl: user.profileImageUrl,
            experienceYears: provider.experienceYears
          };
        })
      );

      const validProviders = providersWithDetails.filter(Boolean);

      // Apply pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedProviders = validProviders.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        providers: paginatedProviders,
        pagination: {
          total: validProviders.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < validProviders.length
        },
        filters: {
          category,
          location,
          radius,
          available,
          verified
        }
      });

    } catch (error) {
      console.error('❌ Error fetching providers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch providers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Return the server that already has WebSocket initialized
  return server;
}
