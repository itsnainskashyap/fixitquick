import { eq, and, desc, asc, count, like, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
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

  // Parts Category methods
  getPartsCategories(activeOnly?: boolean): Promise<PartsCategory[]>;
  
  // Wallet methods
  getWalletBalance(userId: string): Promise<{ balance: string; fixiPoints: number }>;
  getWalletTransactions(userId: string, limit?: number): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit'): Promise<void>;

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
}

export class PostgresStorage implements IStorage {
  // User methods
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
    console.log('Creating user in PostgreSQL:', user);
    const result = await db.insert(users).values({
      ...user,
      updatedAt: new Date(),
    }).returning();
    console.log('User created successfully:', result[0]);
    return result[0];
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
    
    if (role && role !== 'all') {
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
      return await baseQuery.where(whereClause);
    } else {
      return await baseQuery;
    }
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
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
      .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)));
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
    
    return await baseQuery;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
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
      .orderBy(desc(orders.createdAt));
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
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
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
      status: 'accepted',
      updatedAt: new Date()
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
    if (['cancelled', 'completed', 'refunded'].includes(order.status)) {
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
  async getParts(filters?: { categoryId?: string; providerId?: string; isActive?: boolean }): Promise<Part[]> {
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
    if (whereClause) {
      return await baseQuery.where(whereClause);
    } else {
      return await baseQuery;
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

  // Chat methods
  async getChatMessages(orderId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(message: any): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
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
}

export const storage = new PostgresStorage();