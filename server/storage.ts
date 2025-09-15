import { eq, and, desc, asc, count, like, ilike, inArray, sql, type SQL, or, gte, lte } from "drizzle-orm";
import { db } from "./db";
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
  insertSupportTicketSchema,
  insertSupportTicketMessageSchema,
  insertFaqSchema,
  insertSupportCallbackRequestSchema,
  insertSupportAgentSchema,
} from "@shared/schema";

// Helper function to safely combine conditions for Drizzle where clauses
function combineConditions(conditions: SQL[]): SQL | undefined {
  if (conditions.length === 0) {
    return undefined;
  } else if (conditions.length === 1) {
    return conditions[0];
  } else {
    return and(...conditions);
  }
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User | undefined>;
  getUsersByRole(role: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User[]>;
  searchUsers(search: string, role?: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User[]>;
  getUsersCount(): Promise<number>;
  
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  upsertUser(user: UpsertUser): Promise<User>;

  // Service Category methods
  getServiceCategories(activeOnly?: boolean): Promise<ServiceCategory[]>;
  getServiceCategoriesByLevel(level: number, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getMainCategories(activeOnly?: boolean): Promise<ServiceCategory[]>;
  getSubCategories(parentId: string, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getSubcategories(parentId: string, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getCategoryHierarchy(parentId?: string): Promise<ServiceCategory[]>;
  getServiceCategory(id: string): Promise<ServiceCategory | undefined>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  updateServiceCategory(id: string, data: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined>;
  deleteServiceCategory(id: string): Promise<{ success: boolean; message: string }>;
  reorderCategories(categoryIds: string[], startSortOrder?: number): Promise<void>;
  generateCategorySlug(name: string, parentId?: string): Promise<string>;

  // Service methods
  getServices(filters?: { categoryId?: string; isActive?: boolean }): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service>;
  updateService(id: string, data: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<Service | undefined>;
  getServicesByCategory(categoryId: string): Promise<Service[]>;

  // Order methods
  getOrders(filters?: { userId?: string; status?: string; limit?: number }): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithDetails(id: string): Promise<any>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;
  getOrdersByUser(userId: string, status?: string): Promise<Order[]>;
  getOrdersByProvider(providerId: string, status?: string): Promise<Order[]>;
  getRecentOrders(userId: string, limit?: number): Promise<Order[]>;
  getOrdersCount(): Promise<number>;
  
  // Order status and assignment methods
  validateStatusUpdate(orderId: string, newStatus: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }>;
  canProviderAcceptOrder(orderId: string, providerId: string): Promise<{ allowed: boolean; reason?: string }>;
  assignProviderToOrder(orderId: string, providerId: string): Promise<Order | undefined>;
  canCancelOrder(orderId: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }>;

  // Enhanced Parts methods
  getParts(filters?: { categoryId?: string; providerId?: string; isActive?: boolean; search?: string; sortBy?: string; limit?: number; offset?: number; inStock?: boolean }): Promise<Part[]>;
  getPart(id: string): Promise<Part | undefined>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: string, data: Partial<InsertPart>): Promise<Part | undefined>;
  getPartsByProvider(providerId: string): Promise<Part[]>;
  getLowStockParts(providerId: string, threshold?: number): Promise<Part[]>;
  getPartsByCategory(categoryId: string, isActive?: boolean): Promise<Part[]>;
  bulkUpdateParts(updates: { id: string; data: Partial<InsertPart> }[]): Promise<Part[]>;
  generatePartSlug(name: string, providerId: string): Promise<string>;
  getPartsStats(providerId?: string): Promise<{
    totalParts: number;
    activeParts: number;
    lowStockParts: number;
    outOfStockParts: number;
    totalValue: number;
  }>;

  // Parts Provider Business Information methods
  getPartsProviderBusinessInfo(userId: string): Promise<PartsProviderBusinessInfo | undefined>;
  createPartsProviderBusinessInfo(businessInfo: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo>;
  updatePartsProviderBusinessInfo(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined>;
  getPartsProvidersByVerificationStatus(status: string): Promise<PartsProviderBusinessInfo[]>;
  verifyPartsProvider(userId: string, verificationData: {
    isVerified: boolean;
    verificationStatus: string;
    verificationNotes?: string;
  }): Promise<PartsProviderBusinessInfo | undefined>;

  // Parts Inventory Movement methods
  getPartsInventoryMovements(filters?: { partId?: string; providerId?: string; movementType?: string; limit?: number }): Promise<PartsInventoryMovement[]>;
  createPartsInventoryMovement(movement: InsertPartsInventoryMovement): Promise<PartsInventoryMovement>;
  getPartsInventoryHistory(partId: string): Promise<PartsInventoryMovement[]>;
  recordStockMovement(params: {
    partId: string;
    providerId: string;
    movementType: string;
    quantity: number;
    reason?: string;
    orderId?: string;
    costPrice?: number;
  }): Promise<PartsInventoryMovement>;

  // Parts Bulk Upload methods
  getPartsBulkUploads(providerId: string): Promise<PartsBulkUpload[]>;
  createPartsBulkUpload(upload: InsertPartsBulkUpload): Promise<PartsBulkUpload>;
  updatePartsBulkUpload(id: string, data: Partial<InsertPartsBulkUpload>): Promise<PartsBulkUpload | undefined>;
  processBulkUpload(uploadId: string, partsData: any[]): Promise<{ success: number; errors: { row: number; field: string; message: string }[] }>;

  // Parts Supplier methods
  getPartsSuppliers(providerId: string): Promise<PartsSupplier[]>;
  getPartsSupplier(id: string): Promise<PartsSupplier | undefined>;
  createPartsSupplier(supplier: InsertPartsSupplier): Promise<PartsSupplier>;
  updatePartsSupplier(id: string, data: Partial<InsertPartsSupplier>): Promise<PartsSupplier | undefined>;
  deletePartsSupplier(id: string): Promise<boolean>;
  
  // SECURITY: Inventory and price validation methods
  validateInventoryAvailability(items: { id: string; quantity: number; type: 'service' | 'part' }[]): Promise<{ valid: boolean; errors: string[]; unavailableItems: { id: string; requested: number; available: number }[] }>;
  validateOrderPricing(items: { id: string; price: number; quantity: number; type: 'service' | 'part' }[]): Promise<{ valid: boolean; errors: string[]; calculatedTotal: number }>;
  atomicDecrementInventory(partUpdates: { partId: string; quantity: number }[]): Promise<{ success: boolean; errors: string[] }>;

  // Parts Category methods
  getPartsCategories(activeOnly?: boolean): Promise<PartsCategory[]>;
  
  // Wallet methods
  getWalletBalance(userId: string): Promise<{ balance: string; fixiPoints: number }>;
  getWalletTransactions(userId: string, limit?: number): Promise<WalletTransaction[]>;
  getWalletTransactionByReference(reference: string): Promise<WalletTransaction | undefined>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit'): Promise<void>;
  // Atomic wallet operations for order payments
  processWalletPayment(params: {
    userId: string;
    orderId: string;
    amount: number;
    description: string;
    partItems?: { partId: string; quantity: number }[];
    idempotencyKey?: string;
  }): Promise<{ success: boolean; transaction?: WalletTransaction; errors?: string[]; }>;

  // Provider methods
  getServiceProviders(filters?: { categoryId?: string; isVerified?: boolean; verificationStatus?: string }): Promise<ServiceProvider[]>;
  getServiceProvider(userId: string): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined>;
  
  // Enhanced verification methods
  getPendingVerifications(limit?: number): Promise<ServiceProvider[]>;
  updateVerificationStatus(userId: string, params: {
    verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'resubmission_required';
    verifiedBy?: string;
    rejectionReason?: string;
    verificationNotes?: string;
    resubmissionReason?: string;
  }): Promise<ServiceProvider | undefined>;
  getVerificationHistory(userId: string): Promise<any[]>;
  
  // Document management
  validateDocumentUpload(fileData: { filename: string; size: number; mimetype: string; documentType: string }): Promise<{ valid: boolean; errors: string[] }>;
  storeProviderDocument(userId: string, documentType: string, documentData: any): Promise<{ success: boolean; url?: string; error?: string }>;

  // Chat methods
  getChatMessages(orderId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(orderId: string, userId: string): Promise<void>;
  
  // Enhanced conversation methods
  getChatMessagesByConversation(conversationId: string, userId: string): Promise<ChatMessage[]>;
  getUserConversations(userId: string, limit?: number): Promise<any[]>;
  updateChatMessage(messageId: string, data: Partial<ChatMessage>): Promise<ChatMessage | undefined>;

  // Notification methods
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;

  // Review methods
  getReviews(filters?: { orderId?: string; revieweeId?: string }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Coupon methods
  getCoupon(code: string): Promise<Coupon | undefined>;
  getActiveCoupons(): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  useCoupon(code: string): Promise<void>;

  // Settings methods
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown, description?: string): Promise<void>;

  // User Address methods
  getUserAddresses(userId: string): Promise<UserAddress[]>;
  getUserAddress(id: string): Promise<UserAddress | undefined>;
  createUserAddress(address: InsertUserAddress): Promise<UserAddress>;
  updateUserAddress(id: string, data: Partial<InsertUserAddress>): Promise<UserAddress | undefined>;
  deleteUserAddress(id: string): Promise<void>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;
  getUserDefaultAddress(userId: string): Promise<UserAddress | undefined>;

  // User Notification Preferences methods
  getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | undefined>;
  createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
  updateUserNotificationPreferences(userId: string, data: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences | undefined>;
  upsertUserNotificationPreferences(userId: string, data: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences>;

  // TODO: Implement locale preferences following backend guidelines
  // - Define proper schemas in shared/schema.ts first
  // - Add Zod validation schemas  
  // - Update IStorage interface with proper typing

  // Enhanced AI Search methods
  searchServices(filters: {
    query: string;
    categories?: string[];
    priceRange?: { min: number; max: number };
    location?: { latitude: number; longitude: number; maxDistance?: number };
    urgency?: 'low' | 'medium' | 'high';
    limit?: number;
    offset?: number;
  }): Promise<{
    services: (Service & { category: ServiceCategory })[];
    total: number;
    suggestions: string[];
  }>;

  searchParts(filters: {
    query: string;
    categories?: string[];
    priceRange?: { min: number; max: number };
    inStockOnly?: boolean;
    providerId?: string;
    specifications?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<{
    parts: (Part & { category: PartsCategory })[];
    total: number;
    suggestions: string[];
  }>;

  getPersonalizedSuggestions(userId: string, type: 'services' | 'parts' | 'mixed', limit?: number): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    reasons: string[];
  }>;

  getTrendingItems(type: 'services' | 'parts' | 'mixed', limit?: number): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    trendingReasons: string[];
  }>;

  getSimilarItems(itemId: string, itemType: 'service' | 'part', limit?: number): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    similarityScores: Record<string, number>;
  }>;

  getSearchSuggestions(query: string, userId?: string): Promise<string[]>;

  trackSearchQuery(userId: string | null | undefined, query: string, results: number, category?: string): Promise<void>;

  getUserSearchHistory(userId: string, limit?: number): Promise<{
    query: string;
    timestamp: Date;
    results: number;
  }[]>;

  getPopularSearchQueries(limit?: number): Promise<{
    query: string;
    count: number;
    category?: string;
  }[]>;

  // OTP Challenge methods
  createOtpChallenge(challenge: InsertOtpChallenge): Promise<OtpChallenge>;
  getOtpChallenge(phone: string): Promise<OtpChallenge | undefined>;
  getOtpChallengeById(id: string): Promise<OtpChallenge | undefined>;
  updateOtpChallenge(id: string, data: Partial<InsertOtpChallenge>): Promise<OtpChallenge | undefined>;
  expireOtpChallenge(id: string): Promise<void>;
  incrementOtpAttempts(id: string): Promise<OtpChallenge | undefined>;
  expireOtpChallenges(phone: string): Promise<void>;
  getActiveOtpChallenge(phone: string): Promise<OtpChallenge | undefined>;
  getRecentOtpChallenges(phone: string, seconds: number): Promise<OtpChallenge[]>;
  getRecentOtpChallengesByIp(ip: string, seconds: number): Promise<OtpChallenge[]>;
  getOtpStatistics(hours: number): Promise<{
    totalSent: number;
    totalVerified: number;
    successRate: number;
  }>;
  cleanupExpiredOtpChallenges(): Promise<void>;

  // User Session methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(userId: string, refreshTokenHash: string): Promise<UserSession | undefined>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  revokeUserSession(sessionId: string): Promise<void>; // SECURITY FIX: Revoke by sessionId not database id
  revokeUserSessionById(id: string): Promise<void>; // Keep old method for compatibility
  revokeAllUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;

  // Payment Method operations
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  getUserPaymentMethods(userId: string, activeOnly?: boolean): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;
  updateUserPaymentMethodDefaults(userId: string, isDefault: boolean): Promise<void>;

  // Stripe Customer operations
  createStripeCustomer(customer: InsertStripeCustomer): Promise<StripeCustomer>;
  getStripeCustomer(userId: string): Promise<StripeCustomer | undefined>;
  getStripeCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomer | undefined>;
  updateStripeCustomer(userId: string, data: Partial<InsertStripeCustomer>): Promise<StripeCustomer | undefined>;

  // Payment Intent operations
  createPaymentIntent(paymentIntent: InsertPaymentIntent): Promise<PaymentIntent>;
  getPaymentIntent(id: string): Promise<PaymentIntent | undefined>;
  getPaymentIntentByStripeId(stripePaymentIntentId: string): Promise<PaymentIntent | undefined>;
  updatePaymentIntent(stripePaymentIntentId: string, data: Partial<InsertPaymentIntent>): Promise<PaymentIntent | undefined>;
  getUserPaymentIntents(userId: string, status?: string): Promise<PaymentIntent[]>;

  // Order payment operations
  updateOrderPaymentStatus(orderId: string, status: 'pending' | 'paid' | 'failed' | 'refunded'): Promise<Order | undefined>;

  // Service Booking methods
  createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking>;
  getServiceBooking(id: string): Promise<ServiceBooking | undefined>;
  getServiceBookingWithDetails(id: string): Promise<any>;
  updateServiceBooking(id: string, data: Partial<InsertServiceBooking>): Promise<ServiceBooking | undefined>;
  getUserServiceBookings(userId: string, options?: {
    status?: string;
    bookingType?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceBooking[]>;
  validateBookingStatusUpdate(bookingId: string, newStatus: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }>;
  canCancelServiceBooking(bookingId: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }>;

  // Provider Job Request methods
  createProviderJobRequest(request: InsertProviderJobRequest): Promise<ProviderJobRequest>;
  getProviderJobRequest(bookingId: string, providerId: string): Promise<ProviderJobRequest | undefined>;
  getProviderJobRequests(providerId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProviderJobRequest[]>;
  acceptProviderJobRequest(bookingId: string, providerId: string, details?: {
    estimatedArrival?: Date;
    quotedPrice?: number;
    notes?: string;
  }): Promise<{ success: boolean; message?: string; booking?: ServiceBooking }>;
  declineProviderJobRequest(bookingId: string, providerId: string, reason?: string): Promise<{ success: boolean; message?: string }>;
  cancelOtherJobRequests(bookingId: string, acceptedProviderId: string): Promise<void>;
  cancelAllJobRequests(bookingId: string): Promise<void>;

  // Provider Matching methods
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

  // Support Ticket methods
  getSupportTickets(userId?: string, filters?: { status?: string; category?: string; priority?: string }): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  closeSupportTicket(id: string, resolutionNotes?: string): Promise<SupportTicket | undefined>;
  assignSupportTicket(id: string, agentId: string): Promise<SupportTicket | undefined>;
  getSupportTicketsByAgent(agentId: string, status?: string): Promise<SupportTicket[]>;
  generateTicketNumber(): Promise<string>;
  
  // Support Ticket Message methods
  getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]>;
  createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage>;
  markMessagesAsRead(ticketId: string, userId: string): Promise<void>;
  
  // FAQ methods
  getFAQs(category?: string, published?: boolean): Promise<FAQ[]>;
  getFAQ(id: string): Promise<FAQ | undefined>;
  searchFAQs(query: string, category?: string): Promise<FAQ[]>;
  createFAQ(faq: InsertFAQ): Promise<FAQ>;
  updateFAQ(id: string, data: Partial<InsertFAQ>): Promise<FAQ | undefined>;
  deleteFAQ(id: string): Promise<boolean>;
  incrementFAQHelpfulCount(id: string, isHelpful: boolean): Promise<void>;
  
  // Support Callback Request methods
  getSupportCallbackRequests(userId?: string, status?: string): Promise<SupportCallbackRequest[]>;
  getSupportCallbackRequest(id: string): Promise<SupportCallbackRequest | undefined>;
  createSupportCallbackRequest(request: InsertSupportCallbackRequest): Promise<SupportCallbackRequest>;
  updateSupportCallbackRequest(id: string, data: Partial<InsertSupportCallbackRequest>): Promise<SupportCallbackRequest | undefined>;
  
  // Support Agent methods
  getSupportAgents(department?: string, isActive?: boolean): Promise<SupportAgent[]>;
  getSupportAgent(userId: string): Promise<SupportAgent | undefined>;
  createSupportAgent(agent: InsertSupportAgent): Promise<SupportAgent>;
  updateSupportAgent(userId: string, data: Partial<InsertSupportAgent>): Promise<SupportAgent | undefined>;
  updateAgentStatus(userId: string, status: 'available' | 'busy' | 'away' | 'offline', statusMessage?: string): Promise<void>;
  getAvailableAgents(department?: string, skills?: string[]): Promise<SupportAgent[]>;
  
  // Support Analytics methods
  getSupportStats(): Promise<{
    openTickets: number;
    totalTickets: number;
    avgResponseTime: string;
    resolutionRate: number;
    satisfactionScore: number;
  }>;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    console.log(`🔍 storage.getUser: Looking for user with id: "${id}"`);
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    console.log(`🔍 storage.getUser: Found ${result.length} users for id: "${id}"`);
    if (result.length > 0) {
      console.log(`✅ storage.getUser: User found - id: ${result[0].id}, role: ${result[0].role}`);
    } else {
      console.log(`❌ storage.getUser: No user found for id: "${id}"`);
    }
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
    console.log('Creating user in PostgreSQL:', user);
    const result = await db.insert(users).values({
      ...user,
      updatedAt: new Date(),
    }).returning();
    console.log('User created successfully:', result[0]);
    return result[0];
  }

  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserRole(id: string, role: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getUsersByRole(role: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async searchUsers(search: string, role?: "user" | "service_provider" | "parts_provider" | "admin"): Promise<User[]> {
    const searchTerm = `%${search.toLowerCase()}%`;
    let baseQuery = db.select().from(users);
    
    if (role) {
      return await baseQuery
        .where(and(
          eq(users.role, role),
          sql`LOWER(${users.firstName}) LIKE ${searchTerm} OR LOWER(${users.lastName}) LIKE ${searchTerm} OR LOWER(${users.email}) LIKE ${searchTerm}`
        ));
    } else {
      return await baseQuery
        .where(sql`LOWER(${users.firstName}) LIKE ${searchTerm} OR LOWER(${users.lastName}) LIKE ${searchTerm} OR LOWER(${users.email}) LIKE ${searchTerm}`);
    }
  }

  async getUsersCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count;
  }

  // User Session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions).values(session).returning();
    return result[0];
  }

  async getUserSession(userId: string, refreshTokenHash: string): Promise<UserSession | undefined> {
    const result = await db.select().from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.refreshTokenHash, refreshTokenHash),
        sql`${userSessions.revokedAt} IS NULL`
      ))
      .limit(1);
    return result[0];
  }

  async revokeUserSession(sessionId: string): Promise<void> {
    // SECURITY FIX: Revoke by sessionId not database id
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeUserSessionById(id: string): Promise<void> {
    // Keep old method for compatibility
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.id, id));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.userId, userId));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(userSessions)
      .where(sql`${userSessions.expiresAt} < NOW() OR ${userSessions.revokedAt} IS NOT NULL`);
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await db.select().from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        gte(userSessions.expiresAt, new Date()),
        sql`${userSessions.revokedAt} IS NULL`
      ))
      .orderBy(desc(userSessions.createdAt));
  }

  // Service Category methods
  async getServiceCategories(activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: SQL[] = [];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    const whereClause = combineConditions(conditions);
    const query = db.select().from(serviceCategories)
      .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    
    if (whereClause) {
      return await query.where(whereClause);
    } else {
      return await query;
    }
  }

  async getServiceCategoriesByLevel(level: number, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: SQL[] = [eq(serviceCategories.level, level)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    return await db.select().from(serviceCategories)
      .where(combineConditions(conditions)!)
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
  }

  async getMainCategories(activeOnly = true): Promise<ServiceCategory[]> {
    // Main categories are level 0 (top-level categories)
    return await this.getServiceCategoriesByLevel(0, activeOnly);
  }

  async getSubCategories(parentId: string, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: SQL[] = [eq(serviceCategories.parentId, parentId)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    return await db.select().from(serviceCategories)
      .where(combineConditions(conditions)!)
      .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
  }

  async getSubcategories(parentId: string, activeOnly = true): Promise<ServiceCategory[]> {
    // Alias for getSubCategories to match routes.ts method calls
    return await this.getSubCategories(parentId, activeOnly);
  }

  async getCategoryHierarchy(parentId?: string): Promise<ServiceCategory[]> {
    if (parentId) {
      // Get all descendants of a specific category
      const conditions: SQL[] = [eq(serviceCategories.parentId, parentId)];
      return await db.select().from(serviceCategories)
        .where(combineConditions(conditions)!)
        .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    } else {
      // Get all categories ordered by hierarchy
      return await db.select().from(serviceCategories)
        .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    }
  }

  async getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
    const result = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
    return result[0];
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    // Auto-generate slug if not provided
    if (!category.slug) {
      category.slug = await this.generateCategorySlug(category.name, category.parentId || undefined);
    }
    
    // Set level based on parent
    if (category.parentId) {
      const parent = await this.getServiceCategory(category.parentId);
      if (parent) {
        category.level = (parent.level || 0) + 1;
      }
    } else {
      category.level = 0; // Main category
    }
    
    // Set sort order if not provided
    if (category.sortOrder === undefined) {
      const siblings = await this.getSubCategories(category.parentId || '', false);
      category.sortOrder = siblings.length;
    }
    
    const result = await db.insert(serviceCategories).values(category).returning();
    return result[0];
  }

  async updateServiceCategory(id: string, data: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
    // Update slug if name changed
    if (data.name && !data.slug) {
      const currentCategory = await this.getServiceCategory(id);
      if (currentCategory) {
        data.slug = await this.generateCategorySlug(data.name, currentCategory.parentId || undefined);
      }
    }
    
    const result = await db.update(serviceCategories)
      .set(data)
      .where(eq(serviceCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceCategory(id: string): Promise<{ success: boolean; message: string }> {
    // Check if category has subcategories
    const subCategories = await this.getSubCategories(id, false);
    if (subCategories.length > 0) {
      return {
        success: false,
        message: `Cannot delete category with ${subCategories.length} subcategories. Please delete or move subcategories first.`
      };
    }
    
    // Check if category has services
    const services = await this.getServicesByCategory(id);
    if (services.length > 0) {
      return {
        success: false,
        message: `Cannot delete category with ${services.length} services. Please move services to another category first.`
      };
    }
    
    await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return { success: true, message: 'Category deleted successfully' };
  }

  async reorderCategories(categoryIds: string[], startSortOrder = 0): Promise<void> {
    for (let i = 0; i < categoryIds.length; i++) {
      await db.update(serviceCategories)
        .set({ sortOrder: startSortOrder + i })
        .where(eq(serviceCategories.id, categoryIds[i]));
    }
  }

  async generateCategorySlug(name: string, parentId?: string): Promise<string> {
    let baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check for uniqueness within the same level
    while (true) {
      const existing = await db.select().from(serviceCategories)
        .where(and(
          eq(serviceCategories.slug, slug),
          parentId ? eq(serviceCategories.parentId, parentId) : sql`${serviceCategories.parentId} IS NULL`
        ))
        .limit(1);
      
      if (existing.length === 0) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  // Service methods
  async getServices(filters?: { categoryId?: string; isActive?: boolean }): Promise<Service[]> {
    let baseQuery = db.select().from(services);
    
    const conditions: SQL[] = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(services.isActive, filters.isActive));
    }
    if (filters?.categoryId && filters.categoryId !== 'all') {
      conditions.push(eq(services.categoryId, filters.categoryId));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      return await baseQuery.where(whereClause).execute();
    } else {
      return await baseQuery.execute();
    }
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const result = await db.update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return result[0];
  }

  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    return await db.select().from(services)
      .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)))
      .execute();
  }

  // Order methods
  async getOrders(filters?: { userId?: string; status?: string; limit?: number }): Promise<Order[]> {
    let baseQuery = db.select().from(orders);
    
    const conditions: SQL[] = [];
    if (filters?.userId) {
      conditions.push(eq(orders.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "refunded"));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    baseQuery = baseQuery.orderBy(desc(orders.createdAt));
    
    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    
    return await baseQuery.execute();
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    // Handle location field type properly
    const orderData = {
      ...order,
      location: order.location ? {
        ...order.location,
        instructions: typeof order.location.instructions === 'string' ? order.location.instructions : undefined
      } : order.location
    };
    const result = await db.insert(orders).values(orderData).returning();
    return result[0];
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    // Handle location field type properly
    const updateData = {
      ...data,
      location: data.location ? {
        ...data.location,
        instructions: typeof data.location.instructions === 'string' ? data.location.instructions : undefined
      } : data.location
    };
    const result = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getOrdersByUser(userId: string, status?: string): Promise<Order[]> {
    const conditions: SQL[] = [eq(orders.userId, userId)];
    
    if (status) {
      conditions.push(eq(orders.status, status as "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "refunded"));
    }
    
    const whereClause = combineConditions(conditions);
    return await db.select().from(orders)
      .where(whereClause!)
      .orderBy(desc(orders.createdAt))
      .execute();
  }

  async getOrdersByProvider(providerId: string, status?: string): Promise<Order[]> {
    const providerCondition = sql`${orders.serviceProviderId} = ${providerId} OR ${orders.partsProviderId} = ${providerId}`;
    const conditions: SQL[] = [providerCondition];
    
    if (status) {
      conditions.push(eq(orders.status, status as "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "refunded"));
    }
    
    const whereClause = combineConditions(conditions);
    return await db.select().from(orders)
      .where(whereClause!)
      .orderBy(desc(orders.createdAt));
  }

  async getRecentOrders(userId: string, limit = 3): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getOrdersCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(orders);
    return result[0].count;
  }

  // Enhanced order methods with joined data
  async getOrderWithDetails(id: string): Promise<any> {
    // Get order with user and provider details
    const orderResult = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!orderResult[0]) return undefined;
    
    const order = orderResult[0];
    
    // Get customer details
    const user = await this.getUser(order.userId!);
    
    // Get service provider details if assigned
    let serviceProvider = null;
    if (order.serviceProviderId) {
      const providerUser = await this.getUser(order.serviceProviderId);
      const providerProfile = await this.getServiceProvider(order.serviceProviderId);
      serviceProvider = providerUser ? {
        id: providerUser.id,
        firstName: providerUser.firstName,
        lastName: providerUser.lastName,
        phone: providerUser.phone,
        email: providerUser.email,
        rating: providerProfile?.rating || '0.00',
        isVerified: providerProfile?.isVerified || false,
      } : null;
    }
    
    // Get parts provider details if assigned
    let partsProvider = null;
    if (order.partsProviderId) {
      const providerUser = await this.getUser(order.partsProviderId);
      partsProvider = providerUser ? {
        id: providerUser.id,
        firstName: providerUser.firstName,
        lastName: providerUser.lastName,
        phone: providerUser.phone,
        email: providerUser.email,
      } : null;
    }
    
    return {
      ...order,
      user: user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      } : null,
      serviceProvider,
      partsProvider,
    };
  }

  async validateStatusUpdate(orderId: string, newStatus: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return { allowed: false, reason: 'Order not found' };
    }

    const currentStatus = order.status;
    
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'pending': ['accepted', 'cancelled'],
      'accepted': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // Cannot change completed orders
      'cancelled': [], // Cannot change cancelled orders
      'refunded': [] // Cannot change refunded orders
    };

    // Check if transition is valid
    if (!currentStatus || !validTransitions[currentStatus]?.includes(newStatus)) {
      return { allowed: false, reason: `Cannot change status from ${currentStatus} to ${newStatus}` };
    }

    // Role-based permissions
    switch (userRole) {
      case 'admin':
        return { allowed: true }; // Admins can make any valid transition
      
      case 'service_provider':
        // Service providers can only update their own orders
        if (order.serviceProviderId !== userId && order.partsProviderId !== userId) {
          return { allowed: false, reason: 'Not assigned to this order' };
        }
        // Providers can accept, start work, and complete
        if (['accepted', 'in_progress', 'completed'].includes(newStatus)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Service providers cannot set this status' };
      
      case 'user':
        // Users can only cancel pending orders
        if (order.userId !== userId) {
          return { allowed: false, reason: 'Not your order' };
        }
        if (newStatus === 'cancelled' && currentStatus === 'pending') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Users can only cancel pending orders' };
      
      default:
        return { allowed: false, reason: 'Invalid user role' };
    }
  }

  async canProviderAcceptOrder(orderId: string, providerId: string): Promise<{ allowed: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return { allowed: false, reason: 'Order not found' };
    }

    if (order.status !== 'pending') {
      return { allowed: false, reason: 'Order is no longer available for acceptance' };
    }

    if (order.serviceProviderId || order.partsProviderId) {
      return { allowed: false, reason: 'Order already has an assigned provider' };
    }

    // Check if provider is verified and active
    const provider = await this.getServiceProvider(providerId);
    if (!provider) {
      return { allowed: false, reason: 'Service provider profile not found' };
    }

    // SECURITY: Check verification status - only approved providers can accept orders
    if (provider.verificationStatus !== 'approved') {
      return { allowed: false, reason: `Provider verification required. Current status: ${provider.verificationStatus}` };
    }

    const user = await this.getUser(providerId);
    if (!user || !user.isActive) {
      return { allowed: false, reason: 'Provider account is not active' };
    }

    // Check if provider's category matches order items (basic check)
    const hasServiceItems = order.items?.some(item => item.type === 'service');
    const hasPartItems = order.items?.some(item => item.type === 'part');
    
    if (hasServiceItems && order.type === 'service') {
      // For service orders, check if provider's category matches
      return { allowed: true };
    }

    if (hasPartItems && order.type === 'parts') {
      // For parts orders, any parts provider can accept
      const userRole = user.role;
      if (userRole === 'parts_provider') {
        return { allowed: true };
      }
    }

    return { allowed: true }; // Allow by default for now
  }

  async assignProviderToOrder(orderId: string, providerId: string): Promise<Order | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Determine if this is a service or parts provider
    const user = await this.getUser(providerId);
    if (!user) {
      throw new Error('Provider not found');
    }

    const updateData: Partial<InsertOrder> = {
      status: 'accepted'
    };

    if (user.role === 'service_provider' || order.type === 'service') {
      updateData.serviceProviderId = providerId;
    } else if (user.role === 'parts_provider' || order.type === 'parts') {
      updateData.partsProviderId = providerId;
    } else {
      // Default to service provider
      updateData.serviceProviderId = providerId;
    }

    return await this.updateOrder(orderId, updateData);
  }

  async canCancelOrder(orderId: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return { allowed: false, reason: 'Order not found' };
    }

    // Check if order is already cancelled or completed
    if (order.status && ['cancelled', 'completed', 'refunded'].includes(order.status)) {
      return { allowed: false, reason: `Cannot cancel ${order.status} order` };
    }

    // Role-based cancellation rules
    switch (userRole) {
      case 'admin':
        return { allowed: true }; // Admins can cancel any order
      
      case 'user':
        // Users can only cancel their own orders
        if (order.userId !== userId) {
          return { allowed: false, reason: 'Not your order' };
        }
        
        // Users can cancel pending orders anytime, accepted orders within time limit
        if (order.status === 'pending') {
          return { allowed: true };
        }
        
        if (order.status === 'accepted') {
          // Check if order was scheduled for future (allow cancellation if more than 2 hours away)
          if (order.scheduledAt) {
            const scheduledTime = new Date(order.scheduledAt);
            const now = new Date();
            const hoursUntilService = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            if (hoursUntilService > 2) {
              return { allowed: true };
            } else {
              return { allowed: false, reason: 'Cannot cancel less than 2 hours before scheduled time' };
            }
          }
          return { allowed: true };
        }
        
        return { allowed: false, reason: 'Cannot cancel orders in progress' };
      
      case 'service_provider':
        // Providers can cancel orders assigned to them (with penalties in real app)
        if (order.serviceProviderId !== userId && order.partsProviderId !== userId) {
          return { allowed: false, reason: 'Not assigned to this order' };
        }
        
        if (order.status === 'in_progress') {
          return { allowed: false, reason: 'Cannot cancel orders already in progress' };
        }
        
        return { allowed: true };
      
      default:
        return { allowed: false, reason: 'Invalid user role' };
    }
  }

  // Parts methods
  async getParts(filters?: { categoryId?: string; providerId?: string; isActive?: boolean; sortBy?: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'rating' }): Promise<Part[]> {
    let baseQuery = db.select().from(parts);
    
    const conditions: SQL[] = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(parts.isActive, filters.isActive));
    }
    if (filters?.categoryId) {
      conditions.push(eq(parts.categoryId, filters.categoryId));
    }
    if (filters?.providerId) {
      conditions.push(eq(parts.providerId, filters.providerId));
    }
    
    const whereClause = combineConditions(conditions);
    
    // FIXED: Reliable sorting with proper fallbacks
    let sortedQuery = baseQuery;
    if (whereClause) {
      sortedQuery = baseQuery.where(whereClause);
    }
    
    // Apply sorting (default to newest first)
    const sortBy = filters?.sortBy || 'newest';
    switch (sortBy) {
      case 'newest':
        return await sortedQuery.orderBy(desc(parts.createdAt));
      case 'oldest':
        return await sortedQuery.orderBy(asc(parts.createdAt));
      case 'price-asc':
        return await sortedQuery.orderBy(asc(parts.price));
      case 'price-desc':
        return await sortedQuery.orderBy(desc(parts.price));
      case 'rating':
        return await sortedQuery.orderBy(desc(parts.rating), desc(parts.createdAt));
      default:
        return await sortedQuery.orderBy(desc(parts.createdAt));
    }
  }

  async getPart(id: string): Promise<Part | undefined> {
    const result = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
    return result[0];
  }

  async createPart(part: InsertPart): Promise<Part> {
    const result = await db.insert(parts).values(part).returning();
    return result[0];
  }

  async updatePart(id: string, data: Partial<InsertPart>): Promise<Part | undefined> {
    const result = await db.update(parts)
      .set(data)
      .where(eq(parts.id, id))
      .returning();
    return result[0];
  }

  async getPartsByProvider(providerId: string): Promise<Part[]> {
    return await db.select().from(parts).where(eq(parts.providerId, providerId));
  }

  async getLowStockParts(providerId: string, threshold = 10): Promise<Part[]> {
    return await db.select().from(parts)
      .where(and(eq(parts.providerId, providerId), sql`${parts.stock} < ${threshold}`));
  }

  // SECURITY: Critical inventory validation to prevent overselling
  async validateInventoryAvailability(items: { id: string; quantity: number; type: 'service' | 'part' }[]): Promise<{ valid: boolean; errors: string[]; unavailableItems: { id: string; requested: number; available: number }[] }> {
    const errors: string[] = [];
    const unavailableItems: { id: string; requested: number; available: number }[] = [];

    // Only validate parts items for stock (services don't have inventory constraints)
    const partItems = items.filter(item => item.type === 'part');
    
    if (partItems.length === 0) {
      return { valid: true, errors: [], unavailableItems: [] };
    }

    for (const item of partItems) {
      const part = await this.getPart(item.id);
      
      if (!part) {
        errors.push(`Part with ID ${item.id} not found`);
        continue;
      }

      if (!part.isActive) {
        errors.push(`Part "${part.name}" is no longer available`);
        continue;
      }

      const availableStock = part.stock || 0;
      if (availableStock < item.quantity) {
        errors.push(`Insufficient stock for "${part.name}". Requested: ${item.quantity}, Available: ${availableStock}`);
        unavailableItems.push({
          id: item.id,
          requested: item.quantity,
          available: availableStock
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      unavailableItems
    };
  }

  // SECURITY: Critical price validation to prevent fraud
  async validateOrderPricing(items: { id: string; price: number; quantity: number; type: 'service' | 'part' }[]): Promise<{ valid: boolean; errors: string[]; calculatedTotal: number }> {
    const errors: string[] = [];
    let calculatedTotal = 0;

    for (const item of items) {
      let actualPrice: number;

      if (item.type === 'part') {
        const part = await this.getPart(item.id);
        if (!part) {
          errors.push(`Part with ID ${item.id} not found`);
          continue;
        }
        actualPrice = parseFloat(part.price);
      } else if (item.type === 'service') {
        const service = await this.getService(item.id);
        if (!service) {
          errors.push(`Service with ID ${item.id} not found`);
          continue;
        }
        actualPrice = parseFloat(service.basePrice);
      } else {
        errors.push(`Invalid item type: ${item.type}`);
        continue;
      }

      // Compare client price with database price (allow small floating-point differences)
      if (Math.abs(item.price - actualPrice) > 0.01) {
        errors.push(`Price mismatch for item ${item.id}. Expected: ₹${actualPrice}, Received: ₹${item.price}`);
        continue;
      }

      calculatedTotal += actualPrice * item.quantity;
    }

    // Add tax (18% GST)
    const tax = calculatedTotal * 0.18;
    const totalWithTax = calculatedTotal + tax;

    return {
      valid: errors.length === 0,
      errors,
      calculatedTotal: totalWithTax
    };
  }

  // SECURITY: Atomic inventory decrement to prevent race conditions and overselling
  async atomicDecrementInventory(partUpdates: { partId: string; quantity: number }[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Use database transaction to ensure atomicity
    try {
      await db.transaction(async (trx) => {
        for (const update of partUpdates) {
          const part = await trx.select().from(parts).where(eq(parts.id, update.partId)).limit(1);
          
          if (!part[0]) {
            throw new Error(`Part ${update.partId} not found`);
          }

          const currentStock = part[0].stock || 0;
          if (currentStock < update.quantity) {
            throw new Error(`Insufficient stock for part ${part[0].name}. Available: ${currentStock}, Requested: ${update.quantity}`);
          }

          const newStock = currentStock - update.quantity;
          await trx.update(parts)
            .set({ 
              stock: newStock,
              totalSold: (part[0].totalSold || 0) + update.quantity
            })
            .where(eq(parts.id, update.partId));
        }
      });

      return { success: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      errors.push(errorMessage);
      return { success: false, errors };
    }
  }

  // Parts Category methods
  async getPartsCategories(activeOnly = true): Promise<PartsCategory[]> {
    if (activeOnly) {
      return await db.select().from(partsCategories).where(eq(partsCategories.isActive, true));
    } else {
      return await db.select().from(partsCategories);
    }
  }

  // Wallet methods
  async getWalletBalance(userId: string): Promise<{ balance: string; fixiPoints: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      balance: user.walletBalance || '0.00',
      fixiPoints: user.fixiPoints || 0,
    };
  }

  async getWalletTransactions(userId: string, limit = 20): Promise<WalletTransaction[]> {
    return await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async getWalletTransactionByReference(reference: string): Promise<WalletTransaction | undefined> {
    const results = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.reference, reference))
      .limit(1);
    return results[0];
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const result = await db.insert(walletTransactions).values(transaction).returning();
    return result[0];
  }

  async updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit'): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const currentBalance = parseFloat(user.walletBalance || '0');
    const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;
    
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }
    
    await this.updateUser(userId, { walletBalance: newBalance.toFixed(2) });
  }

  // ATOMIC wallet payment operation - all operations wrapped in database transaction
  async processWalletPayment(params: {
    userId: string;
    orderId: string;
    amount: number;
    description: string;
    partItems?: { partId: string; quantity: number }[];
    idempotencyKey?: string;
  }): Promise<{ success: boolean; transaction?: WalletTransaction; errors?: string[]; }> {
    const { userId, orderId, amount, description, partItems = [], idempotencyKey } = params;
    const errors: string[] = [];

    try {
      // Use database transaction to ensure atomicity
      const result = await db.transaction(async (trx) => {
        // Step 1: Validate user and wallet balance
        const userResults = await trx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!userResults[0]) {
          throw new Error('User not found');
        }
        
        const user = userResults[0];
        const currentBalance = parseFloat(user.walletBalance || '0');
        
        if (currentBalance < amount) {
          throw new Error(`Insufficient wallet balance. Current: ₹${currentBalance}, Required: ₹${amount}`);
        }
        
        // Step 2: Create wallet transaction record
        const transactionData: InsertWalletTransaction = {
          userId,
          type: 'debit',
          amount: amount.toString(),
          description,
          category: 'payment',
          orderId,
          paymentMethod: 'wallet',
          status: 'completed',
          reference: idempotencyKey
        };
        
        const transactionResults = await trx.insert(walletTransactions).values(transactionData).returning();
        const transaction = transactionResults[0];
        
        // Step 3: Update wallet balance
        const newBalance = (currentBalance - amount).toFixed(2);
        await trx.update(users)
          .set({ walletBalance: newBalance })
          .where(eq(users.id, userId));
        
        // Step 4: Handle inventory for part items (if any)
        if (partItems.length > 0) {
          for (const item of partItems) {
            const partResults = await trx.select().from(parts).where(eq(parts.id, item.partId)).limit(1);
            
            if (!partResults[0]) {
              throw new Error(`Part ${item.partId} not found`);
            }
            
            const part = partResults[0];
            const currentStock = part.stock || 0;
            
            if (currentStock < item.quantity) {
              throw new Error(`Insufficient stock for ${part.name}. Available: ${currentStock}, Required: ${item.quantity}`);
            }
            
            // Decrement inventory
            await trx.update(parts)
              .set({ stock: currentStock - item.quantity })
              .where(eq(parts.id, item.partId));
          }
        }
        
        // Step 5: Update order payment status
        await trx.update(orders)
          .set({ 
            paymentStatus: 'paid',
            status: sql`CASE WHEN status = 'pending' THEN 'accepted' ELSE status END`
          })
          .where(eq(orders.id, orderId));
        
        return { success: true, transaction };
      });
      
      console.log(`✅ Atomic wallet payment completed: ${userId} paid ₹${amount} for order ${orderId}`);
      return result;
      
    } catch (error) {
      console.error('❌ Atomic wallet payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      errors.push(errorMessage);
      return { success: false, errors };
    }
  }

  // Provider methods
  async getServiceProviders(filters?: { categoryId?: string; isVerified?: boolean; verificationStatus?: string }): Promise<ServiceProvider[]> {
    let baseQuery = db.select().from(serviceProviders);
    
    const conditions: SQL[] = [];
    if (filters?.categoryId) {
      conditions.push(eq(serviceProviders.categoryId, filters.categoryId));
    }
    if (filters?.isVerified !== undefined) {
      conditions.push(eq(serviceProviders.isVerified, filters.isVerified));
    }
    if (filters?.verificationStatus) {
      conditions.push(eq(serviceProviders.verificationStatus, filters.verificationStatus));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      return await baseQuery.where(whereClause);
    } else {
      return await baseQuery;
    }
  }

  async getServiceProvider(userId: string): Promise<ServiceProvider | undefined> {
    const result = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId)).limit(1);
    return result[0];
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const result = await db.insert(serviceProviders).values(provider).returning();
    return result[0];
  }

  async updateServiceProvider(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const result = await db.update(serviceProviders)
      .set(data)
      .where(eq(serviceProviders.userId, userId))
      .returning();
    return result[0];
  }

  // Enhanced verification methods
  async getPendingVerifications(limit?: number): Promise<ServiceProvider[]> {
    let query = db.select({
      ...serviceProviders,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      userPhone: users.phone,
    })
    .from(serviceProviders)
    .leftJoin(users, eq(serviceProviders.userId, users.id))
    .where(or(
      eq(serviceProviders.verificationStatus, 'pending'),
      eq(serviceProviders.verificationStatus, 'under_review'),
      eq(serviceProviders.verificationStatus, 'resubmission_required')
    ))
    .orderBy(desc(serviceProviders.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query as any[];
  }

  async updateVerificationStatus(userId: string, params: {
    verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'resubmission_required';
    verifiedBy?: string;
    rejectionReason?: string;
    verificationNotes?: string;
    resubmissionReason?: string;
  }): Promise<ServiceProvider | undefined> {
    const updateData: Partial<InsertServiceProvider> = {
      verificationStatus: params.verificationStatus,
      verificationNotes: params.verificationNotes,
      rejectionReason: params.rejectionReason,
      resubmissionReason: params.resubmissionReason,
      updatedAt: sql`NOW()`,
    };

    // Set verification date and verifiedBy only for final states
    if (params.verificationStatus === 'approved' || params.verificationStatus === 'rejected') {
      updateData.verificationDate = sql`NOW()`;
      updateData.verifiedBy = params.verifiedBy;
      updateData.isVerified = params.verificationStatus === 'approved';
      
      // Set verification level based on approval
      if (params.verificationStatus === 'approved') {
        updateData.verificationLevel = 'verified';
      } else {
        updateData.verificationLevel = 'none';
      }
    }

    const result = await db.update(serviceProviders)
      .set(updateData)
      .where(eq(serviceProviders.userId, userId))
      .returning();

    return result[0];
  }

  async getVerificationHistory(userId: string): Promise<any[]> {
    // For now, return a simple history based on current state
    // In a more advanced implementation, you'd have a separate verification_history table
    const provider = await this.getServiceProvider(userId);
    if (!provider) return [];

    const history = [];
    
    if (provider.verificationDate) {
      history.push({
        status: provider.isVerified ? 'approved' : 'rejected',
        date: provider.verificationDate,
        verifiedBy: provider.verifiedBy,
        notes: provider.verificationNotes,
        rejectionReason: provider.rejectionReason,
      });
    }

    history.push({
      status: 'pending',
      date: provider.createdAt,
      notes: 'Initial application submitted',
    });

    return history.reverse(); // Show chronological order
  }

  async validateDocumentUpload(fileData: { filename: string; size: number; mimetype: string; documentType: string }): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (fileData.size > MAX_FILE_SIZE) {
      errors.push('File size must not exceed 10MB');
    }

    // File type validation
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedMimeTypes.includes(fileData.mimetype.toLowerCase())) {
      errors.push('File type must be JPEG, PNG, WEBP, or PDF');
    }

    // Document type validation
    const allowedDocumentTypes = [
      'aadhar_front',
      'aadhar_back', 
      'photo',
      'certificate',
      'license',
      'insurance',
      'portfolio'
    ];

    if (!allowedDocumentTypes.includes(fileData.documentType)) {
      errors.push('Invalid document type');
    }

    // Filename validation
    if (!fileData.filename || fileData.filename.length > 255) {
      errors.push('Invalid filename');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async storeProviderDocument(userId: string, documentType: string, documentData: any): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Get existing provider data
      const provider = await this.getServiceProvider(userId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }

      // Update documents object with new document data
      const currentDocs = provider.documents || {};
      const timestamp = new Date().toISOString();

      let updatedDocs;

      switch (documentType) {
        case 'aadhar_front':
          updatedDocs = {
            ...currentDocs,
            aadhar: {
              ...currentDocs.aadhar,
              front: documentData.url,
              uploadedAt: timestamp,
              verified: false,
            }
          };
          break;
          
        case 'aadhar_back':
          updatedDocs = {
            ...currentDocs,
            aadhar: {
              ...currentDocs.aadhar,
              back: documentData.url,
              uploadedAt: timestamp,
              verified: false,
            }
          };
          break;
          
        case 'photo':
          updatedDocs = {
            ...currentDocs,
            photo: {
              url: documentData.url,
              uploadedAt: timestamp,
              verified: false,
            }
          };
          break;
          
        case 'certificate':
          const certificates = currentDocs.certificates || [];
          certificates.push({
            url: documentData.url,
            name: documentData.name || 'Certificate',
            type: documentData.type || 'General',
            uploadedAt: timestamp,
            verified: false,
          });
          updatedDocs = {
            ...currentDocs,
            certificates,
          };
          break;
          
        case 'license':
          const licenses = currentDocs.licenses || [];
          licenses.push({
            url: documentData.url,
            name: documentData.name || 'License',
            type: documentData.type || 'General',
            licenseNumber: documentData.licenseNumber,
            expiryDate: documentData.expiryDate,
            uploadedAt: timestamp,
            verified: false,
          });
          updatedDocs = {
            ...currentDocs,
            licenses,
          };
          break;
          
        case 'insurance':
          updatedDocs = {
            ...currentDocs,
            insurance: {
              url: documentData.url,
              policyNumber: documentData.policyNumber,
              expiryDate: documentData.expiryDate,
              uploadedAt: timestamp,
              verified: false,
            }
          };
          break;
          
        case 'portfolio':
          const portfolio = currentDocs.portfolio || [];
          portfolio.push({
            url: documentData.url,
            caption: documentData.caption || '',
            uploadedAt: timestamp,
          });
          updatedDocs = {
            ...currentDocs,
            portfolio,
          };
          break;
          
        default:
          return { success: false, error: 'Invalid document type' };
      }

      // Update provider with new documents
      await this.updateServiceProvider(userId, {
        documents: updatedDocs,
        updatedAt: sql`NOW()`,
      });

      return { success: true, url: documentData.url };
    } catch (error) {
      console.error('Error storing provider document:', error);
      return { success: false, error: 'Failed to store document' };
    }
  }

  // Chat methods
  async getChatMessages(orderId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }

  async markMessagesAsRead(orderId: string, userId: string): Promise<void> {
    await db.update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.orderId, orderId), eq(chatMessages.receiverId, userId)));
  }
  
  // Enhanced conversation methods
  async getChatMessagesByConversation(conversationId: string, userId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(and(
        eq(chatMessages.conversationId, conversationId),
        or(
          eq(chatMessages.senderId, userId),
          eq(chatMessages.receiverId, userId),
          eq(chatMessages.senderId, 'ai_assistant')
        )
      ))
      .orderBy(asc(chatMessages.createdAt));
  }
  
  async getUserConversations(userId: string, limit = 10): Promise<any[]> {
    const conversations = await db.select({
      conversationId: chatMessages.conversationId,
      content: chatMessages.content,
      timestamp: chatMessages.createdAt,
      messageType: chatMessages.messageType,
      metadata: chatMessages.metadata,
      messageCount: sql<number>`count(*) over (partition by ${chatMessages.conversationId})`
    })
    .from(chatMessages)
    .where(or(
      eq(chatMessages.senderId, userId),
      eq(chatMessages.receiverId, userId)
    ))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit * 10); // Get more messages to find latest per conversation
    
    // Group by conversation and get the latest message for each
    const conversationMap = new Map();
    conversations.forEach(msg => {
      if (!conversationMap.has(msg.conversationId) || 
          conversationMap.get(msg.conversationId).timestamp < msg.timestamp) {
        conversationMap.set(msg.conversationId, msg);
      }
    });
    
    return Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  async updateChatMessage(messageId: string, data: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    const result = await db.update(chatMessages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatMessages.id, messageId))
      .returning();
    return result[0];
  }

  // Notification methods
  async getNotifications(userId: string, limit = 20): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Review methods
  async getReviews(filters?: { orderId?: string; revieweeId?: string }): Promise<Review[]> {
    let baseQuery = db.select().from(reviews);
    
    const conditions: SQL[] = [];
    if (filters?.orderId) {
      conditions.push(eq(reviews.orderId, filters.orderId));
    }
    if (filters?.revieweeId) {
      conditions.push(eq(reviews.revieweeId, filters.revieweeId));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    return await baseQuery.orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  // Coupon methods
  async getCoupon(code: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons)
      .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
      .limit(1);
    return result[0];
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons)
      .where(and(eq(coupons.isActive, true), sql`${coupons.validUntil} > NOW()`));
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(coupon).returning();
    return result[0];
  }

  async useCoupon(code: string): Promise<void> {
    await db.update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.code, code));
  }

  // Settings methods
  async getSetting(key: string): Promise<unknown> {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return result[0]?.value;
  }

  async setSetting(key: string, value: unknown, description?: string): Promise<void> {
    await db.insert(appSettings)
      .values({ key, value, description, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, description, updatedAt: new Date() },
      });
  }

  // Enhanced AI Search methods
  async searchServices(filters: {
    query: string;
    categories?: string[];
    priceRange?: { min: number; max: number };
    location?: { latitude: number; longitude: number; maxDistance?: number };
    urgency?: 'low' | 'medium' | 'high';
    limit?: number;
    offset?: number;
  }): Promise<{
    services: (Service & { category: ServiceCategory })[];
    total: number;
    suggestions: string[];
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    let baseQuery = db.select({
      ...services,
      category: serviceCategories,
    })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id));

    const conditions: SQL[] = [eq(services.isActive, true)];

    // Full-text search on name and description
    if (filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(services.name, searchTerm),
          ilike(services.description, searchTerm),
          ilike(serviceCategories.name, searchTerm)
        )
      );
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(inArray(services.categoryId, filters.categories));
    }

    // Price range filter
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        conditions.push(gte(services.basePrice, filters.priceRange.min.toString()));
      }
      if (filters.priceRange.max) {
        conditions.push(lte(services.basePrice, filters.priceRange.max.toString()));
      }
    }

    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }

    // Execute search with pagination
    const results = await baseQuery
      .orderBy(desc(services.totalBookings), desc(services.rating))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalQuery = db.select({ count: count() })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id));
    
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    // Generate search suggestions based on current query
    const suggestions = await this.generateSearchSuggestions(filters.query, 'services');

    return {
      services: results,
      total: Number(total),
      suggestions,
    };
  }

  async searchParts(filters: {
    query: string;
    categories?: string[];
    priceRange?: { min: number; max: number };
    inStockOnly?: boolean;
    providerId?: string;
    specifications?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<{
    parts: (Part & { category: PartsCategory })[];
    total: number;
    suggestions: string[];
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    let baseQuery = db.select({
      ...parts,
      category: partsCategories,
    })
      .from(parts)
      .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id));

    const conditions: SQL[] = [eq(parts.isActive, true)];

    // Full-text search on name and description
    if (filters.query.trim()) {
      const searchTerm = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(parts.name, searchTerm),
          ilike(parts.description, searchTerm),
          ilike(partsCategories.name, searchTerm)
        )
      );
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(inArray(parts.categoryId, filters.categories));
    }

    // Price range filter
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        conditions.push(gte(parts.price, filters.priceRange.min.toString()));
      }
      if (filters.priceRange.max) {
        conditions.push(lte(parts.price, filters.priceRange.max.toString()));
      }
    }

    // In stock filter
    if (filters.inStockOnly) {
      conditions.push(sql`${parts.stock} > 0`);
    }

    // Provider filter
    if (filters.providerId) {
      conditions.push(eq(parts.providerId, filters.providerId));
    }

    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }

    // Execute search with pagination
    const results = await baseQuery
      .orderBy(desc(parts.totalSold), desc(parts.rating))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalQuery = db.select({ count: count() })
      .from(parts)
      .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id));
    
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    // Generate search suggestions
    const suggestions = await this.generateSearchSuggestions(filters.query, 'parts');

    return {
      parts: results,
      total: Number(total),
      suggestions,
    };
  }

  async getPersonalizedSuggestions(userId: string, type: 'services' | 'parts' | 'mixed', limit = 10): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let suggestedServices: (Service & { category: ServiceCategory })[] = [];
    let suggestedParts: (Part & { category: PartsCategory })[] = [];

    // Get user's order history to understand preferences
    const userOrders = await db.select({
      id: orders.id,
      items: orders.items,
      type: orders.type,
      status: orders.status,
    })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, 'completed')))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    // Extract categories from user's history
    const userCategories = new Set<string>();
    const serviceIds = new Set<string>();
    
    userOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.type === 'service') {
            serviceIds.add(item.id);
          }
        });
      }
    });

    // Get service categories from user's history
    if (serviceIds.size > 0) {
      const userServices = await db.select()
        .from(services)
        .where(inArray(services.id, Array.from(serviceIds)));
      
      userServices.forEach(service => {
        if (service.categoryId) {
          userCategories.add(service.categoryId);
        }
      });
    }

    if (type === 'services' || type === 'mixed') {
      if (userCategories.size > 0) {
        // Suggest highly-rated services in user's preferred categories
        suggestedServices = await db.select({
          ...services,
          category: serviceCategories,
        })
          .from(services)
          .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
          .where(and(
            inArray(services.categoryId, Array.from(userCategories)),
            eq(services.isActive, true),
            sql`${services.rating} >= 4.0`
          ))
          .orderBy(desc(services.rating), desc(services.totalBookings))
          .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
        
        if (suggestedServices.length > 0) {
          reasons.push('Based on your previous service bookings');
        }
      }

      // If no history-based suggestions, get trending services
      if (suggestedServices.length === 0) {
        suggestedServices = await db.select({
          ...services,
          category: serviceCategories,
        })
          .from(services)
          .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
          .where(eq(services.isActive, true))
          .orderBy(desc(services.totalBookings), desc(services.rating))
          .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
        
        if (suggestedServices.length > 0) {
          reasons.push('Popular services in your area');
        }
      }
    }

    if (type === 'parts' || type === 'mixed') {
      // Suggest complementary parts based on service history
      if (userCategories.size > 0) {
        // Map service categories to relevant parts categories
        const relevantPartsCategoryNames = Array.from(userCategories).map(categoryId => {
          // Simple mapping - could be enhanced with a proper lookup table
          return categoryId; // Assuming similar category structure
        });

        const partsCategs = await db.select()
          .from(partsCategories)
          .where(eq(partsCategories.isActive, true));

        const relevantPartsCategories = partsCategs.filter(pc => 
          relevantPartsCategoryNames.some(name => pc.name.toLowerCase().includes(name.toLowerCase()))
        );

        if (relevantPartsCategories.length > 0) {
          suggestedParts = await db.select({
            ...parts,
            category: partsCategories,
          })
            .from(parts)
            .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id))
            .where(and(
              inArray(parts.categoryId, relevantPartsCategories.map(pc => pc.id)),
              eq(parts.isActive, true),
              sql`${parts.stock} > 0`,
              sql`${parts.rating} >= 4.0`
            ))
            .orderBy(desc(parts.rating), desc(parts.totalSold))
            .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
          
          if (suggestedParts.length > 0) {
            reasons.push('Parts related to your service history');
          }
        }
      }

      // If no history-based part suggestions, get trending parts
      if (suggestedParts.length === 0) {
        suggestedParts = await db.select({
          ...parts,
          category: partsCategories,
        })
          .from(parts)
          .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id))
          .where(and(eq(parts.isActive, true), sql`${parts.stock} > 0`))
          .orderBy(desc(parts.totalSold), desc(parts.rating))
          .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
        
        if (suggestedParts.length > 0) {
          reasons.push('Popular parts in demand');
        }
      }
    }

    return {
      services: suggestedServices,
      parts: suggestedParts,
      reasons,
    };
  }

  async getTrendingItems(type: 'services' | 'parts' | 'mixed', limit = 10): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    trendingReasons: string[];
  }> {
    const reasons: string[] = [];
    let trendingServices: (Service & { category: ServiceCategory })[] = [];
    let trendingParts: (Part & { category: PartsCategory })[] = [];

    if (type === 'services' || type === 'mixed') {
      // Get services with high recent booking activity
      trendingServices = await db.select({
        ...services,
        category: serviceCategories,
      })
        .from(services)
        .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
        .where(eq(services.isActive, true))
        .orderBy(desc(services.totalBookings), desc(services.rating))
        .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
      
      if (trendingServices.length > 0) {
        reasons.push('Most booked services this month');
      }
    }

    if (type === 'parts' || type === 'mixed') {
      // Get parts with high sales activity
      trendingParts = await db.select({
        ...parts,
        category: partsCategories,
      })
        .from(parts)
        .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id))
        .where(and(eq(parts.isActive, true), sql`${parts.stock} > 0`))
        .orderBy(desc(parts.totalSold), desc(parts.rating))
        .limit(type === 'mixed' ? Math.floor(limit / 2) : limit);
      
      if (trendingParts.length > 0) {
        reasons.push('Best-selling parts this month');
      }
    }

    return {
      services: trendingServices,
      parts: trendingParts,
      trendingReasons: reasons,
    };
  }

  async getSimilarItems(itemId: string, itemType: 'service' | 'part', limit = 5): Promise<{
    services: (Service & { category: ServiceCategory })[];
    parts: (Part & { category: PartsCategory })[];
    similarityScores: Record<string, number>;
  }> {
    const similarityScores: Record<string, number> = {};
    let similarServices: (Service & { category: ServiceCategory })[] = [];
    let similarParts: (Part & { category: PartsCategory })[] = [];

    if (itemType === 'service') {
      // Find the source service
      const sourceService = await db.select()
        .from(services)
        .where(eq(services.id, itemId))
        .limit(1);
      
      if (sourceService[0]) {
        // Find services in the same category with similar price range
        const priceBuffer = parseFloat(sourceService[0].basePrice) * 0.3; // 30% price range
        
        similarServices = await db.select({
          ...services,
          category: serviceCategories,
        })
          .from(services)
          .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
          .where(and(
            eq(services.categoryId, sourceService[0].categoryId!),
            eq(services.isActive, true),
            sql`${services.id} != ${itemId}`,
            gte(services.basePrice, (parseFloat(sourceService[0].basePrice) - priceBuffer).toString()),
            lte(services.basePrice, (parseFloat(sourceService[0].basePrice) + priceBuffer).toString())
          ))
          .orderBy(desc(services.rating), desc(services.totalBookings))
          .limit(limit);

        // Calculate similarity scores based on rating and category match
        similarServices.forEach(service => {
          similarityScores[service.id] = 0.9; // High similarity for same category
        });
      }
    } else {
      // Find the source part
      const sourcePart = await db.select()
        .from(parts)
        .where(eq(parts.id, itemId))
        .limit(1);
      
      if (sourcePart[0]) {
        // Find parts in the same category with similar price range
        const priceBuffer = parseFloat(sourcePart[0].price) * 0.3; // 30% price range
        
        similarParts = await db.select({
          ...parts,
          category: partsCategories,
        })
          .from(parts)
          .innerJoin(partsCategories, eq(parts.categoryId, partsCategories.id))
          .where(and(
            eq(parts.categoryId, sourcePart[0].categoryId!),
            eq(parts.isActive, true),
            sql`${parts.stock} > 0`,
            sql`${parts.id} != ${itemId}`,
            gte(parts.price, (parseFloat(sourcePart[0].price) - priceBuffer).toString()),
            lte(parts.price, (parseFloat(sourcePart[0].price) + priceBuffer).toString())
          ))
          .orderBy(desc(parts.rating), desc(parts.totalSold))
          .limit(limit);

        // Calculate similarity scores
        similarParts.forEach(part => {
          similarityScores[part.id] = 0.9; // High similarity for same category
        });
      }
    }

    return {
      services: similarServices,
      parts: similarParts,
      similarityScores,
    };
  }

  async getSearchSuggestions(query: string, userId?: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (query.length < 2) {
      return suggestions;
    }

    // Get service name suggestions
    const serviceResults = await db.select({ name: services.name })
      .from(services)
      .where(and(
        ilike(services.name, `%${query}%`),
        eq(services.isActive, true)
      ))
      .orderBy(desc(services.totalBookings))
      .limit(3);

    serviceResults.forEach(service => suggestions.push(service.name));

    // Get category suggestions
    const categoryResults = await db.select({ name: serviceCategories.name })
      .from(serviceCategories)
      .where(and(
        ilike(serviceCategories.name, `%${query}%`),
        eq(serviceCategories.isActive, true)
      ))
      .limit(3);

    categoryResults.forEach(category => suggestions.push(category.name));

    // Get parts name suggestions
    const partsResults = await db.select({ name: parts.name })
      .from(parts)
      .where(and(
        ilike(parts.name, `%${query}%`),
        eq(parts.isActive, true)
      ))
      .orderBy(desc(parts.totalSold))
      .limit(3);

    partsResults.forEach(part => suggestions.push(part.name));

    return [...new Set(suggestions)]; // Remove duplicates
  }

  async trackSearchQuery(userId: string | null | undefined, query: string, results: number, category?: string): Promise<void> {
    // Store search tracking in app settings as JSON for analytics
    const key = `search_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.setSetting(key, {
      userId,
      query,
      results,
      category,
      timestamp: new Date().toISOString(),
    }, 'Search query tracking');
  }

  async getUserSearchHistory(userId: string, limit = 10): Promise<{
    query: string;
    timestamp: Date;
    results: number;
  }[]> {
    // Get user search history from app settings
    const searchSettings = await db.select()
      .from(appSettings)
      .where(and(
        like(appSettings.key, 'search_log_%'),
        sql`${appSettings.value}->>'userId' = ${userId}`
      ))
      .orderBy(desc(appSettings.updatedAt))
      .limit(limit);

    return searchSettings.map(setting => {
      const data = setting.value as any;
      return {
        query: data.query,
        timestamp: new Date(data.timestamp),
        results: data.results,
      };
    });
  }

  async getPopularSearchQueries(limit = 10): Promise<{
    query: string;
    count: number;
    category?: string;
  }[]> {
    // Get popular search queries from app settings
    const searchSettings = await db.select()
      .from(appSettings)
      .where(like(appSettings.key, 'search_log_%'))
      .orderBy(desc(appSettings.updatedAt))
      .limit(500); // Get recent searches to analyze

    const queryCount: Record<string, { count: number; category?: string }> = {};
    
    searchSettings.forEach(setting => {
      const data = setting.value as any;
      if (data.query) {
        const query = data.query.toLowerCase();
        if (queryCount[query]) {
          queryCount[query].count++;
        } else {
          queryCount[query] = { count: 1, category: data.category };
        }
      }
    });

    // Convert to array and sort by count
    return Object.entries(queryCount)
      .map(([query, data]) => ({
        query,
        count: data.count,
        category: data.category,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private async generateSearchSuggestions(query: string, type: 'services' | 'parts'): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (query.length < 2) {
      return suggestions;
    }

    if (type === 'services') {
      // Get related service categories
      const categories = await db.select({ name: serviceCategories.name })
        .from(serviceCategories)
        .where(and(
          or(
            ilike(serviceCategories.name, `%${query}%`),
            ilike(serviceCategories.description, `%${query}%`)
          ),
          eq(serviceCategories.isActive, true)
        ))
        .limit(3);

      categories.forEach(cat => suggestions.push(cat.name));

      // Get popular service names
      const popularServices = await db.select({ name: services.name })
        .from(services)
        .where(and(
          ilike(services.name, `%${query}%`),
          eq(services.isActive, true)
        ))
        .orderBy(desc(services.totalBookings))
        .limit(3);

      popularServices.forEach(service => suggestions.push(service.name));
    } else {
      // Get related parts categories
      const categories = await db.select({ name: partsCategories.name })
        .from(partsCategories)
        .where(and(
          or(
            ilike(partsCategories.name, `%${query}%`),
            ilike(partsCategories.description, `%${query}%`)
          ),
          eq(partsCategories.isActive, true)
        ))
        .limit(3);

      categories.forEach(cat => suggestions.push(cat.name));

      // Get popular part names
      const popularParts = await db.select({ name: parts.name })
        .from(parts)
        .where(and(
          ilike(parts.name, `%${query}%`),
          eq(parts.isActive, true)
        ))
        .orderBy(desc(parts.totalSold))
        .limit(3);

      popularParts.forEach(part => suggestions.push(part.name));
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // OTP Challenge methods
  async createOtpChallenge(challenge: InsertOtpChallenge): Promise<OtpChallenge> {
    const result = await db.insert(otpChallenges).values(challenge).returning();
    return result[0];
  }

  async getOtpChallenge(phone: string): Promise<OtpChallenge | undefined> {
    const result = await db.select().from(otpChallenges)
      .where(and(
        eq(otpChallenges.phone, phone),
        gte(otpChallenges.expiresAt, new Date()),
        eq(otpChallenges.status, "sent")
      ))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);
    return result[0];
  }

  async getOtpChallengeById(id: string): Promise<OtpChallenge | undefined> {
    const result = await db.select().from(otpChallenges).where(eq(otpChallenges.id, id)).limit(1);
    return result[0];
  }

  async updateOtpChallenge(id: string, data: Partial<InsertOtpChallenge>): Promise<OtpChallenge | undefined> {
    const result = await db.update(otpChallenges)
      .set(data)
      .where(eq(otpChallenges.id, id))
      .returning();
    return result[0];
  }

  async expireOtpChallenge(id: string): Promise<void> {
    await db.update(otpChallenges)
      .set({ status: "expired" })
      .where(eq(otpChallenges.id, id));
  }

  async incrementOtpAttempts(id: string): Promise<OtpChallenge | undefined> {
    const result = await db.update(otpChallenges)
      .set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(eq(otpChallenges.id, id))
      .returning();
    return result[0];
  }

  async expireOtpChallenges(phone: string): Promise<void> {
    await db.update(otpChallenges)
      .set({ status: "expired" })
      .where(and(
        eq(otpChallenges.phone, phone),
        eq(otpChallenges.status, "sent")
      ));
  }

  async getActiveOtpChallenge(phone: string): Promise<OtpChallenge | undefined> {
    const result = await db.select().from(otpChallenges)
      .where(and(
        eq(otpChallenges.phone, phone),
        eq(otpChallenges.status, "sent"),
        gte(otpChallenges.expiresAt, new Date())
      ))
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);
    return result[0];
  }

  async getRecentOtpChallenges(phone: string, seconds: number): Promise<OtpChallenge[]> {
    const cutoffTime = new Date(Date.now() - seconds * 1000);
    return await db.select().from(otpChallenges)
      .where(and(
        eq(otpChallenges.phone, phone),
        gte(otpChallenges.createdAt, cutoffTime)
      ))
      .orderBy(desc(otpChallenges.createdAt));
  }

  async getRecentOtpChallengesByIp(ip: string, seconds: number): Promise<OtpChallenge[]> {
    if (!ip) return [];
    
    const cutoffTime = new Date(Date.now() - seconds * 1000);
    return await db.select().from(otpChallenges)
      .where(and(
        eq(otpChallenges.ip, ip),
        gte(otpChallenges.createdAt, cutoffTime)
      ))
      .orderBy(desc(otpChallenges.createdAt));
  }

  async getOtpStatistics(hours: number): Promise<{
    totalSent: number;
    totalVerified: number;
    successRate: number;
  }> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const totalSentResult = await db.select({ count: count() })
      .from(otpChallenges)
      .where(gte(otpChallenges.createdAt, cutoffTime));
    
    const totalVerifiedResult = await db.select({ count: count() })
      .from(otpChallenges)
      .where(and(
        eq(otpChallenges.status, "verified"),
        gte(otpChallenges.createdAt, cutoffTime)
      ));
    
    const totalSent = totalSentResult[0].count;
    const totalVerified = totalVerifiedResult[0].count;
    const successRate = totalSent > 0 ? (totalVerified / totalSent) * 100 : 0;
    
    return {
      totalSent,
      totalVerified,
      successRate: parseFloat(successRate.toFixed(2))
    };
  }

  async cleanupExpiredOtpChallenges(): Promise<void> {
    await db.delete(otpChallenges)
      .where(lte(otpChallenges.expiresAt, new Date()));
  }

  // Seed data for production - creates essential categories only
  async seedData(): Promise<void> {
    try {
      // Check if we already have data
      const existingCategories = await this.getServiceCategories();
      if (existingCategories.length > 0) {
        console.log("✅ Categories already exist, skipping seed");
        return; // Already seeded
      }

      console.log("🌱 Creating essential production seed data...");

      // Add essential service categories for production
      await this.createServiceCategory({
        name: "Home Services",
        description: "Home repair and maintenance services",
        icon: "🏠",
        isActive: true
      });

      await this.createServiceCategory({
        name: "Technology",
        description: "Device repairs and tech support",
        icon: "📱",
        isActive: true
      });

      await this.createServiceCategory({
        name: "Automotive",
        description: "Vehicle maintenance and repair services",
        icon: "🚗",
        isActive: true
      });

      await this.createServiceCategory({
        name: "Beauty & Wellness",
        description: "Beauty and wellness services",
        icon: "💅",
        isActive: true
      });

      await this.createServiceCategory({
        name: "Cleaning Services",
        description: "Professional cleaning services",
        icon: "🧹",
        isActive: true
      });

      // Create essential app settings for production
      await this.setSetting("maintenance_mode", false, "Application maintenance status");
      await this.setSetting("app_version", "1.0.0", "Current application version");
      await this.setSetting("min_order_amount", 99, "Minimum order amount in INR");
      await this.setSetting("service_fee_percentage", 2.5, "Service fee percentage");
      await this.setSetting("delivery_radius_km", 25, "Service delivery radius in kilometers");

      console.log("✅ Production seed data created successfully - ready for service providers to add their services");
    } catch (error) {
      console.error("❌ Error seeding production data:", error);
      throw error;
    }
  }

  // ========================================
  // PAYMENT METHOD OPERATIONS
  // ========================================

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const result = await db.insert(paymentMethods).values(paymentMethod).returning();
    return result[0];
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const result = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    return result[0];
  }

  async getUserPaymentMethods(userId: string, activeOnly: boolean = true): Promise<PaymentMethod[]> {
    const conditions = [eq(paymentMethods.userId, userId)];
    
    if (activeOnly) {
      conditions.push(eq(paymentMethods.isActive, true));
    }

    return await db.select().from(paymentMethods)
      .where(and(...conditions))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.lastUsedAt));
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const result = await db.update(paymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  async updateUserPaymentMethodDefaults(userId: string, isDefault: boolean): Promise<void> {
    // Set all user's payment methods to not default
    await db.update(paymentMethods)
      .set({ isDefault, updatedAt: new Date() })
      .where(eq(paymentMethods.userId, userId));
  }

  // ========================================
  // STRIPE CUSTOMER OPERATIONS
  // ========================================

  async createStripeCustomer(customer: InsertStripeCustomer): Promise<StripeCustomer> {
    const result = await db.insert(stripeCustomers).values(customer).returning();
    return result[0];
  }

  async getStripeCustomer(userId: string): Promise<StripeCustomer | undefined> {
    const result = await db.select().from(stripeCustomers)
      .where(eq(stripeCustomers.userId, userId))
      .limit(1);
    return result[0];
  }

  async getStripeCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomer | undefined> {
    const result = await db.select().from(stripeCustomers)
      .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return result[0];
  }

  async updateStripeCustomer(userId: string, data: Partial<InsertStripeCustomer>): Promise<StripeCustomer | undefined> {
    const result = await db.update(stripeCustomers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stripeCustomers.userId, userId))
      .returning();
    return result[0];
  }

  // ========================================
  // PAYMENT INTENT OPERATIONS
  // ========================================

  async createPaymentIntent(paymentIntent: InsertPaymentIntent): Promise<PaymentIntent> {
    const result = await db.insert(paymentIntents).values(paymentIntent).returning();
    return result[0];
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent | undefined> {
    const result = await db.select().from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .limit(1);
    return result[0];
  }

  async getPaymentIntentByStripeId(stripePaymentIntentId: string): Promise<PaymentIntent | undefined> {
    const result = await db.select().from(paymentIntents)
      .where(eq(paymentIntents.stripePaymentIntentId, stripePaymentIntentId))
      .limit(1);
    return result[0];
  }

  async updatePaymentIntent(stripePaymentIntentId: string, data: Partial<InsertPaymentIntent>): Promise<PaymentIntent | undefined> {
    const result = await db.update(paymentIntents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentIntents.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    return result[0];
  }

  async getUserPaymentIntents(userId: string, status?: string): Promise<PaymentIntent[]> {
    const conditions = [eq(paymentIntents.userId, userId)];
    
    if (status) {
      conditions.push(eq(paymentIntents.status, status));
    }

    return await db.select().from(paymentIntents)
      .where(and(...conditions))
      .orderBy(desc(paymentIntents.createdAt));
  }

  // ========================================
  // ORDER PAYMENT OPERATIONS
  // ========================================

  async updateOrderPaymentStatus(orderId: string, status: 'pending' | 'paid' | 'failed' | 'refunded'): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set({ 
        paymentStatus: status, 
        updatedAt: new Date(),
        // Update order status based on payment status
        ...(status === 'paid' && { status: 'accepted' }),
        ...(status === 'failed' && { status: 'cancelled' }),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  }

  // ========================================
  // USER ADDRESS OPERATIONS
  // ========================================

  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    return await db.select().from(userAddresses)
      .where(and(eq(userAddresses.userId, userId), eq(userAddresses.isActive, true)))
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
  }

  async getUserAddress(id: string): Promise<UserAddress | undefined> {
    const result = await db.select().from(userAddresses)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.isActive, true)))
      .limit(1);
    return result[0];
  }

  async createUserAddress(address: InsertUserAddress): Promise<UserAddress> {
    // If this is set as default, make sure no other address is default for this user
    if (address.isDefault) {
      await db.update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, address.userId));
    }

    const result = await db.insert(userAddresses).values(address).returning();
    return result[0];
  }

  async updateUserAddress(id: string, data: Partial<InsertUserAddress>): Promise<UserAddress | undefined> {
    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      const addressResult = await db.select().from(userAddresses)
        .where(eq(userAddresses.id, id))
        .limit(1);
      
      if (addressResult[0]) {
        await db.update(userAddresses)
          .set({ isDefault: false })
          .where(eq(userAddresses.userId, addressResult[0].userId));
      }
    }

    const result = await db.update(userAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(userAddresses.id, id), eq(userAddresses.isActive, true)))
      .returning();
    return result[0];
  }

  async deleteUserAddress(id: string): Promise<void> {
    await db.update(userAddresses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userAddresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    // First, remove default from all addresses for this user
    await db.update(userAddresses)
      .set({ isDefault: false })
      .where(eq(userAddresses.userId, userId));

    // Then set the specified address as default
    await db.update(userAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(
        eq(userAddresses.id, addressId),
        eq(userAddresses.userId, userId),
        eq(userAddresses.isActive, true)
      ));
  }

  async getUserDefaultAddress(userId: string): Promise<UserAddress | undefined> {
    const result = await db.select().from(userAddresses)
      .where(and(
        eq(userAddresses.userId, userId),
        eq(userAddresses.isDefault, true),
        eq(userAddresses.isActive, true)
      ))
      .limit(1);
    return result[0];
  }

  // ========================================
  // USER NOTIFICATION PREFERENCES OPERATIONS
  // ========================================

  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | undefined> {
    const result = await db.select().from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);
    return result[0];
  }

  async createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const result = await db.insert(userNotificationPreferences).values(preferences).returning();
    return result[0];
  }

  async updateUserNotificationPreferences(userId: string, data: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences | undefined> {
    const result = await db.update(userNotificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userNotificationPreferences.userId, userId))
      .returning();
    return result[0];
  }

  async upsertUserNotificationPreferences(userId: string, data: Partial<InsertUserNotificationPreferences>): Promise<UserNotificationPreferences> {
    // First try to get existing preferences
    const existing = await this.getUserNotificationPreferences(userId);
    
    if (existing) {
      // Update existing preferences
      const updated = await this.updateUserNotificationPreferences(userId, data);
      return updated!;
    } else {
      // Create new preferences with defaults
      const newPreferences: InsertUserNotificationPreferences = {
        userId,
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
        timezone: 'Asia/Kolkata',
        ...data,
      };
      
      return await this.createUserNotificationPreferences(newPreferences);
    }
  }

  // TODO: Implement locale preferences following backend guidelines
  // - Define proper schemas in shared/schema.ts first
  // - Add Zod validation schemas  
  // - Update IStorage interface with proper typing
  // - Implement methods following established patterns

  // TODO: Implement regional functionality following backend guidelines
  // - Define proper schemas in shared/schema.ts first
  // - Add Zod validation schemas  
  // - Update IStorage interface with proper typing
  // - Implement methods following established patterns

  // ========================================
  // SERVICE BOOKING OPERATIONS
  // ========================================

  async createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking> {
    const result = await db.insert(serviceBookings).values([{
      ...booking,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).returning();
    return result[0];
  }

  async getServiceBooking(id: string): Promise<ServiceBooking | undefined> {
    const result = await db.select().from(serviceBookings)
      .where(eq(serviceBookings.id, id))
      .limit(1);
    return result[0];
  }

  async getServiceBookingWithDetails(id: string): Promise<any> {
    const result = await db.select({
      // Service booking fields
      id: serviceBookings.id,
      userId: serviceBookings.userId,
      serviceId: serviceBookings.serviceId,
      bookingType: serviceBookings.bookingType,
      requestedAt: serviceBookings.requestedAt,
      scheduledAt: serviceBookings.scheduledAt,
      serviceLocation: serviceBookings.serviceLocation,
      serviceDetails: serviceBookings.serviceDetails,
      notes: serviceBookings.notes,
      attachments: serviceBookings.attachments,
      urgency: serviceBookings.urgency,
      status: serviceBookings.status,
      assignedProviderId: serviceBookings.assignedProviderId,
      assignedAt: serviceBookings.assignedAt,
      assignmentMethod: serviceBookings.assignmentMethod,
      totalAmount: serviceBookings.totalAmount,
      paymentMethod: serviceBookings.paymentMethod,
      paymentStatus: serviceBookings.paymentStatus,
      completedAt: serviceBookings.completedAt,
      customerRating: serviceBookings.customerRating,
      customerReview: serviceBookings.customerReview,
      providerRating: serviceBookings.providerRating,
      providerReview: serviceBookings.providerReview,
      createdAt: serviceBookings.createdAt,
      updatedAt: serviceBookings.updatedAt,
      // User details
      customerFirstName: users.firstName,
      customerLastName: users.lastName,
      customerEmail: users.email,
      customerPhone: users.phone,
      // Service details
      serviceName: services.name,
      serviceDescription: services.description,
      serviceCategory: services.categoryId,
      // Provider details (if assigned)
      providerFirstName: sql<string | null>`provider.first_name`,
      providerLastName: sql<string | null>`provider.last_name`,
      providerEmail: sql<string | null>`provider.email`,
      providerPhone: sql<string | null>`provider.phone`,
    })
    .from(serviceBookings)
    .leftJoin(users, eq(serviceBookings.userId, users.id))
    .leftJoin(services, eq(serviceBookings.serviceId, services.id))
    .leftJoin(sql`users AS provider`, sql`${serviceBookings.assignedProviderId} = provider.id`)
    .where(eq(serviceBookings.id, id))
    .limit(1);
    
    return result[0];
  }

  async updateServiceBooking(id: string, data: Partial<InsertServiceBooking>): Promise<ServiceBooking | undefined> {
    const result = await db.update(serviceBookings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceBookings.id, id))
      .returning();
    return result[0];
  }

  async getUserServiceBookings(userId: string, options?: {
    status?: string;
    bookingType?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceBooking[]> {
    const conditions: SQL[] = [eq(serviceBookings.userId, userId)];
    
    if (options?.status) {
      conditions.push(eq(serviceBookings.status, options.status));
    }
    if (options?.bookingType) {
      conditions.push(eq(serviceBookings.bookingType, options.bookingType));
    }

    const whereClause = combineConditions(conditions);
    let query = db.select().from(serviceBookings);
    
    if (whereClause) {
      query = query.where(whereClause);
    }
    
    query = query.orderBy(desc(serviceBookings.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  async validateBookingStatusUpdate(bookingId: string, newStatus: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }> {
    const booking = await this.getServiceBooking(bookingId);
    if (!booking) {
      return { allowed: false, reason: 'Booking not found' };
    }

    // Check user permissions
    const canUpdate = 
      userRole === 'admin' || 
      booking.userId === userId || 
      booking.assignedProviderId === userId;
    
    if (!canUpdate) {
      return { allowed: false, reason: 'Insufficient permissions' };
    }

    // Validate status transitions
    const currentStatus = booking.status;
    const validTransitions: Record<string, string[]> = {
      'pending': ['provider_search', 'cancelled'],
      'provider_search': ['provider_assigned', 'cancelled'],
      'provider_assigned': ['provider_on_way', 'cancelled'],
      'provider_on_way': ['work_in_progress', 'cancelled'],
      'work_in_progress': ['work_completed', 'cancelled'],
      'work_completed': ['payment_pending', 'completed'],
      'payment_pending': ['completed', 'refunded'],
      'completed': ['refunded'],
      'cancelled': [],
      'refunded': [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    if (!allowedStatuses.includes(newStatus)) {
      return { 
        allowed: false, 
        reason: `Cannot transition from ${currentStatus} to ${newStatus}` 
      };
    }

    return { allowed: true };
  }

  async canCancelServiceBooking(bookingId: string, userId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }> {
    const booking = await this.getServiceBooking(bookingId);
    if (!booking) {
      return { allowed: false, reason: 'Booking not found' };
    }

    // Admin can always cancel
    if (userRole === 'admin') {
      return { allowed: true };
    }

    // Customer can cancel their own bookings
    if (booking.userId === userId) {
      // Check if booking is in cancellable state
      const cancellableStatuses = ['pending', 'provider_search', 'provider_assigned'];
      if (cancellableStatuses.includes(booking.status)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: `Cannot cancel booking in ${booking.status} status` 
      };
    }

    // Provider can cancel assigned bookings
    if (booking.assignedProviderId === userId && userRole === 'service_provider') {
      const providerCancellableStatuses = ['provider_assigned', 'provider_on_way'];
      if (providerCancellableStatuses.includes(booking.status)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: `Provider cannot cancel booking in ${booking.status} status` 
      };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  // ========================================
  // PROVIDER JOB REQUEST OPERATIONS
  // ========================================

  async createProviderJobRequest(request: InsertProviderJobRequest): Promise<ProviderJobRequest> {
    const result = await db.insert(providerJobRequests).values([{
      ...request,
      createdAt: new Date(),
    }]).returning();
    return result[0];
  }

  async getProviderJobRequest(bookingId: string, providerId: string): Promise<ProviderJobRequest | undefined> {
    const result = await db.select().from(providerJobRequests)
      .where(and(
        eq(providerJobRequests.bookingId, bookingId),
        eq(providerJobRequests.providerId, providerId)
      ))
      .limit(1);
    return result[0];
  }

  async getProviderJobRequests(providerId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProviderJobRequest[]> {
    const conditions: SQL[] = [eq(providerJobRequests.providerId, providerId)];
    
    if (options?.status) {
      conditions.push(eq(providerJobRequests.status, options.status));
    }

    const whereClause = combineConditions(conditions);
    let query = db.select().from(providerJobRequests);
    
    if (whereClause) {
      query = query.where(whereClause);
    }
    
    query = query.orderBy(desc(providerJobRequests.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  async acceptProviderJobRequest(bookingId: string, providerId: string, details?: {
    estimatedArrival?: Date;
    quotedPrice?: number;
    notes?: string;
  }): Promise<{ success: boolean; message?: string; booking?: ServiceBooking }> {
    // Start transaction for race condition handling
    const jobRequest = await this.getProviderJobRequest(bookingId, providerId);
    if (!jobRequest || jobRequest.status !== 'sent') {
      return { success: false, message: 'Job request not found or already processed' };
    }

    const booking = await this.getServiceBooking(bookingId);
    if (!booking || booking.status !== 'provider_search') {
      return { success: false, message: 'Booking no longer available' };
    }

    // Check if job request hasn't expired
    if (jobRequest.expiresAt && jobRequest.expiresAt < new Date()) {
      return { success: false, message: 'Job request has expired' };
    }

    try {
      // Update job request to accepted
      await db.update(providerJobRequests)
        .set({ 
          status: 'accepted',
          responseTime: Math.floor((Date.now() - jobRequest.createdAt.getTime()) / 1000),
          notes: details?.notes || null,
        })
        .where(and(
          eq(providerJobRequests.bookingId, bookingId),
          eq(providerJobRequests.providerId, providerId)
        ));

      // Update booking with provider assignment
      const updatedBooking = await this.updateServiceBooking(bookingId, {
        status: 'provider_assigned',
        assignedProviderId: providerId,
        assignedAt: new Date(),
        assignmentMethod: 'auto',
        totalAmount: details?.quotedPrice ? details.quotedPrice.toString() : booking.totalAmount,
      });

      return { 
        success: true, 
        message: 'Job accepted successfully',
        booking: updatedBooking 
      };
    } catch (error) {
      console.error('Error accepting job request:', error);
      return { success: false, message: 'Failed to accept job request' };
    }
  }

  async declineProviderJobRequest(bookingId: string, providerId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    const jobRequest = await this.getProviderJobRequest(bookingId, providerId);
    if (!jobRequest || jobRequest.status !== 'sent') {
      return { success: false, message: 'Job request not found or already processed' };
    }

    try {
      await db.update(providerJobRequests)
        .set({ 
          status: 'declined',
          responseTime: Math.floor((Date.now() - jobRequest.createdAt.getTime()) / 1000),
          notes: reason || null,
        })
        .where(and(
          eq(providerJobRequests.bookingId, bookingId),
          eq(providerJobRequests.providerId, providerId)
        ));

      return { success: true, message: 'Job declined successfully' };
    } catch (error) {
      console.error('Error declining job request:', error);
      return { success: false, message: 'Failed to decline job request' };
    }
  }

  async cancelOtherJobRequests(bookingId: string, acceptedProviderId: string): Promise<void> {
    await db.update(providerJobRequests)
      .set({ status: 'cancelled' })
      .where(and(
        eq(providerJobRequests.bookingId, bookingId),
        sql`${providerJobRequests.providerId} != ${acceptedProviderId}`,
        eq(providerJobRequests.status, 'sent')
      ));
  }

  async cancelAllJobRequests(bookingId: string): Promise<void> {
    await db.update(providerJobRequests)
      .set({ status: 'cancelled' })
      .where(and(
        eq(providerJobRequests.bookingId, bookingId),
        eq(providerJobRequests.status, 'sent')
      ));
  }

  // ========================================
  // PROVIDER MATCHING OPERATIONS
  // ========================================

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
    estimatedTravelTime?: number;
    estimatedArrival?: Date;
    currentLocation?: { latitude: number; longitude: number };
    lastKnownLocation?: { latitude: number; longitude: number };
    isOnline: boolean;
    responseRate: number;
    skills: string[];
  }>> {
    const maxDistance = criteria.maxDistance || 25; // km
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
      isActive: serviceProviders.isActive,
      isVerified: serviceProviders.isVerified,
      currentLocation: serviceProviders.currentLocation,
      lastKnownLocation: serviceProviders.lastKnownLocation,
      isOnline: serviceProviders.isOnline,
      avgRating: serviceProviders.avgRating,
      totalJobs: serviceProviders.totalJobs,
      completionRate: serviceProviders.completionRate,
      responseRate: serviceProviders.responseRate,
      // User details
      firstName: users.firstName,
      lastName: users.lastName,
      profileImage: users.profileImage,
      isActiveUser: users.isActive,
    })
    .from(serviceProviders)
    .leftJoin(users, eq(serviceProviders.userId, users.id))
    .where(and(
      eq(serviceProviders.isActive, true),
      eq(serviceProviders.isVerified, true),
      eq(users.isActive, true),
      sql`${serviceProviders.skills} && ARRAY[${service.categoryId}]`, // PostgreSQL array overlap operator
    ));

    // Filter by distance and other criteria
    const matchingProviders = providers
      .filter(provider => {
        // Check if provider is online for instant bookings
        if (criteria.bookingType === 'instant' && !provider.isOnline) {
          return false;
        }

        // Calculate distance using Haversine formula
        const providerLocation = provider.currentLocation || provider.lastKnownLocation;
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
        const providerLocation = provider.currentLocation || provider.lastKnownLocation;
        const distanceKm = this.calculateDistance(
          criteria.location.latitude,
          criteria.location.longitude,
          providerLocation!.latitude,
          providerLocation!.longitude
        );

        return {
          userId: provider.userId,
          firstName: provider.firstName,
          lastName: provider.lastName,
          profileImage: provider.profileImage || undefined,
          rating: parseFloat(provider.avgRating || '0'),
          totalJobs: provider.totalJobs || 0,
          distanceKm,
          estimatedTravelTime: Math.ceil(distanceKm / 25 * 60), // Assume 25 km/h average speed
          currentLocation: provider.currentLocation,
          lastKnownLocation: provider.lastKnownLocation,
          isOnline: provider.isOnline,
          responseRate: parseFloat(provider.responseRate || '0'),
          skills: provider.skills || [],
        };
      })
      .sort((a, b) => {
        // Sort by distance, rating, and response rate
        const distanceScore = (a.distanceKm || 0) - (b.distanceKm || 0);
        const ratingScore = (b.rating - a.rating) * 5; // Weight rating heavily
        const responseScore = (b.responseRate - a.responseRate) * 2;
        
        return distanceScore + ratingScore + responseScore;
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

  // ========================================
  // COMPREHENSIVE PARTS MANAGEMENT METHODS
  // ========================================

  // Enhanced Parts Provider Business Information methods
  async getPartsProviderBusinessInfo(userId: string): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.select().from(partsProviderBusinessInfo)
      .where(eq(partsProviderBusinessInfo.userId, userId)).limit(1);
    return result[0];
  }

  async createPartsProviderBusinessInfo(businessInfo: InsertPartsProviderBusinessInfo): Promise<PartsProviderBusinessInfo> {
    const result = await db.insert(partsProviderBusinessInfo).values(businessInfo).returning();
    return result[0];
  }

  async updatePartsProviderBusinessInfo(userId: string, data: Partial<InsertPartsProviderBusinessInfo>): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.update(partsProviderBusinessInfo)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(partsProviderBusinessInfo.userId, userId))
      .returning();
    return result[0];
  }

  async getPartsProvidersByVerificationStatus(status: string): Promise<PartsProviderBusinessInfo[]> {
    return await db.select().from(partsProviderBusinessInfo)
      .where(eq(partsProviderBusinessInfo.verificationStatus, status as any))
      .orderBy(desc(partsProviderBusinessInfo.createdAt));
  }

  async verifyPartsProvider(userId: string, verificationData: {
    isVerified: boolean;
    verificationStatus: string;
    verificationNotes?: string;
  }): Promise<PartsProviderBusinessInfo | undefined> {
    const result = await db.update(partsProviderBusinessInfo)
      .set({
        isVerified: verificationData.isVerified,
        verificationStatus: verificationData.verificationStatus as any,
        updatedAt: new Date(),
      })
      .where(eq(partsProviderBusinessInfo.userId, userId))
      .returning();
    return result[0];
  }

  // Enhanced Parts Inventory Movement methods
  async getPartsInventoryMovements(filters?: { 
    partId?: string; 
    providerId?: string; 
    movementType?: string; 
    limit?: number 
  }): Promise<PartsInventoryMovement[]> {
    let baseQuery = db.select().from(partsInventoryMovements);
    
    const conditions: SQL[] = [];
    if (filters?.partId) {
      conditions.push(eq(partsInventoryMovements.partId, filters.partId));
    }
    if (filters?.providerId) {
      conditions.push(eq(partsInventoryMovements.providerId, filters.providerId));
    }
    if (filters?.movementType) {
      conditions.push(eq(partsInventoryMovements.movementType, filters.movementType as any));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    baseQuery = baseQuery.orderBy(desc(partsInventoryMovements.createdAt));
    
    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    
    return await baseQuery.execute();
  }

  async createPartsInventoryMovement(movement: InsertPartsInventoryMovement): Promise<PartsInventoryMovement> {
    const result = await db.insert(partsInventoryMovements).values(movement).returning();
    return result[0];
  }

  async getPartsInventoryHistory(partId: string): Promise<PartsInventoryMovement[]> {
    return await db.select().from(partsInventoryMovements)
      .where(eq(partsInventoryMovements.partId, partId))
      .orderBy(desc(partsInventoryMovements.createdAt));
  }

  async recordStockMovement(params: {
    partId: string;
    providerId: string;
    movementType: string;
    quantity: number;
    reason?: string;
    orderId?: string;
    costPrice?: number;
  }): Promise<PartsInventoryMovement> {
    // Get current part info
    const part = await this.getPart(params.partId);
    if (!part) {
      throw new Error('Part not found');
    }

    const previousStock = part.stock || 0;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (params.movementType) {
      case 'stock_in':
      case 'returned':
        newStock = previousStock + params.quantity;
        break;
      case 'stock_out':
      case 'sold':
      case 'damaged':
        newStock = previousStock - params.quantity;
        break;
      case 'adjustment':
        newStock = params.quantity; // Direct set for adjustments
        break;
      case 'reserved':
        // Don't change actual stock for reserved
        newStock = previousStock;
        break;
      case 'unreserved':
        newStock = previousStock;
        break;
    }

    // Update part stock and availability status
    const availabilityStatus = newStock > 0 ? 
      (newStock <= (part.lowStockThreshold || 10) ? 'low_stock' : 'in_stock') : 
      'out_of_stock';

    // Update part stock (except for reserved/unreserved which handle reserved stock separately)
    if (!['reserved', 'unreserved'].includes(params.movementType)) {
      await this.updatePart(params.partId, { 
        stock: newStock,
        lastStockUpdate: new Date(),
        updatedAt: new Date(),
        availabilityStatus: availabilityStatus as any
      });
    }

    // Create movement record
    const movement: InsertPartsInventoryMovement = {
      partId: params.partId,
      providerId: params.providerId,
      movementType: params.movementType as any,
      quantity: params.movementType === 'stock_out' || params.movementType === 'sold' || params.movementType === 'damaged' 
        ? -params.quantity 
        : params.quantity,
      previousStock,
      newStock,
      orderId: params.orderId,
      reason: params.reason,
      costPrice: params.costPrice?.toString(),
    };

    return await this.createPartsInventoryMovement(movement);
  }

  // Enhanced Parts methods with comprehensive functionality
  async generatePartSlug(name: string, providerId: string): Promise<string> {
    let baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check for uniqueness within the same provider
    while (true) {
      const existing = await db.select().from(parts)
        .where(and(
          eq(parts.slug, slug),
          eq(parts.providerId, providerId)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  async getPartsByCategory(categoryId: string, isActive = true): Promise<Part[]> {
    const conditions: SQL[] = [eq(parts.categoryId, categoryId)];
    if (isActive) {
      conditions.push(eq(parts.isActive, true));
    }
    
    return await db.select().from(parts)
      .where(combineConditions(conditions)!)
      .orderBy(desc(parts.createdAt));
  }

  async bulkUpdateParts(updates: { id: string; data: Partial<InsertPart> }[]): Promise<Part[]> {
    const results: Part[] = [];
    
    for (const update of updates) {
      const result = await this.updatePart(update.id, update.data);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  async getPartsStats(providerId?: string): Promise<{
    totalParts: number;
    activeParts: number;
    lowStockParts: number;
    outOfStockParts: number;
    totalValue: number;
  }> {
    let baseCondition = providerId ? eq(parts.providerId, providerId) : undefined;
    
    // Total parts
    const totalQuery = db.select({ count: count() }).from(parts);
    if (baseCondition) totalQuery.where(baseCondition);
    const totalResult = await totalQuery;
    
    // Active parts
    const activeCondition = baseCondition 
      ? and(baseCondition, eq(parts.isActive, true))
      : eq(parts.isActive, true);
    const activeResult = await db.select({ count: count() }).from(parts).where(activeCondition);
    
    // Low stock parts (stock <= lowStockThreshold or <= 10 if not set)
    const lowStockCondition = baseCondition
      ? and(baseCondition, eq(parts.isActive, true), sql`${parts.stock} <= COALESCE(${parts.lowStockThreshold}, 10)`)
      : and(eq(parts.isActive, true), sql`${parts.stock} <= COALESCE(${parts.lowStockThreshold}, 10)`);
    const lowStockResult = await db.select({ count: count() }).from(parts).where(lowStockCondition);
    
    // Out of stock parts
    const outOfStockCondition = baseCondition
      ? and(baseCondition, eq(parts.isActive, true), eq(parts.stock, 0))
      : and(eq(parts.isActive, true), eq(parts.stock, 0));
    const outOfStockResult = await db.select({ count: count() }).from(parts).where(outOfStockCondition);
    
    // Total value
    const valueCondition = baseCondition
      ? and(baseCondition, eq(parts.isActive, true))
      : eq(parts.isActive, true);
    const valueResult = await db.select({ 
      total: sql<number>`SUM(${parts.price}::numeric * ${parts.stock})`
    }).from(parts).where(valueCondition);
    
    return {
      totalParts: totalResult[0].count,
      activeParts: activeResult[0].count,
      lowStockParts: lowStockResult[0].count,
      outOfStockParts: outOfStockResult[0].count,
      totalValue: parseFloat(valueResult[0].total?.toString() || '0'),
    };
  }

  // Parts Bulk Upload methods
  async getPartsBulkUploads(providerId: string): Promise<PartsBulkUpload[]> {
    return await db.select().from(partsBulkUploads)
      .where(eq(partsBulkUploads.providerId, providerId))
      .orderBy(desc(partsBulkUploads.createdAt));
  }

  async createPartsBulkUpload(upload: InsertPartsBulkUpload): Promise<PartsBulkUpload> {
    const result = await db.insert(partsBulkUploads).values(upload).returning();
    return result[0];
  }

  async updatePartsBulkUpload(id: string, data: Partial<InsertPartsBulkUpload>): Promise<PartsBulkUpload | undefined> {
    const result = await db.update(partsBulkUploads)
      .set(data)
      .where(eq(partsBulkUploads.id, id))
      .returning();
    return result[0];
  }

  async processBulkUpload(uploadId: string, partsData: any[]): Promise<{ 
    success: number; 
    errors: { row: number; field: string; message: string }[] 
  }> {
    const upload = await db.select().from(partsBulkUploads)
      .where(eq(partsBulkUploads.id, uploadId)).limit(1);
    
    if (!upload[0]) {
      throw new Error('Upload not found');
    }

    await this.updatePartsBulkUpload(uploadId, { 
      status: 'processing',
      startedAt: new Date()
    });

    let successCount = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < partsData.length; i++) {
      const row = i + 2; // Assuming header row
      const partData = partsData[i];

      try {
        // Validate required fields
        if (!partData.name || !partData.price || !partData.categoryId) {
          errors.push({
            row,
            field: 'required',
            message: 'Missing required fields: name, price, or categoryId'
          });
          continue;
        }

        // Generate slug if not provided
        if (!partData.slug) {
          partData.slug = await this.generatePartSlug(partData.name, upload[0].providerId);
        }

        // Create part
        await this.createPart({
          ...partData,
          providerId: upload[0].providerId,
          stock: parseInt(partData.stock) || 0,
          price: parseFloat(partData.price).toString(),
        });

        successCount++;
      } catch (error) {
        errors.push({
          row,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update upload status
    const finalStatus = errors.length === 0 ? 'completed' : 
      (successCount > 0 ? 'partially_completed' : 'failed');

    await this.updatePartsBulkUpload(uploadId, {
      status: finalStatus as any,
      successCount,
      errorCount: errors.length,
      errors,
      completedAt: new Date(),
      processingTime: Math.floor((Date.now() - (upload[0].startedAt?.getTime() || Date.now())) / 1000)
    });

    return { success: successCount, errors };
  }

  // Parts Supplier methods
  async getPartsSuppliers(providerId: string): Promise<PartsSupplier[]> {
    return await db.select().from(partsSuppliers)
      .where(eq(partsSuppliers.providerId, providerId))
      .orderBy(desc(partsSuppliers.createdAt));
  }

  async getPartsSupplier(id: string): Promise<PartsSupplier | undefined> {
    const result = await db.select().from(partsSuppliers)
      .where(eq(partsSuppliers.id, id)).limit(1);
    return result[0];
  }

  async createPartsSupplier(supplier: InsertPartsSupplier): Promise<PartsSupplier> {
    const result = await db.insert(partsSuppliers).values(supplier).returning();
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
    const result = await db.delete(partsSuppliers)
      .where(eq(partsSuppliers.id, id));
    return result.rowCount > 0;
  }

  // Support Ticket methods
  async getSupportTickets(userId?: string, filters?: { status?: string; category?: string; priority?: string }): Promise<SupportTicket[]> {
    let baseQuery = db.select().from(supportTickets);
    
    const conditions: SQL[] = [];
    
    if (userId) {
      conditions.push(eq(supportTickets.userId, userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    
    if (filters?.category) {
      conditions.push(eq(supportTickets.category, filters.category));
    }
    
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    return await baseQuery.orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const result = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, id)).limit(1);
    return result[0];
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const ticketNumber = await this.generateTicketNumber();
    const result = await db.insert(supportTickets).values([{
      ...ticket,
      ticketNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).returning();
    return result[0];
  }

  async updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async closeSupportTicket(id: string, resolutionNotes?: string): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({ 
        status: 'resolved',
        resolutionNotes,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async assignSupportTicket(id: string, agentId: string): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({ 
        assignedTo: agentId,
        status: 'assigned',
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async getSupportTicketsByAgent(agentId: string, status?: string): Promise<SupportTicket[]> {
    let baseQuery = db.select().from(supportTickets)
      .where(eq(supportTickets.assignedTo, agentId));
    
    if (status) {
      baseQuery = baseQuery.where(and(
        eq(supportTickets.assignedTo, agentId),
        eq(supportTickets.status, status)
      ));
    }
    
    return await baseQuery.orderBy(desc(supportTickets.updatedAt));
  }

  async generateTicketNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TKT${timestamp}${random}`;
  }

  // Support Ticket Message methods
  async getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    return await db.select().from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(asc(supportTicketMessages.createdAt));
  }

  async createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const result = await db.insert(supportTicketMessages).values([{
      ...message,
      createdAt: new Date(),
    }]).returning();
    
    // Update ticket's last activity
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, message.ticketId));
    
    return result[0];
  }

  async markMessagesAsRead(ticketId: string, userId: string): Promise<void> {
    await db.update(supportTicketMessages)
      .set({ isRead: true })
      .where(and(
        eq(supportTicketMessages.ticketId, ticketId),
        sql`${supportTicketMessages.senderId} != ${userId}`
      ));
  }

  // FAQ methods
  async getFAQs(category?: string, published?: boolean): Promise<FAQ[]> {
    let baseQuery = db.select().from(faq);
    
    const conditions: SQL[] = [];
    
    if (category) {
      conditions.push(eq(faq.category, category));
    }
    
    if (published !== undefined) {
      conditions.push(eq(faq.isPublished, published));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    return await baseQuery.orderBy(asc(faq.sortOrder), desc(faq.createdAt));
  }

  async getFAQ(id: string): Promise<FAQ | undefined> {
    const result = await db.select().from(faq)
      .where(eq(faq.id, id)).limit(1);
    return result[0];
  }

  async searchFAQs(query: string, category?: string): Promise<FAQ[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    let baseQuery = db.select().from(faq);
    
    const conditions: SQL[] = [
      eq(faq.isPublished, true),
      or(
        ilike(faq.question, searchTerm),
        ilike(faq.answer, searchTerm),
        sql`${faq.tags}::text ILIKE ${searchTerm}`
      )
    ];
    
    if (category) {
      conditions.push(eq(faq.category, category));
    }
    
    return await baseQuery
      .where(and(...conditions))
      .orderBy(desc(faq.helpfulCount));
  }

  async createFAQ(faqData: InsertFAQ): Promise<FAQ> {
    const result = await db.insert(faq).values([{
      ...faqData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).returning();
    return result[0];
  }

  async updateFAQ(id: string, data: Partial<InsertFAQ>): Promise<FAQ | undefined> {
    const result = await db.update(faq)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(faq.id, id))
      .returning();
    return result[0];
  }

  async deleteFAQ(id: string): Promise<boolean> {
    const result = await db.delete(faq)
      .where(eq(faq.id, id));
    return result.rowCount > 0;
  }

  async incrementFAQHelpfulCount(id: string, isHelpful: boolean): Promise<void> {
    const column = isHelpful ? faq.helpfulCount : faq.notHelpfulCount;
    await db.update(faq)
      .set({ 
        [isHelpful ? 'helpfulCount' : 'notHelpfulCount']: sql`${column} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(faq.id, id));
  }

  // Support Callback Request methods
  async getSupportCallbackRequests(userId?: string, status?: string): Promise<SupportCallbackRequest[]> {
    let baseQuery = db.select().from(supportCallbackRequests);
    
    const conditions: SQL[] = [];
    
    if (userId) {
      conditions.push(eq(supportCallbackRequests.userId, userId));
    }
    
    if (status) {
      conditions.push(eq(supportCallbackRequests.status, status));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    return await baseQuery.orderBy(desc(supportCallbackRequests.createdAt));
  }

  async getSupportCallbackRequest(id: string): Promise<SupportCallbackRequest | undefined> {
    const result = await db.select().from(supportCallbackRequests)
      .where(eq(supportCallbackRequests.id, id)).limit(1);
    return result[0];
  }

  async createSupportCallbackRequest(request: InsertSupportCallbackRequest): Promise<SupportCallbackRequest> {
    const result = await db.insert(supportCallbackRequests).values([{
      ...request,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).returning();
    return result[0];
  }

  async updateSupportCallbackRequest(id: string, data: Partial<InsertSupportCallbackRequest>): Promise<SupportCallbackRequest | undefined> {
    const result = await db.update(supportCallbackRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportCallbackRequests.id, id))
      .returning();
    return result[0];
  }

  // Support Agent methods
  async getSupportAgents(department?: string, isActive?: boolean): Promise<SupportAgent[]> {
    let baseQuery = db.select().from(supportAgents);
    
    const conditions: SQL[] = [];
    
    if (department) {
      conditions.push(eq(supportAgents.department, department));
    }
    
    if (isActive !== undefined) {
      conditions.push(eq(supportAgents.isActive, isActive));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    return await baseQuery.orderBy(asc(supportAgents.firstName));
  }

  async getSupportAgent(userId: string): Promise<SupportAgent | undefined> {
    const result = await db.select().from(supportAgents)
      .where(eq(supportAgents.userId, userId)).limit(1);
    return result[0];
  }

  async createSupportAgent(agent: InsertSupportAgent): Promise<SupportAgent> {
    const result = await db.insert(supportAgents).values([{
      ...agent,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]).returning();
    return result[0];
  }

  async updateSupportAgent(userId: string, data: Partial<InsertSupportAgent>): Promise<SupportAgent | undefined> {
    const result = await db.update(supportAgents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportAgents.userId, userId))
      .returning();
    return result[0];
  }

  async updateAgentStatus(userId: string, status: 'available' | 'busy' | 'away' | 'offline', statusMessage?: string): Promise<void> {
    await db.update(supportAgents)
      .set({ 
        status,
        statusMessage,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportAgents.userId, userId));
  }

  async getAvailableAgents(department?: string, skills?: string[]): Promise<SupportAgent[]> {
    let baseQuery = db.select().from(supportAgents)
      .where(and(
        eq(supportAgents.isActive, true),
        eq(supportAgents.status, 'available')
      ));
    
    if (department) {
      baseQuery = baseQuery.where(and(
        eq(supportAgents.isActive, true),
        eq(supportAgents.status, 'available'),
        eq(supportAgents.department, department)
      ));
    }
    
    if (skills && skills.length > 0) {
      // For PostgreSQL, we can use the @> operator to check if skills array contains required skills
      baseQuery = baseQuery.where(and(
        eq(supportAgents.isActive, true),
        eq(supportAgents.status, 'available'),
        department ? eq(supportAgents.department, department) : sql`true`,
        sql`${supportAgents.skills} @> ${JSON.stringify(skills)}`
      ));
    }
    
    return await baseQuery.orderBy(asc(supportAgents.currentTicketLoad));
  }

  // Support Analytics methods
  async getSupportStats(): Promise<{
    openTickets: number;
    totalTickets: number;
    avgResponseTime: string;
    resolutionRate: number;
    satisfactionScore: number;
  }> {
    // Get total tickets count
    const totalTicketsResult = await db.select({ count: count() }).from(supportTickets);
    const totalTickets = totalTicketsResult[0].count;
    
    // Get open tickets count
    const openTicketsResult = await db.select({ count: count() })
      .from(supportTickets)
      .where(inArray(supportTickets.status, ['open', 'assigned', 'in_progress']));
    const openTickets = openTicketsResult[0].count;
    
    // Get resolved tickets for resolution rate
    const resolvedTicketsResult = await db.select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'resolved'));
    const resolvedTickets = resolvedTicketsResult[0].count;
    
    // Calculate resolution rate
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    
    // Calculate average response time (simplified - first response time)
    const responseTimeQuery = await db.select({
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${supportTickets.assignedAt} - ${supportTickets.createdAt})) / 3600)`.as('avgHours')
    })
      .from(supportTickets)
      .where(sql`${supportTickets.assignedAt} IS NOT NULL`);
    
    const avgResponseHours = responseTimeQuery[0]?.avgHours || 0;
    const avgResponseTime = avgResponseHours > 0 
      ? `${Math.round(avgResponseHours)} hours`
      : 'No data';
    
    // Calculate satisfaction score from resolved tickets (assuming rating field exists)
    const satisfactionQuery = await db.select({
      avgRating: sql<number>`AVG(CAST(${supportTickets.customerRating} AS DECIMAL))`.as('avgRating')
    })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.status, 'resolved'),
        sql`${supportTickets.customerRating} IS NOT NULL`
      ));
    
    const satisfactionScore = satisfactionQuery[0]?.avgRating || 0;
    
    return {
      openTickets,
      totalTickets,
      avgResponseTime,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      satisfactionScore: Math.round(satisfactionScore * 100) / 100,
    };
  }

}

export const storage = new PostgresStorage();