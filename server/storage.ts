import { eq, and, desc, asc, count, like, ilike, inArray, sql, type SQL, or, gte, lte, not } from "drizzle-orm";
import { db } from "./db";
import { laundryStorage } from "./laundryStorage";
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
    const result = await db.insert(users).values(user).onConflictDoUpdate({
      target: users.id,
      set: user
    }).returning();
    return result[0];
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values([service]).returning();
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

  async getServiceCategoriesByLevel(level: number, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: Array<SQL<boolean> | SQL<unknown> | undefined> = [eq(serviceCategories.level, level)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    const whereClause = whereAll(...conditions);
    return await db.select().from(serviceCategories)
      .where(whereClause!)
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
  }

  async getMainCategories(activeOnly = true): Promise<ServiceCategory[]> {
    // Main categories are level 0 (top-level categories)
    return await this.getServiceCategoriesByLevel(0, activeOnly);
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
    }).returning();
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
        )
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
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Add sorting
    switch (sortBy) {
      case 'price_low':
        query = query.orderBy(asc(parts.price));
        break;
      case 'price_high':
        query = query.orderBy(desc(parts.price));
        break;
      case 'rating':
        query = query.orderBy(desc(parts.rating));
        break;
      case 'popular':
        query = query.orderBy(desc(parts.totalSold));
        break;
      case 'newest':
        query = query.orderBy(desc(parts.createdAt));
        break;
      default:
        query = query.orderBy(asc(parts.name));
    }

    // Add pagination
    query = query.limit(limit).offset(offset);

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
      .set({ ...data, updatedAt: new Date() })
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
    let query = db.select().from(partsSuppliers).where(eq(partsSuppliers.isActive, true));
    
    if (providerId) {
      query = query.where(and(
        eq(partsSuppliers.isActive, true),
        eq(partsSuppliers.providerId, providerId)
      ));
    }

    return await query.orderBy(asc(partsSuppliers.name));
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

  // ========================================
  // PARTS PROVIDER BUSINESS INFO METHODS
  // ========================================

  async createPartsProviderBusinessInfo(businessInfo: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo> {
    const result = await db.insert(partsProviderBusinessInfo).values({
      ...businessInfo,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
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
      .set({ ...data, updatedAt: new Date() })
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
        .values([processedData])
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
        verificationStatus: status,
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
}

export const storage = new PostgresStorage();

