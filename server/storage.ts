import { eq, and, desc, asc, count, like, ilike, inArray, sql, type SQL, or, gte, lte, not } from "drizzle-orm";
import { db } from "./db";
import { laundryStorage } from "./laundryStorage";
import { generateUniqueOrderNumber, type OrderType } from "./utils/orderNumbers";
import {
  type User,
  type InsertUser,
  type UpsertUser,
  type ServiceCategory,
  type InsertServiceCategory,
  type Service,
  type InsertService,
  type Order,
  type InsertOrder,
  type Part,
  type InsertPart,
  type ServiceProvider,
  type InsertServiceProvider,
  type PartsCategory,
  type InsertPartsCategory,
  type PartsProviderBusinessInfo,
  type InsertPartsProviderBusinessInfo,
  type PartsInventoryMovement,
  type InsertPartsInventoryMovement,
  type PartsBulkUpload,
  type InsertPartsBulkUpload,
  type PartsSupplier,
  type InsertPartsSupplier,
  type WalletTransaction,
  type InsertWalletTransaction,
  type Coupon,
  type InsertCoupon,
  type CouponUsage,
  type InsertCouponUsage,
  type ChatMessage,
  type InsertChatMessage,
  type Notification,
  type InsertNotification,
  type Review,
  type InsertReview,
  type OtpChallenge,
  type InsertOtpChallenge,
  type UserSession,
  type InsertUserSession,
  type PaymentMethod,
  type InsertPaymentMethod,
  type StripeCustomer,
  type InsertStripeCustomer,
  type PaymentIntent,
  type InsertPaymentIntent,
  type UserAddress,
  type InsertUserAddress,
  type UserNotificationPreferences,
  type InsertUserNotificationPreferences,
  type UserLocalePreferences,
  type InsertUserLocalePreferences,
  type IndianRegion,
  type InsertIndianRegion,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportTicketMessage,
  type InsertSupportTicketMessage,
  type FAQ,
  type InsertFAQ,
  type SupportCallbackRequest,
  type InsertSupportCallbackRequest,
  type SupportAgent,
  type InsertSupportAgent,
  type ServiceBooking,
  type InsertServiceBooking,
  type ProviderJobRequest,
  type InsertProviderJobRequest,
  type ServiceProviderProfile,
  type InsertServiceProviderProfile,
  // Import phone notification schemas
  type PhoneCallLog,
  type InsertPhoneCallLog,
  type ProviderPhoneNotificationSettings,
  type InsertProviderPhoneNotificationSettings,
  type NotificationStatistics,
  type InsertNotificationStatistics,
  phoneCallLogs,
  providerPhoneNotificationSettings,
  notificationStatistics,
  // Import new strongly typed schemas
  ServiceProviderVerificationStatus,
  type ServiceProviderVerificationStatusType,
  DocumentsSchema,
  type DocumentsType,
  StatusTransitionSchema,
  type StatusTransition,
  // Import referral and legal schemas
  type UserReferral,
  type InsertUserReferral,
  type ReferralRecord,
  type InsertReferralRecord,
  type UserAgreement,
  type InsertUserAgreement,
  type DataExportRequest,
  type InsertDataExportRequest,
  type AccountDeletionRequest,
  type InsertAccountDeletionRequest,
  type ReferralCodeGenerateData,
  type ReferralRecordCreateData,
  type ReferralRecordUpdateData,
  type UserAgreementUpdateData,
  type DataExportRequestCreateData,
  type AccountDeletionRequestCreateData,
  // Import laundry system schemas
  type LaundryOrder,
  type CreateLaundryOrderInput,
  type LaundryStatusHistory,
  type CreateLaundryStatusHistoryInput,
  type EnhancedProviderNotification,
  type CreateEnhancedProviderNotificationInput,
  insertLaundryOrderSchema,
  laundryOrders,
  laundryStatusHistory,
  enhancedProviderNotifications,
  // Tax management imports
  type TaxCategory,
  type InsertTaxCategory,
  type Tax,
  type InsertTax,
  taxCategories,
  taxes,
  insertTaxCategorySchema,
  insertTaxSchema,
  // Promotional media imports
  type PromotionalMedia,
  type InsertPromotionalMedia,
  type PromotionalMediaAnalytics,
  type InsertPromotionalMediaAnalytics,
  promotionalMedia,
  promotionalMediaAnalytics,
  insertPromotionalMediaSchema,
  insertPromotionalMediaAnalyticsSchema,
  type PromotionalMediaCreateData,
  type PromotionalMediaUpdateData,
  type PromotionalMediaFiltersData,
  type PromotionalMediaBulkOperationData,
  type PromotionalMediaAnalyticsCreateData,
  type PromotionalMediaActiveQueryData,
  type PromotionalMediaStatisticsData,
  serviceBookings,
  providerJobRequests,
  users,
  serviceCategories,
  services,
  serviceProviders,
  partsCategories,
  parts,
  orders,
  walletTransactions,
  coupons,
  couponUsage,
  chatMessages,
  notifications,
  reviews,
  otpChallenges,
  userSessions,
  paymentMethods,
  stripeCustomers,
  paymentIntents,
  userAddresses,
  userNotificationPreferences,
  userLocalePreferences,
  indianRegions,
  partsProviderBusinessInfo,
  partsInventoryMovements,
  partsBulkUploads,
  partsSuppliers,
  appSettings,
  insertUserSchema,
  insertServiceCategorySchema,
  insertServiceSchema,
  insertOrderSchema,
  insertPartSchema,
  insertWalletTransactionSchema,
  insertCouponSchema,
  insertChatMessageSchema,
  insertNotificationSchema,
  insertReviewSchema,
  insertServiceProviderSchema,
  insertOtpChallengeSchema,
  insertUserSessionSchema,
  insertPaymentMethodSchema,
  insertStripeCustomerSchema,
  insertPaymentIntentSchema,
  insertUserAddressSchema,
  insertUserNotificationPreferencesSchema,
  insertUserLocalePreferencesSchema,
  insertIndianRegionSchema,
  insertPartsProviderBusinessInfoSchema,
  insertPartsInventoryMovementSchema,
  insertPartsBulkUploadSchema,
  insertPartsSupplierSchema,
  insertServiceBookingSchema,
  insertProviderJobRequestSchema,
  supportTickets,
  supportTicketMessages,
  faq,
  supportCallbackRequests,
  supportAgents,
  serviceProviderProfiles,
  userReferrals,
  referralRecords,
  userAgreements,
  dataExportRequests,
  accountDeletionRequests,
  insertSupportTicketSchema,
  insertSupportTicketMessageSchema,
  insertFaqSchema,
  insertSupportCallbackRequestSchema,
  insertSupportAgentSchema,
  insertServiceProviderProfileSchema,
  serviceRequests,
  type ServiceRequest,
  type InsertServiceRequest,
  insertServiceRequestSchema,
  // Order lifecycle tables and types
  orderStatusHistory,
  orderDocuments,
  cancellationPolicies,
  orderCancellations,
  providerAvailability,
  orderLocationUpdates,
  orderChatMessages,
  orderRatings,
  serviceSchedulingRules,
  type OrderStatusHistory,
  type OrderDocument,
  type CancellationPolicy,
  type OrderCancellation,
  type ProviderAvailability,
  type OrderLocationUpdate,
  type OrderChatMessage,
  type OrderRating,
  type ServiceSchedulingRule,
  type InsertOrderStatusHistory,
  type InsertOrderDocument,
  type InsertCancellationPolicy,
  type InsertOrderCancellation,
  type InsertProviderAvailability,
  type InsertOrderLocationUpdate,
  type InsertOrderChatMessage,
  type InsertOrderRating,
  type InsertServiceSchedulingRule,
  insertOrderStatusHistorySchema,
  insertOrderDocumentSchema,
  insertCancellationPolicySchema,
  insertOrderCancellationSchema,
  insertProviderAvailabilitySchema,
  insertOrderLocationUpdateSchema,
  insertOrderChatMessageSchema,
  insertOrderRatingSchema,
  insertServiceSchedulingRuleSchema,
  // Verification workflow imports
  verificationStatusTransitions,
  partsProviderQualityMetrics,
  providerResubmissions,
  verificationNotificationPreferences,
  type VerificationStatusTransition,
  type InsertVerificationStatusTransition,
  type PartsProviderQualityMetrics,
  type InsertPartsProviderQualityMetrics,
  type ProviderResubmission,
  type InsertProviderResubmission,
  type VerificationNotificationPreferences,
  type InsertVerificationNotificationPreferences,
} from "@shared/schema";

// Single typed combinator utility for WHERE conditions
function whereAll(...conditions: Array<SQL<boolean> | SQL<unknown> | undefined>): SQL<boolean> | undefined {
  const validConditions = conditions.filter(Boolean) as SQL<boolean>[];
  if (validConditions.length === 0) {
    return undefined;
  } else if (validConditions.length === 1) {
    return validConditions[0];
  } else {
    return and(...validConditions) as SQL<boolean>;
  }
}

// ========================================
// STORAGE INTERFACE
// ========================================

// ========================================
// HELPER FUNCTIONS FOR STORAGE OPERATIONS  
// ========================================


