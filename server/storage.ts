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
  getServiceCategory(id: string): Promise<ServiceCategory | undefined>;
  createServiceCategory(category: Omit<ServiceCategory, 'id' | 'createdAt'>): Promise<ServiceCategory>;
  updateServiceCategory(id: string, data: Partial<Omit<ServiceCategory, 'id' | 'createdAt'>>): Promise<ServiceCategory | undefined>;

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

  // Parts methods
  getParts(filters?: { categoryId?: string; providerId?: string; isActive?: boolean }): Promise<Part[]>;
  getPart(id: string): Promise<Part | undefined>;
  createPart(part: Omit<Part, 'id' | 'createdAt'>): Promise<Part>;
  updatePart(id: string, data: Partial<Omit<Part, 'id' | 'createdAt'>>): Promise<Part | undefined>;
  getPartsByProvider(providerId: string): Promise<Part[]>;
  getLowStockParts(providerId: string, threshold?: number): Promise<Part[]>;
  
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
  getServiceProviders(filters?: { categoryId?: string; isVerified?: boolean }): Promise<ServiceProvider[]>;
  getServiceProvider(userId: string): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined>;

  // Chat methods
  getChatMessages(orderId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(orderId: string, userId: string): Promise<void>;

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

  trackSearchQuery(userId: string | null, query: string, results: number, category?: string): Promise<void>;

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
    if (activeOnly) {
      return await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true));
    } else {
      return await db.select().from(serviceCategories);
    }
  }

  async getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
    const result = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
    return result[0];
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const result = await db.insert(serviceCategories).values(category).returning();
    return result[0];
  }

  async updateServiceCategory(id: string, data: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
    const result = await db.update(serviceCategories)
      .set(data)
      .where(eq(serviceCategories.id, id))
      .returning();
    return result[0];
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

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values([service]).returning();
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
    const result = await db.insert(orders).values([order]).returning();
    return result[0];
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set(data)
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

    if (!provider.isVerified) {
      return { allowed: false, reason: 'Provider is not verified' };
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
    const result = await db.insert(parts).values([part]).returning();
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
    const result = await db.insert(walletTransactions).values([transaction]).returning();
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
        
        const transactionResults = await trx.insert(walletTransactions).values([transactionData]).returning();
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
      errors.push(error.message || 'Payment processing failed');
      return { success: false, errors };
    }
  }

  // Provider methods
  async getServiceProviders(filters?: { categoryId?: string; isVerified?: boolean }): Promise<ServiceProvider[]> {
    let baseQuery = db.select().from(serviceProviders);
    
    const conditions: SQL[] = [];
    if (filters?.categoryId) {
      conditions.push(eq(serviceProviders.categoryId, filters.categoryId));
    }
    if (filters?.isVerified !== undefined) {
      conditions.push(eq(serviceProviders.isVerified, filters.isVerified));
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
    const result = await db.insert(serviceProviders).values([provider]).returning();
    return result[0];
  }

  async updateServiceProvider(userId: string, data: Partial<InsertServiceProvider>): Promise<ServiceProvider | undefined> {
    const result = await db.update(serviceProviders)
      .set(data)
      .where(eq(serviceProviders.userId, userId))
      .returning();
    return result[0];
  }

  // Chat methods
  async getChatMessages(orderId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values([message]).returning();
    return result[0];
  }

  async markMessagesAsRead(orderId: string, userId: string): Promise<void> {
    await db.update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.orderId, orderId), eq(chatMessages.receiverId, userId)));
  }

  // Notification methods
  async getNotifications(userId: string, limit = 20): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values([notification]).returning();
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
    const result = await db.insert(reviews).values([review]).returning();
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
    const result = await db.insert(coupons).values([coupon]).returning();
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

  async trackSearchQuery(userId: string | null, query: string, results: number, category?: string): Promise<void> {
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
    const result = await db.insert(paymentMethods).values([paymentMethod]).returning();
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
    const result = await db.insert(stripeCustomers).values([customer]).returning();
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
    const result = await db.insert(paymentIntents).values([paymentIntent]).returning();
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

    const result = await db.insert(userAddresses).values([address]).returning();
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
    const result = await db.insert(userNotificationPreferences).values([preferences]).returning();
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

}

export const storage = new PostgresStorage();