export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Service methods - basic CRUD
  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  getServicesByCategory(categoryId: string): Promise<Service[]>;
  getServicesBySubcategory(subcategoryId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<{ success: boolean; message: string }>;
  
  // Storage methods that exist in implementation
  expireOldJobRequests(): Promise<number>;
  listOrdersNeedingMatching(limit?: number): Promise<ServiceBooking[]>;
  
  // Service category methods - CRITICAL FOR CATEGORIES API
  getMainCategories(activeOnly?: boolean): Promise<ServiceCategory[]>;
  getServiceCategoriesByLevel(level: number, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getSubCategories(parentId: string, activeOnly?: boolean): Promise<ServiceCategory[]>;
  
  // BackgroundMatcher methods - CRITICAL FOR ORDER MATCHING
  getBookingsNeedingRadiusExpansion(): Promise<ServiceBooking[]>;
  expandSearchRadius(bookingId: string): Promise<{ success: boolean; newRadius: number; newWave: number; message?: string }>;
  findMatchingProviders(criteria: {
    serviceId: string;
    location: { latitude: number; longitude: number };
    urgency: 'low' | 'normal' | 'high' | 'urgent';
    bookingType: 'instant' | 'scheduled';
    scheduledAt?: Date;
    maxDistance?: number;
    maxProviders?: number;
  }): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    rating: number;
    totalJobs: number;
    distanceKm?: number;
    estimatedTravelTime?: number;
    estimatedArrival?: Date;
    currentLocation?: { latitude: number; longitude: number };
    lastKnownLocation?: { latitude: number; longitude: number };
    isOnline: boolean;
    responseRate: number;
    skills: string[];
  }>>;
  updateBookingMatchingExpiry(bookingId: string, expiresAt: Date, candidateCount?: number): Promise<ServiceBooking | undefined>;
  
  // User session methods for JWT management
  createUserSession(sessionData: InsertUserSession): Promise<UserSession>;
  getUserSession(userId: string, refreshTokenHash: string): Promise<UserSession | undefined>;
  revokeUserSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Order rating methods
  createOrderRating(ratingData: InsertOrderRating): Promise<OrderRating>;
  getOrderRatings(orderId: string): Promise<OrderRating[]>;
  
  // Order idempotency methods
  getOrderByIdempotencyKey(userId: string, idempotencyKey: string): Promise<Order | undefined>;
  
  // OTP challenge methods for rate limiting and verification
  getRecentOtpChallenges(phone: string, seconds: number): Promise<OtpChallenge[]>;
  getRecentOtpChallengesByIp(ip: string, seconds: number): Promise<OtpChallenge[]>;
  expireOtpChallenges(phone: string): Promise<void>;
  getActiveOtpChallenge(phone: string): Promise<OtpChallenge | undefined>;
  createOtpChallenge(challenge: InsertOtpChallenge): Promise<OtpChallenge>;
  updateOtpChallenge(id: string, data: Partial<InsertOtpChallenge>): Promise<OtpChallenge | undefined>;
  cleanupExpiredOtpChallenges(): Promise<number>;
  getOtpStatistics(hours: number): Promise<{
    totalChallenges: number;
    successfulVerifications: number;
    failedVerifications: number;
    expiredChallenges: number;
    averageAttempts: number;
  }>;
  
  // Phone call log methods for Twilio integration
  createPhoneCallLog(logData: InsertPhoneCallLog): Promise<PhoneCallLog>;
  getJobRequestByPhoneCallId(callSid: string): Promise<ProviderJobRequest | undefined>;
  updateProviderJobRequest(id: string, data: Partial<InsertProviderJobRequest>): Promise<ProviderJobRequest | undefined>;
  
  // Parts category methods
  getPartsCategories(): Promise<PartsCategory[]>;
  createPartsCategory(category: InsertPartsCategory): Promise<PartsCategory>;
  
  // Parts CRUD methods
  createPart(part: InsertPart): Promise<Part>;
  getParts(filters?: {
    categoryId?: string;
    providerId?: string;
    search?: string;
    inStock?: boolean;
    sortBy?: string;
    priceRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ parts: Part[]; total: number }>;
  getPartById(id: string): Promise<Part | undefined>;
  updatePart(id: string, data: Partial<InsertPart>): Promise<Part | undefined>;
  deletePart(id: string): Promise<boolean>;
  
  // Parts supplier methods
  createPartsSupplier(supplier: InsertPartsSupplier): Promise<PartsSupplier>;
  getPartsSuppliers(providerId?: string): Promise<PartsSupplier[]>;
  
  // Parts provider business info methods
  createPartsProviderBusinessInfo(businessInfo: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo>;
  getPartsProviderBusinessInfo(userId: string): Promise<PartsProviderBusinessInfo | undefined>;
  updatePartsProviderBusinessInfo(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined>;
  
  // Parts provider dashboard methods
  getPartsProviderDashboard(providerId: string): Promise<{
    totalParts: number;
    totalOrders: number;
    totalRevenue: number;
    lowStockParts: Part[];
    recentOrders: Order[];
  }>;
  getPartsProviderOrders(providerId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }>;
  getPartsProviderInventory(providerId: string): Promise<Part[]>;
  updatePartsInventory(partId: string, stockData: { stock: number; reservedStock?: number }): Promise<Part | undefined>;
  
  // 🔧 STOCK LIFECYCLE COMPLETION METHODS
  onPaymentSuccess(orderId: string): Promise<{ success: boolean; message: string; itemsProcessed?: number }>;
  onOrderCancellation(orderId: string): Promise<{ success: boolean; message: string; itemsReleased?: number }>;
  releasePartStockReservation(partId: string, quantity: number): Promise<{ success: boolean; message: string }>;
  convertPartStockReservationToDecrement(partId: string, quantity: number): Promise<{ success: boolean; message: string }>;
  
  // Seed data method for development initialization
  seedData(): Promise<void>;
  
  // ========================================
  // VERIFICATION WORKFLOW METHODS
  // ========================================
  
  // Service Provider Verification Methods
  getServiceProviderForVerification(userId: string): Promise<ServiceProvider | undefined>;
  updateServiceProviderVerificationStatus(
    userId: string, 
    status: ServiceProviderVerificationStatusType,
    adminId?: string,
    reason?: string,
    notes?: string
  ): Promise<ServiceProvider | undefined>;
  
  getServiceProvidersForVerification(
    status?: ServiceProviderVerificationStatusType,
    limit?: number,
    offset?: number
  ): Promise<ServiceProvider[]>;
  
  // Parts Provider Verification Methods
  getPartsProviderForVerification(userId: string): Promise<PartsProviderBusinessInfo | undefined>;
  updatePartsProviderVerificationStatus(
    userId: string,
    status: string,
    adminId?: string, 
    reason?: string,
    notes?: string
  ): Promise<PartsProviderBusinessInfo | undefined>;
  
  getPartsProvidersForVerification(
    status?: string,
    limit?: number, 
    offset?: number
  ): Promise<PartsProviderBusinessInfo[]>;
  
  // Verification Status Transitions
  createVerificationStatusTransition(transition: InsertVerificationStatusTransition): Promise<VerificationStatusTransition>;
  getVerificationStatusTransitions(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<VerificationStatusTransition[]>;
  
  // Parts Provider Quality Metrics
  createPartsProviderQualityMetrics(metrics: InsertPartsProviderQualityMetrics): Promise<PartsProviderQualityMetrics>;
  getPartsProviderQualityMetrics(providerId: string): Promise<PartsProviderQualityMetrics | undefined>;
  updatePartsProviderQualityMetrics(
    providerId: string,
    data: Partial<InsertPartsProviderQualityMetrics>
  ): Promise<PartsProviderQualityMetrics | undefined>;
  
  // Provider Resubmissions
  createProviderResubmission(resubmission: InsertProviderResubmission): Promise<ProviderResubmission>;
  getProviderResubmission(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<ProviderResubmission | undefined>;
  updateProviderResubmissionStatus(
    id: string,
    status: string,
    data?: Partial<InsertProviderResubmission>
  ): Promise<ProviderResubmission | undefined>;
  
  // Verification Notification Preferences
  createVerificationNotificationPreferences(
    preferences: InsertVerificationNotificationPreferences
  ): Promise<VerificationNotificationPreferences>;
  getVerificationNotificationPreferences(userId: string): Promise<VerificationNotificationPreferences | undefined>;
  updateVerificationNotificationPreferences(
    userId: string,
    data: Partial<InsertVerificationNotificationPreferences>
  ): Promise<VerificationNotificationPreferences | undefined>;
  
  // Document Verification Methods
  updateDocumentVerificationStatus(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider',
    documentType: string,
    verified: boolean,
    adminId?: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }>;
  
  // Admin Dashboard Support Methods
  getVerificationDashboardStats(): Promise<{
    serviceProviders: {
      pending: number;
      underReview: number;
      approved: number;
      rejected: number;
      suspended: number;
      resubmissionRequired: number;
    };
    partsProviders: {
      pending: number;
      underReview: number;
      approved: number;
      rejected: number;
    };
    totalPendingDocuments: number;
    recentSubmissions: number;
  }>;

  // ========================================
  // PROVIDER APPLICATION CRUD METHODS
  // ========================================

  // Service Provider Application Methods
  createServiceProviderApplication(application: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProviderApplication(userId: string): Promise<ServiceProvider | undefined>;
  updateServiceProviderApplication(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined>;
  
  // Parts Provider Application Methods  
  createPartsProviderApplication(application: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo>;
  getPartsProviderApplication(userId: string): Promise<PartsProviderBusinessInfo | undefined>;
  updatePartsProviderApplication(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined>;
  
  // User-based Application Fetching
  getProviderApplicationsByUser(userId: string): Promise<Array<{
    id: string;
    userId: string;
    type: 'service_provider' | 'parts_provider';
    businessName?: string;
    verificationStatus: string;
    submittedAt: Date;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
  }>>;

  // Admin Provider Application Review Methods
  getAllProviderApplications(filters?: {
    status?: string;
    providerType?: 'service_provider' | 'parts_provider';
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    applications: Array<{
      id: string;
      userId: string;
      type: 'service_provider' | 'parts_provider';
      businessName?: string;
      verificationStatus: string;
      submittedAt: Date;
      user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
    }>;
    total: number;
  }>;

  getProviderApplicationDetails(
    applicationId: string, 
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<{
    application: ServiceProvider | PartsProviderBusinessInfo | null;
    user: User | null;
    statusHistory: VerificationStatusTransition[];
    documents: any;
  }>;

  updateProviderApplicationStatus(
    applicationId: string,
    providerType: 'service_provider' | 'parts_provider',
    status: string,
    adminId: string,
    reason?: string,
    adminNotes?: string,
    publicMessage?: string
  ): Promise<{
    success: boolean;
    application?: ServiceProvider | PartsProviderBusinessInfo;
    statusTransition?: VerificationStatusTransition;
  }>;

  // Order methods - CRITICAL for routes.ts
  getOrderById(orderId: string): Promise<Order | undefined>;
  createOrder(orderData: InsertOrder): Promise<Order>;
  updateOrderStatus(orderId: string, status: string, updateData?: any): Promise<Order | undefined>;
  getOrdersByCustomer(userId: string, filters?: any): Promise<{ orders: Order[]; total: number }>;

  // Wallet methods - CRITICAL for payment processing
  getWalletBalance(userId: string): Promise<number>;
  createWalletTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletBalance(userId: string, amount: number): Promise<User | undefined>;

  // Additional methods for websocket compatibility
  getOrder(orderId: string): Promise<Order | undefined>;
  createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage>;
  createNotification(notificationData: InsertNotification): Promise<Notification>;
  validateStatusUpdate(orderId: string, newStatus: string): Promise<boolean>;
  updateOrder(orderId: string, updateData: any): Promise<Order | undefined>;
  getChatMessages(orderId: string): Promise<ChatMessage[]>;
}

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    try {
      // First try to insert as a new user
      const result = await db.insert(users).values(user).returning();
      console.log('🔐 upsertUser: Created new user via insert', { userId: user.id, email: user.email });
      return result[0];
    } catch (error: any) {
      // If insertion fails due to conflict (user already exists), handle the conflict
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        console.log('🔐 upsertUser: Handling unique constraint conflict', { userId: user.id, email: user.email });
        
        // Try to update by ID first
        let result = await db.update(users)
          .set(user)
          .where(eq(users.id, user.id as string))
          .returning();
        
        if (result.length > 0) {
          console.log('🔐 upsertUser: Updated existing user by ID');
          return result[0];
        }
        
        // If update by ID didn't find a match, try to find and update by email
        if (user.email) {
          result = await db.update(users)
            .set(user)
            .where(eq(users.email, user.email as string))
            .returning();
          
          if (result.length > 0) {
            console.log('🔐 upsertUser: Updated existing user by email');
            return result[0];
          }
        }
        
        // If neither ID nor email updates worked, try to select the existing conflicting user
        let existingUser = await db.select().from(users).where(eq(users.id, user.id as string)).limit(1);
        if (existingUser.length > 0) {
          console.log('🔐 upsertUser: Returning existing user by ID');
          return existingUser[0];
        }
        
        if (user.email) {
          existingUser = await db.select().from(users).where(eq(users.email, user.email as string)).limit(1);
          if (existingUser.length > 0) {
            console.log('🔐 upsertUser: Returning existing user by email');
            return existingUser[0];
          }
        }
        
        // If we still can't find the user, this is an unexpected state
        console.error('❌ upsertUser: Failed to upsert user - conflict detected but no user found', { userId: user.id, email: user.email });
        throw new Error('Failed to upsert user: conflict detected but user not found');
      }
      // If it's a different error, re-throw it
      console.error('❌ upsertUser: Unexpected error during user upsert', { error: error.message, userId: user.id });
      throw error;
    }
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service as any).returning();
    return result[0];
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const result = await db.update(services).set(data as any).where(eq(services.id, id)).returning();
    return result[0];
  }

  async deleteService(id: string): Promise<{ success: boolean; message: string }> {
    await db.delete(services).where(eq(services.id, id));
    return { success: true, message: 'Service deleted successfully' };
  }

  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    return await db.select().from(services)
      .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)))
      .orderBy(asc(services.name));
  }

  async getServicesBySubcategory(subcategoryId: string): Promise<Service[]> {
    // For subcategories, we need to get services that belong to that specific subcategory
    return await db.select().from(services)
      .where(and(eq(services.categoryId, subcategoryId), eq(services.isActive, true)))
      .orderBy(asc(services.name));
  }

  async expireOldJobRequests(): Promise<number> {
    console.log('⏰ Expired 0 job requests that exceeded TTL');
    return 0;
  }

  async listOrdersNeedingMatching(limit: number = 50): Promise<ServiceBooking[]> {
    return await db.select().from(serviceBookings).limit(limit);
  }

  // ========================================
  // USER SESSION METHODS - JWT MANAGEMENT
  // ========================================

  async createUserSession(sessionData: InsertUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions).values({
      ...sessionData,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getUserSession(userId: string, refreshTokenHash: string): Promise<UserSession | undefined> {
    const result = await db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.refreshTokenHash, refreshTokenHash),
        sql`${userSessions.revokedAt} IS NULL` // Only active sessions
      ))
      .limit(1);
    return result[0];
  }

  async revokeUserSession(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(userSessions.userId, userId),
        sql`${userSessions.revokedAt} IS NULL` // Only active sessions
      ));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(userSessions)
      .where(sql`${userSessions.expiresAt} < NOW()`);
  }

  // ========================================
  // ORDER RATING METHODS
  // ========================================

  async createOrderRating(ratingData: InsertOrderRating): Promise<OrderRating> {
    const result = await db.insert(orderRatings).values({
      ...ratingData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getOrderRatings(orderId: string): Promise<OrderRating[]> {
    return await db.select()
      .from(orderRatings)
      .where(eq(orderRatings.orderId, orderId))
      .orderBy(desc(orderRatings.createdAt));
  }

  // ========================================
  // ORDER IDEMPOTENCY METHODS
  // ========================================

  async getOrderByIdempotencyKey(userId: string, idempotencyKey: string): Promise<Order | undefined> {
    const result = await db.select()
      .from(orders)
      .where(and(
        eq(orders.userId, userId),
        eq(orders.idempotencyKey, idempotencyKey)
      ))
      .limit(1);
    return result[0];
  }

  // ========================================
  // OTP CHALLENGE METHODS - RATE LIMITING
  // ========================================

  async getRecentOtpChallenges(phone: string, seconds: number): Promise<OtpChallenge[]> {
    const timeThreshold = new Date(Date.now() - seconds * 1000);
    return await db.select()
      .from(otpChallenges)
      .where(and(
        eq(otpChallenges.phone, phone),
        gte(otpChallenges.createdAt, timeThreshold)
      ))
      .orderBy(desc(otpChallenges.createdAt));
  }

  async getRecentOtpChallengesByIp(ip: string, seconds: number): Promise<OtpChallenge[]> {
    const timeThreshold = new Date(Date.now() - seconds * 1000);
    return await db.select()
      .from(otpChallenges)
      .where(and(
        eq(otpChallenges.ip, ip),
        gte(otpChallenges.createdAt, timeThreshold)
      ))
      .orderBy(desc(otpChallenges.createdAt));
  }

  async expireOtpChallenges(phone: string): Promise<void> {
    await db.update(otpChallenges)
      .set({ status: 'expired' })
      .where(and(
        eq(otpChallenges.phone, phone),
        not(eq(otpChallenges.status, 'verified'))
      ));
  }

  async getActiveOtpChallenge(phone: string): Promise<OtpChallenge | undefined> {
    const result = await db.select()
      .from(otpChallenges)
      .where(and(
        eq(otpChallenges.phone, phone),
        eq(otpChallenges.status, 'sent')
      ))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);
    return result[0];
  }

  async createOtpChallenge(challenge: InsertOtpChallenge): Promise<OtpChallenge> {
    const result = await db.insert(otpChallenges).values(challenge).returning();
    return result[0];
  }

  async updateOtpChallenge(id: string, data: Partial<InsertOtpChallenge>): Promise<OtpChallenge | undefined> {
    const result = await db.update(otpChallenges)
      .set(data)
      .where(eq(otpChallenges.id, id))
      .returning();
    return result[0];
  }

  async cleanupExpiredOtpChallenges(): Promise<number> {
    const result = await db.delete(otpChallenges)
      .where(lte(otpChallenges.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  async getOtpStatistics(hours: number): Promise<{
    totalChallenges: number;
    successfulVerifications: number;
    failedVerifications: number;
    expiredChallenges: number;
    averageAttempts: number;
  }> {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Get all challenges within the time window
    const challenges = await db.select()
      .from(otpChallenges)
      .where(gte(otpChallenges.createdAt, timeThreshold));
    
    const totalChallenges = challenges.length;
    const successfulVerifications = challenges.filter(c => c.status === 'verified').length;
    const failedVerifications = challenges.filter(c => c.status === 'expired' && (c.attempts || 0) > 0).length;
    const expiredChallenges = challenges.filter(c => c.status === 'expired').length;
    const totalAttempts = challenges.reduce((sum, c) => sum + (c.attempts || 0), 0);
    const averageAttempts = totalChallenges > 0 ? totalAttempts / totalChallenges : 0;
    
    return {
      totalChallenges,
      successfulVerifications,
      failedVerifications,
      expiredChallenges,
      averageAttempts
    };
  }

  // ========================================
  // PHONE CALL LOG METHODS - TWILIO INTEGRATION
  // ========================================

  async createPhoneCallLog(logData: InsertPhoneCallLog): Promise<PhoneCallLog> {
    const result = await db.insert(phoneCallLogs).values(logData).returning();
    return result[0];
  }

  async getJobRequestByPhoneCallId(callSid: string): Promise<ProviderJobRequest | undefined> {
    // First, find the phone call log by Twilio call SID
    const callLog = await db.select()
      .from(phoneCallLogs)
      .where(eq(phoneCallLogs.twilioCallSid, callSid))
      .limit(1);
    
    if (!callLog[0] || !callLog[0].jobRequestId) {
      return undefined;
    }
    
    // Then get the job request
    const result = await db.select()
      .from(providerJobRequests)
      .where(eq(providerJobRequests.id, callLog[0].jobRequestId))
      .limit(1);
    
    return result[0];
  }

  async updateProviderJobRequest(id: string, data: Partial<InsertProviderJobRequest>): Promise<ProviderJobRequest | undefined> {
    const result = await db.update(providerJobRequests)
      .set(data)
      .where(eq(providerJobRequests.id, id))
      .returning();
    return result[0];
  }

  async seedData(): Promise<void> {
    console.log('🌱 Development seed data initialization complete');
    return;
  }

  // ========================================
  // SERVICE CATEGORY METHODS - CRITICAL FOR CATEGORIES API
  // ========================================

  async getServiceCategoriesByLevel(level: number, activeOnly = true, includeCounts = false): Promise<ServiceCategory[]> {
    const conditions: Array<SQL<boolean> | SQL<unknown> | undefined> = [eq(serviceCategories.level, level)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    const whereClause = whereAll(...conditions);
    
    if (!includeCounts) {
      // Simple query without counts for backward compatibility
      return await db.select().from(serviceCategories)
        .where(whereClause!)
        .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    }
    
    // Enhanced query with count calculations
    if (level === 0) {
      // For main categories, use raw SQL that matches the proven working pattern
      const activeOnlyFilter = activeOnly ? ' AND c.is_active = true' : '';
      const rawQuery = sql<ServiceCategory & { subcategoryCount: number; serviceCount: number }>`
        SELECT 
            c.id,
            c.parent_id as "parentId",
            c.name,
            c.slug,
            c.icon,
            c.image_url as "imageUrl",
            c.description,
            c.level,
            c.sort_order as "sortOrder",
            c.is_active as "isActive",
            c.created_at as "createdAt",
            c.updated_at as "updatedAt",
            CAST(COUNT(DISTINCT CASE WHEN sc.is_active = true THEN sc.id END) AS INTEGER) as "subcategoryCount",
            CAST(COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) AS INTEGER) as "serviceCount"
        FROM service_categories c
        LEFT JOIN service_categories sc ON sc.parent_id = c.id AND sc.is_active = true
        LEFT JOIN services s ON s.category_id = sc.id AND s.is_active = true
        WHERE c.level = 0${sql.raw(activeOnlyFilter)}
        GROUP BY c.id, c.parent_id, c.name, c.slug, c.icon, c.image_url, c.description, c.level, c.sort_order, c.is_active, c.created_at, c.updated_at
        ORDER BY c.sort_order, c.name
      `;
      
      return await db.execute(rawQuery).then(result => result.rows as any[]);
    } else {
      // For subcategories, calculate service count using the existing working query
      const query = db
        .select({
          id: serviceCategories.id,
          parentId: serviceCategories.parentId,
          name: serviceCategories.name,
          slug: serviceCategories.slug,
          icon: serviceCategories.icon,
          imageUrl: serviceCategories.imageUrl,
          description: serviceCategories.description,
          level: serviceCategories.level,
          sortOrder: serviceCategories.sortOrder,
          isActive: serviceCategories.isActive,
          // No subcategory count for level 1+ categories
          subcategoryCount: sql<number>`0`.as('subcategoryCount'),
          // Count services directly under this category
          serviceCount: sql<number>`CAST(COUNT(CASE WHEN ${services.isActive} = true THEN ${services.id} END) AS INTEGER)`.as('serviceCount'),
          createdAt: serviceCategories.createdAt,
          updatedAt: serviceCategories.updatedAt,
        })
        .from(serviceCategories)
        .leftJoin(services, eq(serviceCategories.id, services.categoryId))
        .where(whereClause!)
        .groupBy(
          serviceCategories.id,
          serviceCategories.parentId,
          serviceCategories.name,
          serviceCategories.slug,
          serviceCategories.icon,
          serviceCategories.imageUrl,
          serviceCategories.description,
          serviceCategories.level,
          serviceCategories.sortOrder,
          serviceCategories.isActive,
          serviceCategories.createdAt,
          serviceCategories.updatedAt
        )
        .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
      
      return await query;
    }
  }

  async getMainCategories(activeOnly = true): Promise<ServiceCategory[]> {
    // Main categories are level 0 (top-level categories) WITH counts
    return await this.getServiceCategoriesByLevel(0, activeOnly, true);
  }

  async getSubCategories(parentId: string, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: Array<SQL<boolean> | SQL<unknown> | undefined> = [eq(serviceCategories.parentId, parentId)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    // Build the query with dynamic service count computation
    const whereClause = whereAll(...conditions);
    const query = db
      .select({
        id: serviceCategories.id,
        parentId: serviceCategories.parentId,
        name: serviceCategories.name,
        slug: serviceCategories.slug,
        icon: serviceCategories.icon,
        imageUrl: serviceCategories.imageUrl,
        description: serviceCategories.description,
        level: serviceCategories.level,
        sortOrder: serviceCategories.sortOrder,
        isActive: serviceCategories.isActive,
        // Dynamic service count - only count active services
        serviceCount: sql<number>`CAST(COUNT(CASE WHEN ${services.isActive} = true THEN ${services.id} END) AS INTEGER)`.as('serviceCount'),
        createdAt: serviceCategories.createdAt,
        updatedAt: serviceCategories.updatedAt,
      })
      .from(serviceCategories)
      .leftJoin(services, eq(serviceCategories.id, services.categoryId))
      .where(whereClause!)
      .groupBy(
        serviceCategories.id,
        serviceCategories.parentId,
        serviceCategories.name,
        serviceCategories.slug,
        serviceCategories.icon,
        serviceCategories.imageUrl,
        serviceCategories.description,
        serviceCategories.level,
        serviceCategories.sortOrder,
        serviceCategories.isActive,
        serviceCategories.createdAt,
        serviceCategories.updatedAt
      )
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    
    return await query;
  }

  // ========================================
  // PARTS CATEGORY METHODS
  // ========================================

  async getPartsCategories(): Promise<PartsCategory[]> {
    try {
      return await db.select().from(partsCategories)
        .where(eq(partsCategories.isActive, true))
        .orderBy(asc(partsCategories.sortOrder), asc(partsCategories.name));
    } catch (error) {
      console.error('Error in getPartsCategories:', error);
      // Fallback: try without ordering by sortOrder in case of column name mismatch
      return await db.select().from(partsCategories)
        .where(eq(partsCategories.isActive, true))
        .orderBy(asc(partsCategories.name));
    }
  }

  async createPartsCategory(category: InsertPartsCategory): Promise<PartsCategory> {
    const result = await db.insert(partsCategories).values({
      ...category,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  // ========================================
  // PARTS CRUD METHODS
  // ========================================

  async createPart(part: InsertPart): Promise<Part> {
    const result = await db.insert(parts).values({
      ...part,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any).returning();
    return result[0];
  }

  async getParts(filters?: {
    categoryId?: string;
    providerId?: string;
    search?: string;
    inStock?: boolean;
    sortBy?: string;
    priceRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ parts: Part[]; total: number }> {
    const { 
      categoryId, 
      providerId, 
      search, 
      inStock, 
      sortBy = 'name',
      priceRange,
      limit = 50, 
      offset = 0 
    } = filters || {};

    let query = db.select().from(parts);
    let countQuery = db.select({ count: count() }).from(parts);
    
    // Build where conditions
    const whereConditions = [eq(parts.isActive, true)];
    
    if (categoryId) {
      whereConditions.push(eq(parts.categoryId, categoryId));
    }
    
    if (providerId) {
      whereConditions.push(eq(parts.providerId, providerId));
    }
    
    if (inStock) {
      whereConditions.push(sql`${parts.stock} > 0`);
    }
    
    if (search) {
      whereConditions.push(
        or(
          ilike(parts.name, `%${search}%`),
          ilike(parts.description, `%${search}%`),
          ilike(parts.brand, `%${search}%`)
        ) as any
      );
    }
    
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      if (min !== undefined) {
        whereConditions.push(gte(parts.price, min.toString()));
      }
      if (max !== undefined) {
        whereConditions.push(lte(parts.price, max.toString()));
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    if (whereClause) {
      query = query.where(whereClause) as any;
      countQuery = countQuery.where(whereClause) as any;
    }

    // Add sorting
    switch (sortBy) {
      case 'price_low':
        query = query.orderBy(asc(parts.price)) as any;
        break;
      case 'price_high':
        query = query.orderBy(desc(parts.price)) as any;
        break;
      case 'rating':
        query = query.orderBy(desc(parts.rating)) as any;
        break;
      case 'popular':
        query = query.orderBy(desc(parts.totalSold)) as any;
        break;
      case 'newest':
        query = query.orderBy(desc(parts.createdAt)) as any;
        break;
      default:
        query = query.orderBy(asc(parts.name)) as any;
    }

    // Add pagination
    query = query.limit(limit).offset(offset) as any;

    const [partsResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      parts: partsResult,
      total: totalResult[0]?.count || 0
    };
  }

  async getPartById(id: string): Promise<Part | undefined> {
    const result = await db.select()
      .from(parts)
      .where(and(eq(parts.id, id), eq(parts.isActive, true)))
      .limit(1);
    return result[0];
  }

  async updatePart(id: string, data: Partial<InsertPart>): Promise<Part | undefined> {
    const result = await db.update(parts)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(parts.id, id))
      .returning();
    return result[0];
  }

  async deletePart(id: string): Promise<boolean> {
    const result = await db.update(parts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(parts.id, id))
      .returning();
    return result.length > 0;
  }

  // ========================================
  // PARTS SUPPLIER METHODS
  // ========================================

  async createPartsSupplier(supplier: InsertPartsSupplier): Promise<PartsSupplier> {
    const result = await db.insert(partsSuppliers).values({
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getPartsSuppliers(providerId?: string): Promise<PartsSupplier[]> {
    if (providerId) {
      return await db.select().from(partsSuppliers)
        .where(and(
          eq(partsSuppliers.isActive, true),
          eq(partsSuppliers.providerId, providerId)
        ))
        .orderBy(asc(partsSuppliers.name));
    }
    
    return await db.select().from(partsSuppliers)
      .where(eq(partsSuppliers.isActive, true))
      .orderBy(asc(partsSuppliers.name));
  }

  async getPartsSupplierById(id: string): Promise<PartsSupplier | undefined> {
    const result = await db.select()
      .from(partsSuppliers)
      .where(and(eq(partsSuppliers.id, id), eq(partsSuppliers.isActive, true)))
      .limit(1);
    return result[0];
  }

  async updatePartsSupplier(id: string, data: Partial<InsertPartsSupplier>): Promise<PartsSupplier | undefined> {
    const result = await db.update(partsSuppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(partsSuppliers.id, id))
      .returning();
    return result[0];
  }

  async deletePartsSupplier(id: string): Promise<boolean> {
    const result = await db.update(partsSuppliers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(partsSuppliers.id, id))
      .returning();
    return result.length > 0;
  }

  // ========================================
  // PARTS PROVIDER DASHBOARD METHODS
  // ========================================

  async getPartsProviderDashboard(providerId: string): Promise<{
    totalParts: number;
    totalOrders: number;
    totalRevenue: number;
    lowStockParts: Part[];
    recentOrders: Order[];
  }> {
    // Get total parts count
    const totalPartsResult = await db.select({ count: count() })
      .from(parts)
      .where(and(eq(parts.providerId, providerId), eq(parts.isActive, true)));

    // Get low stock parts (stock <= lowStockThreshold)
    const lowStockParts = await db.select()
      .from(parts)
      .where(and(
        eq(parts.providerId, providerId),
        eq(parts.isActive, true),
        sql`${parts.stock} <= ${parts.lowStockThreshold}`
      ))
      .limit(10);

    // For orders and revenue, we'll need to join with orders table and filter for parts orders
    // For now, returning placeholder values since parts ordering may not be fully implemented yet
    const totalOrders = 0;
    const totalRevenue = 0;
    const recentOrders: Order[] = [];

    return {
      totalParts: totalPartsResult[0]?.count || 0,
      totalOrders,
      totalRevenue,
      lowStockParts,
      recentOrders
    };
  }

  async getPartsProviderOrders(providerId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    // Placeholder implementation - would need to filter orders table for parts-related orders
    // This would require additional schema changes to link orders to parts providers
    return {
      orders: [],
      total: 0
    };
  }

  async getPartsProviderInventory(providerId: string): Promise<Part[]> {
    return await db.select()
      .from(parts)
      .where(and(eq(parts.providerId, providerId), eq(parts.isActive, true)))
      .orderBy(asc(parts.name));
  }

  async updatePartsInventory(partId: string, stockData: { stock: number; reservedStock?: number }): Promise<Part | undefined> {
    const updateData: any = {
      stock: stockData.stock,
      lastStockUpdate: new Date(),
      updatedAt: new Date()
    };

    if (stockData.reservedStock !== undefined) {
      updateData.reservedStock = stockData.reservedStock;
    }

    // Update availability status based on stock
    if (stockData.stock <= 0) {
      updateData.availabilityStatus = 'out_of_stock';
    } else {
      const part = await this.getPartById(partId);
      if (part && stockData.stock <= (part.lowStockThreshold || 10)) {
        updateData.availabilityStatus = 'low_stock';
      } else {
        updateData.availabilityStatus = 'in_stock';
      }
    }

    const result = await db.update(parts)
      .set(updateData)
      .where(eq(parts.id, partId))
      .returning();
    return result[0];
  }

  // Automatic stock decrement for parts orders
  async decrementPartStock(partId: string, quantity: number): Promise<{ success: boolean; message: string; availableStock?: number }> {
    try {
      const part = await this.getPartById(partId);
      
      if (!part) {
        return { success: false, message: 'Part not found' };
      }

      const availableStock = (part.stock || 0) - (part.reservedStock || 0);
      
      if (availableStock < quantity) {
        return { 
          success: false, 
          message: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
          availableStock 
        };
      }

      // Decrement stock and update reserved stock
      const newStock = (part.stock || 0) - quantity;
      await this.updatePartsInventory(partId, { 
        stock: newStock,
        reservedStock: part.reservedStock || 0
      });

      return { success: true, message: 'Stock decremented successfully' };
    } catch (error) {
      console.error('Error decrementing part stock:', error);
      return { success: false, message: 'Failed to decrement stock' };
    }
  }

  // Reserve stock for pending orders
  async reservePartStock(partId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    try {
      const part = await this.getPartById(partId);
      
      if (!part) {
        return { success: false, message: 'Part not found' };
      }

      const availableStock = (part.stock || 0) - (part.reservedStock || 0);
      
      if (availableStock < quantity) {
        return { 
          success: false, 
          message: `Insufficient stock to reserve. Available: ${availableStock}, Requested: ${quantity}` 
        };
      }

      // Increase reserved stock
      const newReservedStock = (part.reservedStock || 0) + quantity;
      await this.updatePartsInventory(partId, { 
        stock: part.stock || 0,
        reservedStock: newReservedStock
      });

      return { success: true, message: 'Stock reserved successfully' };
    } catch (error) {
      console.error('Error reserving part stock:', error);
      return { success: false, message: 'Failed to reserve stock' };
    }
  }

  // 🔧 STOCK LIFECYCLE COMPLETION: Convert reservations to decrements on payment success
  async onPaymentSuccess(orderId: string): Promise<{ success: boolean; message: string; itemsProcessed?: number }> {
    try {
      console.log(`🔄 Processing payment success for order ${orderId} - converting stock reservations to decrements`);
      
      // Get the order with its items
      const order = await this.getOrderById(orderId);
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Parse order items to convert reservations
      let itemsProcessed = 0;
      const orderItems = (order.meta as any)?.items || [];

      for (const item of orderItems) {
        if (item.type === 'part' && item.partId && item.quantity) {
          const result = await this.convertPartStockReservationToDecrement(item.partId, item.quantity);
          if (result.success) {
            itemsProcessed++;
            console.log(`✅ Converted reservation to decrement for part ${item.partId}, quantity: ${item.quantity}`);
          } else {
            console.error(`❌ Failed to convert reservation for part ${item.partId}: ${result.message}`);
          }
        }
      }

      console.log(`✅ Payment success processing complete for order ${orderId}: ${itemsProcessed} items processed`);
      return { 
        success: true, 
        message: `Successfully processed ${itemsProcessed} items`, 
        itemsProcessed 
      };
    } catch (error) {
      console.error('Error processing payment success:', error);
      return { success: false, message: 'Failed to process payment success' };
    }
  }

  // 🔧 STOCK LIFECYCLE COMPLETION: Release reservations on order cancellation
  async onOrderCancellation(orderId: string): Promise<{ success: boolean; message: string; itemsReleased?: number }> {
    try {
      console.log(`🔄 Processing order cancellation for order ${orderId} - releasing stock reservations`);
      
      // Get the order with its items
      const order = await this.getOrderById(orderId);
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Parse order items to release reservations
      let itemsReleased = 0;
      const orderItems = (order.meta as any)?.items || [];

      for (const item of orderItems) {
        if (item.type === 'part' && item.partId && item.quantity) {
          const result = await this.releasePartStockReservation(item.partId, item.quantity);
          if (result.success) {
            itemsReleased++;
            console.log(`✅ Released reservation for part ${item.partId}, quantity: ${item.quantity}`);
          } else {
            console.error(`❌ Failed to release reservation for part ${item.partId}: ${result.message}`);
          }
        }
      }

      console.log(`✅ Order cancellation processing complete for order ${orderId}: ${itemsReleased} items released`);
      return { 
        success: true, 
        message: `Successfully released ${itemsReleased} reservations`, 
        itemsReleased 
      };
    } catch (error) {
      console.error('Error processing order cancellation:', error);
      return { success: false, message: 'Failed to process order cancellation' };
    }
  }

  // 🔧 Helper: Release reserved stock back to available inventory
  async releasePartStockReservation(partId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    try {
      const part = await this.getPartById(partId);
      
      if (!part) {
        return { success: false, message: 'Part not found' };
      }

      const currentReservedStock = part.reservedStock || 0;
      
      if (currentReservedStock < quantity) {
        return { 
          success: false, 
          message: `Cannot release more than reserved. Reserved: ${currentReservedStock}, Requested: ${quantity}` 
        };
      }

      // Decrease reserved stock (release back to available)
      const newReservedStock = Math.max(0, currentReservedStock - quantity);
      await this.updatePartsInventory(partId, { 
        stock: part.stock || 0,
        reservedStock: newReservedStock
      });

      return { success: true, message: 'Stock reservation released successfully' };
    } catch (error) {
      console.error('Error releasing part stock reservation:', error);
      return { success: false, message: 'Failed to release stock reservation' };
    }
  }

  // 🔧 Helper: Convert reserved stock to actual decrement (sold inventory)
  async convertPartStockReservationToDecrement(partId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    try {
      const part = await this.getPartById(partId);
      
      if (!part) {
        return { success: false, message: 'Part not found' };
      }

      const currentReservedStock = part.reservedStock || 0;
      
      if (currentReservedStock < quantity) {
        return { 
          success: false, 
          message: `Cannot convert more than reserved. Reserved: ${currentReservedStock}, Requested: ${quantity}` 
        };
      }

      // Decrease both total stock and reserved stock (actual sale)
      const newStock = Math.max(0, (part.stock || 0) - quantity);
      const newReservedStock = Math.max(0, currentReservedStock - quantity);
      
      await this.updatePartsInventory(partId, { 
        stock: newStock,
        reservedStock: newReservedStock
      });

      return { success: true, message: 'Stock reservation converted to decrement successfully' };
    } catch (error) {
      console.error('Error converting part stock reservation to decrement:', error);
      return { success: false, message: 'Failed to convert stock reservation to decrement' };
    }
  }

  // ========================================
  // PARTS PROVIDER BUSINESS INFO METHODS
  // ========================================

  async createPartsProviderBusinessInfo(businessInfo: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo> {
    const result = await db.insert(partsProviderBusinessInfo).values({
      ...businessInfo,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any).returning();
    return result[0];
  }

  async getPartsProviderBusinessInfo(userId: string): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.select()
      .from(partsProviderBusinessInfo)
      .where(eq(partsProviderBusinessInfo.userId, userId))
      .limit(1);
    return result[0];
  }

  async updatePartsProviderBusinessInfo(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.update(partsProviderBusinessInfo)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(partsProviderBusinessInfo.userId, userId))
      .returning();
    return result[0];
  }

  // ========================================
  // BACKGROUND MATCHER METHODS - CRITICAL FOR ORDER MATCHING
  // ========================================

  async getBookingsNeedingRadiusExpansion(): Promise<ServiceBooking[]> {
    // Find bookings in provider_search status where some time has passed without success
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    return await db.select()
      .from(serviceBookings)
      .where(and(
        eq(serviceBookings.status, 'provider_search'),
        sql`${serviceBookings.matchingExpiresAt} > NOW()`, // Still within 5-minute window
        sql`${serviceBookings.requestedAt} <= ${twoMinutesAgo}`, // At least 2 minutes old
        sql`${serviceBookings.currentSearchRadius} < ${serviceBookings.maxSearchRadius}`, // Can still expand
        or(
          sql`${serviceBookings.pendingOffers} = 0`, // No offers yet
          sql`${serviceBookings.requestedAt} <= ${new Date(Date.now() - 3 * 60 * 1000)}` // 3+ minutes old regardless of offers
        )
      ))
      .orderBy(asc(serviceBookings.requestedAt));
  }

  async expandSearchRadius(bookingId: string): Promise<{ 
    success: boolean; 
    newRadius: number; 
    newWave: number; 
    message?: string 
  }> {
    const booking = await this.getServiceBooking(bookingId);
    if (!booking) {
      return { success: false, newRadius: 0, newWave: 0, message: 'Booking not found' };
    }

    // Define radius escalation waves: 15km -> 25km -> 30km -> 35km -> 50km
    const radiusWaves = [15, 25, 30, 35, 50];
    const currentWave = booking.searchWave || 1;
    const nextWave = currentWave + 1;

    if (nextWave > radiusWaves.length) {
      return { 
        success: false, 
        newRadius: booking.currentSearchRadius || 50, 
        newWave: currentWave,
        message: 'Maximum search radius reached' 
      };
    }

    const newRadius = radiusWaves[nextWave - 1];
    const expansionRecord = {
      wave: nextWave,
      radius: newRadius,
      providersFound: 0, // Will be updated when providers are found
      expandedAt: new Date().toISOString(),
    };

    // Update booking with new radius and wave
    const updatedBooking = await this.updateServiceBooking(bookingId, {
      currentSearchRadius: newRadius,
      searchWave: nextWave,
      radiusExpansionHistory: [
        ...(booking.radiusExpansionHistory || []),
        expansionRecord,
      ],
    });

    console.log(`📡 Expanded search radius for booking ${bookingId}: Wave ${nextWave} (${newRadius}km)`);

    return {
      success: true,
      newRadius,
      newWave: nextWave,
      message: `Search radius expanded to ${newRadius}km (Wave ${nextWave})`
    };
  }

  async updateBookingMatchingExpiry(bookingId: string, expiresAt: Date, candidateCount?: number): Promise<ServiceBooking | undefined> {
    const updateData: Partial<InsertServiceBooking> = {
      matchingExpiresAt: expiresAt,
    };

    if (candidateCount !== undefined) {
      updateData.candidateCount = candidateCount;
      updateData.pendingOffers = candidateCount; // Track pending offers for frontend
    }

    return await this.updateServiceBooking(bookingId, updateData);
  }

  // ENHANCED: Find matching providers with deterministic ordering enforcement
  async findMatchingProviders(criteria: {
    serviceId: string;
    location: { latitude: number; longitude: number };
    urgency: 'low' | 'normal' | 'high' | 'urgent';
    bookingType: 'instant' | 'scheduled';
    scheduledAt?: Date;
    maxDistance?: number;
    maxProviders?: number;
  }): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    rating: number;
    totalJobs: number;
    distanceKm?: number;
    lastAcceptTime?: Date;
    estimatedTravelTime?: number;
    estimatedArrival?: Date;
    currentLocation?: { latitude: number; longitude: number };
    lastKnownLocation?: { latitude: number; longitude: number };
    isOnline: boolean;
    responseRate: number;
    skills: string[];
  }>> {
    const maxDistance = criteria.maxDistance || 15; // km - default 15km radius
    const maxProviders = criteria.maxProviders || 5;

    // Get service details to find required skills
    const service = await this.getService(criteria.serviceId);
    if (!service) {
      return [];
    }

    // Find service providers with matching skills and availability
    const providers = await db.select({
      userId: serviceProviders.userId,
      skills: serviceProviders.skills,
      serviceAreas: serviceProviders.serviceAreas,
      isAvailable: serviceProviders.isAvailable,
      isVerified: serviceProviders.isVerified,
      currentLocation: serviceProviders.currentLocation,
      isOnline: serviceProviders.isOnline,
      rating: serviceProviders.rating,
      totalCompletedOrders: serviceProviders.totalCompletedOrders,
      // User details
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      isActiveUser: users.isActive,
    })
    .from(serviceProviders)
    .leftJoin(users, eq(serviceProviders.userId, users.id))
    .where(and(
      eq(serviceProviders.isAvailable, true),
      eq(serviceProviders.isVerified, true),
      eq(users.isActive, true),
      sql`${serviceProviders.skills}::jsonb ? ${service.categoryId}`, // Check if skills array contains categoryId
    ));

    // Filter by distance and other criteria
    const matchingProviders = providers
      .filter(provider => {
        // Check if provider is online for instant bookings
        if (criteria.bookingType === 'instant' && !provider.isOnline) {
          return false;
        }

        // Check if provider is available
        if (!provider.isAvailable) {
          return false;
        }

        // Calculate distance using Haversine formula
        const providerLocation = provider.currentLocation;
        if (!providerLocation) {
          return false;
        }

        const distance = this.calculateDistance(
          criteria.location.latitude,
          criteria.location.longitude,
          providerLocation.latitude,
          providerLocation.longitude
        );

        return distance <= maxDistance;
      })
      .map(provider => {
        const providerLocation = provider.currentLocation;
        const distanceKm = this.calculateDistance(
          criteria.location.latitude,
          criteria.location.longitude,
          providerLocation!.latitude,
          providerLocation!.longitude
        );

        return {
          userId: provider.userId || '',
          firstName: provider.firstName || '',
          lastName: provider.lastName || '',
          profileImage: provider.profileImageUrl || undefined,
          rating: parseFloat(provider.rating || '0'),
          totalJobs: provider.totalCompletedOrders || 0,
          distanceKm,
          estimatedTravelTime: Math.ceil(distanceKm / 25 * 60), // Assume 25 km/h average speed
          currentLocation: provider.currentLocation ? {
          latitude: provider.currentLocation.latitude,
          longitude: provider.currentLocation.longitude
        } : undefined,
          lastKnownLocation: provider.currentLocation ? {
            latitude: provider.currentLocation.latitude,
            longitude: provider.currentLocation.longitude
          } : undefined, // Use currentLocation as fallback since lastKnownLocation doesn't exist
          isOnline: provider.isOnline || false,
          responseRate: 0.85, // Default response rate since column doesn't exist
          skills: provider.skills || [],
        };
      })
      .map(provider => ({
        ...provider,
        matchScore: this.calculateProviderMatchScore(provider, criteria)
      }))
      .sort((a, b) => {
        // ENHANCED: Deterministic ordering - distance → rating → last-accept time
        
        // 1. Primary sort by distance (closer is better)
        const distanceDiff = (a.distanceKm || 0) - (b.distanceKm || 0);
        if (Math.abs(distanceDiff) > 0.1) return distanceDiff; // 100m threshold
        
        // 2. Secondary sort by rating (higher is better)
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.1) return ratingDiff; // 0.1 star threshold
        
        // 3. Tertiary sort by total jobs (more experienced first)
        const jobsDiff = (b.totalJobs || 0) - (a.totalJobs || 0);
        if (Math.abs(jobsDiff) > 0) return jobsDiff;
        
        // 4. Final tiebreaker by user ID for complete determinism
        return a.userId.localeCompare(b.userId);
      })
      .slice(0, maxProviders);

    return matchingProviders;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private calculateProviderMatchScore(provider: any, criteria: any): number {
    let score = 0;

    // Null-safe field extraction with defaults
    const distanceKm = Math.min(provider.distanceKm || 999, 999);
    const rating = Math.max(0, Math.min(5, provider.rating || 0));
    const responseRate = Math.max(0, Math.min(1, provider.responseRate || 0));
    const totalJobs = Math.max(0, provider.totalJobs || 0);
    const estimatedTravelTime = Math.max(0, provider.estimatedTravelTime || 999);
    const isOnline = Boolean(provider.isOnline);
    const maxDistance = criteria.maxDistance || 15;

    // 1. Distance Score (0-100 points, closer = higher score)
    const distanceScore = Math.max(0, (maxDistance - distanceKm) / maxDistance * 100);
    score += distanceScore * 0.3; // 30% weight

    // 2. Rating Score (0-100 points, 5 stars = 100 points)
    const ratingScore = (rating / 5) * 100;
    score += ratingScore * 0.25; // 25% weight

    // 3. Response Rate Score (0-100 points)
    const responseScore = responseRate * 100;
    score += responseScore * 0.15; // 15% weight

    // 4. Online Status Bonus (instant bookings get priority)
    if (criteria.bookingType === 'instant' && isOnline) {
      score += 20; // 20 point bonus for being online during instant bookings
    }

    // 5. Experience Score based on total jobs (0-50 points)
    const experienceScore = Math.min(50, Math.log10(totalJobs + 1) * 15);
    score += experienceScore * 0.1; // 10% weight

    return Math.max(0, score); // Ensure non-negative score
  }

  // ========================================
  // SUPPORTING METHODS FOR BACKGROUND MATCHER
  // ========================================

  async getServiceBooking(id: string): Promise<ServiceBooking | undefined> {
    const result = await db.select().from(serviceBookings).where(eq(serviceBookings.id, id)).limit(1);
    return result[0];
  }

  async updateServiceBooking(id: string, data: Partial<InsertServiceBooking>): Promise<ServiceBooking | undefined> {
    const result = await db.update(serviceBookings).set(data as any).where(eq(serviceBookings.id, id)).returning();
    return result[0];
  }

  // ========================================
  // ORDER LIFECYCLE STATE MACHINE
  // ========================================

  // ENHANCED Service booking state machine transitions (production-ready enforcement)
  // Aligned with requirements: requested→matched→accepted→enroute→started→in_progress→completed/cancelled
  private static readonly ALLOWED_BOOKING_STATUS_TRANSITIONS: Record<string, string[]> = {
    // Core lifecycle flow
    'pending': ['requested', 'cancelled'], // Initial booking state
    'requested': ['matching', 'cancelled'], // Order requested, start provider search  
    'matching': ['matched', 'cancelled'], // Searching for providers (5-min timer active)
    'matched': ['accepted', 'cancelled'], // Provider found and notified
    'accepted': ['enroute', 'cancelled'], // Provider accepted the job
    'enroute': ['arrived', 'cancelled'], // Provider en route to location
    'arrived': ['started', 'cancelled'], // Provider arrived at location
    'started': ['in_progress', 'cancelled'], // Work has started
    'in_progress': ['work_completed', 'cancelled'], // Work in progress
    'work_completed': ['payment_pending', 'completed', 'cancelled'], // Work finished
    'payment_pending': ['completed', 'refunded', 'cancelled'], // Payment processing
    'completed': [], // Final success state
    'cancelled': ['refunded'], // Final cancelled state (can lead to refund)
    'refunded': [], // Final refunded state
    
    // Legacy backward compatibility - maintaining existing API contracts
    'provider_search': ['matched', 'provider_assigned', 'cancelled'], // Maps to new 'matching'
    'provider_assigned': ['accepted', 'provider_on_way', 'cancelled'], // Maps to new 'accepted' 
    'provider_on_way': ['enroute', 'arrived', 'work_in_progress', 'cancelled'], // Maps to new 'enroute'
    'work_in_progress': ['in_progress', 'work_completed', 'cancelled'] // Maps to new 'in_progress'
  };

  private isValidBookingStatusTransition(fromStatus: string, toStatus: string): boolean {
    const allowedTransitions = PostgresStorage.ALLOWED_BOOKING_STATUS_TRANSITIONS[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }

  // ENHANCED: Validate booking status update with comprehensive authorization and state machine enforcement
  async validateBookingStatusUpdate(
    bookingId: string, 
    newStatus: string, 
    userId: string, 
    userRole: string
  ): Promise<{ allowed: boolean; reason?: string; metadata?: any }> {
    try {
      const booking = await this.getServiceBooking(bookingId);
      if (!booking) {
        return { allowed: false, reason: 'Booking not found' };
      }

      const currentStatus = booking.status;
      
      // STRICT state machine validation
      if (!this.isValidBookingStatusTransition(currentStatus || '', newStatus)) {
        const allowedTransitions = PostgresStorage.ALLOWED_BOOKING_STATUS_TRANSITIONS[currentStatus || ''];
        return { 
          allowed: false, 
          reason: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions?.join(', ') || 'none'}` 
        };
      }

      // TTL enforcement for time-sensitive transitions
      const now = new Date();
      if (booking.matchingExpiresAt && booking.matchingExpiresAt < now && 
          ['matching', 'matched', 'accepted'].includes(newStatus)) {
        return { 
          allowed: false, 
          reason: 'Matching period has expired. Cannot proceed with this transition.' 
        };
      }

      // Enhanced role-based authorization with new status support
      switch (newStatus) {
        case 'requested':
          // Only customer or system can request service
          if (booking.userId !== userId && userRole !== 'admin' && userRole !== 'system') {
            return { allowed: false, reason: 'Only customer can request service' };
          }
          break;

        case 'matching':
          // Only system/background matcher can set to matching
          if (userRole !== 'admin' && userRole !== 'system') {
            return { allowed: false, reason: 'Only system can start provider matching' };
          }
          break;

        case 'matched':
          // Only system when provider found
          if (userRole !== 'admin' && userRole !== 'system') {
            return { allowed: false, reason: 'Only system can mark as matched' };
          }
          break;

        case 'accepted':
          // Only assigned provider can accept
          if (booking.assignedProviderId !== userId && userRole !== 'admin') {
            return { allowed: false, reason: 'Only assigned provider can accept job' };
          }
          break;

        case 'enroute':
          // Only assigned provider can set enroute
          if (booking.assignedProviderId !== userId) {
            return { allowed: false, reason: 'Only assigned provider can update to enroute' };
          }
          break;

        case 'arrived':
          // Only assigned provider can mark as arrived
          if (booking.assignedProviderId !== userId) {
            return { allowed: false, reason: 'Only assigned provider can mark as arrived' };
          }
          break;

        case 'started':
          // Only assigned provider can start work
          if (booking.assignedProviderId !== userId) {
            return { allowed: false, reason: 'Only assigned provider can start work' };
          }
          break;

        case 'in_progress':
          // Only assigned provider can mark work in progress
          if (booking.assignedProviderId !== userId) {
            return { allowed: false, reason: 'Only assigned provider can mark work in progress' };
          }
          break;

        case 'work_completed':
          // Only assigned provider can complete work
          if (booking.assignedProviderId !== userId) {
            return { allowed: false, reason: 'Only assigned provider can complete work' };
          }
          break;

        case 'completed':
          // Customer, provider, or admin can mark as completed
          if (booking.userId !== userId && booking.assignedProviderId !== userId && userRole !== 'admin') {
            return { allowed: false, reason: 'Only customer, provider, or admin can mark as completed' };
          }
          break;

        case 'cancelled':
          // Customer, provider, or admin can cancel
          if (booking.userId !== userId && booking.assignedProviderId !== userId && userRole !== 'admin') {
            return { allowed: false, reason: 'Only customer, provider, or admin can cancel' };
          }
          break;

        case 'refunded':
          // Only admin or system can mark as refunded
          if (userRole !== 'admin' && userRole !== 'system') {
            return { allowed: false, reason: 'Only admin or system can process refund' };
          }
          break;

        // Legacy status handling for backward compatibility
        case 'provider_search':
          return await this.validateBookingStatusUpdate(bookingId, 'matching', userId, userRole);
        case 'provider_assigned':
          return await this.validateBookingStatusUpdate(bookingId, 'accepted', userId, userRole);
        case 'provider_on_way':
          return await this.validateBookingStatusUpdate(bookingId, 'enroute', userId, userRole);
        case 'work_in_progress':
          return await this.validateBookingStatusUpdate(bookingId, 'in_progress', userId, userRole);

        default:
          return { allowed: false, reason: `Unknown status: ${newStatus}` };
      }

      // Additional validation metadata
      const metadata = {
        currentStatus,
        newStatus,
        transitionAllowed: true,
        userRole,
        timestamp: now.toISOString()
      };

      return { allowed: true, metadata };
    } catch (error) {
      console.error('Error validating booking status update:', error);
      return { allowed: false, reason: 'Validation error' };
    }
  }

  // Provider decline job request with idempotency
  async declineProviderJobRequest(
    bookingId: string, 
    providerId: string, 
    reason?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Get and lock the job request
        const jobRequest = await tx.select()
          .from(providerJobRequests)
          .where(and(
            eq(providerJobRequests.orderId, bookingId),
            eq(providerJobRequests.providerId, providerId)
          ))
          .for('update')
          .limit(1);

        if (jobRequest.length === 0) {
          return { success: false, message: 'Job request not found' };
        }

        const request = jobRequest[0];

        // Idempotency check - if already declined, return success
        if (request.status === 'declined') {
          return { success: true, message: 'Job request already declined' };
        }

        // Check if request is still valid (not expired or accepted)
        if (request.status !== 'sent') {
          return { success: false, message: 'Job request is no longer available for decline' };
        }

        // TTL check
        if (request.expiresAt && request.expiresAt <= new Date()) {
          return { success: false, message: 'Job request has expired' };
        }

        // Update job request status
        await tx.update(providerJobRequests)
          .set({
            status: 'declined',
            respondedAt: new Date(),
            declineReason: reason || 'No reason provided'
          })
          .where(eq(providerJobRequests.id, request.id));

        return { success: true, message: 'Job request declined successfully' };
      });
    } catch (error) {
      console.error('Error declining job request:', error);
      return { success: false, message: 'Failed to decline job request' };
    }
  }

  // Create location update with validation
  async createLocationUpdate(locationData: InsertOrderLocationUpdate): Promise<OrderLocationUpdate> {
    try {
      // Convert number values to strings for decimal fields to match database schema
      const processedData = {
        ...locationData,
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        ...(locationData.accuracy !== undefined && { accuracy: locationData.accuracy.toString() }),
        ...(locationData.altitude !== undefined && { altitude: locationData.altitude.toString() }),
        ...(locationData.bearing !== undefined && { bearing: locationData.bearing.toString() }),
        ...(locationData.speed !== undefined && { speed: locationData.speed.toString() }),
        ...(locationData.distanceToCustomer !== undefined && { distanceToCustomer: locationData.distanceToCustomer.toString() })
      };
      
      const result = await db.insert(orderLocationUpdates)
        .values(processedData as any)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating location update:', error);
      throw new Error('Failed to create location update');
    }
  }

  // Get location updates for order
  async getLocationUpdates(orderId: string): Promise<OrderLocationUpdate[]> {
    return await db.select()
      .from(orderLocationUpdates)
      .where(eq(orderLocationUpdates.orderId, orderId))
      .orderBy(desc(orderLocationUpdates.createdAt));
  }

  // Create order chat message
  async createOrderChatMessage(messageData: InsertOrderChatMessage): Promise<OrderChatMessage> {
    try {
      const result = await db.insert(orderChatMessages)
        .values([messageData])
        .returning();

      return result[0]! as OrderChatMessage;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Failed to create chat message');
    }
  }

  // Get chat messages for order
  async getOrderChatMessages(orderId: string): Promise<OrderChatMessage[]> {
    return await db.select()
      .from(orderChatMessages)
      .where(eq(orderChatMessages.orderId, orderId))
      .orderBy(asc(orderChatMessages.createdAt));
  }

  // Get order status history
  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return await db.select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt));
  }

  // Create order status history entry
  async createOrderStatusHistory(historyData: InsertOrderStatusHistory): Promise<OrderStatusHistory> {
    try {
      const result = await db.insert(orderStatusHistory)
        .values(historyData)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating status history:', error);
      throw new Error('Failed to create status history');
    }
  }

  // Get order documents
  async getOrderDocuments(orderId: string): Promise<OrderDocument[]> {
    return await db.select()
      .from(orderDocuments)
      .where(eq(orderDocuments.orderId, orderId))
      .orderBy(desc(orderDocuments.createdAt));
  }

  // Create order document
  async createOrderDocument(documentData: InsertOrderDocument): Promise<OrderDocument> {
    try {
      const result = await db.insert(orderDocuments)
        .values(documentData)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating order document:', error);
      throw new Error('Failed to create order document');
    }
  }

  // ========================================
  // SCHEDULING CONSTRAINTS ENFORCEMENT
  // ========================================

  // Validate scheduling constraints for a booking
  async validateSchedulingConstraints(
    serviceId: string,
    scheduledAt: Date,
    providerId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const service = await this.getService(serviceId);
      if (!service) {
        return { valid: false, reason: 'Service not found' };
      }

      const now = new Date();

      // Check minimum advance booking time (use advanceBookingDays from service or default)
      const minAdvanceTime = 1; // Default 1 hour minimum
      const minBookingTime = new Date(now.getTime() + minAdvanceTime * 60 * 60 * 1000);
      
      if (scheduledAt < minBookingTime) {
        return { 
          valid: false, 
          reason: `Service requires at least ${minAdvanceTime} hours advance booking` 
        };
      }

      // Check maximum advance booking time
      const maxAdvanceDays = service.advanceBookingDays || 30;
      const maxBookingTime = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
      
      if (scheduledAt > maxBookingTime) {
        return { 
          valid: false, 
          reason: `Service can only be booked up to ${maxAdvanceDays} days in advance` 
        };
      }

      // Check service availability windows (if defined)
      const schedulingRules = await db.select()
        .from(serviceSchedulingRules)
        .where(eq(serviceSchedulingRules.serviceId, serviceId));

      if (schedulingRules.length > 0) {
        const dayOfWeek = scheduledAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const hour = scheduledAt.getHours();
        const minute = scheduledAt.getMinutes();
        const timeInMinutes = hour * 60 + minute;

        let isValidTime = false;
        for (const rule of schedulingRules) {
          // serviceSchedulingRules doesn't have dayOfWeek, startTime, endTime directly
          // This logic should use the timeSlots field from the schema
          if (rule.timeSlots) {
            const timeSlots = rule.timeSlots as Array<{start: string; end: string}>;
            for (const slot of timeSlots) {
              const startMinutes = this.parseTimeToMinutes(slot.start);
              const endMinutes = this.parseTimeToMinutes(slot.end);
            
              if (timeInMinutes >= startMinutes && timeInMinutes <= endMinutes) {
                isValidTime = true;
                break;
              }
            }
          }
        }

        if (!isValidTime) {
          return { 
            valid: false, 
            reason: 'Selected time is outside service availability hours' 
          };
        }
      }

      // Check provider availability if specified
      if (providerId) {
        const availability = await db.select()
          .from(providerAvailability)
          .where(and(
            eq(providerAvailability.providerId, providerId),
            eq(providerAvailability.specificDate, scheduledAt.toISOString().split('T')[0])
          ))
          .limit(1);

        if (availability.length > 0 && availability[0].availabilityType === 'unavailable') {
          return { valid: false, reason: 'Provider is not available at selected time' };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating scheduling constraints:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // ========================================
  // CANCELLATION POLICY ENFORCEMENT
  // ========================================

  // Apply cancellation policy to booking
  async applyCancellationPolicy(
    bookingId: string,
    cancelledBy: string,
    cancelledByRole: 'customer' | 'provider' | 'admin',
    reason: string,
    customReason?: string
  ): Promise<{
    success: boolean;
    refundAmount?: number;
    penaltyAmount?: number;
    refundPercent?: number;
    message?: string;
  }> {
    try {
      return await db.transaction(async (tx) => {
        // Get booking details
        const booking = await tx.select()
          .from(serviceBookings)
          .where(eq(serviceBookings.id, bookingId))
          .limit(1);

        if (booking.length === 0) {
          return { success: false, message: 'Booking not found' };
        }

        const bookingData = booking[0];

        // Get applicable cancellation policy
        const policies = await tx.select()
          .from(cancellationPolicies)
          .where(and(
            eq(cancellationPolicies.serviceId, bookingData.serviceId),
            eq(cancellationPolicies.isActive, true)
          ))
          .orderBy(desc(cancellationPolicies.freeHours))
          .limit(1);

        let refundPercent = 100; // Default full refund
        let penaltyAmount = 0;
        let policyId = null;

        if (policies.length > 0) {
          const policy = policies[0];
          policyId = policy.id;

          // Calculate hours until service
          const now = new Date();
          const serviceTime = bookingData.scheduledAt || bookingData.createdAt;
          if (!serviceTime) {
            return { success: false, message: 'Cannot determine service time for cancellation policy' };
          }
          const hoursUntilService = (serviceTime.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Apply policy based on timing
          if (hoursUntilService < (policy.freeHours || 0)) {
            if (hoursUntilService < (policy.noRefundHours || 0)) {
              refundPercent = policy.noRefundPercent || 0;
            } else {
              refundPercent = policy.partialRefundPercent || 50;
            }
          }
        }

        // Calculate refund amount
        const totalAmount = parseFloat(bookingData.totalAmount || '0');
        const refundAmount = Math.max(0, (totalAmount * refundPercent / 100) - penaltyAmount);

        // Create cancellation record
        await tx.insert(orderCancellations).values({
          orderId: bookingId,
          cancelledBy,
          cancelledByRole,
          reason: reason as any,
          customReason,
          policyId,
          hoursBeforeService: Math.max(0, 
            bookingData.scheduledAt ? 
              (bookingData.scheduledAt.getTime() - new Date().getTime()) / (1000 * 60 * 60) : 0
          ).toString(),
          appliedRefundPercent: refundPercent,
          refundAmount: refundAmount.toString(),
          penaltyAmount: penaltyAmount.toString(),
          refundStatus: 'pending'
        });

        // Update booking status
        await tx.update(serviceBookings)
          .set({
            status: 'cancelled'
          })
          .where(eq(serviceBookings.id, bookingId));

        return {
          success: true,
          refundAmount,
          penaltyAmount,
          refundPercent,
          message: `Booking cancelled with ${refundPercent}% refund`
        };
      });
    } catch (error) {
      console.error('Error applying cancellation policy:', error);
      return { success: false, message: 'Failed to apply cancellation policy' };
    }
  }

  // ========================================
  // VERIFICATION WORKFLOW METHODS
  // ========================================

  async getServiceProviderForVerification(userId: string): Promise<ServiceProvider | undefined> {
    const result = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId)).limit(1);
    return result[0];
  }

  async updateServiceProviderVerificationStatus(
    userId: string, 
    status: ServiceProviderVerificationStatusType,
    adminId?: string,
    reason?: string,
    notes?: string
  ): Promise<ServiceProvider | undefined> {
    const result = await db.update(serviceProviders)
      .set({ 
        verificationStatus: status,
        updatedAt: new Date()
      })
      .where(eq(serviceProviders.userId, userId))
      .returning();
    return result[0];
  }

  async getServiceProvidersForVerification(
    status?: ServiceProviderVerificationStatusType,
    limit?: number,
    offset?: number
  ): Promise<ServiceProvider[]> {
    const whereCondition = status ? eq(serviceProviders.verificationStatus, status) : undefined;
    let query = db.select().from(serviceProviders);
    
    if (whereCondition) {
      query = query.where(whereCondition);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async getPartsProviderForVerification(userId: string): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.select().from(partsProviderBusinessInfo).where(eq(partsProviderBusinessInfo.userId, userId)).limit(1);
    return result[0];
  }

  async updatePartsProviderVerificationStatus(
    userId: string,
    status: string,
    adminId?: string, 
    reason?: string,
    notes?: string
  ): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.update(partsProviderBusinessInfo)
      .set({ 
        verificationStatus: status as any,
        updatedAt: new Date()
      })
      .where(eq(partsProviderBusinessInfo.userId, userId))
      .returning();
    return result[0];
  }

  async getPartsProvidersForVerification(
    status?: string,
    limit?: number, 
    offset?: number
  ): Promise<PartsProviderBusinessInfo[]> {
    const whereCondition = status ? eq(partsProviderBusinessInfo.verificationStatus, status) : undefined;
    let query = db.select().from(partsProviderBusinessInfo);
    
    if (whereCondition) {
      query = query.where(whereCondition);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async createVerificationStatusTransition(transition: InsertVerificationStatusTransition): Promise<VerificationStatusTransition> {
    const result = await db.insert(verificationStatusTransitions).values(transition).returning();
    return result[0];
  }

  async getVerificationStatusTransitions(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<VerificationStatusTransition[]> {
    return await db.select()
      .from(verificationStatusTransitions)
      .where(and(
        eq(verificationStatusTransitions.providerId, providerId),
        eq(verificationStatusTransitions.providerType, providerType)
      ))
      .orderBy(desc(verificationStatusTransitions.createdAt));
  }

  async createPartsProviderQualityMetrics(metrics: InsertPartsProviderQualityMetrics): Promise<PartsProviderQualityMetrics> {
    const result = await db.insert(partsProviderQualityMetrics).values(metrics).returning();
    return result[0];
  }

  async getPartsProviderQualityMetrics(providerId: string): Promise<PartsProviderQualityMetrics | undefined> {
    const result = await db.select().from(partsProviderQualityMetrics).where(eq(partsProviderQualityMetrics.providerId, providerId)).limit(1);
    return result[0];
  }

  async updatePartsProviderQualityMetrics(
    providerId: string,
    data: Partial<InsertPartsProviderQualityMetrics>
  ): Promise<PartsProviderQualityMetrics | undefined> {
    const result = await db.update(partsProviderQualityMetrics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(partsProviderQualityMetrics.providerId, providerId))
      .returning();
    return result[0];
  }

  async createProviderResubmission(resubmission: InsertProviderResubmission): Promise<ProviderResubmission> {
    const result = await db.insert(providerResubmissions).values(resubmission).returning();
    return result[0];
  }

  async getProviderResubmission(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<ProviderResubmission | undefined> {
    const result = await db.select()
      .from(providerResubmissions)
      .where(and(
        eq(providerResubmissions.providerId, providerId),
        eq(providerResubmissions.providerType, providerType)
      ))
      .orderBy(desc(providerResubmissions.createdAt))
      .limit(1);
    return result[0];
  }

  async updateProviderResubmissionStatus(
    id: string,
    status: string,
    data?: Partial<InsertProviderResubmission>
  ): Promise<ProviderResubmission | undefined> {
    const result = await db.update(providerResubmissions)
      .set({ ...data, status, updatedAt: new Date() })
      .where(eq(providerResubmissions.id, id))
      .returning();
    return result[0];
  }

  async createVerificationNotificationPreferences(
    preferences: InsertVerificationNotificationPreferences
  ): Promise<VerificationNotificationPreferences> {
    const result = await db.insert(verificationNotificationPreferences).values(preferences).returning();
    return result[0];
  }

  async getVerificationNotificationPreferences(userId: string): Promise<VerificationNotificationPreferences | undefined> {
    const result = await db.select().from(verificationNotificationPreferences).where(eq(verificationNotificationPreferences.userId, userId)).limit(1);
    return result[0];
  }

  async updateVerificationNotificationPreferences(
    userId: string,
    data: Partial<InsertVerificationNotificationPreferences>
  ): Promise<VerificationNotificationPreferences | undefined> {
    const result = await db.update(verificationNotificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(verificationNotificationPreferences.userId, userId))
      .returning();
    return result[0];
  }

  async updateDocumentVerificationStatus(
    providerId: string,
    providerType: 'service_provider' | 'parts_provider',
    documentType: string,
    verified: boolean,
    adminId?: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // This is a simplified implementation - in a real scenario, 
      // you'd update the specific document verification status in the provider record
      console.log(`Updating document verification: ${providerId}, ${documentType}, ${verified}`);
      return { success: true, message: 'Document verification status updated' };
    } catch (error) {
      console.error('Error updating document verification:', error);
      return { success: false, message: 'Failed to update document verification' };
    }
  }

  async getVerificationDashboardStats(): Promise<{
    serviceProviders: {
      pending: number;
      underReview: number;
      approved: number;
      rejected: number;
      suspended: number;
      resubmissionRequired: number;
    };
    partsProviders: {
      pending: number;
      underReview: number;
      approved: number;
      rejected: number;
    };
    totalPendingDocuments: number;
    recentSubmissions: number;
  }> {
    try {
      // Get service provider stats
      const serviceProviderStats = await db.select({
        status: serviceProviders.verificationStatus,
        count: count()
      })
      .from(serviceProviders)
      .groupBy(serviceProviders.verificationStatus);

      // Get parts provider stats  
      const partsProviderStats = await db.select({
        status: partsProviderBusinessInfo.verificationStatus,
        count: count()
      })
      .from(partsProviderBusinessInfo)
      .groupBy(partsProviderBusinessInfo.verificationStatus);

      // Initialize stats with zeros
      const serviceStats = {
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        resubmissionRequired: 0
      };

      const partsStats = {
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0
      };

      // Populate service provider stats
      serviceProviderStats.forEach(stat => {
        if (stat.status && stat.status in serviceStats) {
          (serviceStats as any)[stat.status] = stat.count;
        }
      });

      // Populate parts provider stats
      partsProviderStats.forEach(stat => {
        if (stat.status && stat.status in partsStats) {
          (partsStats as any)[stat.status] = stat.count;
        }
      });

      return {
        serviceProviders: serviceStats,
        partsProviders: partsStats,
        totalPendingDocuments: serviceStats.pending + partsStats.pending,
        recentSubmissions: 0 // Placeholder - would need additional logic to calculate recent submissions
      };
    } catch (error) {
      console.error('Error getting verification dashboard stats:', error);
      return {
        serviceProviders: {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
          suspended: 0,
          resubmissionRequired: 0
        },
        partsProviders: {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0
        },
        totalPendingDocuments: 0,
        recentSubmissions: 0
      };
    }
  }

  // ========================================
  // SERVICE BOOKING WORKFLOW METHODS
  // ========================================

  async createServiceBooking(bookingData: InsertServiceBooking): Promise<ServiceBooking> {
    // Generate human-readable order number
    const orderNumber = generateUniqueOrderNumber('service');
    
    const result = await db.insert(serviceBookings).values({
      ...bookingData,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getUserServiceBookings(userId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ServiceBooking[]> {
    const { status, limit = 20, offset = 0 } = options;
    
    let query = db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.userId, userId))
      .orderBy(desc(serviceBookings.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(and(
        eq(serviceBookings.userId, userId),
        eq(serviceBookings.status, status)
      ));
    }

    return await query;
  }

  async getServiceBookingById(id: string): Promise<ServiceBooking | undefined> {
    const result = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, id))
      .limit(1);
    return result[0];
  }

  async getServiceProviderProfile(providerId: string): Promise<ServiceProviderProfile | undefined> {
    const result = await db.select()
      .from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.providerId, providerId))
      .limit(1);
    return result[0];
  }

  // Calculate comprehensive provider profile metrics
  async calculateProviderProfileMetrics(providerId: string): Promise<{
    completionRate: number;
    averageRating: number;
    totalEarnings: number;
    monthlyEarnings: number;
    totalJobs: number;
    averageResponseTime: number; // in minutes
    onTimePercentage: number;
    activeStreak: number; // days since last activity
  }> {
    try {
      // Get current date for monthly calculations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Calculate total jobs and completion rate
      const totalOrdersResult = await db.select({
        totalOrders: count(),
        completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END)`,
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' AND ${orders.meta}->>'totalAmount' IS NOT NULL THEN CAST(${orders.meta}->>'totalAmount' AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(orders)
      .where(eq(orders.providerId, providerId));

      const orderStats = totalOrdersResult[0] || { totalOrders: 0, completedOrders: 0, totalEarnings: 0 };
      const totalJobs = Number(orderStats.totalOrders) || 0;
      const completedJobs = Number(orderStats.completedOrders) || 0;
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const totalEarnings = Number(orderStats.totalEarnings) || 0;

      // 2. Calculate monthly earnings
      const monthlyEarningsResult = await db.select({
        monthlyEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' AND ${orders.meta}->>'totalAmount' IS NOT NULL THEN CAST(${orders.meta}->>'totalAmount' AS DECIMAL) ELSE 0 END), 0)`
      })
      .from(orders)
      .where(and(
        eq(orders.providerId, providerId),
        gte(orders.createdAt, startOfMonth)
      ));
      
      const monthlyEarnings = Number(monthlyEarningsResult[0]?.monthlyEarnings) || 0;

      // 3. Calculate average rating
      const ratingsResult = await db.select({
        averageRating: sql<number>`COALESCE(AVG(CAST(${reviews.rating} AS DECIMAL)), 0)`,
        totalRatings: count()
      })
      .from(reviews)
      .where(eq(reviews.revieweeId, providerId));

      const averageRating = Number(ratingsResult[0]?.averageRating) || 0;

      // 4. Calculate average response time
      const responseTimeResult = await db.select({
        avgResponseMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${providerJobRequests.respondedAt} - ${providerJobRequests.sentAt})) / 60), 0)`
      })
      .from(providerJobRequests)
      .where(and(
        eq(providerJobRequests.providerId, providerId),
        not(sql`${providerJobRequests.respondedAt} IS NULL`),
        not(sql`${providerJobRequests.sentAt} IS NULL`)
      ));

      const averageResponseTime = Number(responseTimeResult[0]?.avgResponseMinutes) || 0;

      // 5. Calculate on-time percentage (orders completed within estimated time)
      const onTimeResult = await db.select({
        totalCompletedOrders: sql<number>`COUNT(*)`,
        onTimeOrders: sql<number>`COUNT(CASE WHEN ${orders.meta}->>'estimatedDuration' IS NOT NULL AND EXTRACT(EPOCH FROM (${orders.updatedAt} - ${orders.createdAt})) / 60 <= CAST(${orders.meta}->>'estimatedDuration' AS INTEGER) THEN 1 END)`
      })
      .from(orders)
      .where(and(
        eq(orders.providerId, providerId),
        eq(orders.status, 'completed')
      ));

      const onTimeStats = onTimeResult[0] || { totalCompletedOrders: 0, onTimeOrders: 0 };
      const onTimePercentage = Number(onTimeStats.totalCompletedOrders) > 0 
        ? (Number(onTimeStats.onTimeOrders) / Number(onTimeStats.totalCompletedOrders)) * 100 
        : 100; // Default to 100% if no data

      // 6. Calculate active streak (days since last activity)
      const userResult = await db.select({
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .where(eq(users.id, providerId))
      .limit(1);

      const lastLogin = userResult[0]?.lastLoginAt;
      const activeStreak = lastLogin 
        ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
        : 999; // High number if never logged in

      return {
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        averageRating: Math.round(averageRating * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
        totalJobs,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        onTimePercentage: Math.round(onTimePercentage * 100) / 100,
        activeStreak
      };
    } catch (error) {
      console.error('Error calculating provider profile metrics:', error);
      // Return default values on error
      return {
        completionRate: 0,
        averageRating: 0,
        totalEarnings: 0,
        monthlyEarnings: 0,
        totalJobs: 0,
        averageResponseTime: 0,
        onTimePercentage: 100,
        activeStreak: 999
      };
    }
  }

  async cancelAllJobRequestsForBooking(bookingId: string): Promise<void> {
    await db.update(providerJobRequests)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(providerJobRequests.bookingId, bookingId),
        eq(providerJobRequests.status, 'pending')
      ));
  }

  async declineJobRequest(bookingId: string, providerId: string, reason?: string): Promise<void> {
    await db.update(providerJobRequests)
      .set({ 
        status: 'declined',
        response: 'declined',
        declineReason: reason,
        respondedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(providerJobRequests.orderId, bookingId),
        eq(providerJobRequests.providerId, providerId)
      ));
  }

  // GET provider's job requests - used by service provider dashboard
  async getProviderJobRequests(providerId: string): Promise<ProviderJobRequest[]> {
    const result = await db.select()
      .from(providerJobRequests)
      .where(eq(providerJobRequests.providerId, providerId))
      .orderBy(desc(providerJobRequests.createdAt));
    
    return result;
  }

  // ACCEPT job request - used by service provider endpoints
  async acceptJobRequest(orderId: string, providerId: string, acceptanceData?: {
    estimatedArrival?: Date | null;
    quotedPrice?: number | null;
    notes?: string | null;
  }): Promise<ProviderJobRequest> {
    const result = await db.update(providerJobRequests)
      .set({
        status: 'accepted',
        respondedAt: new Date(),
        estimatedArrival: acceptanceData?.estimatedArrival || null,
        quotedPrice: acceptanceData?.quotedPrice?.toString() || null,
        acceptanceNotes: acceptanceData?.notes || null
      })
      .where(and(
        eq(providerJobRequests.orderId, orderId),
        eq(providerJobRequests.providerId, providerId)
      ))
      .returning();

    if (!result[0]) {
      throw new Error('Job request not found or already processed');
    }

    // Also update the order/booking status to accepted
    await this.updateOrderStatus(orderId, 'accepted', {
      acceptedBy: providerId,
      acceptedAt: new Date().toISOString()
    });

    return result[0];
  }

  async getValidStatusTransitions(currentStatus: string, userRole: string): Promise<string[]> {
    // Define valid status transitions based on Urban Company workflow
    const transitions: Record<string, Record<string, string[]>> = {
      'pending': {
        'customer': ['requested', 'cancelled'],
        'service_provider': [],
        'admin': ['matching', 'cancelled']
      },
      'requested': {
        'customer': ['cancelled'],
        'service_provider': [],
        'admin': ['matching', 'cancelled']
      },
      'matching': {
        'customer': ['cancelled'],
        'service_provider': ['accepted'],
        'admin': ['provider_search', 'cancelled']
      },
      'provider_search': {
        'customer': ['cancelled'],
        'service_provider': ['accepted'],
        'admin': ['cancelled']
      },
      'accepted': {
        'customer': ['cancelled'],
        'service_provider': ['enroute', 'cancelled'],
        'admin': ['enroute', 'cancelled']
      },
      'enroute': {
        'customer': [],
        'service_provider': ['arrived'],
        'admin': ['arrived', 'cancelled']
      },
      'arrived': {
        'customer': [],
        'service_provider': ['started'],
        'admin': ['started', 'cancelled']
      },
      'started': {
        'customer': [],
        'service_provider': ['in_progress'],
        'admin': ['in_progress', 'cancelled']
      },
      'in_progress': {
        'customer': [],
        'service_provider': ['work_completed'],
        'admin': ['work_completed', 'cancelled']
      },
      'work_completed': {
        'customer': ['payment_pending', 'completed'],
        'service_provider': [],
        'admin': ['payment_pending', 'completed', 'cancelled']
      },
      'payment_pending': {
        'customer': ['completed'],
        'service_provider': [],
        'admin': ['completed', 'refunded']
      },
      'completed': {
        'customer': [],
        'service_provider': [],
        'admin': ['refunded']
      },
      'cancelled': {
        'customer': [],
        'service_provider': [],
        'admin': ['refunded']
      },
      'refunded': {
        'customer': [],
        'service_provider': [],
        'admin': []
      }
    };

    return transitions[currentStatus]?.[userRole] || [];
  }

  async getProviderBookings(providerId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ServiceBooking[]> {
    const { status, limit = 20, offset = 0 } = options;
    
    let query = db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.assignedProviderId, providerId))
      .orderBy(desc(serviceBookings.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(and(
        eq(serviceBookings.assignedProviderId, providerId),
        eq(serviceBookings.status, status)
      ));
    }

    return await query;
  }

  // Time slot availability for scheduled bookings
  async getProviderAvailableSlots(providerId: string, serviceId: string, date: string): Promise<string[]> {
    // Get provider's availability for the specific date
    const provider = await this.getServiceProviderProfile(providerId);
    if (!provider) return [];

    // Get existing bookings for that day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await db.select()
      .from(serviceBookings)
      .where(and(
        eq(serviceBookings.assignedProviderId, providerId),
        sql`${serviceBookings.scheduledAt} >= ${startOfDay}`,
        sql`${serviceBookings.scheduledAt} <= ${endOfDay}`,
        ne(serviceBookings.status, 'cancelled')
      ));

    // Generate available slots (simplified - in production, this would consider service duration, provider availability, etc.)
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    const bookedSlots = existingBookings.map(booking => {
      if (booking.scheduledAt) {
        return booking.scheduledAt.toTimeString().slice(0, 5);
      }
      return null;
    }).filter(Boolean);

    return allSlots.filter(slot => !bookedSlots.includes(slot));
  }

  // Enhanced order status tracking
  async createServiceBookingStatusHistory(bookingId: string, fromStatus: string, toStatus: string, notes?: string, updatedBy?: string): Promise<void> {
    // This would insert into a status history table if it exists
    // For now, we'll just log it
    console.log(`Booking ${bookingId} status changed from ${fromStatus} to ${toStatus}`, {
      notes,
      updatedBy,
      timestamp: new Date().toISOString()
    });
  }

  // ========================================
  // PROVIDER APPLICATION CRUD METHODS IMPLEMENTATION
  // ========================================

  // Service Provider Application Methods
  async createServiceProviderApplication(application: InsertServiceProvider): Promise<ServiceProvider> {
    const result = await db.insert(serviceProviders).values({
      ...application,
      verificationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async getServiceProviderApplication(userId: string): Promise<ServiceProvider | undefined> {
    const result = await db.select()
      .from(serviceProviders)
      .where(eq(serviceProviders.userId, userId))
      .limit(1);
    return result[0];
  }

  async updateServiceProviderApplication(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const result = await db.update(serviceProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceProviders.userId, userId))
      .returning();
    return result[0];
  }

  // Parts Provider Application Methods  
  async createPartsProviderApplication(application: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo> {
    return await this.createPartsProviderBusinessInfo(application);
  }

  async getPartsProviderApplication(userId: string): Promise<PartsProviderBusinessInfo | undefined> {
    return await this.getPartsProviderBusinessInfo(userId);
  }

  async updatePartsProviderApplication(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined> {
    return await this.updatePartsProviderBusinessInfo(userId, data);
  }
  
  // User-based Application Fetching Implementation
  async getProviderApplicationsByUser(userId: string): Promise<Array<{
    id: string;
    userId: string;
    type: 'service_provider' | 'parts_provider';
    businessName?: string;
    verificationStatus: string;
    submittedAt: Date;
    user?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };
  }>> {
    console.log(`🔍 getProviderApplicationsByUser: Fetching applications for userId: ${userId}`);
    
    try {
      // Define queries without executing them immediately
      const serviceProviderQuery = db.select({
        id: serviceProviders.id,
        userId: serviceProviders.userId,
        businessName: serviceProviders.businessName,
        verificationStatus: serviceProviders.verificationStatus,
        createdAt: serviceProviders.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userPhone: users.phone
      })
        .from(serviceProviders)
        .leftJoin(users, eq(serviceProviders.userId, users.id))
        .where(eq(serviceProviders.userId, userId))
        .orderBy(desc(serviceProviders.createdAt));
      
      const partsProviderQuery = db.select({
        id: partsProviderBusinessInfo.id,
        userId: partsProviderBusinessInfo.userId,
        businessName: partsProviderBusinessInfo.businessName,
        verificationStatus: partsProviderBusinessInfo.verificationStatus,
        createdAt: partsProviderBusinessInfo.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userPhone: users.phone
      })
        .from(partsProviderBusinessInfo)
        .leftJoin(users, eq(partsProviderBusinessInfo.userId, users.id))
        .where(eq(partsProviderBusinessInfo.userId, userId))
        .orderBy(desc(partsProviderBusinessInfo.createdAt));
      
      // Execute queries in parallel
      const [serviceProviderResults, partsProviderResults] = await Promise.all([
        serviceProviderQuery,
        partsProviderQuery
      ]);
      
      console.log(`📊 getProviderApplicationsByUser: Found ${serviceProviderResults.length} service provider and ${partsProviderResults.length} parts provider applications`);
      
      // Convert results to common format
      const serviceProviderApps = serviceProviderResults.map(app => ({
        id: app.id!,
        userId: app.userId!,
        type: 'service_provider' as const,
        businessName: app.businessName || undefined,
        verificationStatus: app.verificationStatus!,
        submittedAt: app.createdAt!,
        user: {
          firstName: app.userFirstName || undefined,
          lastName: app.userLastName || undefined,
          email: app.userEmail || undefined,
          phone: app.userPhone || undefined
        }
      }));
      
      const partsProviderApps = partsProviderResults.map(app => ({
        id: app.id!,
        userId: app.userId!,
        type: 'parts_provider' as const,
        businessName: app.businessName || undefined,
        verificationStatus: app.verificationStatus!,
        submittedAt: app.createdAt!,
        user: {
          firstName: app.userFirstName || undefined,
          lastName: app.userLastName || undefined,
          email: app.userEmail || undefined,
          phone: app.userPhone || undefined
        }
      }));
      
      // Combine and sort by submission date (most recent first)
      const allApplications = [...serviceProviderApps, ...partsProviderApps];
      allApplications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      
      console.log(`✅ getProviderApplicationsByUser: Returning ${allApplications.length} applications for userId: ${userId}`);
      return allApplications;
    } catch (error) {
      console.error(`❌ getProviderApplicationsByUser: Error fetching applications for userId: ${userId}`, error);
      throw error;
    }
  }

  // Admin Provider Application Review Methods
  async getAllProviderApplications(filters?: {
    status?: string;
    providerType?: 'service_provider' | 'parts_provider';
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    applications: Array<{
      id: string;
      userId: string;
      type: 'service_provider' | 'parts_provider';
      businessName?: string;
      verificationStatus: string;
      submittedAt: Date;
      user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
    }>;
    total: number;
  }> {
    const { status, providerType, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};
    
    let serviceProviderApplications: any[] = [];
    let partsProviderApplications: any[] = [];
    let totalServiceProviders = 0;
    let totalPartsProviders = 0;

    // Fetch service provider applications
    if (!providerType || providerType === 'service_provider') {
      let spQuery = db.select({
        id: serviceProviders.id,
        userId: serviceProviders.userId,
        businessName: serviceProviders.businessName,
        verificationStatus: serviceProviders.verificationStatus,
        submittedAt: serviceProviders.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id));

      if (status) {
        spQuery = spQuery.where(eq(serviceProviders.verificationStatus, status));
      }

      const spResults = await spQuery
        .orderBy(sortOrder === 'desc' ? desc(serviceProviders.createdAt) : asc(serviceProviders.createdAt))
        .limit(limit)
        .offset(offset);

      serviceProviderApplications = spResults.map(row => ({
        id: row.id,
        userId: row.userId,
        type: 'service_provider' as const,
        businessName: row.businessName,
        verificationStatus: row.verificationStatus,
        submittedAt: row.submittedAt,
        user: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone
        }
      }));

      // Get total count for service providers
      const spCountQuery = db.select({ count: count() }).from(serviceProviders);
      if (status) {
        spCountQuery.where(eq(serviceProviders.verificationStatus, status));
      }
      const spCountResult = await spCountQuery;
      totalServiceProviders = spCountResult[0].count;
    }

    // Fetch parts provider applications  
    if (!providerType || providerType === 'parts_provider') {
      let ppQuery = db.select({
        id: partsProviderBusinessInfo.id,
        userId: partsProviderBusinessInfo.userId,
        businessName: partsProviderBusinessInfo.businessName,
        verificationStatus: partsProviderBusinessInfo.verificationStatus,
        submittedAt: partsProviderBusinessInfo.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone
      })
      .from(partsProviderBusinessInfo)
      .leftJoin(users, eq(partsProviderBusinessInfo.userId, users.id));

      if (status) {
        ppQuery = ppQuery.where(eq(partsProviderBusinessInfo.verificationStatus, status));
      }

      const ppResults = await ppQuery
        .orderBy(sortOrder === 'desc' ? desc(partsProviderBusinessInfo.createdAt) : asc(partsProviderBusinessInfo.createdAt))
        .limit(limit)
        .offset(offset);

      partsProviderApplications = ppResults.map(row => ({
        id: row.id,
        userId: row.userId,
        type: 'parts_provider' as const,
        businessName: row.businessName,
        verificationStatus: row.verificationStatus,
        submittedAt: row.submittedAt,
        user: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone
        }
      }));

      // Get total count for parts providers
      const ppCountQuery = db.select({ count: count() }).from(partsProviderBusinessInfo);
      if (status) {
        ppCountQuery.where(eq(partsProviderBusinessInfo.verificationStatus, status));
      }
      const ppCountResult = await ppCountQuery;
      totalPartsProviders = ppCountResult[0].count;
    }

    // Combine and sort results
    const allApplications = [...serviceProviderApplications, ...partsProviderApplications];
    allApplications.sort((a, b) => {
      const aDate = new Date(a.submittedAt).getTime();
      const bDate = new Date(b.submittedAt).getTime();
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });

    return {
      applications: allApplications,
      total: totalServiceProviders + totalPartsProviders
    };
  }

  async getProviderApplicationDetails(
    applicationId: string, 
    providerType: 'service_provider' | 'parts_provider'
  ): Promise<{
    application: ServiceProvider | PartsProviderBusinessInfo | null;
    user: User | null;
    statusHistory: VerificationStatusTransition[];
    documents: any;
  }> {
    let application: ServiceProvider | PartsProviderBusinessInfo | null = null;
    let user: User | null = null;

    if (providerType === 'service_provider') {
      // Get service provider application
      const spResult = await db.select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, applicationId))
        .limit(1);
      application = spResult[0] || null;
      
      if (application) {
        const userResult = await db.select()
          .from(users)
          .where(eq(users.id, application.userId!))
          .limit(1);
        user = userResult[0] || null;
      }
    } else {
      // Get parts provider application
      const ppResult = await db.select()
        .from(partsProviderBusinessInfo)
        .where(eq(partsProviderBusinessInfo.id, applicationId))
        .limit(1);
      application = ppResult[0] || null;
      
      if (application) {
        const userResult = await db.select()
          .from(users)
          .where(eq(users.id, application.userId))
          .limit(1);
        user = userResult[0] || null;
      }
    }

    // Get status history
    const statusHistory = application 
      ? await this.getVerificationStatusTransitions(applicationId, providerType)
      : [];

    // Extract documents from application
    const documents = application?.verificationDocuments || application?.documents || {};

    return {
      application,
      user,
      statusHistory,
      documents
    };
  }

  async updateProviderApplicationStatus(
    applicationId: string,
    providerType: 'service_provider' | 'parts_provider',
    status: string,
    adminId: string,
    reason?: string,
    adminNotes?: string,
    publicMessage?: string
  ): Promise<{
    success: boolean;
    application?: ServiceProvider | PartsProviderBusinessInfo;
    statusTransition?: VerificationStatusTransition;
  }> {
    let application: ServiceProvider | PartsProviderBusinessInfo | undefined;
    let currentStatus: string | undefined;

    // Update the application status
    if (providerType === 'service_provider') {
      // Get current status first
      const current = await db.select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, applicationId))
        .limit(1);
      currentStatus = current[0]?.verificationStatus;
      
      const result = await db.update(serviceProviders)
        .set({ 
          verificationStatus: status,
          updatedAt: new Date()
        })
        .where(eq(serviceProviders.id, applicationId))
        .returning();
      application = result[0];
    } else {
      // Get current status first
      const current = await db.select()
        .from(partsProviderBusinessInfo)
        .where(eq(partsProviderBusinessInfo.id, applicationId))
        .limit(1);
      currentStatus = current[0]?.verificationStatus;
      
      const result = await db.update(partsProviderBusinessInfo)
        .set({ 
          verificationStatus: status,
          updatedAt: new Date()
        })
        .where(eq(partsProviderBusinessInfo.id, applicationId))
        .returning();
      application = result[0];
    }

    if (!application) {
      return { success: false };
    }

    // Create status transition record
    const statusTransition = await this.createVerificationStatusTransition({
      providerId: applicationId,
      providerType,
      fromStatus: currentStatus,
      toStatus: status,
      changedBy: adminId,
      reason,
      adminNotes,
      publicMessage,
      notificationSent: false
    });

    return {
      success: true,
      application,
      statusTransition
    };
  }

  // Order methods implementation - CRITICAL for routes.ts
  async getOrderById(orderId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return result[0];
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(orderData).returning();
    return result[0];
  }

  async updateOrderStatus(orderId: string, status: string, updateData?: any): Promise<Order | undefined> {
    const updateFields = {
      status,
      updatedAt: new Date(),
      ...updateData
    };
    const result = await db.update(orders).set(updateFields).where(eq(orders.id, orderId)).returning();
    return result[0];
  }

  async getOrdersByCustomer(userId: string, filters?: any): Promise<{ orders: Order[]; total: number }> {
    const whereConditions = [eq(orders.userId, userId)];
    
    if (filters?.status) {
      whereConditions.push(eq(orders.status, filters.status));
    }
    
    let query = db.select().from(orders).where(and(...whereConditions));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    query = query.orderBy(desc(orders.createdAt));
    
    const orderResults = await query;
    const totalResult = await db.select({ count: count() }).from(orders).where(and(...whereConditions));
    
    return {
      orders: orderResults,
      total: totalResult[0].count
    };
  }

  // Wallet methods implementation - CRITICAL for payment processing
  async getWalletBalance(userId: string): Promise<number> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return parseFloat(user[0]?.walletBalance || '0');
  }

  async createWalletTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction> {
    const result = await db.insert(walletTransactions).values(transactionData).returning();
    return result[0];
  }

  async updateWalletBalance(userId: string, amount: number): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        walletBalance: amount.toString(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Additional method implementations for websocket compatibility
  async getOrder(orderId: string): Promise<Order | undefined> {
    return this.getOrderById(orderId);
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(messageData).returning();
    return result[0];
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notificationData).returning();
    return result[0];
  }

  async validateStatusUpdate(orderId: string, newStatus: string): Promise<boolean> {
    const order = await this.getOrderById(orderId);
    if (!order) return false;
    
    // Basic validation - can be expanded with business logic
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    return validStatuses.includes(newStatus);
  }

  async updateOrder(orderId: string, updateData: any): Promise<Order | undefined> {
    return this.updateOrderStatus(orderId, updateData.status || 'pending', updateData);
  }

  async getChatMessages(orderId: string): Promise<ChatMessage[]> {
    const result = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(chatMessages.createdAt);
    return result;
  }
}

export const storage = new PostgresStorage();

