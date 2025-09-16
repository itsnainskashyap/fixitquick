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
} from "@shared/schema";

// Helper function to safely combine conditions for Drizzle where clauses
function combineConditions(conditions: SQL[]): SQL<unknown> | undefined {
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

  // Enhanced hierarchical category methods
  getCategoryTree(rootId?: string, maxDepth?: number, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getCategoryPath(categoryId: string): Promise<ServiceCategory[]>;
  getCategoryBreadcrumbs(categoryId: string): Promise<{ id: string; name: string; slug: string }[]>;
  getChildCategories(parentId: string, activeOnly?: boolean): Promise<ServiceCategory[]>;
  getCategoryWithChildren(categoryId: string, activeOnly?: boolean): Promise<ServiceCategory & { children?: ServiceCategory[] }>;
  moveCategoryToParent(categoryId: string, newParentId: string | null): Promise<ServiceCategory | undefined>;
  bulkReorderCategories(updates: { categoryId: string; sortOrder: number; parentId?: string }[]): Promise<void>;
  updateCategoryPaths(startFromCategoryId?: string): Promise<void>;
  getCategoriesByPath(pathPrefix: string, activeOnly?: boolean): Promise<ServiceCategory[]>;
  validateCategoryHierarchy(categoryId: string, newParentId: string | null): Promise<{ valid: boolean; reason?: string }>;
  getMaxDepthForCategory(categoryId: string): Promise<number>;
  getCategoryStats(categoryId?: string): Promise<{
    totalCategories: number;
    maxDepth: number;
    categoriesAtLevel: { level: number; count: number }[];
    servicesCount: number;
  }>;

  // Service methods
  getServices(filters?: { categoryId?: string; isActive?: boolean; isTestService?: boolean }): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service>;
  updateService(id: string, data: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<Service | undefined>;
  deleteService(id: string): Promise<{ success: boolean; message: string }>;
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
  
  // Enhanced verification methods with strong typing
  getPendingVerifications(limit?: number): Promise<ServiceProvider[]>;
  updateVerificationStatus(userId: string, params: {
    verificationStatus: ServiceProviderVerificationStatusType;
    verifiedBy?: string;
    rejectionReason?: string;
    verificationNotes?: string;
    resubmissionReason?: string;
  }): Promise<ServiceProvider | undefined>;
  getVerificationHistory(userId: string): Promise<any[]>;

  // Atomic operations to fix approval atomicity issue
  approveProviderAtomic(userId: string, params: {
    verifiedBy: string;
    verificationNotes?: string;
  }): Promise<{ success: boolean; error?: string }>;
  rejectProviderAtomic(userId: string, params: {
    rejectionReason: string;
    verifiedBy: string;
    verificationNotes?: string;
  }): Promise<{ success: boolean; error?: string }>;

  // Status transition validation
  validateStatusTransition(
    fromStatus: ServiceProviderVerificationStatusType,
    toStatus: ServiceProviderVerificationStatusType,
    userId: string
  ): Promise<{ valid: boolean; errors: string[] }>;
  
  // Document management with strong typing
  validateDocumentUpload(fileData: { filename: string; size: number; mimetype: string; documentType: string }): Promise<{ valid: boolean; errors: string[] }>;
  storeProviderDocument(
    userId: string, 
    documentType: string, 
    documentData: DocumentsType[keyof DocumentsType]
  ): Promise<{ success: boolean; url?: string; error?: string }>;

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

  // Comprehensive Coupon Management methods
  // Core CRUD operations
  getCoupon(code: string): Promise<Coupon | undefined>;
  getCouponById(id: string): Promise<Coupon | undefined>;
  getAllCoupons(filters?: {
    isActive?: boolean;
    isExpired?: boolean;
    type?: string;
    campaignName?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ coupons: Coupon[]; total: number }>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<InsertCoupon & { lastModifiedBy: string }>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<{ success: boolean; message: string }>;
  
  // Coupon validation and application
  validateCoupon(code: string, context: {
    userId: string;
    orderValue: number;
    serviceIds?: string[];
    categoryIds?: string[];
  }): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    errors: string[];
  }>;
  applyCoupon(code: string, userId: string, orderId: string, orderValue: number): Promise<{
    success: boolean;
    discountAmount: number;
    couponUsage?: CouponUsage;
    error?: string;
  }>;
  
  // Usage tracking and analytics
  getCouponUsage(couponId: string, filters?: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ usage: CouponUsage[]; total: number }>;
  getCouponStatistics(couponId?: string): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    totalUsage: number;
    totalSavings: number;
    averageDiscountAmount: number;
    topPerformingCoupons: Array<{
      id: string;
      code: string;
      title: string;
      usageCount: number;
      totalSavings: number;
    }>;
  }>;
  getUserCouponUsage(userId: string, limit?: number): Promise<CouponUsage[]>;
  
  // Bulk operations
  bulkUpdateCoupons(couponIds: string[], updates: {
    isActive?: boolean;
    lastModifiedBy: string;
  }): Promise<{ success: boolean; updated: number; errors: string[] }>;
  bulkDeleteCoupons(couponIds: string[]): Promise<{ success: boolean; deleted: number; errors: string[] }>;
  
  // Advanced coupon features
  generateCouponCode(pattern?: string): Promise<string>;
  checkCouponCodeAvailability(code: string): Promise<{ available: boolean; suggestions?: string[] }>;
  expireOutdatedCoupons(): Promise<{ expired: number; deactivated: number }>;
  calculateCouponPerformance(couponId: string): Promise<{
    usageRate: number;
    conversionRate: number;
    averageOrderValue: number;
    totalRevenue: number;
    roi: number;
  }>;
  
  // Campaign and targeting
  getCouponsByCategory(categoryIds: string[], userId?: string): Promise<Coupon[]>;
  getCouponsForUser(userId: string, filters?: {
    categoryIds?: string[];
    minOrderValue?: number;
    onlyUnused?: boolean;
  }): Promise<Coupon[]>;
  duplicateCoupon(couponId: string, modifications: Partial<InsertCoupon>): Promise<Coupon>;

  // Smart Assignment System methods
  findEligibleProviders(bookingId: string): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    rating: number;
    totalJobs: number;
    distanceKm: number;
    estimatedTravelTime: number;
    isOnline: boolean;
    responseRate: number;
    assignmentScore: number;
    skills: string[];
    currentLocation?: { latitude: number; longitude: number };
  }>>;
  calculateProviderScore(provider: any, booking: any): number;
  autoAssignProvider(bookingId: string, options?: {
    retryCount?: number;
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    assignedProviderId?: string;
    jobRequestIds?: string[];
    error?: string;
    retryAfter?: number;
  }>;
  sendJobOffers(bookingId: string, providerIds: string[]): Promise<{
    success: boolean;
    sentOffers: number;
    errors: string[];
  }>;
  getJobRequestsWithDetails(providerId: string, options?: {
    status?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    bookingId: string;
    status: string;
    expiresAt: Date;
    sentAt: Date;
    distanceKm?: number;
    booking: {
      id: string;
      serviceId: string;
      userId: string;
      serviceLocation: any;
      totalAmount: string;
      urgency: string;
      status: string;
      customerName: string;
      serviceType: string;
    };
  }>>;
  expireJobRequests(): Promise<void>;
  reassignExpiredBookings(): Promise<void>;

  // Settings methods
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown, description?: string): Promise<void>;

  // Tax Category methods
  getTaxCategories(filters?: { isActive?: boolean; search?: string }): Promise<TaxCategory[]>;
  getTaxCategory(id: string): Promise<TaxCategory | undefined>;
  createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory>;
  updateTaxCategory(id: string, data: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined>;
  deleteTaxCategory(id: string): Promise<{ success: boolean; message: string }>;
  getTaxCategoriesByPriority(activeOnly?: boolean): Promise<TaxCategory[]>;
  reorderTaxCategories(categoryIds: string[], startOrder?: number): Promise<void>;
  getTaxCategoryStatistics(): Promise<{
    totalCategories: number;
    activeCategories: number;
    averageRate: number;
    mostUsedCategory: TaxCategory | null;
  }>;

  // Tax methods - Core CRUD
  getTaxes(filters?: { 
    isActive?: boolean; 
    categoryId?: string; 
    type?: string; 
    locationBased?: boolean;
    search?: string;
    isPrimary?: boolean;
    gstType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ taxes: Tax[]; total: number }>;
  getTax(id: string): Promise<Tax | undefined>;
  getTaxByCode(code: string): Promise<Tax | undefined>;
  createTax(tax: InsertTax): Promise<Tax>;
  updateTax(id: string, data: Partial<InsertTax>): Promise<Tax | undefined>;
  deleteTax(id: string): Promise<{ success: boolean; message: string }>;

  // Tax applicability and filtering
  getApplicableTaxes(context: {
    serviceCategories?: string[];
    partCategories?: string[];
    orderValue: number;
    userLocation?: { state?: string; city?: string };
    userRole?: string;
    orderType?: string;
    promoCode?: string;
  }): Promise<Tax[]>;
  getTaxesByCategory(categoryId: string, activeOnly?: boolean): Promise<Tax[]>;
  getTaxesByService(serviceId: string, orderValue?: number): Promise<Tax[]>;
  getTaxesByLocation(state?: string, city?: string, activeOnly?: boolean): Promise<Tax[]>;
  getTaxesByGSTType(gstType: string, activeOnly?: boolean): Promise<Tax[]>;

  // Tax calculation engine
  calculateTaxes(params: {
    orderValue: number;
    serviceCategories?: string[];
    partCategories?: string[];
    userLocation?: { state?: string; city?: string };
    userRole?: string;
    promoCode?: string;
    orderType?: string;
    shippingAmount?: number;
  }): Promise<{
    taxes: Array<{
      tax: Tax;
      taxableAmount: number;
      calculatedAmount: number;
      appliedRate: number;
    }>;
    totalTaxAmount: number;
    totalAmount: number;
    breakdown: {
      baseAmount: number;
      totalTaxAmount: number;
      finalAmount: number;
    };
  }>;
  previewTaxCalculation(taxIds: string[], orderValue: number): Promise<{
    preview: Array<{
      tax: Tax;
      calculatedAmount: number;
      appliedRate: number;
    }>;
    totalTax: number;
    conflicts: string[];
  }>;

  // Tax validation and business rules
  validateTaxConfiguration(tax: Partial<InsertTax>): Promise<{ valid: boolean; errors: string[] }>;
  validateTaxCombination(taxIds: string[]): Promise<{ valid: boolean; conflicts: string[] }>;
  checkTaxCodeAvailability(code: string, excludeId?: string): Promise<{ available: boolean; suggestions?: string[] }>;
  validateTaxRules(tax: Tax, orderContext: any): Promise<{ applicable: boolean; reasons: string[] }>;

  // Bulk operations
  bulkUpdateTaxes(operations: {
    taxIds: string[];
    operation: 'activate' | 'deactivate' | 'update_priority' | 'delete';
    data?: {
      isActive?: boolean;
      priority?: number;
    };
  }): Promise<{ success: boolean; updated: number; errors: string[] }>;
  bulkActivateTaxes(taxIds: string[]): Promise<{ success: boolean; activated: number; errors: string[] }>;
  bulkDeactivateTaxes(taxIds: string[]): Promise<{ success: boolean; deactivated: number; errors: string[] }>;

  // Tax analytics and statistics
  getTaxStatistics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    categoryIds?: string[];
    stateFilter?: string;
    typeFilter?: string;
  }): Promise<{
    totalTaxes: number;
    activeTaxes: number;
    totalCollected: number;
    averageRate: number;
    topPerformingTaxes: Array<{
      id: string;
      name: string;
      code: string;
      totalCollected: number;
      totalOrders: number;
      averageAmount: number;
    }>;
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      taxCount: number;
      totalCollected: number;
    }>;
    locationBreakdown: Array<{
      location: string;
      taxCount: number;
      totalCollected: number;
    }>;
    typeBreakdown: Array<{
      type: string;
      count: number;
      totalCollected: number;
    }>;
  }>;
  getTaxPerformanceReport(taxId: string, dateRange?: { from: string; to: string }): Promise<{
    tax: Tax;
    totalOrders: number;
    totalCollected: number;
    averageOrderValue: number;
    averageTaxAmount: number;
    usageRate: number;
    timeSeries: Array<{
      date: string;
      orders: number;
      collected: number;
    }>;
  }>;

  // Tax compliance and audit
  getTaxAuditTrail(taxId?: string, limit?: number): Promise<Array<{
    id: string;
    taxId: string;
    action: string;
    oldValues: any;
    newValues: any;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>>;
  updateTaxUsageStats(taxId: string, orderValue: number, taxAmount: number): Promise<void>;
  archiveExpiredTaxes(): Promise<{ archived: number; errors: string[] }>;

  // Tax exemption and special rules
  checkTaxExemption(taxId: string, context: {
    userRole?: string;
    orderValue?: number;
    promoCode?: string;
    serviceCategories?: string[];
  }): Promise<{ exempt: boolean; reason?: string }>;
  getExemptionRules(taxId: string): Promise<any>;
  applyTaxExemptions(taxes: Tax[], context: any): Promise<Tax[]>;

  // Advanced tax features
  getTaxTiers(taxId: string): Promise<any>;
  calculateTieredTax(taxId: string, orderValue: number): Promise<{
    tierApplied: any;
    calculatedAmount: number;
    effectiveRate: number;
  }>;
  generateTaxCode(baseName: string, type: string): Promise<string>;
  duplicateTax(taxId: string, modifications?: Partial<InsertTax>): Promise<Tax>;

  // Integration methods
  syncTaxWithOrders(taxId: string): Promise<{ success: boolean; ordersUpdated: number }>;
  recalculateTaxForOrders(taxId: string, orderIds?: string[]): Promise<{ success: boolean; ordersRecalculated: number; errors: string[] }>;
  validateTaxIntegrity(): Promise<{ valid: boolean; issues: string[]; fixedIssues: string[] }>;

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

  // User Locale Preferences methods
  getUserLocalePreferences(userId: string): Promise<UserLocalePreferences | undefined>;
  createUserLocalePreferences(preferences: InsertUserLocalePreferences): Promise<UserLocalePreferences>;
  updateUserLocalePreferences(userId: string, data: Partial<InsertUserLocalePreferences>): Promise<UserLocalePreferences | undefined>;
  upsertUserLocalePreferences(userId: string, data: Partial<InsertUserLocalePreferences>): Promise<UserLocalePreferences>;

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
  
  // Background matching methods
  listOrdersNeedingMatching(limit?: number): Promise<ServiceBooking[]>;
  updateBookingMatchingExpiry(bookingId: string, expiresAt: Date, candidateCount: number): Promise<ServiceBooking | undefined>;

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

  // Service Provider Profile Management methods
  upsertServiceProviderProfile(data: InsertServiceProviderProfile): Promise<ServiceProviderProfile | null>;
  getProviderProfileByUserId(userId: string): Promise<ServiceProviderProfile | null>;

  // Document Management  
  submitProviderDocuments(userId: string, documents: DocumentsType): Promise<ServiceProviderProfile | null>;

  // Verification Workflow
  setProviderVerificationStatus(userId: string, status: ServiceProviderVerificationStatusType, rejectionReason?: string): Promise<ServiceProviderProfile | null>;
  listProviderSubmissions(status?: ServiceProviderVerificationStatusType): Promise<ServiceProviderProfile[]>;

  // Role Management
  upgradeUserRoleToProvider(userId: string): Promise<boolean>;

  // Referral methods
  getUserReferral(userId: string): Promise<UserReferral | undefined>;
  createUserReferral(referral: InsertUserReferral): Promise<UserReferral>;
  updateUserReferral(userId: string, data: Partial<InsertUserReferral>): Promise<UserReferral | undefined>;
  generateReferralCode(userId: string, customCode?: string): Promise<string>;
  getReferralRecords(referrerId: string, status?: string): Promise<ReferralRecord[]>;
  createReferralRecord(record: InsertReferralRecord): Promise<ReferralRecord>;
  updateReferralRecord(id: string, data: Partial<InsertReferralRecord>): Promise<ReferralRecord | undefined>;
  getReferralByCode(code: string): Promise<UserReferral | undefined>;
  processReferralSignup(referralCode: string, newUserId: string, metadata?: any): Promise<ReferralRecord | undefined>;
  calculateReferralEarnings(userId: string): Promise<{ total: number; available: number; pending: number }>;
  updateReferralTier(userId: string): Promise<string>;

  // Legal and Privacy methods
  getUserAgreements(userId: string): Promise<UserAgreement | undefined>;
  createUserAgreements(agreements: InsertUserAgreement): Promise<UserAgreement>;
  updateUserAgreements(userId: string, data: UserAgreementUpdateData): Promise<UserAgreement | undefined>;
  getDataExportRequests(userId: string): Promise<DataExportRequest[]>;
  createDataExportRequest(request: InsertDataExportRequest): Promise<DataExportRequest>;
  updateDataExportRequest(id: string, data: Partial<InsertDataExportRequest>): Promise<DataExportRequest | undefined>;
  getDataExportRequest(id: string): Promise<DataExportRequest | undefined>;
  processDataExport(id: string): Promise<string | undefined>;
  getAccountDeletionRequests(userId?: string): Promise<AccountDeletionRequest[]>;
  createAccountDeletionRequest(request: InsertAccountDeletionRequest): Promise<AccountDeletionRequest>;
  updateAccountDeletionRequest(id: string, data: Partial<InsertAccountDeletionRequest>): Promise<AccountDeletionRequest | undefined>;
  cancelAccountDeletion(userId: string): Promise<boolean>;
  processAccountDeletion(id: string): Promise<boolean>;

  // Promotional Media methods
  // Core CRUD operations
  getPromotionalMedia(filters?: {
    isActive?: boolean;
    placement?: string;
    mediaType?: string;
    status?: string;
    moderationStatus?: string;
    campaignId?: string;
    tags?: string[];
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ media: PromotionalMedia[]; total: number }>;
  getPromotionalMediaItem(id: string): Promise<PromotionalMedia | undefined>;
  createPromotionalMedia(data: PromotionalMediaCreateData & { createdBy: string }): Promise<PromotionalMedia>;
  updatePromotionalMedia(id: string, data: Partial<PromotionalMediaUpdateData> & { lastModifiedBy: string }): Promise<PromotionalMedia | undefined>;
  deletePromotionalMedia(id: string): Promise<{ success: boolean; message: string }>;
  archivePromotionalMedia(id: string): Promise<PromotionalMedia | undefined>;

  // Active media queries for public display
  getActivePromotionalMedia(filters?: {
    placement?: string;
    userId?: string;
    userRole?: string;
    country?: string;
    state?: string;
    city?: string;
    limit?: number;
  }): Promise<PromotionalMedia[]>;
  getActiveMediaByPlacement(placement: string, userId?: string): Promise<PromotionalMedia[]>;
  getTargetedMediaForUser(userId: string, placement?: string): Promise<PromotionalMedia[]>;

  // Analytics and tracking
  createPromotionalMediaAnalytics(data: PromotionalMediaAnalyticsCreateData): Promise<PromotionalMediaAnalytics>;
  trackMediaImpression(mediaId: string, context: {
    userId?: string;
    sessionId?: string;
    placement?: string;
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
    viewportSize?: { width: number; height: number };
    metadata?: Record<string, any>;
  }): Promise<void>;
  trackMediaClick(mediaId: string, context: {
    userId?: string;
    sessionId?: string;
    placement?: string;
    clickPosition?: { x: number; y: number };
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
  trackMediaEvent(mediaId: string, eventType: string, context: any): Promise<void>;

  // Bulk operations
  bulkOperatePromotionalMedia(operation: PromotionalMediaBulkOperationData): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }>;
  bulkActivateMedia(mediaIds: string[]): Promise<{ success: boolean; activated: number; errors: string[] }>;
  bulkDeactivateMedia(mediaIds: string[]): Promise<{ success: boolean; deactivated: number; errors: string[] }>;
  bulkArchiveMedia(mediaIds: string[]): Promise<{ success: boolean; archived: number; errors: string[] }>;

  // Analytics and statistics
  getPromotionalMediaStatistics(filters?: PromotionalMediaStatisticsData): Promise<{
    totalMedia: number;
    activeMedia: number;
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    topPerformingMedia: Array<{
      id: string;
      title: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    performanceByType: Array<{
      mediaType: string;
      count: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    performanceByPlacement: Array<{
      placement: string;
      count: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    timeSeriesData: Array<{
      date: string;
      impressions: number;
      clicks: number;
      uniqueViews: number;
    }>;
  }>;
  getMediaPerformanceReport(mediaId: string, dateRange?: { from: string; to: string }): Promise<{
    media: PromotionalMedia;
    totalImpressions: number;
    totalClicks: number;
    uniqueViews: number;
    averageCTR: number;
    averageViewDuration: number;
    deviceBreakdown: Array<{ deviceType: string; count: number; percentage: number }>;
    timeSeriesData: Array<{
      date: string;
      impressions: number;
      clicks: number;
      viewDuration: number;
    }>;
  }>;

  // Moderation and approval
  updateModerationStatus(mediaId: string, status: string, notes?: string): Promise<PromotionalMedia | undefined>;
  getMediaForModeration(limit?: number): Promise<PromotionalMedia[]>;
  approveMedia(mediaId: string, approvedBy: string): Promise<PromotionalMedia | undefined>;
  rejectMedia(mediaId: string, rejectionNotes: string, rejectedBy: string): Promise<PromotionalMedia | undefined>;

  // Scheduling and automation
  getScheduledMedia(dateRange?: { from: string; to: string }): Promise<PromotionalMedia[]>;
  activateScheduledMedia(): Promise<{ activated: number; deactivated: number }>;
  expireOutdatedMedia(): Promise<{ expired: number; archived: number }>;

  // Campaign management
  getMediaByCampaign(campaignId: string, activeOnly?: boolean): Promise<PromotionalMedia[]>;
  getCampaignStatistics(campaignId: string): Promise<{
    totalMedia: number;
    activeMedia: number;
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    campaignPeriod: { startDate: string; endDate: string };
  }>;

  // Targeting and personalization
  checkMediaTargeting(mediaId: string, userContext: {
    userId?: string;
    userRole?: string;
    orderCount?: number;
    location?: { country?: string; state?: string; city?: string };
  }): Promise<{ eligible: boolean; reasons: string[] }>;
  getPersonalizedMedia(userId: string, placement?: string): Promise<PromotionalMedia[]>;

  // Cache and performance optimization
  updateMediaMetrics(mediaId: string, metrics: {
    impressions?: number;
    clicks?: number;
    uniqueViews?: number;
    avgViewDuration?: number;
    lastDisplayed?: Date;
  }): Promise<void>;
  getMediaCacheStatus(mediaId: string): Promise<{
    cached: boolean;
    cacheExpiry: Date;
    loadTime: number;
  }>;
  
  // Content management
  duplicateMedia(mediaId: string, modifications?: Partial<PromotionalMediaCreateData>): Promise<PromotionalMedia>;
  generateMediaPreview(mediaId: string): Promise<{ thumbnailUrl: string; previewUrl: string }>;
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

  // Enhanced hierarchical category methods
  async getCategoryTree(rootId?: string, maxDepth?: number, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: SQL[] = [];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    if (rootId) {
      // Get tree starting from specific root - include the root and all descendants
      // This would need path-based filtering for proper subtree selection
      const rootCondition = or(
        eq(serviceCategories.id, rootId),
        like(serviceCategories.categoryPath, `%${rootId}%`)
      );
      if (rootCondition) {
        conditions.push(rootCondition);
      }
    } else {
      // Get entire tree - return ALL categories, not just root level
      // Frontend will handle tree structure building
    }
    
    if (maxDepth !== undefined) {
      conditions.push(lte(serviceCategories.depth, maxDepth));
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      return await db.select().from(serviceCategories)
        .where(whereClause)
        .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    } else {
      return await db.select().from(serviceCategories)
        .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder), asc(serviceCategories.name));
    }
  }

  async getCategoryPath(categoryId: string): Promise<ServiceCategory[]> {
    const category = await this.getServiceCategory(categoryId);
    if (!category) {
      return [];
    }
    
    const path: ServiceCategory[] = [category];
    let currentCategory = category;
    
    // Traverse up the hierarchy
    while (currentCategory.parentId) {
      const parent = await this.getServiceCategory(currentCategory.parentId);
      if (!parent) break;
      
      path.unshift(parent);
      currentCategory = parent;
    }
    
    return path;
  }

  async getCategoryBreadcrumbs(categoryId: string): Promise<{ id: string; name: string; slug: string }[]> {
    const path = await this.getCategoryPath(categoryId);
    return path.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug || ''
    }));
  }

  async getChildCategories(parentId: string, activeOnly = true): Promise<ServiceCategory[]> {
    return await this.getSubCategories(parentId, activeOnly);
  }

  async getCategoryWithChildren(categoryId: string, activeOnly = true): Promise<ServiceCategory & { children?: ServiceCategory[] }> {
    const category = await this.getServiceCategory(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
    
    const children = await this.getChildCategories(categoryId, activeOnly);
    return {
      ...category,
      children
    };
  }

  async moveCategoryToParent(categoryId: string, newParentId: string | null): Promise<ServiceCategory | undefined> {
    // Validate the move is not creating a circular reference
    const validation = await this.validateCategoryHierarchy(categoryId, newParentId);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid category hierarchy move');
    }
    
    // Calculate new level and depth
    let newLevel = 0;
    let newDepth = 0;
    let newCategoryPath = '/';
    
    if (newParentId) {
      const parent = await this.getServiceCategory(newParentId);
      if (parent) {
        newLevel = (parent.level || 0) + 1;
        newDepth = (parent.depth || 0) + 1;
        newCategoryPath = (parent.categoryPath || '/') + (parent.slug || '') + '/';
      }
    }
    
    // Update the category
    const currentCategory = await this.getServiceCategory(categoryId);
    if (!currentCategory) return undefined;
    
    const updatedCategory = await db.update(serviceCategories)
      .set({
        parentId: newParentId,
        level: newLevel,
        depth: newDepth,
        categoryPath: newCategoryPath + (currentCategory.slug || '')
      })
      .where(eq(serviceCategories.id, categoryId))
      .returning();
      
    // Update paths for all descendants
    await this.updateCategoryPaths(categoryId);
    
    return updatedCategory[0];
  }

  async bulkReorderCategories(updates: { categoryId: string; sortOrder: number; parentId?: string }[]): Promise<void> {
    for (const update of updates) {
      const setData: any = { sortOrder: update.sortOrder };
      if (update.parentId !== undefined) {
        setData.parentId = update.parentId;
      }
      
      await db.update(serviceCategories)
        .set(setData)
        .where(eq(serviceCategories.id, update.categoryId));
    }
  }

  async updateCategoryPaths(startFromCategoryId?: string): Promise<void> {
    // If specific category provided, update its descendants
    if (startFromCategoryId) {
      const category = await this.getServiceCategory(startFromCategoryId);
      if (!category) return;
      
      // Update this category's path first
      let categoryPath = '/';
      if (category.parentId) {
        const parent = await this.getServiceCategory(category.parentId);
        if (parent && parent.categoryPath) {
          categoryPath = parent.categoryPath + parent.slug + '/';
        }
      }
      
      await db.update(serviceCategories)
        .set({ categoryPath: categoryPath + (category.slug || '') })
        .where(eq(serviceCategories.id, startFromCategoryId));
      
      // Get all descendants and update their paths recursively
      const descendants = await this.getChildCategories(startFromCategoryId, false);
      for (const descendant of descendants) {
        await this.updateCategoryPaths(descendant.id);
      }
    } else {
      // Update all categories starting from root
      const allCategories = await db.select().from(serviceCategories)
        .orderBy(asc(serviceCategories.level));
      
      for (const category of allCategories) {
        let categoryPath = '/';
        if (category.parentId) {
          const parent = await this.getServiceCategory(category.parentId);
          if (parent && parent.categoryPath) {
            categoryPath = parent.categoryPath + parent.slug + '/';
          }
        }
        
        await db.update(serviceCategories)
          .set({ categoryPath: categoryPath + (category.slug || '') })
          .where(eq(serviceCategories.id, category.id));
      }
    }
  }

  async getCategoriesByPath(pathPrefix: string, activeOnly = true): Promise<ServiceCategory[]> {
    const conditions: SQL[] = [like(serviceCategories.categoryPath, `${pathPrefix}%`)];
    if (activeOnly) {
      conditions.push(eq(serviceCategories.isActive, true));
    }
    
    return await db.select().from(serviceCategories)
      .where(combineConditions(conditions)!)
      .orderBy(asc(serviceCategories.level), asc(serviceCategories.sortOrder));
  }

  async validateCategoryHierarchy(categoryId: string, newParentId: string | null): Promise<{ valid: boolean; reason?: string }> {
    if (!newParentId) {
      return { valid: true }; // Moving to root is always valid
    }
    
    if (categoryId === newParentId) {
      return { valid: false, reason: 'Category cannot be its own parent' };
    }
    
    // Check if newParentId is a descendant of categoryId (would create circular reference)
    const parentPath = await this.getCategoryPath(newParentId);
    const isDescendant = parentPath.some(cat => cat.id === categoryId);
    
    if (isDescendant) {
      return { valid: false, reason: 'Cannot move category under its own descendant' };
    }
    
    return { valid: true };
  }

  async getMaxDepthForCategory(categoryId: string): Promise<number> {
    const result = await db.select({
      maxDepth: sql<number>`MAX(${serviceCategories.depth})`
    })
    .from(serviceCategories)
    .where(like(serviceCategories.categoryPath, `%/${categoryId}/%`));
    
    return result[0]?.maxDepth || 0;
  }

  async getCategoryStats(categoryId?: string): Promise<{
    totalCategories: number;
    maxDepth: number;
    categoriesAtLevel: { level: number; count: number }[];
    servicesCount: number;
  }> {
    let categoryCondition: SQL | undefined = undefined;
    
    if (categoryId) {
      const category = await this.getServiceCategory(categoryId);
      if (category && category.categoryPath) {
        categoryCondition = like(serviceCategories.categoryPath, `${category.categoryPath}%`);
      }
    }
    
    // Get total categories
    const totalResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(serviceCategories)
    .where(categoryCondition);
    
    const totalCategories = totalResult[0]?.count || 0;
    
    // Get max depth
    const depthResult = await db.select({
      maxDepth: sql<number>`MAX(${serviceCategories.depth})`
    })
    .from(serviceCategories)
    .where(categoryCondition);
    
    const maxDepth = depthResult[0]?.maxDepth || 0;
    
    // Get categories at each level
    const levelStats = await db.select({
      level: serviceCategories.level,
      count: sql<number>`COUNT(*)`
    })
    .from(serviceCategories)
    .where(categoryCondition)
    .groupBy(serviceCategories.level)
    .orderBy(asc(serviceCategories.level));
    
    const categoriesAtLevel = levelStats.map(stat => ({
      level: stat.level || 0,
      count: stat.count
    }));
    
    // Get services count
    let servicesCondition: SQL | undefined = undefined;
    if (categoryId) {
      servicesCondition = eq(services.categoryId, categoryId);
    }
    
    const servicesResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(services)
    .where(servicesCondition);
    
    const servicesCount = servicesResult[0]?.count || 0;
    
    return {
      totalCategories,
      maxDepth,
      categoriesAtLevel,
      servicesCount
    };
  }

  // Service methods
  async getServices(filters?: { categoryId?: string; isActive?: boolean; isTestService?: boolean }): Promise<Service[]> {
    let baseQuery = db.select().from(services);
    
    const conditions: SQL[] = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(services.isActive, filters.isActive));
    }
    if (filters?.categoryId && filters.categoryId !== 'all') {
      conditions.push(eq(services.categoryId, filters.categoryId));
    }
    if (filters?.isTestService !== undefined) {
      conditions.push(eq(services.isTestService, filters.isTestService));
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
    const result = await db.insert(services).values([service]).returning();
    return result[0];
  }

  async updateService(id: string, data: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<Service | undefined> {
    const result = await db.update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return result[0];
  }

  async deleteService(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if service exists
      const service = await this.getService(id);
      if (!service) {
        return { success: false, message: 'Service not found' };
      }

      // Check if service has active orders by searching items JSONB
      const activeOrders = await db.select({ count: count() })
        .from(orders)
        .where(and(
          sql`${orders.items}::jsonb @> ${JSON.stringify([{id}])}::jsonb`,
          inArray(orders.status, ['pending', 'accepted', 'in_progress'])
        ));
      
      if (activeOrders[0].count > 0) {
        return { 
          success: false, 
          message: `Cannot delete service with ${activeOrders[0].count} active orders. Please complete or cancel them first.` 
        };
      }

      // Delete the service
      await db.delete(services).where(eq(services.id, id));
      
      return { success: true, message: 'Service deleted successfully' };
    } catch (error) {
      console.error('Error deleting service:', error);
      return { success: false, message: 'Failed to delete service' };
    }
  }

  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    return await db.select().from(services)
      .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)))
      .execute();
  }

  // Test service management methods
  async getTestServices(): Promise<Service[]> {
    return await db.select().from(services)
      .where(eq(services.isTestService, true))
      .orderBy(desc(services.createdAt));
  }

  async createTestService(serviceData: Omit<Service, 'id' | 'createdAt'> & { isTestService: true }): Promise<Service> {
    const result = await db.insert(services).values([serviceData]).returning();
    return result[0];
  }

  async bulkDeleteTestServices(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      // Get all test services first to count them
      const testServices = await this.getTestServices();
      
      if (testServices.length === 0) {
        return { success: false, message: 'No test services found to delete', deletedCount: 0 };
      }
      
      // Check if any test services have active orders
      const testServiceIds = testServices.map(s => s.id);
      const activeOrdersQuery = await db.select({ count: count() })
        .from(orders)
        .where(
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
            WHERE (item->>'id')::text = ANY(${testServiceIds})
          )`
        );
      
      const activeOrdersCount = activeOrdersQuery[0]?.count || 0;
      
      if (activeOrdersCount > 0) {
        return {
          success: false,
          message: `Cannot delete test services with ${activeOrdersCount} active orders. Please complete or cancel them first.`,
          deletedCount: 0
        };
      }
      
      // Delete all test services
      const deleteResult = await db.delete(services)
        .where(eq(services.isTestService, true));
      
      return {
        success: true,
        message: `Successfully deleted ${testServices.length} test services`,
        deletedCount: testServices.length
      };
    } catch (error) {
      console.error('Error bulk deleting test services:', error);
      return { success: false, message: 'Failed to delete test services', deletedCount: 0 };
    }
  }

  async deleteSelectedTestServices(serviceIds: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      if (serviceIds.length === 0) {
        return { success: false, message: 'No services selected for deletion', deletedCount: 0 };
      }
      
      // Verify all services are test services
      const serviceRecords = await db.select()
        .from(services)
        .where(and(
          inArray(services.id, serviceIds),
          eq(services.isTestService, true)
        ));
      
      if (serviceRecords.length !== serviceIds.length) {
        return {
          success: false,
          message: 'Some selected services are not test services or do not exist',
          deletedCount: 0
        };
      }
      
      // Check for active orders
      const activeOrdersQuery = await db.select({ count: count() })
        .from(orders)
        .where(
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
            WHERE (item->>'id')::text = ANY(${serviceIds})
          )`
        );
      
      const activeOrdersCount = activeOrdersQuery[0]?.count || 0;
      
      if (activeOrdersCount > 0) {
        return {
          success: false,
          message: `Cannot delete services with ${activeOrdersCount} active orders`,
          deletedCount: 0
        };
      }
      
      // Delete selected test services
      await db.delete(services)
        .where(and(
          inArray(services.id, serviceIds),
          eq(services.isTestService, true)
        ));
      
      return {
        success: true,
        message: `Successfully deleted ${serviceRecords.length} test services`,
        deletedCount: serviceRecords.length
      };
    } catch (error) {
      console.error('Error deleting selected test services:', error);
      return { success: false, message: 'Failed to delete selected services', deletedCount: 0 };
    }
  }

  // Order methods
  async getOrders(filters?: { userId?: string; status?: string; limit?: number }): Promise<Order[]> {
    const conditions: SQL[] = [];
    if (filters?.userId) {
      conditions.push(eq(orders.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "refunded"));
    }
    
    const whereClause = combineConditions(conditions);
    let baseQuery = db.select().from(orders);
    
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
    }
    
    baseQuery = baseQuery.orderBy(desc(orders.createdAt));
    
    if (filters?.limit) {
      return await baseQuery.limit(filters.limit);
    }
    
    return await baseQuery;
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
    const result = await db.insert(orders).values([orderData]).returning();
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
    if (whereClause) {
      return await db.select().from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders)
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
      sortedQuery = sortedQuery.where(whereClause);
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

  // Enhanced verification methods
  async getPendingVerifications(limit?: number): Promise<ServiceProvider[]> {
    let query = db.select({
      id: serviceProviders.id,
      userId: serviceProviders.userId,
      categoryId: serviceProviders.categoryId,
      businessName: serviceProviders.businessName,
      businessType: serviceProviders.businessType,
      experienceYears: serviceProviders.experienceYears,
      skills: serviceProviders.skills,
      serviceIds: serviceProviders.serviceIds,
      isVerified: serviceProviders.isVerified,
      verificationStatus: serviceProviders.verificationStatus,
      verificationNotes: serviceProviders.verificationNotes,
      verifiedBy: serviceProviders.verifiedBy,
      verificationDate: serviceProviders.verificationDate,
      rejectionReason: serviceProviders.rejectionReason,
      resubmissionReason: serviceProviders.resubmissionReason,
      documents: serviceProviders.documents,
      rating: serviceProviders.rating,
      totalCompletedOrders: serviceProviders.totalCompletedOrders,
      totalRatings: serviceProviders.totalRatings,
      responseTime: serviceProviders.responseTime,
      completionRate: serviceProviders.completionRate,
      onTimeRate: serviceProviders.onTimeRate,
      availability: serviceProviders.availability,
      currentLocation: serviceProviders.currentLocation,
      serviceAreas: serviceProviders.serviceAreas,
      isOnline: serviceProviders.isOnline,
      isAvailable: serviceProviders.isAvailable,
      lastActiveAt: serviceProviders.lastActiveAt,
      createdAt: serviceProviders.createdAt,
      updatedAt: serviceProviders.updatedAt,
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

  // STATUS TRANSITION VALIDATION
  async validateStatusTransition(
    fromStatus: ServiceProviderVerificationStatusType,
    toStatus: ServiceProviderVerificationStatusType,
    userId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    console.log(`🔍 validateStatusTransition: From "${fromStatus}" to "${toStatus}" for user ${userId}`);
    
    const errors: string[] = [];
    
    // Status validation using Zod
    try {
      ServiceProviderVerificationStatus.parse(fromStatus);
      ServiceProviderVerificationStatus.parse(toStatus);
    } catch (error) {
      errors.push('Invalid status value provided');
      return { valid: false, errors };
    }

    // Define valid transitions
    const validTransitions: Record<ServiceProviderVerificationStatusType, ServiceProviderVerificationStatusType[]> = {
      'pending': ['under_review', 'rejected'],
      'under_review': ['approved', 'rejected', 'resubmission_required'],
      'resubmission_required': ['under_review', 'rejected'],
      'approved': ['suspended'], // Once approved, can only be suspended
      'rejected': ['under_review'], // Can be reconsidered
      'suspended': ['under_review', 'approved'] // Can be reinstated or reviewed again
    };

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      errors.push(`Invalid transition from "${fromStatus}" to "${toStatus}"`);
    }

    // Additional validation for specific transitions
    if (toStatus === 'approved') {
      const provider = await this.getServiceProvider(userId);
      if (!provider) {
        errors.push('Provider not found');
      } else if (!provider.documents) {
        errors.push('No documents uploaded');
      }
    }

    console.log(`${errors.length === 0 ? '✅' : '❌'} validateStatusTransition: ${errors.length === 0 ? 'Valid' : 'Invalid'} transition`);
    return { valid: errors.length === 0, errors };
  }

  // ATOMIC APPROVAL OPERATION WITH TRANSACTION
  async approveProviderAtomic(userId: string, params: {
    verifiedBy: string;
    verificationNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 approveProviderAtomic: Starting atomic approval for userId: ${userId}`);
    
    try {
      const result = await db.transaction(async (tx) => {
        console.log(`🔄 Transaction started for provider approval: ${userId}`);
        
        // 1. Get current provider to validate transition
        const currentProvider = await tx.select().from(serviceProviders)
          .where(eq(serviceProviders.userId, userId))
          .limit(1);
        
        if (currentProvider.length === 0) {
          throw new Error('Service provider profile not found');
        }

        const currentStatus = currentProvider[0].verificationStatus as ServiceProviderVerificationStatusType;
        
        // 2. Validate status transition
        const transitionValidation = await this.validateStatusTransition(
          currentStatus,
          'approved',
          userId
        );
        
        if (!transitionValidation.valid) {
          throw new Error(`Invalid status transition: ${transitionValidation.errors.join(', ')}`);
        }

        // 3. Update service provider profile atomically
        const providerUpdateResult = await tx.update(serviceProviders)
          .set({
            verificationStatus: 'approved',
            isVerified: true,
            verificationLevel: 'verified',
            verificationDate: sql`NOW()`,
            verifiedBy: params.verifiedBy,
            verificationNotes: params.verificationNotes,
            updatedAt: sql`NOW()`,
          })
          .where(eq(serviceProviders.userId, userId))
          .returning();

        if (providerUpdateResult.length === 0) {
          throw new Error('Failed to update service provider profile');
        }

        // 4. Upgrade user role atomically
        const userUpdateResult = await tx.update(users)
          .set({
            role: 'service_provider',
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.id, userId))
          .returning();

        if (userUpdateResult.length === 0) {
          throw new Error('Failed to upgrade user role');
        }

        console.log(`✅ Transaction completed successfully for provider approval: ${userId}`);
        return { success: true };
      });

      console.log(`✅ approveProviderAtomic: Atomic approval completed successfully for userId: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ approveProviderAtomic: Error during atomic approval for userId: ${userId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during approval' 
      };
    }
  }

  // ATOMIC REJECTION OPERATION WITH TRANSACTION
  async rejectProviderAtomic(userId: string, params: {
    rejectionReason: string;
    verifiedBy: string;
    verificationNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 rejectProviderAtomic: Starting atomic rejection for userId: ${userId}`);
    
    try {
      const result = await db.transaction(async (tx) => {
        console.log(`🔄 Transaction started for provider rejection: ${userId}`);
        
        // 1. Get current provider to validate transition
        const currentProvider = await tx.select().from(serviceProviders)
          .where(eq(serviceProviders.userId, userId))
          .limit(1);
        
        if (currentProvider.length === 0) {
          throw new Error('Service provider profile not found');
        }

        const currentStatus = currentProvider[0].verificationStatus as ServiceProviderVerificationStatusType;
        
        // 2. Validate status transition
        const transitionValidation = await this.validateStatusTransition(
          currentStatus,
          'rejected',
          userId
        );
        
        if (!transitionValidation.valid) {
          throw new Error(`Invalid status transition: ${transitionValidation.errors.join(', ')}`);
        }

        // 3. Update service provider profile atomically
        const providerUpdateResult = await tx.update(serviceProviders)
          .set({
            verificationStatus: 'rejected',
            isVerified: false,
            verificationLevel: 'none',
            verificationDate: sql`NOW()`,
            verifiedBy: params.verifiedBy,
            rejectionReason: params.rejectionReason,
            verificationNotes: params.verificationNotes,
            updatedAt: sql`NOW()`,
          })
          .where(eq(serviceProviders.userId, userId))
          .returning();

        if (providerUpdateResult.length === 0) {
          throw new Error('Failed to update service provider profile');
        }

        // 4. Ensure user role remains as 'user' (do not upgrade for rejected providers)
        const userUpdateResult = await tx.update(users)
          .set({
            role: 'user', // Keep as regular user
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.id, userId))
          .returning();

        if (userUpdateResult.length === 0) {
          throw new Error('Failed to update user role');
        }

        console.log(`✅ Transaction completed successfully for provider rejection: ${userId}`);
        return { success: true };
      });

      console.log(`✅ rejectProviderAtomic: Atomic rejection completed successfully for userId: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ rejectProviderAtomic: Error during atomic rejection for userId: ${userId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during rejection' 
      };
    }
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

  // Comprehensive Coupon Storage Implementation
  async getCoupon(code: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons)
      .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
      .limit(1);
    return result[0];
  }

  async getCouponById(id: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);
    return result[0];
  }

  async getAllCoupons(filters?: {
    isActive?: boolean;
    isExpired?: boolean;
    type?: string;
    campaignName?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ coupons: Coupon[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    let baseQuery = db.select().from(coupons);
    let countQuery = db.select({ count: count(coupons.id) }).from(coupons);
    
    const conditions: SQL[] = [];
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(coupons.isActive, filters.isActive));
    }
    if (filters?.isExpired !== undefined) {
      if (filters.isExpired) {
        conditions.push(sql`${coupons.validUntil} < NOW()`);
      } else {
        conditions.push(sql`${coupons.validUntil} > NOW()`);
      }
    }
    if (filters?.type) {
      conditions.push(eq(coupons.type, filters.type));
    }
    if (filters?.campaignName) {
      conditions.push(eq(coupons.campaignName, filters.campaignName));
    }
    if (filters?.createdBy) {
      conditions.push(eq(coupons.createdBy, filters.createdBy));
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(coupons.code, searchTerm),
          ilike(coupons.title, searchTerm),
          ilike(coupons.description, searchTerm)
        )
      );
    }
    
    const whereClause = combineConditions(conditions);
    if (whereClause) {
      baseQuery = baseQuery.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }
    
    const [couponResults, totalResults] = await Promise.all([
      baseQuery.orderBy(desc(coupons.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);
    
    return {
      coupons: couponResults,
      total: totalResults[0]?.count || 0
    };
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values({
      ...coupon,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCoupon(id: string, data: Partial<InsertCoupon & { lastModifiedBy: string }>): Promise<Coupon | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const result = await db.update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();
    
    return result[0];
  }

  async deleteCoupon(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if coupon has been used
      const coupon = await this.getCouponById(id);
      if (!coupon) {
        return { success: false, message: 'Coupon not found' };
      }
      
      if (coupon.usageCount > 0) {
        // Soft delete - just deactivate
        await db.update(coupons)
          .set({
            isActive: false,
            deactivatedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(coupons.id, id));
        return { success: true, message: 'Coupon deactivated (has usage history)' };
      } else {
        // Hard delete for unused coupons
        await db.delete(coupons).where(eq(coupons.id, id));
        return { success: true, message: 'Coupon permanently deleted' };
      }
    } catch (error) {
      return { success: false, message: 'Failed to delete coupon' };
    }
  }

  async validateCoupon(code: string, context: {
    userId: string;
    orderValue: number;
    serviceIds?: string[];
    categoryIds?: string[];
  }): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Get coupon
    const coupon = await this.getCoupon(code);
    if (!coupon) {
      return { valid: false, errors: ['Coupon not found or inactive'] };
    }
    
    // Check if expired
    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      errors.push('Coupon is not yet valid');
    }
    if (new Date(coupon.validUntil) < now) {
      errors.push('Coupon has expired');
    }
    
    // Check usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      errors.push('Coupon usage limit exceeded');
    }
    
    // Check per-user usage limit
    if (coupon.maxUsagePerUser) {
      const userUsage = await db.select({ count: count(couponUsage.id) })
        .from(couponUsage)
        .where(and(
          eq(couponUsage.couponId, coupon.id),
          eq(couponUsage.userId, context.userId)
        ));
      
      const userUsageCount = userUsage[0]?.count || 0;
      if (userUsageCount >= coupon.maxUsagePerUser) {
        errors.push('Personal usage limit exceeded for this coupon');
      }
    }
    
    // Check minimum order amount
    if (coupon.minOrderAmount && context.orderValue < Number(coupon.minOrderAmount)) {
      errors.push(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
    }
    
    // Check service applicability
    if (coupon.applicableServices && coupon.applicableServices.length > 0 && context.serviceIds) {
      const hasApplicableService = context.serviceIds.some(serviceId =>
        coupon.applicableServices?.includes(serviceId)
      );
      if (!hasApplicableService) {
        errors.push('Coupon not applicable to selected services');
      }
    }
    
    // Check category applicability
    if (coupon.serviceCategories && coupon.serviceCategories.length > 0 && context.categoryIds) {
      const hasApplicableCategory = context.categoryIds.some(categoryId =>
        coupon.serviceCategories?.includes(categoryId)
      );
      if (!hasApplicableCategory) {
        errors.push('Coupon not applicable to selected service categories');
      }
    }
    
    // Check user restrictions
    if (coupon.userRestrictions) {
      const restrictions = coupon.userRestrictions as any;
      
      if (restrictions.firstTimeOnly) {
        const userOrderCount = await db.select({ count: count(orders.id) })
          .from(orders)
          .where(and(
            eq(orders.userId, context.userId),
            eq(orders.status, 'completed')
          ));
        
        if ((userOrderCount[0]?.count || 0) > 0) {
          errors.push('This coupon is only for first-time users');
        }
      }
      
      if (restrictions.specificUsers && !restrictions.specificUsers.includes(context.userId)) {
        errors.push('This coupon is not available for your account');
      }
      
      if (restrictions.excludeUsers && restrictions.excludeUsers.includes(context.userId)) {
        errors.push('This coupon is not available for your account');
      }
    }
    
    if (errors.length > 0) {
      return { valid: false, coupon, errors };
    }
    
    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (context.orderValue * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else if (coupon.type === 'fixed_amount') {
      discountAmount = Math.min(Number(coupon.value), context.orderValue);
    }
    
    return {
      valid: true,
      coupon,
      discountAmount,
      errors: []
    };
  }

  async applyCoupon(code: string, userId: string, orderId: string, orderValue: number): Promise<{
    success: boolean;
    discountAmount: number;
    couponUsage?: CouponUsage;
    error?: string;
  }> {
    try {
      // First validate the coupon
      const validation = await this.validateCoupon(code, { userId, orderValue });
      if (!validation.valid || !validation.coupon) {
        return {
          success: false,
          discountAmount: 0,
          error: validation.errors.join(', ')
        };
      }
      
      const { coupon, discountAmount = 0 } = validation;
      
      // Create usage record and update coupon usage in transaction
      const [usageRecord] = await db.transaction(async (tx) => {
        // Create usage record
        const usage = await tx.insert(couponUsage).values({
          couponId: coupon.id,
          userId,
          orderId,
          discountAmount: discountAmount.toString(),
          orderValue: orderValue.toString(),
          savingsPercent: ((discountAmount / orderValue) * 100).toString(),
          validationStatus: 'valid'
        }).returning();
        
        // Update coupon usage count and stats
        await tx.update(coupons)
          .set({
            usageCount: sql`${coupons.usageCount} + 1`,
            totalSavings: sql`${coupons.totalSavings} + ${discountAmount}`,
            averageOrderValue: sql`(${coupons.averageOrderValue} * ${coupons.usageCount} + ${orderValue}) / (${coupons.usageCount} + 1)`,
            updatedAt: new Date()
          })
          .where(eq(coupons.id, coupon.id));
        
        return usage;
      });
      
      return {
        success: true,
        discountAmount,
        couponUsage: usageRecord[0]
      };
    } catch (error) {
      console.error('Error applying coupon:', error);
      return {
        success: false,
        discountAmount: 0,
        error: 'Failed to apply coupon'
      };
    }
  }

  // Coupon Analytics and Advanced Operations
  async getCouponUsage(couponId: string, filters?: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ usage: CouponUsage[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    let baseQuery = db.select().from(couponUsage).where(eq(couponUsage.couponId, couponId));
    let countQuery = db.select({ count: count(couponUsage.id) }).from(couponUsage).where(eq(couponUsage.couponId, couponId));
    
    if (filters?.userId) {
      const userFilter = eq(couponUsage.userId, filters.userId);
      baseQuery = baseQuery.where(and(eq(couponUsage.couponId, couponId), userFilter));
      countQuery = countQuery.where(and(eq(couponUsage.couponId, couponId), userFilter));
    }
    
    const [usageResults, totalResults] = await Promise.all([
      baseQuery.orderBy(desc(couponUsage.usedAt)).limit(limit).offset(offset),
      countQuery
    ]);
    
    return {
      usage: usageResults,
      total: totalResults[0]?.count || 0
    };
  }

  async getCouponStatistics(couponId?: string): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    totalUsage: number;
    totalSavings: number;
    averageDiscountAmount: number;
    topPerformingCoupons: Array<{
      id: string;
      code: string;
      title: string;
      usageCount: number;
      totalSavings: number;
    }>;
  }> {
    const now = new Date();
    
    let baseCondition = sql`1=1`;
    if (couponId) {
      baseCondition = eq(coupons.id, couponId);
    }
    
    const [stats, topCoupons] = await Promise.all([
      db.select({
        totalCoupons: count(coupons.id),
        activeCoupons: count(sql`CASE WHEN ${coupons.isActive} = true THEN 1 END`),
        expiredCoupons: count(sql`CASE WHEN ${coupons.validUntil} < ${now} THEN 1 END`),
        totalUsage: sql<number>`COALESCE(SUM(${coupons.usageCount}), 0)`,
        totalSavings: sql<number>`COALESCE(SUM(${coupons.totalSavings}), 0)`,
        averageDiscountAmount: sql<number>`COALESCE(AVG(${coupons.totalSavings} / NULLIF(${coupons.usageCount}, 0)), 0)`
      }).from(coupons).where(baseCondition),
      
      db.select({
        id: coupons.id,
        code: coupons.code,
        title: coupons.title,
        usageCount: coupons.usageCount,
        totalSavings: coupons.totalSavings
      })
        .from(coupons)
        .where(couponId ? eq(coupons.id, couponId) : sql`1=1`)
        .orderBy(desc(coupons.usageCount))
        .limit(10)
    ]);
    
    const result = stats[0] || {
      totalCoupons: 0,
      activeCoupons: 0,
      expiredCoupons: 0,
      totalUsage: 0,
      totalSavings: 0,
      averageDiscountAmount: 0
    };
    
    return {
      ...result,
      topPerformingCoupons: topCoupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        usageCount: coupon.usageCount,
        totalSavings: Number(coupon.totalSavings)
      }))
    };
  }

  async getUserCouponUsage(userId: string, limit = 50): Promise<CouponUsage[]> {
    return await db.select().from(couponUsage)
      .where(eq(couponUsage.userId, userId))
      .orderBy(desc(couponUsage.usedAt))
      .limit(limit);
  }

  async bulkUpdateCoupons(couponIds: string[], updates: {
    isActive?: boolean;
    lastModifiedBy: string;
  }): Promise<{ success: boolean; updated: number; errors: string[] }> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      const result = await db.update(coupons)
        .set(updateData)
        .where(inArray(coupons.id, couponIds))
        .returning({ id: coupons.id });
      
      return {
        success: true,
        updated: result.length,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        updated: 0,
        errors: ['Failed to update coupons: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  async bulkDeleteCoupons(couponIds: string[]): Promise<{ success: boolean; deleted: number; errors: string[] }> {
    try {
      // Get coupons to check usage
      const couponsToDelete = await db.select({
        id: coupons.id,
        usageCount: coupons.usageCount
      }).from(coupons).where(inArray(coupons.id, couponIds));
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const coupon of couponsToDelete) {
        try {
          if (coupon.usageCount > 0) {
            // Soft delete for used coupons
            await db.update(coupons)
              .set({
                isActive: false,
                deactivatedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(coupons.id, coupon.id));
          } else {
            // Hard delete for unused coupons
            await db.delete(coupons).where(eq(coupons.id, coupon.id));
          }
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete coupon ${coupon.id}`);
        }
      }
      
      return {
        success: errors.length === 0,
        deleted: deletedCount,
        errors
      };
    } catch (error) {
      return {
        success: false,
        deleted: 0,
        errors: ['Failed to delete coupons: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  async generateCouponCode(pattern = 'SAVE###'): Promise<string> {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      let code = pattern;
      
      // Replace patterns with random values
      code = code.replace(/#+/g, (match) => {
        return Array.from({ length: match.length }, () => Math.floor(Math.random() * 10)).join('');
      });
      
      code = code.replace(/\*+/g, (match) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return Array.from({ length: match.length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      });
      
      // If no pattern markers, add random numbers
      if (!pattern.includes('#') && !pattern.includes('*')) {
        code = code + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      }
      
      // Check if code already exists
      const existing = await this.getCoupon(code);
      if (!existing) {
        return code;
      }
      
      attempts++;
    }
    
    // Fallback to timestamp-based code
    return 'COUPON' + Date.now().toString().slice(-6);
  }

  async checkCouponCodeAvailability(code: string): Promise<{ available: boolean; suggestions?: string[] }> {
    const existing = await db.select({ id: coupons.id }).from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    
    const available = existing.length === 0;
    
    if (available) {
      return { available: true };
    }
    
    // Generate suggestions if code is taken
    const suggestions: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const suggestion = code + i;
      const suggestionExists = await db.select({ id: coupons.id }).from(coupons)
        .where(eq(coupons.code, suggestion))
        .limit(1);
      
      if (suggestionExists.length === 0) {
        suggestions.push(suggestion);
      }
    }
    
    return { available: false, suggestions };
  }

  async expireOutdatedCoupons(): Promise<{ expired: number; deactivated: number }> {
    const now = new Date();
    
    // Mark expired coupons as expired
    const expiredResult = await db.update(coupons)
      .set({
        isExpired: true,
        updatedAt: now
      })
      .where(and(
        sql`${coupons.validUntil} < ${now}`,
        eq(coupons.isExpired, false)
      ))
      .returning({ id: coupons.id });
    
    // Auto-deactivate expired coupons if enabled
    const deactivatedResult = await db.update(coupons)
      .set({
        isActive: false,
        deactivatedAt: now,
        updatedAt: now
      })
      .where(and(
        sql`${coupons.validUntil} < ${now}`,
        eq(coupons.autoDeactivate, true),
        eq(coupons.isActive, true)
      ))
      .returning({ id: coupons.id });
    
    return {
      expired: expiredResult.length,
      deactivated: deactivatedResult.length
    };
  }

  async calculateCouponPerformance(couponId: string): Promise<{
    usageRate: number;
    conversionRate: number;
    averageOrderValue: number;
    totalRevenue: number;
    roi: number;
  }> {
    const coupon = await this.getCouponById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }
    
    const usageStats = await db.select({
      totalUsage: count(couponUsage.id),
      avgOrderValue: sql<number>`COALESCE(AVG(${couponUsage.orderValue}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${couponUsage.orderValue}), 0)`,
      totalDiscount: sql<number>`COALESCE(SUM(${couponUsage.discountAmount}), 0)`
    })
      .from(couponUsage)
      .where(eq(couponUsage.couponId, couponId));
    
    const stats = usageStats[0] || {
      totalUsage: 0,
      avgOrderValue: 0,
      totalRevenue: 0,
      totalDiscount: 0
    };
    
    const usageRate = coupon.usageLimit ? (coupon.usageCount / coupon.usageLimit) * 100 : 0;
    const conversionRate = stats.totalUsage > 0 ? (stats.totalUsage / (stats.totalUsage + coupon.usageCount)) * 100 : 0;
    const roi = stats.totalDiscount > 0 ? (stats.totalRevenue / stats.totalDiscount) * 100 : 0;
    
    return {
      usageRate,
      conversionRate,
      averageOrderValue: stats.avgOrderValue,
      totalRevenue: stats.totalRevenue,
      roi
    };
  }

  async getCouponsByCategory(categoryIds: string[], userId?: string): Promise<Coupon[]> {
    let baseQuery = db.select().from(coupons)
      .where(and(
        eq(coupons.isActive, true),
        sql`${coupons.validFrom} <= NOW()`,
        sql`${coupons.validUntil} > NOW()`
      ));
    
    // Filter by categories if specified
    if (categoryIds.length > 0) {
      baseQuery = baseQuery.where(and(
        eq(coupons.isActive, true),
        sql`${coupons.validFrom} <= NOW()`,
        sql`${coupons.validUntil} > NOW()`,
        sql`${coupons.serviceCategories} && ${JSON.stringify(categoryIds)}`
      ));
    }
    
    const results = await baseQuery.orderBy(desc(coupons.priority), desc(coupons.createdAt));
    
    // If userId is provided, filter out coupons that user has exceeded usage for
    if (userId) {
      const filteredResults = [];
      for (const coupon of results) {
        if (coupon.maxUsagePerUser) {
          const userUsage = await db.select({ count: count(couponUsage.id) })
            .from(couponUsage)
            .where(and(
              eq(couponUsage.couponId, coupon.id),
              eq(couponUsage.userId, userId)
            ));
          
          const userUsageCount = userUsage[0]?.count || 0;
          if (userUsageCount < coupon.maxUsagePerUser) {
            filteredResults.push(coupon);
          }
        } else {
          filteredResults.push(coupon);
        }
      }
      return filteredResults;
    }
    
    return results;
  }

  async getCouponsForUser(userId: string, filters?: {
    categoryIds?: string[];
    minOrderValue?: number;
    onlyUnused?: boolean;
  }): Promise<Coupon[]> {
    const now = new Date();
    const conditions: SQL[] = [
      eq(coupons.isActive, true),
      sql`${coupons.validFrom} <= ${now}`,
      sql`${coupons.validUntil} > ${now}`
    ];
    
    // Category filter
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      conditions.push(sql`${coupons.serviceCategories} && ${JSON.stringify(filters.categoryIds)}`);
    }
    
    // Minimum order value filter
    if (filters?.minOrderValue) {
      conditions.push(
        or(
          sql`${coupons.minOrderAmount} IS NULL`,
          sql`${coupons.minOrderAmount} <= ${filters.minOrderValue}`
        )
      );
    }
    
    const baseQuery = db.select().from(coupons).where(combineConditions(conditions) || sql`1=1`);
    const results = await baseQuery.orderBy(desc(coupons.priority), desc(coupons.createdAt));
    
    // Filter based on user eligibility and usage
    const eligibleCoupons = [];
    for (const coupon of results) {
      let eligible = true;
      
      // Check user restrictions
      if (coupon.userRestrictions) {
        const restrictions = coupon.userRestrictions as any;
        
        if (restrictions.specificUsers && !restrictions.specificUsers.includes(userId)) {
          eligible = false;
        }
        
        if (restrictions.excludeUsers && restrictions.excludeUsers.includes(userId)) {
          eligible = false;
        }
        
        if (restrictions.firstTimeOnly) {
          const userOrderCount = await db.select({ count: count(orders.id) })
            .from(orders)
            .where(and(
              eq(orders.userId, userId),
              eq(orders.status, 'completed')
            ));
          
          if ((userOrderCount[0]?.count || 0) > 0) {
            eligible = false;
          }
        }
      }
      
      // Check per-user usage limits
      if (eligible && coupon.maxUsagePerUser) {
        const userUsage = await db.select({ count: count(couponUsage.id) })
          .from(couponUsage)
          .where(and(
            eq(couponUsage.couponId, coupon.id),
            eq(couponUsage.userId, userId)
          ));
        
        const userUsageCount = userUsage[0]?.count || 0;
        if (filters?.onlyUnused && userUsageCount > 0) {
          eligible = false;
        } else if (userUsageCount >= coupon.maxUsagePerUser) {
          eligible = false;
        }
      }
      
      if (eligible) {
        eligibleCoupons.push(coupon);
      }
    }
    
    return eligibleCoupons;
  }

  async duplicateCoupon(couponId: string, modifications: Partial<InsertCoupon>): Promise<Coupon> {
    const originalCoupon = await this.getCouponById(couponId);
    if (!originalCoupon) {
      throw new Error('Original coupon not found');
    }
    
    // Generate new code if not provided in modifications
    let newCode = modifications.code;
    if (!newCode) {
      newCode = await this.generateCouponCode(originalCoupon.code + '_COPY');
    }
    
    const duplicatedCoupon: InsertCoupon = {
      ...originalCoupon,
      id: undefined as any, // Remove id to let DB generate new one
      code: newCode,
      title: modifications.title || originalCoupon.title + ' (Copy)',
      usageCount: 0,
      totalSavings: '0.00',
      isExpired: false,
      deactivatedAt: null,
      deactivatedBy: null,
      averageOrderValue: null,
      conversionRate: null,
      ...modifications,
      createdAt: undefined as any, // Let DB set this
      updatedAt: undefined as any  // Let DB set this
    };
    
    return await this.createCoupon(duplicatedCoupon);
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

  // User Locale Preferences methods implementation
  async getUserLocalePreferences(userId: string): Promise<UserLocalePreferences | undefined> {
    const result = await db.select().from(userLocalePreferences)
      .where(eq(userLocalePreferences.userId, userId))
      .limit(1);
    return result[0];
  }

  async createUserLocalePreferences(preferences: InsertUserLocalePreferences): Promise<UserLocalePreferences> {
    const result = await db.insert(userLocalePreferences).values(preferences).returning();
    return result[0];
  }

  async updateUserLocalePreferences(userId: string, data: Partial<InsertUserLocalePreferences>): Promise<UserLocalePreferences | undefined> {
    const result = await db.update(userLocalePreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userLocalePreferences.userId, userId))
      .returning();
    return result[0];
  }

  async upsertUserLocalePreferences(userId: string, data: Partial<InsertUserLocalePreferences>): Promise<UserLocalePreferences> {
    const existingPrefs = await this.getUserLocalePreferences(userId);
    
    if (existingPrefs) {
      const updated = await this.updateUserLocalePreferences(userId, data);
      return updated!;
    } else {
      const fullData = {
        userId,
        ...data
      } as InsertUserLocalePreferences;
      return await this.createUserLocalePreferences(fullData);
    }
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

  // Background matching methods
  async listOrdersNeedingMatching(limit: number = 50): Promise<ServiceBooking[]> {
    const now = new Date();
    const result = await db.select()
      .from(serviceBookings)
      .where(or(
        // Orders currently in provider_search status
        eq(serviceBookings.status, 'provider_search'),
        // Orders with expired matchingExpiresAt that need re-matching
        and(
          eq(serviceBookings.status, 'pending'),
          lte(serviceBookings.matchingExpiresAt, now)
        )
      ))
      .orderBy(asc(serviceBookings.requestedAt))
      .limit(limit);
    return result;
  }

  async updateBookingMatchingExpiry(bookingId: string, expiresAt: Date, candidateCount: number): Promise<ServiceBooking | undefined> {
    const result = await db.update(serviceBookings)
      .set({ 
        matchingExpiresAt: expiresAt,
        candidateCount,
        updatedAt: new Date()
      })
      .where(eq(serviceBookings.id, bookingId))
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
  // SMART ASSIGNMENT SYSTEM OPERATIONS
  // ========================================

  async findEligibleProviders(bookingId: string): Promise<Array<{
    userId: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    rating: number;
    totalJobs: number;
    distanceKm: number;
    estimatedTravelTime: number;
    isOnline: boolean;
    responseRate: number;
    assignmentScore: number;
    skills: string[];
    currentLocation?: { latitude: number; longitude: number };
  }>> {
    const booking = await this.getServiceBooking(bookingId);
    if (!booking) {
      console.log(`❌ Smart Assignment: Booking ${bookingId} not found`);
      return [];
    }

    const service = await this.getService(booking.serviceId);
    if (!service) {
      console.log(`❌ Smart Assignment: Service ${booking.serviceId} not found`);
      return [];
    }

    console.log(`🔍 Smart Assignment: Finding providers for booking ${bookingId} (service: ${service.name})`);
    
    // Find eligible providers using existing logic
    const matchingProviders = await this.findMatchingProviders({
      serviceId: booking.serviceId,
      location: {
        latitude: booking.serviceLocation.latitude,
        longitude: booking.serviceLocation.longitude
      },
      urgency: booking.urgency,
      bookingType: booking.bookingType,
      scheduledAt: booking.scheduledAt || undefined,
      maxDistance: 25,
      maxProviders: 10
    });

    // Calculate assignment scores and sort providers
    const scoredProviders = matchingProviders.map(provider => {
      const score = this.calculateProviderScore(provider, booking);
      return {
        ...provider,
        profileImageUrl: provider.profileImage,
        assignmentScore: score
      };
    })
    .sort((a, b) => b.assignmentScore - a.assignmentScore)
    .slice(0, 5); // Top 5 providers

    console.log(`✅ Smart Assignment: Found ${scoredProviders.length} eligible providers for booking ${bookingId}`);
    return scoredProviders;
  }

  calculateProviderScore(provider: any, booking: any): number {
    let score = 0;
    
    // Distance scoring (max 30 points) - closer is better
    const distanceKm = provider.distanceKm || 50;
    const distanceScore = Math.max(0, 30 - (distanceKm * 1.5));
    score += distanceScore;
    
    // Rating scoring (max 25 points)
    const ratingScore = (provider.rating || 0) * 5;
    score += ratingScore;
    
    // Response rate scoring (max 20 points)
    const responseScore = (provider.responseRate || 0) * 20;
    score += responseScore;
    
    // Online status bonus (15 points)
    if (provider.isOnline) {
      score += 15;
    }
    
    // Experience scoring (max 10 points)
    const experienceScore = Math.min(10, (provider.totalJobs || 0) * 0.1);
    score += experienceScore;
    
    // Urgency bonus for instant bookings
    if (booking.urgency === 'urgent' && provider.isOnline) {
      score += 10;
    }
    
    return Math.round(score * 100) / 100;
  }

  async autoAssignProvider(bookingId: string, options?: {
    retryCount?: number;
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    assignedProviderId?: string;
    jobRequestIds?: string[];
    error?: string;
    retryAfter?: number;
  }> {
    const retryCount = options?.retryCount || 0;
    const timeoutMs = options?.timeoutMs || 300000; // 5 minutes default
    
    console.log(`🤖 Smart Assignment: Starting auto-assignment for booking ${bookingId} (retry: ${retryCount})`);
    
    try {
      // Check if booking is still assignable
      const booking = await this.getServiceBooking(bookingId);
      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }
      
      if (booking.assignedProviderId) {
        return { 
          success: true, 
          assignedProviderId: booking.assignedProviderId,
          error: 'Already assigned'
        };
      }
      
      if (booking.status !== 'provider_search') {
        await this.updateServiceBooking(bookingId, { status: 'provider_search' });
      }
      
      // Find eligible providers
      const eligibleProviders = await this.findEligibleProviders(bookingId);
      
      if (eligibleProviders.length === 0) {
        console.log(`⚠️ Smart Assignment: No providers found for booking ${bookingId}`);
        return { 
          success: false, 
          error: 'No eligible providers found',
          retryAfter: 60000 // Retry after 1 minute
        };
      }
      
      // Send job offers to top 3 providers
      const topProviders = eligibleProviders.slice(0, 3);
      const providerIds = topProviders.map(p => p.userId);
      
      console.log(`📤 Smart Assignment: Sending job offers to ${providerIds.length} providers`);
      const offerResult = await this.sendJobOffers(bookingId, providerIds);
      
      if (!offerResult.success) {
        return {
          success: false,
          error: `Failed to send job offers: ${offerResult.errors.join(', ')}`
        };
      }
      
      return {
        success: true,
        jobRequestIds: providerIds, // For tracking purposes
        error: 'Job offers sent, waiting for provider response'
      };
      
    } catch (error) {
      console.error(`❌ Smart Assignment: Error in auto-assignment for booking ${bookingId}:`, error);
      return {
        success: false,
        error: `Assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async sendJobOffers(bookingId: string, providerIds: string[]): Promise<{
    success: boolean;
    sentOffers: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sentOffers = 0;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    console.log(`📨 Smart Assignment: Sending job offers for booking ${bookingId} to ${providerIds.length} providers`);
    
    for (const providerId of providerIds) {
      try {
        // Check if provider is still eligible
        const provider = await this.getServiceProvider(providerId);
        if (!provider || !provider.isVerified || provider.verificationStatus !== 'approved') {
          errors.push(`Provider ${providerId} is not eligible`);
          continue;
        }
        
        // Check if job request already exists
        const existingRequest = await this.getProviderJobRequest(bookingId, providerId);
        if (existingRequest) {
          console.log(`⚠️ Smart Assignment: Job request already exists for provider ${providerId}`);
          continue;
        }
        
        // Calculate distance for this provider
        const booking = await this.getServiceBooking(bookingId);
        let distanceKm = 0;
        let estimatedTravelTime = 0;
        
        if (booking && provider.currentLocation) {
          distanceKm = this.calculateDistance(
            booking.serviceLocation.latitude,
            booking.serviceLocation.longitude,
            provider.currentLocation.latitude,
            provider.currentLocation.longitude
          );
          estimatedTravelTime = Math.ceil(distanceKm / 25 * 60); // 25 km/h average
        }
        
        // Create job request
        await this.createProviderJobRequest({
          bookingId,
          providerId,
          expiresAt,
          distanceKm: distanceKm.toString(),
          estimatedTravelTime
        });
        
        sentOffers++;
        console.log(`✅ Smart Assignment: Job offer sent to provider ${providerId}`);
        
      } catch (error) {
        console.error(`❌ Smart Assignment: Failed to send job offer to provider ${providerId}:`, error);
        errors.push(`Failed to send offer to provider ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`📊 Smart Assignment: Sent ${sentOffers} job offers for booking ${bookingId}`);
    return {
      success: sentOffers > 0,
      sentOffers,
      errors
    };
  }

  async getJobRequestsWithDetails(providerId: string, options?: {
    status?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    bookingId: string;
    status: string;
    expiresAt: Date;
    sentAt: Date;
    distanceKm?: number;
    booking: {
      id: string;
      serviceId: string;
      userId: string;
      serviceLocation: any;
      totalAmount: string;
      urgency: string;
      status: string;
      customerName: string;
      serviceType: string;
    };
  }>> {
    const jobRequests = await this.getProviderJobRequests(providerId, {
      status: options?.status,
      limit: options?.limit || 10
    });
    
    const detailedRequests = [];
    
    for (const request of jobRequests) {
      const booking = await this.getServiceBooking(request.bookingId);
      if (!booking) continue;
      
      const service = await this.getService(booking.serviceId);
      const customer = await this.getUser(booking.userId);
      
      detailedRequests.push({
        id: request.id,
        bookingId: request.bookingId,
        status: request.status,
        expiresAt: request.expiresAt,
        sentAt: request.sentAt,
        distanceKm: request.distanceKm ? parseFloat(request.distanceKm) : undefined,
        booking: {
          id: booking.id,
          serviceId: booking.serviceId,
          userId: booking.userId,
          serviceLocation: booking.serviceLocation,
          totalAmount: booking.totalAmount,
          urgency: booking.urgency,
          status: booking.status,
          customerName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
          serviceType: service?.name || 'Unknown Service'
        }
      });
    }
    
    return detailedRequests;
  }

  async expireJobRequests(): Promise<void> {
    console.log('🕒 Smart Assignment: Checking for expired job requests');
    
    const expiredRequests = await db.select()
      .from(providerJobRequests)
      .where(and(
        eq(providerJobRequests.status, 'sent'),
        sql`${providerJobRequests.expiresAt} < NOW()`
      ));
    
    if (expiredRequests.length > 0) {
      console.log(`⏰ Smart Assignment: Found ${expiredRequests.length} expired job requests`);
      
      await db.update(providerJobRequests)
        .set({ status: 'expired' })
        .where(and(
          eq(providerJobRequests.status, 'sent'),
          sql`${providerJobRequests.expiresAt} < NOW()`
        ));
        
      console.log(`✅ Smart Assignment: Marked ${expiredRequests.length} job requests as expired`);
    }
  }

  async reassignExpiredBookings(): Promise<void> {
    console.log('🔄 Smart Assignment: Checking for bookings needing reassignment');
    
    // Find bookings in provider_search status with no active job requests
    const bookingsNeedingReassignment = await db.select({
      id: serviceBookings.id,
      createdAt: serviceBookings.createdAt
    })
    .from(serviceBookings)
    .leftJoin(
      providerJobRequests, 
      and(
        eq(serviceBookings.id, providerJobRequests.bookingId),
        eq(providerJobRequests.status, 'sent')
      )
    )
    .where(and(
      eq(serviceBookings.status, 'provider_search'),
      sql`${providerJobRequests.bookingId} IS NULL`, // No active job requests
      sql`${serviceBookings.createdAt} < NOW() - INTERVAL '10 minutes'` // Older than 10 minutes
    ));
    
    if (bookingsNeedingReassignment.length > 0) {
      console.log(`🔄 Smart Assignment: Found ${bookingsNeedingReassignment.length} bookings needing reassignment`);
      
      for (const booking of bookingsNeedingReassignment) {
        console.log(`🔄 Smart Assignment: Reassigning booking ${booking.id}`);
        await this.autoAssignProvider(booking.id, { retryCount: 1 });
      }
    }
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

  // ========================================
  // SERVICE PROVIDER ONBOARDING OPERATIONS
  // ========================================

  // Provider Profile Management
  async upsertServiceProviderProfile(data: InsertServiceProviderProfile): Promise<ServiceProviderProfile | null> {
    try {
      console.log(`🔧 storage.upsertServiceProviderProfile: Upserting profile for userId: ${data.userId}`);
      
      const validatedData = insertServiceProviderProfileSchema.parse(data);
      
      const result = await db.insert(serviceProviderProfiles)
        .values({
          ...validatedData,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: serviceProviderProfiles.userId,
          set: {
            ...validatedData,
            updatedAt: new Date(),
          },
        })
        .returning();

      const profile = result[0];
      console.log(`✅ storage.upsertServiceProviderProfile: Profile ${profile ? 'upserted' : 'failed'} for userId: ${data.userId}`);
      return profile || null;
    } catch (error) {
      console.error(`❌ storage.upsertServiceProviderProfile: Error upserting profile for userId: ${data.userId}:`, error);
      return null;
    }
  }

  async getProviderProfileByUserId(userId: string): Promise<ServiceProviderProfile | null> {
    try {
      console.log(`🔍 storage.getProviderProfileByUserId: Fetching profile for userId: ${userId}`);
      
      const result = await db.select()
        .from(serviceProviderProfiles)
        .where(eq(serviceProviderProfiles.userId, userId))
        .limit(1);

      const profile = result[0] || null;
      console.log(`${profile ? '✅' : '❌'} storage.getProviderProfileByUserId: Profile ${profile ? 'found' : 'not found'} for userId: ${userId}`);
      return profile;
    } catch (error) {
      console.error(`❌ storage.getProviderProfileByUserId: Error fetching profile for userId: ${userId}:`, error);
      return null;
    }
  }

  // Document Management
  async submitProviderDocuments(userId: string, documents: DocumentsType): Promise<ServiceProviderProfile | null> {
    try {
      console.log(`📄 storage.submitProviderDocuments: Submitting documents for userId: ${userId}`);
      
      const result = await db.update(serviceProviderProfiles)
        .set({
          documents,
          verificationStatus: 'documents_submitted',
          updatedAt: new Date(),
        })
        .where(eq(serviceProviderProfiles.userId, userId))
        .returning();

      const profile = result[0] || null;
      console.log(`${profile ? '✅' : '❌'} storage.submitProviderDocuments: Documents ${profile ? 'submitted' : 'failed'} for userId: ${userId}`);
      return profile;
    } catch (error) {
      console.error(`❌ storage.submitProviderDocuments: Error submitting documents for userId: ${userId}:`, error);
      return null;
    }
  }

  // Verification Workflow
  async setProviderVerificationStatus(userId: string, status: ServiceProviderVerificationStatusType, rejectionReason?: string): Promise<ServiceProviderProfile | null> {
    try {
      console.log(`⚖️ storage.setProviderVerificationStatus: Setting status '${status}' for userId: ${userId}`);
      
      const updateData: any = {
        verificationStatus: status,
        updatedAt: new Date(),
      };

      // Add rejection reason if status is rejected
      if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      // Clear rejection reason if status is not rejected
      if (status !== 'rejected') {
        updateData.rejectionReason = null;
      }

      const result = await db.update(serviceProviderProfiles)
        .set(updateData)
        .where(eq(serviceProviderProfiles.userId, userId))
        .returning();

      const profile = result[0] || null;
      
      // If approved, upgrade user role to service_provider
      if (profile && status === 'approved') {
        console.log(`🔧 storage.setProviderVerificationStatus: Upgrading role for userId: ${userId}`);
        await this.upgradeUserRoleToProvider(userId);
      }

      console.log(`${profile ? '✅' : '❌'} storage.setProviderVerificationStatus: Status ${profile ? 'updated' : 'failed'} for userId: ${userId}`);
      return profile;
    } catch (error) {
      console.error(`❌ storage.setProviderVerificationStatus: Error setting status for userId: ${userId}:`, error);
      return null;
    }
  }

  async listProviderSubmissions(status?: ServiceProviderVerificationStatusType): Promise<ServiceProviderProfile[]> {
    try {
      console.log(`📋 storage.listProviderSubmissions: Listing submissions${status ? ` with status: ${status}` : ''}`);
      
      const conditions = [];
      
      if (status) {
        conditions.push(eq(serviceProviderProfiles.verificationStatus, status));
      }

      const whereClause = combineConditions(conditions);

      const result = await db.select()
        .from(serviceProviderProfiles)
        .where(whereClause)
        .orderBy(desc(serviceProviderProfiles.updatedAt));

      console.log(`✅ storage.listProviderSubmissions: Found ${result.length} submissions`);
      return result;
    } catch (error) {
      console.error(`❌ storage.listProviderSubmissions: Error listing submissions:`, error);
      return [];
    }
  }

  // Role Management
  async upgradeUserRoleToProvider(userId: string): Promise<boolean> {
    try {
      console.log(`🔄 storage.upgradeUserRoleToProvider: Upgrading role for userId: ${userId}`);
      
      const result = await db.update(users)
        .set({
          role: 'service_provider',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      const success = result.length > 0;
      console.log(`${success ? '✅' : '❌'} storage.upgradeUserRoleToProvider: Role upgrade ${success ? 'successful' : 'failed'} for userId: ${userId}`);
      return success;
    } catch (error) {
      console.error(`❌ storage.upgradeUserRoleToProvider: Error upgrading role for userId: ${userId}:`, error);
      return false;
    }
  }

  // Referral methods implementation
  async getUserReferral(userId: string): Promise<UserReferral | undefined> {
    try {
      const result = await db.select().from(userReferrals).where(eq(userReferrals.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getUserReferral: Error fetching referral for userId: ${userId}:`, error);
      return undefined;
    }
  }

  async createUserReferral(referral: InsertUserReferral): Promise<UserReferral> {
    const result = await db.insert(userReferrals).values({
      ...referral,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateUserReferral(userId: string, data: Partial<InsertUserReferral>): Promise<UserReferral | undefined> {
    const result = await db.update(userReferrals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userReferrals.userId, userId))
      .returning();
    return result[0];
  }

  async generateReferralCode(userId: string, customCode?: string): Promise<string> {
    const baseCode = customCode || `FQ${userId.substring(0, 6).toUpperCase()}`;
    let referralCode = baseCode;
    let attempts = 0;
    
    // Ensure uniqueness by adding suffix if needed
    while (attempts < 10) {
      const existing = await this.getReferralByCode(referralCode);
      if (!existing) {
        break;
      }
      attempts++;
      referralCode = `${baseCode}${attempts}`;
    }
    
    return referralCode;
  }

  async getReferralRecords(referrerId: string, status?: string): Promise<ReferralRecord[]> {
    try {
      const conditions = [eq(referralRecords.referrerId, referrerId)];
      
      if (status) {
        conditions.push(eq(referralRecords.status, status));
      }
      
      const result = await db.select().from(referralRecords)
        .where(combineConditions(conditions))
        .orderBy(desc(referralRecords.createdAt));
      
      return result;
    } catch (error) {
      console.error(`❌ storage.getReferralRecords: Error fetching records for referrerId: ${referrerId}:`, error);
      return [];
    }
  }

  async createReferralRecord(record: InsertReferralRecord): Promise<ReferralRecord> {
    const result = await db.insert(referralRecords).values({
      ...record,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateReferralRecord(id: string, data: Partial<InsertReferralRecord>): Promise<ReferralRecord | undefined> {
    const result = await db.update(referralRecords)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(referralRecords.id, id))
      .returning();
    return result[0];
  }

  async getReferralByCode(code: string): Promise<UserReferral | undefined> {
    try {
      const result = await db.select().from(userReferrals).where(eq(userReferrals.referralCode, code)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getReferralByCode: Error fetching referral for code: ${code}:`, error);
      return undefined;
    }
  }

  async processReferralSignup(referralCode: string, newUserId: string, metadata?: any): Promise<ReferralRecord | undefined> {
    try {
      const referral = await this.getReferralByCode(referralCode);
      if (!referral) {
        return undefined;
      }

      const friend = await this.getUser(newUserId);
      if (!friend) {
        return undefined;
      }

      // Create referral record
      const record = await this.createReferralRecord({
        referrerId: referral.userId,
        friendId: newUserId,
        friendName: `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || 'Anonymous',
        friendEmail: friend.email,
        friendPhone: friend.phone,
        status: 'pending',
        earnings: 100, // Default referral bonus
        metadata: metadata || {},
      });

      // Update referral counts
      await this.updateUserReferral(referral.userId, {
        totalReferrals: referral.totalReferrals + 1,
        pendingReferrals: referral.pendingReferrals + 1,
        pendingEarnings: Number(referral.pendingEarnings) + 100,
      });

      return record;
    } catch (error) {
      console.error(`❌ storage.processReferralSignup: Error processing referral signup:`, error);
      return undefined;
    }
  }

  async calculateReferralEarnings(userId: string): Promise<{ total: number; available: number; pending: number }> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) {
        return { total: 0, available: 0, pending: 0 };
      }

      return {
        total: Number(referral.totalEarnings),
        available: Number(referral.availableEarnings),
        pending: Number(referral.pendingEarnings),
      };
    } catch (error) {
      console.error(`❌ storage.calculateReferralEarnings: Error calculating earnings for userId: ${userId}:`, error);
      return { total: 0, available: 0, pending: 0 };
    }
  }

  async updateReferralTier(userId: string): Promise<string> {
    try {
      const referral = await this.getUserReferral(userId);
      if (!referral) {
        return 'Bronze';
      }

      const successful = referral.successfulReferrals;
      let tier = 'Bronze';
      
      if (successful >= 50) tier = 'Diamond';
      else if (successful >= 20) tier = 'Platinum';
      else if (successful >= 10) tier = 'Gold';
      else if (successful >= 5) tier = 'Silver';

      if (tier !== referral.currentTier) {
        await this.updateUserReferral(userId, { currentTier: tier });
      }

      return tier;
    } catch (error) {
      console.error(`❌ storage.updateReferralTier: Error updating tier for userId: ${userId}:`, error);
      return 'Bronze';
    }
  }

  // Legal and Privacy methods implementation
  async getUserAgreements(userId: string): Promise<UserAgreement | undefined> {
    try {
      const result = await db.select().from(userAgreements).where(eq(userAgreements.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getUserAgreements: Error fetching agreements for userId: ${userId}:`, error);
      return undefined;
    }
  }

  async createUserAgreements(agreements: InsertUserAgreement): Promise<UserAgreement> {
    const result = await db.insert(userAgreements).values({
      ...agreements,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateUserAgreements(userId: string, data: UserAgreementUpdateData): Promise<UserAgreement | undefined> {
    try {
      // First get existing agreements or create default ones
      let existing = await this.getUserAgreements(userId);
      
      if (!existing) {
        existing = await this.createUserAgreements({
          userId,
          termsOfService: { accepted: false, version: '1.0' },
          privacyPolicy: { accepted: false, version: '1.0' },
          cookiePolicy: { accepted: false, version: '1.0' },
          dataProcessing: { accepted: false, version: '1.0' },
        });
      }

      // Update the specific agreements with acceptedAt timestamp
      const updateData: any = { updatedAt: new Date() };
      const timestamp = new Date().toISOString();

      if (data.termsOfService) {
        updateData.termsOfService = {
          ...existing.termsOfService,
          ...data.termsOfService,
          acceptedAt: data.termsOfService.accepted ? timestamp : existing.termsOfService.acceptedAt,
        };
      }

      if (data.privacyPolicy) {
        updateData.privacyPolicy = {
          ...existing.privacyPolicy,
          ...data.privacyPolicy,
          acceptedAt: data.privacyPolicy.accepted ? timestamp : existing.privacyPolicy.acceptedAt,
        };
      }

      if (data.cookiePolicy) {
        updateData.cookiePolicy = {
          ...existing.cookiePolicy,
          ...data.cookiePolicy,
          acceptedAt: data.cookiePolicy.accepted ? timestamp : existing.cookiePolicy.acceptedAt,
        };
      }

      if (data.dataProcessing) {
        updateData.dataProcessing = {
          ...existing.dataProcessing,
          ...data.dataProcessing,
          acceptedAt: data.dataProcessing.accepted ? timestamp : existing.dataProcessing.acceptedAt,
        };
      }

      const result = await db.update(userAgreements)
        .set(updateData)
        .where(eq(userAgreements.userId, userId))
        .returning();

      return result[0];
    } catch (error) {
      console.error(`❌ storage.updateUserAgreements: Error updating agreements for userId: ${userId}:`, error);
      return undefined;
    }
  }

  async getDataExportRequests(userId: string): Promise<DataExportRequest[]> {
    try {
      const result = await db.select().from(dataExportRequests)
        .where(eq(dataExportRequests.userId, userId))
        .orderBy(desc(dataExportRequests.createdAt));
      return result;
    } catch (error) {
      console.error(`❌ storage.getDataExportRequests: Error fetching export requests for userId: ${userId}:`, error);
      return [];
    }
  }

  async createDataExportRequest(request: InsertDataExportRequest): Promise<DataExportRequest> {
    const result = await db.insert(dataExportRequests).values({
      ...request,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateDataExportRequest(id: string, data: Partial<InsertDataExportRequest>): Promise<DataExportRequest | undefined> {
    const result = await db.update(dataExportRequests)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(dataExportRequests.id, id))
      .returning();
    return result[0];
  }

  async getDataExportRequest(id: string): Promise<DataExportRequest | undefined> {
    try {
      const result = await db.select().from(dataExportRequests).where(eq(dataExportRequests.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getDataExportRequest: Error fetching export request id: ${id}:`, error);
      return undefined;
    }
  }

  async processDataExport(id: string): Promise<string | undefined> {
    try {
      const exportRequest = await this.getDataExportRequest(id);
      if (!exportRequest || exportRequest.status !== 'pending') {
        return undefined;
      }

      // Mark as processing
      await this.updateDataExportRequest(id, { status: 'processing' });

      // Generate export data URL (in a real implementation, this would be processed by a background job)
      const downloadUrl = `https://exports.fixitquick.com/user-data-${id}.${exportRequest.format}`;
      
      // Mark as ready
      await this.updateDataExportRequest(id, {
        status: 'ready',
        downloadUrl,
        readyAt: new Date(),
        fileSize: 1024 * 100, // Mock file size
      });

      return downloadUrl;
    } catch (error) {
      console.error(`❌ storage.processDataExport: Error processing export id: ${id}:`, error);
      await this.updateDataExportRequest(id, { status: 'pending' });
      return undefined;
    }
  }

  async getAccountDeletionRequests(userId?: string): Promise<AccountDeletionRequest[]> {
    try {
      const conditions = [];
      
      if (userId) {
        conditions.push(eq(accountDeletionRequests.userId, userId));
      }
      
      const result = await db.select().from(accountDeletionRequests)
        .where(combineConditions(conditions))
        .orderBy(desc(accountDeletionRequests.createdAt));
      
      return result;
    } catch (error) {
      console.error(`❌ storage.getAccountDeletionRequests: Error fetching deletion requests:`, error);
      return [];
    }
  }

  async createAccountDeletionRequest(request: InsertAccountDeletionRequest): Promise<AccountDeletionRequest> {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30 days from now
    
    const cancellationDeadline = new Date();
    cancellationDeadline.setDate(cancellationDeadline.getDate() + 29); // 29 days grace period

    const result = await db.insert(accountDeletionRequests).values({
      ...request,
      scheduledFor: scheduledDate,
      cancellationDeadline,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateAccountDeletionRequest(id: string, data: Partial<InsertAccountDeletionRequest>): Promise<AccountDeletionRequest | undefined> {
    const result = await db.update(accountDeletionRequests)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionRequests.id, id))
      .returning();
    return result[0];
  }

  async cancelAccountDeletion(userId: string): Promise<boolean> {
    try {
      const result = await db.update(accountDeletionRequests)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(and(
          eq(accountDeletionRequests.userId, userId),
          eq(accountDeletionRequests.status, 'pending')
        ))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`❌ storage.cancelAccountDeletion: Error cancelling deletion for userId: ${userId}:`, error);
      return false;
    }
  }

  async processAccountDeletion(id: string): Promise<boolean> {
    try {
      const deletionRequest = await db.select().from(accountDeletionRequests)
        .where(eq(accountDeletionRequests.id, id))
        .limit(1);

      if (deletionRequest.length === 0 || deletionRequest[0].status !== 'pending') {
        return false;
      }

      const request = deletionRequest[0];
      
      // Mark as processing
      await this.updateAccountDeletionRequest(id, { 
        status: 'processing',
        processedAt: new Date()
      });

      // In a real implementation, this would:
      // 1. Anonymize user data based on retention settings
      // 2. Delete or archive user records
      // 3. Handle related data cleanup
      // For now, we'll just mark as completed

      await this.updateAccountDeletionRequest(id, { 
        status: 'completed',
        processedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error(`❌ storage.processAccountDeletion: Error processing deletion id: ${id}:`, error);
      return false;
    }
  }

  // ========================================
  // TAX MANAGEMENT STORAGE IMPLEMENTATIONS
  // ========================================

  // Tax Category methods implementation
  async getTaxCategories(filters?: { isActive?: boolean; search?: string }): Promise<TaxCategory[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters?.isActive !== undefined) {
        conditions.push(eq(taxCategories.isActive, filters.isActive));
      }
      
      if (filters?.search) {
        conditions.push(or(
          ilike(taxCategories.name, `%${filters.search}%`),
          ilike(taxCategories.code, `%${filters.search}%`),
          ilike(taxCategories.description, `%${filters.search}%`)
        ));
      }

      const whereClause = combineConditions(conditions);
      
      const result = await db.select().from(taxCategories)
        .where(whereClause)
        .orderBy(asc(taxCategories.displayOrder), asc(taxCategories.name));
      
      return result;
    } catch (error) {
      console.error('❌ storage.getTaxCategories: Error fetching tax categories:', error);
      return [];
    }
  }

  async getTaxCategory(id: string): Promise<TaxCategory | undefined> {
    try {
      const result = await db.select().from(taxCategories)
        .where(eq(taxCategories.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getTaxCategory: Error fetching category ${id}:`, error);
      return undefined;
    }
  }

  async createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory> {
    try {
      const result = await db.insert(taxCategories).values({
        ...category,
        updatedAt: new Date(),
      }).returning();
      
      console.log('✅ storage.createTaxCategory: Tax category created:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ storage.createTaxCategory: Error creating tax category:', error);
      throw error;
    }
  }

  async updateTaxCategory(id: string, data: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined> {
    try {
      const result = await db.update(taxCategories)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(taxCategories.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`❌ storage.updateTaxCategory: Error updating category ${id}:`, error);
      return undefined;
    }
  }

  async deleteTaxCategory(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if category has associated taxes
      const associatedTaxes = await db.select().from(taxes)
        .where(eq(taxes.categoryId, id))
        .limit(1);
      
      if (associatedTaxes.length > 0) {
        return { 
          success: false, 
          message: 'Cannot delete category. There are taxes associated with this category.' 
        };
      }

      const result = await db.delete(taxCategories)
        .where(eq(taxCategories.id, id))
        .returning();
      
      if (result.length === 0) {
        return { success: false, message: 'Tax category not found.' };
      }

      return { success: true, message: 'Tax category deleted successfully.' };
    } catch (error) {
      console.error(`❌ storage.deleteTaxCategory: Error deleting category ${id}:`, error);
      return { success: false, message: 'Failed to delete tax category.' };
    }
  }

  async getTaxCategoriesByPriority(activeOnly = true): Promise<TaxCategory[]> {
    try {
      const conditions: SQL[] = [];
      
      if (activeOnly) {
        conditions.push(eq(taxCategories.isActive, true));
      }

      const whereClause = combineConditions(conditions);
      
      const result = await db.select().from(taxCategories)
        .where(whereClause)
        .orderBy(asc(taxCategories.priority), asc(taxCategories.displayOrder));
      
      return result;
    } catch (error) {
      console.error('❌ storage.getTaxCategoriesByPriority: Error:', error);
      return [];
    }
  }

  async reorderTaxCategories(categoryIds: string[], startOrder = 0): Promise<void> {
    try {
      const updatePromises = categoryIds.map((id, index) => 
        db.update(taxCategories)
          .set({ displayOrder: startOrder + index, updatedAt: new Date() })
          .where(eq(taxCategories.id, id))
      );
      
      await Promise.all(updatePromises);
      console.log('✅ storage.reorderTaxCategories: Categories reordered successfully');
    } catch (error) {
      console.error('❌ storage.reorderTaxCategories: Error reordering categories:', error);
      throw error;
    }
  }

  async getTaxCategoryStatistics(): Promise<{
    totalCategories: number;
    activeCategories: number;
    averageRate: number;
    mostUsedCategory: TaxCategory | null;
  }> {
    try {
      const totalCategories = await db.select({ count: count() }).from(taxCategories);
      const activeCategories = await db.select({ count: count() })
        .from(taxCategories)
        .where(eq(taxCategories.isActive, true));

      // Calculate average default rate
      const averageRateResult = await db.select({
        avgRate: sql<number>`AVG(${taxCategories.defaultRate})`
      }).from(taxCategories).where(eq(taxCategories.isActive, true));

      // Find most used category (category with most associated taxes)
      const mostUsedResult = await db.select({
        category: taxCategories,
        taxCount: count(taxes.id)
      }).from(taxCategories)
        .leftJoin(taxes, eq(taxes.categoryId, taxCategories.id))
        .where(eq(taxCategories.isActive, true))
        .groupBy(taxCategories.id)
        .orderBy(desc(count(taxes.id)))
        .limit(1);

      return {
        totalCategories: totalCategories[0]?.count || 0,
        activeCategories: activeCategories[0]?.count || 0,
        averageRate: Number(averageRateResult[0]?.avgRate || 0),
        mostUsedCategory: mostUsedResult[0]?.category || null,
      };
    } catch (error) {
      console.error('❌ storage.getTaxCategoryStatistics: Error:', error);
      return {
        totalCategories: 0,
        activeCategories: 0,
        averageRate: 0,
        mostUsedCategory: null,
      };
    }
  }

  // Tax methods - Core CRUD implementation
  async getTaxes(filters?: { 
    isActive?: boolean; 
    categoryId?: string; 
    type?: string; 
    locationBased?: boolean;
    search?: string;
    isPrimary?: boolean;
    gstType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ taxes: Tax[]; total: number }> {
    try {
      const conditions: SQL[] = [];
      
      if (filters?.isActive !== undefined) {
        conditions.push(eq(taxes.isActive, filters.isActive));
      }
      
      if (filters?.categoryId) {
        conditions.push(eq(taxes.categoryId, filters.categoryId));
      }
      
      if (filters?.type) {
        conditions.push(eq(taxes.type, filters.type));
      }
      
      if (filters?.locationBased !== undefined) {
        conditions.push(eq(taxes.locationBased, filters.locationBased));
      }
      
      if (filters?.isPrimary !== undefined) {
        conditions.push(eq(taxes.isPrimary, filters.isPrimary));
      }
      
      if (filters?.gstType) {
        conditions.push(eq(taxes.gstType, filters.gstType));
      }
      
      if (filters?.search) {
        conditions.push(or(
          ilike(taxes.name, `%${filters.search}%`),
          ilike(taxes.code, `%${filters.search}%`),
          ilike(taxes.displayName, `%${filters.search}%`),
          ilike(taxes.description, `%${filters.search}%`)
        ));
      }

      const whereClause = combineConditions(conditions);
      
      // Get total count
      const totalResult = await db.select({ count: count() }).from(taxes).where(whereClause);
      const total = totalResult[0]?.count || 0;
      
      // Get taxes with pagination
      let query = db.select().from(taxes).where(whereClause);
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
      
      const result = await query.orderBy(asc(taxes.priority), asc(taxes.name));
      
      return { taxes: result, total };
    } catch (error) {
      console.error('❌ storage.getTaxes: Error fetching taxes:', error);
      return { taxes: [], total: 0 };
    }
  }

  async getTax(id: string): Promise<Tax | undefined> {
    try {
      const result = await db.select().from(taxes)
        .where(eq(taxes.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getTax: Error fetching tax ${id}:`, error);
      return undefined;
    }
  }

  async getTaxByCode(code: string): Promise<Tax | undefined> {
    try {
      const result = await db.select().from(taxes)
        .where(eq(taxes.code, code))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(`❌ storage.getTaxByCode: Error fetching tax by code ${code}:`, error);
      return undefined;
    }
  }

  async createTax(tax: InsertTax): Promise<Tax> {
    try {
      const result = await db.insert(taxes).values({
        ...tax,
        updatedAt: new Date(),
      }).returning();
      
      console.log('✅ storage.createTax: Tax created:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ storage.createTax: Error creating tax:', error);
      throw error;
    }
  }

  async updateTax(id: string, data: Partial<InsertTax>): Promise<Tax | undefined> {
    try {
      // Add change tracking if modifying critical fields
      const existingTax = await this.getTax(id);
      if (existingTax && (data.rate !== undefined || data.type !== undefined)) {
        const changeHistory = existingTax.changeHistory || [];
        const timestamp = new Date().toISOString();
        
        if (data.rate !== undefined && Number(data.rate) !== Number(existingTax.rate)) {
          changeHistory.push({
            field: 'rate',
            oldValue: existingTax.rate,
            newValue: data.rate,
            changedBy: data.lastModifiedBy || 'system',
            changedAt: timestamp,
          });
        }
        
        data.changeHistory = changeHistory;
      }

      const result = await db.update(taxes)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(taxes.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`❌ storage.updateTax: Error updating tax ${id}:`, error);
      return undefined;
    }
  }

  async deleteTax(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if tax is being used in active orders (in a real implementation)
      // For now, we'll just perform the delete
      const result = await db.delete(taxes)
        .where(eq(taxes.id, id))
        .returning();
      
      if (result.length === 0) {
        return { success: false, message: 'Tax not found.' };
      }

      return { success: true, message: 'Tax deleted successfully.' };
    } catch (error) {
      console.error(`❌ storage.deleteTax: Error deleting tax ${id}:`, error);
      return { success: false, message: 'Failed to delete tax.' };
    }
  }

  // Tax applicability and filtering methods
  async getApplicableTaxes(context: {
    serviceCategories?: string[];
    partCategories?: string[];
    orderValue: number;
    userLocation?: { state?: string; city?: string };
    userRole?: string;
    orderType?: string;
    promoCode?: string;
  }): Promise<Tax[]> {
    try {
      const conditions: SQL[] = [
        eq(taxes.isActive, true),
        gte(sql`${context.orderValue}`, taxes.minOrderValue),
      ];

      // Check validity period
      const now = new Date();
      conditions.push(lte(taxes.validFrom, now));
      conditions.push(or(
        sql`${taxes.validTo} IS NULL`,
        gte(taxes.validTo, now)
      ));

      // Check max order value if specified
      conditions.push(or(
        sql`${taxes.maxOrderValue} IS NULL`,
        lte(sql`${context.orderValue}`, taxes.maxOrderValue)
      ));

      const whereClause = combineConditions(conditions);

      const result = await db.select().from(taxes)
        .where(whereClause)
        .orderBy(asc(taxes.priority));

      // Filter by business rules (to be implemented with more complex logic)
      let applicableTaxes = result.filter(tax => {
        // Service category check
        if (context.serviceCategories && tax.serviceCategories.length > 0) {
          const hasMatch = context.serviceCategories.some(cat => 
            tax.serviceCategories.includes(cat)
          );
          if (!hasMatch) return false;
        }

        // Part category check
        if (context.partCategories && tax.partCategories.length > 0) {
          const hasMatch = context.partCategories.some(cat => 
            tax.partCategories.includes(cat)
          );
          if (!hasMatch) return false;
        }

        // Location-based check
        if (tax.locationBased) {
          if (tax.stateRestrictions.length > 0 && context.userLocation?.state) {
            if (!tax.stateRestrictions.includes(context.userLocation.state)) {
              return false;
            }
          }
          
          if (tax.cityRestrictions.length > 0 && context.userLocation?.city) {
            if (!tax.cityRestrictions.includes(context.userLocation.city)) {
              return false;
            }
          }
        }

        return true;
      });

      // Apply exemption rules
      applicableTaxes = await this.applyTaxExemptions(applicableTaxes, context);

      return applicableTaxes;
    } catch (error) {
      console.error('❌ storage.getApplicableTaxes: Error:', error);
      return [];
    }
  }

  async getTaxesByCategory(categoryId: string, activeOnly = true): Promise<Tax[]> {
    try {
      const conditions: SQL[] = [eq(taxes.categoryId, categoryId)];
      
      if (activeOnly) {
        conditions.push(eq(taxes.isActive, true));
      }

      const whereClause = combineConditions(conditions);
      
      const result = await db.select().from(taxes)
        .where(whereClause)
        .orderBy(asc(taxes.priority), asc(taxes.name));
      
      return result;
    } catch (error) {
      console.error(`❌ storage.getTaxesByCategory: Error for category ${categoryId}:`, error);
      return [];
    }
  }

  async getTaxesByService(serviceId: string, orderValue = 0): Promise<Tax[]> {
    try {
      // In a real implementation, this would involve joining with services table
      // For now, we'll get all active taxes
      const result = await db.select().from(taxes)
        .where(and(
          eq(taxes.isActive, true),
          lte(taxes.minOrderValue, orderValue)
        ))
        .orderBy(asc(taxes.priority));
      
      return result;
    } catch (error) {
      console.error(`❌ storage.getTaxesByService: Error for service ${serviceId}:`, error);
      return [];
    }
  }

  async getTaxesByLocation(state?: string, city?: string, activeOnly = true): Promise<Tax[]> {
    try {
      const conditions: SQL[] = [];
      
      if (activeOnly) {
        conditions.push(eq(taxes.isActive, true));
      }

      // Location-based taxes
      conditions.push(eq(taxes.locationBased, true));

      const whereClause = combineConditions(conditions);
      
      const result = await db.select().from(taxes)
        .where(whereClause)
        .orderBy(asc(taxes.priority));

      // Filter by location restrictions
      return result.filter(tax => {
        if (state && tax.stateRestrictions.length > 0) {
          return tax.stateRestrictions.includes(state);
        }
        if (city && tax.cityRestrictions.length > 0) {
          return tax.cityRestrictions.includes(city);
        }
        return true;
      });
    } catch (error) {
      console.error(`❌ storage.getTaxesByLocation: Error for ${state}, ${city}:`, error);
      return [];
    }
  }

  async getTaxesByGSTType(gstType: string, activeOnly = true): Promise<Tax[]> {
    try {
      const conditions: SQL[] = [eq(taxes.gstType, gstType)];
      
      if (activeOnly) {
        conditions.push(eq(taxes.isActive, true));
      }

      const whereClause = combineConditions(conditions);
      
      const result = await db.select().from(taxes)
        .where(whereClause)
        .orderBy(asc(taxes.priority));
      
      return result;
    } catch (error) {
      console.error(`❌ storage.getTaxesByGSTType: Error for type ${gstType}:`, error);
      return [];
    }
  }

  // Tax calculation engine implementation
  async calculateTaxes(params: {
    orderValue: number;
    serviceCategories?: string[];
    partCategories?: string[];
    userLocation?: { state?: string; city?: string };
    userRole?: string;
    promoCode?: string;
    orderType?: string;
    shippingAmount?: number;
  }): Promise<{
    taxes: Array<{
      tax: Tax;
      taxableAmount: number;
      calculatedAmount: number;
      appliedRate: number;
    }>;
    totalTaxAmount: number;
    totalAmount: number;
    breakdown: {
      baseAmount: number;
      totalTaxAmount: number;
      finalAmount: number;
    };
  }> {
    try {
      const applicableTaxes = await this.getApplicableTaxes(params);
      const calculations: Array<{
        tax: Tax;
        taxableAmount: number;
        calculatedAmount: number;
        appliedRate: number;
      }> = [];

      let runningTotal = params.orderValue;
      let totalTaxAmount = 0;

      // Sort taxes by priority for correct calculation order
      const sortedTaxes = applicableTaxes.sort((a, b) => a.priority - b.priority);

      for (const tax of sortedTaxes) {
        const taxableAmount = this.calculateTaxableAmount(tax, {
          orderValue: params.orderValue,
          shippingAmount: params.shippingAmount || 0,
          previousTaxes: calculations,
          runningTotal,
        });

        let calculatedAmount = 0;
        let appliedRate = Number(tax.rate);

        if (tax.type === 'percentage') {
          calculatedAmount = (taxableAmount * appliedRate) / 100;
        } else if (tax.type === 'fixed') {
          calculatedAmount = appliedRate;
        } else if (tax.type === 'tiered' && tax.tierConfig) {
          const tierResult = await this.calculateTieredTax(tax.id, taxableAmount);
          calculatedAmount = tierResult.calculatedAmount;
          appliedRate = tierResult.effectiveRate;
        }

        // Apply min/max limits
        if (tax.minAmount && calculatedAmount < Number(tax.minAmount)) {
          calculatedAmount = Number(tax.minAmount);
        }
        if (tax.maxAmount && calculatedAmount > Number(tax.maxAmount)) {
          calculatedAmount = Number(tax.maxAmount);
        }

        // Apply rounding rule
        calculatedAmount = this.applyRounding(calculatedAmount, tax.roundingRule);

        calculations.push({
          tax,
          taxableAmount,
          calculatedAmount,
          appliedRate,
        });

        totalTaxAmount += calculatedAmount;

        // If tax is compoundable, add to running total for next tax calculation
        if (tax.compoundable) {
          runningTotal += calculatedAmount;
        }
      }

      return {
        taxes: calculations,
        totalTaxAmount,
        totalAmount: params.orderValue + totalTaxAmount,
        breakdown: {
          baseAmount: params.orderValue,
          totalTaxAmount,
          finalAmount: params.orderValue + totalTaxAmount,
        },
      };
    } catch (error) {
      console.error('❌ storage.calculateTaxes: Error calculating taxes:', error);
      return {
        taxes: [],
        totalTaxAmount: 0,
        totalAmount: params.orderValue,
        breakdown: {
          baseAmount: params.orderValue,
          totalTaxAmount: 0,
          finalAmount: params.orderValue,
        },
      };
    }
  }

  private calculateTaxableAmount(tax: Tax, context: {
    orderValue: number;
    shippingAmount: number;
    previousTaxes: any[];
    runningTotal: number;
  }): number {
    let taxableAmount = 0;

    const includes = tax.taxableBaseIncludes;

    if (includes.serviceAmount) {
      taxableAmount += context.orderValue;
    }

    if (includes.shippingAmount) {
      taxableAmount += context.shippingAmount;
    }

    if (includes.previousTaxes) {
      const previousTaxAmount = context.previousTaxes.reduce((sum, calc) => 
        sum + calc.calculatedAmount, 0
      );
      taxableAmount += previousTaxAmount;
    }

    return taxableAmount || context.orderValue;
  }

  private applyRounding(amount: number, rule: string): number {
    switch (rule) {
      case 'ceil':
        return Math.ceil(amount);
      case 'floor':
        return Math.floor(amount);
      case 'round_to_nearest_5':
        return Math.round(amount / 5) * 5;
      case 'round_to_nearest_10':
        return Math.round(amount / 10) * 10;
      case 'round':
      default:
        return Math.round(amount * 100) / 100; // Round to 2 decimal places
    }
  }

  async previewTaxCalculation(taxIds: string[], orderValue: number): Promise<{
    preview: Array<{
      tax: Tax;
      calculatedAmount: number;
      appliedRate: number;
    }>;
    totalTax: number;
    conflicts: string[];
  }> {
    try {
      const taxes = await Promise.all(
        taxIds.map(id => this.getTax(id))
      );
      const validTaxes = taxes.filter(tax => tax !== undefined) as Tax[];

      const preview: Array<{
        tax: Tax;
        calculatedAmount: number;
        appliedRate: number;
      }> = [];

      let totalTax = 0;
      const conflicts: string[] = [];

      // Check for conflicts
      const conflictCheck = await this.validateTaxCombination(taxIds);
      conflicts.push(...conflictCheck.conflicts);

      for (const tax of validTaxes) {
        let calculatedAmount = 0;
        let appliedRate = Number(tax.rate);

        if (tax.type === 'percentage') {
          calculatedAmount = (orderValue * appliedRate) / 100;
        } else if (tax.type === 'fixed') {
          calculatedAmount = appliedRate;
        }

        calculatedAmount = this.applyRounding(calculatedAmount, tax.roundingRule);

        preview.push({
          tax,
          calculatedAmount,
          appliedRate,
        });

        totalTax += calculatedAmount;
      }

      return { preview, totalTax, conflicts };
    } catch (error) {
      console.error('❌ storage.previewTaxCalculation: Error:', error);
      return { preview: [], totalTax: 0, conflicts: ['Calculation error'] };
    }
  }

  // Tax validation and business rules implementation
  async validateTaxConfiguration(tax: Partial<InsertTax>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate rate based on type
      if (tax.type === 'percentage' && tax.rate !== undefined) {
        if (Number(tax.rate) < 0 || Number(tax.rate) > 100) {
          errors.push('Percentage tax rate must be between 0 and 100');
        }
      }

      if (tax.type === 'fixed' && tax.rate !== undefined) {
        if (Number(tax.rate) < 0) {
          errors.push('Fixed tax amount cannot be negative');
        }
      }

      // Validate min/max amounts
      if (tax.minAmount !== undefined && tax.maxAmount !== undefined) {
        if (Number(tax.minAmount) > Number(tax.maxAmount)) {
          errors.push('Minimum amount cannot be greater than maximum amount');
        }
      }

      // Validate order value thresholds
      if (tax.minOrderValue !== undefined && tax.maxOrderValue !== undefined) {
        if (Number(tax.minOrderValue) > Number(tax.maxOrderValue)) {
          errors.push('Minimum order value cannot be greater than maximum order value');
        }
      }

      // Validate code uniqueness
      if (tax.code) {
        const existingTax = await this.getTaxByCode(tax.code);
        if (existingTax) {
          errors.push('Tax code already exists');
        }
      }

      // Validate validity period
      if (tax.validFrom && tax.validTo) {
        if (new Date(tax.validFrom) >= new Date(tax.validTo)) {
          errors.push('Valid from date must be before valid to date');
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('❌ storage.validateTaxConfiguration: Error:', error);
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  async validateTaxCombination(taxIds: string[]): Promise<{ valid: boolean; conflicts: string[] }> {
    try {
      const taxes = await Promise.all(taxIds.map(id => this.getTax(id)));
      const validTaxes = taxes.filter(tax => tax !== undefined) as Tax[];
      const conflicts: string[] = [];

      // Check for primary tax conflicts (only one primary tax allowed)
      const primaryTaxes = validTaxes.filter(tax => tax.isPrimary);
      if (primaryTaxes.length > 1) {
        conflicts.push(`Multiple primary taxes detected: ${primaryTaxes.map(t => t.name).join(', ')}`);
      }

      // Check for non-combinable taxes
      const nonCombinableTaxes = validTaxes.filter(tax => !tax.combinable);
      if (nonCombinableTaxes.length > 0 && validTaxes.length > 1) {
        conflicts.push(`Non-combinable taxes cannot be used with other taxes: ${nonCombinableTaxes.map(t => t.name).join(', ')}`);
      }

      // Check for GST type conflicts (CGST + SGST vs IGST)
      const cgstTaxes = validTaxes.filter(tax => tax.gstType === 'cgst');
      const sgstTaxes = validTaxes.filter(tax => tax.gstType === 'sgst');
      const igstTaxes = validTaxes.filter(tax => tax.gstType === 'igst');
      
      if ((cgstTaxes.length > 0 || sgstTaxes.length > 0) && igstTaxes.length > 0) {
        conflicts.push('Cannot combine CGST/SGST with IGST');
      }

      return { valid: conflicts.length === 0, conflicts };
    } catch (error) {
      console.error('❌ storage.validateTaxCombination: Error:', error);
      return { valid: false, conflicts: ['Validation failed'] };
    }
  }

  async checkTaxCodeAvailability(code: string, excludeId?: string): Promise<{ available: boolean; suggestions?: string[] }> {
    try {
      const existingTax = await this.getTaxByCode(code);
      
      if (!existingTax || (excludeId && existingTax.id === excludeId)) {
        return { available: true };
      }

      // Generate suggestions
      const suggestions = [
        `${code}_V2`,
        `${code}_NEW`,
        `${code}_${new Date().getFullYear()}`,
        `${code}_${Math.floor(Math.random() * 1000)}`,
      ];

      return { available: false, suggestions };
    } catch (error) {
      console.error('❌ storage.checkTaxCodeAvailability: Error:', error);
      return { available: false };
    }
  }

  async validateTaxRules(tax: Tax, orderContext: any): Promise<{ applicable: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // Check if tax is active
      if (!tax.isActive) {
        reasons.push('Tax is not active');
        return { applicable: false, reasons };
      }

      // Check validity period
      const now = new Date();
      if (tax.validFrom && new Date(tax.validFrom) > now) {
        reasons.push('Tax is not yet valid');
      }
      if (tax.validTo && new Date(tax.validTo) < now) {
        reasons.push('Tax has expired');
      }

      // Check order value thresholds
      if (orderContext.orderValue < Number(tax.minOrderValue)) {
        reasons.push(`Order value below minimum threshold (${tax.minOrderValue})`);
      }
      if (tax.maxOrderValue && orderContext.orderValue > Number(tax.maxOrderValue)) {
        reasons.push(`Order value above maximum threshold (${tax.maxOrderValue})`);
      }

      return { applicable: reasons.length === 0, reasons };
    } catch (error) {
      console.error('❌ storage.validateTaxRules: Error:', error);
      return { applicable: false, reasons: ['Validation failed'] };
    }
  }

  // Bulk operations implementation
  async bulkUpdateTaxes(operations: {
    taxIds: string[];
    operation: 'activate' | 'deactivate' | 'update_priority' | 'delete';
    data?: {
      isActive?: boolean;
      priority?: number;
    };
  }): Promise<{ success: boolean; updated: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let updated = 0;

      for (const taxId of operations.taxIds) {
        try {
          switch (operations.operation) {
            case 'activate':
              await this.updateTax(taxId, { isActive: true });
              updated++;
              break;
            case 'deactivate':
              await this.updateTax(taxId, { isActive: false });
              updated++;
              break;
            case 'update_priority':
              if (operations.data?.priority !== undefined) {
                await this.updateTax(taxId, { priority: operations.data.priority });
                updated++;
              }
              break;
            case 'delete':
              const deleteResult = await this.deleteTax(taxId);
              if (deleteResult.success) {
                updated++;
              } else {
                errors.push(`Failed to delete tax ${taxId}: ${deleteResult.message}`);
              }
              break;
          }
        } catch (error) {
          errors.push(`Failed to update tax ${taxId}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        updated,
        errors,
      };
    } catch (error) {
      console.error('❌ storage.bulkUpdateTaxes: Error:', error);
      return { success: false, updated: 0, errors: ['Bulk operation failed'] };
    }
  }

  async bulkActivateTaxes(taxIds: string[]): Promise<{ success: boolean; activated: number; errors: string[] }> {
    const result = await this.bulkUpdateTaxes({
      taxIds,
      operation: 'activate',
    });
    
    return {
      success: result.success,
      activated: result.updated,
      errors: result.errors,
    };
  }

  async bulkDeactivateTaxes(taxIds: string[]): Promise<{ success: boolean; deactivated: number; errors: string[] }> {
    const result = await this.bulkUpdateTaxes({
      taxIds,
      operation: 'deactivate',
    });
    
    return {
      success: result.success,
      deactivated: result.updated,
      errors: result.errors,
    };
  }

  // Tax exemption and special rules implementation
  async checkTaxExemption(taxId: string, context: {
    userRole?: string;
    orderValue?: number;
    promoCode?: string;
    serviceCategories?: string[];
  }): Promise<{ exempt: boolean; reason?: string }> {
    try {
      const tax = await this.getTax(taxId);
      if (!tax || !tax.exemptionRules) {
        return { exempt: false };
      }

      const rules = tax.exemptionRules;

      // Check user role exemption
      if (rules.userRoles && context.userRole && rules.userRoles.includes(context.userRole)) {
        return { exempt: true, reason: `Exempt for user role: ${context.userRole}` };
      }

      // Check minimum order value exemption
      if (rules.minimumOrderValue && context.orderValue && context.orderValue >= rules.minimumOrderValue) {
        return { exempt: true, reason: `Exempt for orders above ₹${rules.minimumOrderValue}` };
      }

      // Check promo code exemption
      if (rules.promoCodeRequired && context.promoCode === rules.promoCodeRequired) {
        return { exempt: true, reason: `Exempt with promo code: ${context.promoCode}` };
      }

      return { exempt: false };
    } catch (error) {
      console.error(`❌ storage.checkTaxExemption: Error for tax ${taxId}:`, error);
      return { exempt: false };
    }
  }

  async getExemptionRules(taxId: string): Promise<any> {
    try {
      const tax = await this.getTax(taxId);
      return tax?.exemptionRules || {};
    } catch (error) {
      console.error(`❌ storage.getExemptionRules: Error for tax ${taxId}:`, error);
      return {};
    }
  }

  async applyTaxExemptions(taxes: Tax[], context: any): Promise<Tax[]> {
    try {
      const exemptTaxes: Tax[] = [];

      for (const tax of taxes) {
        const exemptionCheck = await this.checkTaxExemption(tax.id, context);
        if (!exemptionCheck.exempt) {
          exemptTaxes.push(tax);
        }
      }

      return exemptTaxes;
    } catch (error) {
      console.error('❌ storage.applyTaxExemptions: Error:', error);
      return taxes; // Return original list if exemption check fails
    }
  }

  // Advanced tax features implementation
  async getTaxTiers(taxId: string): Promise<any> {
    try {
      const tax = await this.getTax(taxId);
      return tax?.tierConfig || null;
    } catch (error) {
      console.error(`❌ storage.getTaxTiers: Error for tax ${taxId}:`, error);
      return null;
    }
  }

  async calculateTieredTax(taxId: string, orderValue: number): Promise<{
    tierApplied: any;
    calculatedAmount: number;
    effectiveRate: number;
  }> {
    try {
      const tax = await this.getTax(taxId);
      if (!tax || !tax.tierConfig || !tax.tierConfig.tiers) {
        return { tierApplied: null, calculatedAmount: 0, effectiveRate: 0 };
      }

      const tiers = tax.tierConfig.tiers;
      
      // Find applicable tier
      const applicableTier = tiers.find(tier => {
        const minMatch = orderValue >= tier.minOrderValue;
        const maxMatch = !tier.maxOrderValue || orderValue <= tier.maxOrderValue;
        return minMatch && maxMatch;
      });

      if (!applicableTier) {
        return { tierApplied: null, calculatedAmount: 0, effectiveRate: 0 };
      }

      let calculatedAmount = 0;
      if (applicableTier.type === 'percentage') {
        calculatedAmount = (orderValue * applicableTier.rate) / 100;
      } else if (applicableTier.type === 'fixed') {
        calculatedAmount = applicableTier.rate;
      }

      return {
        tierApplied: applicableTier,
        calculatedAmount,
        effectiveRate: applicableTier.rate,
      };
    } catch (error) {
      console.error(`❌ storage.calculateTieredTax: Error for tax ${taxId}:`, error);
      return { tierApplied: null, calculatedAmount: 0, effectiveRate: 0 };
    }
  }

  async generateTaxCode(baseName: string, type: string): Promise<string> {
    try {
      const sanitizedBase = baseName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const typePrefix = type.toUpperCase();
      let code = `${typePrefix}_${sanitizedBase}`;

      // Check if code exists, if so add suffix
      let suffix = 1;
      while (!(await this.checkTaxCodeAvailability(code)).available) {
        code = `${typePrefix}_${sanitizedBase}_${suffix}`;
        suffix++;
      }

      return code;
    } catch (error) {
      console.error('❌ storage.generateTaxCode: Error:', error);
      return `TAX_${Date.now()}`;
    }
  }

  async duplicateTax(taxId: string, modifications?: Partial<InsertTax>): Promise<Tax> {
    try {
      const originalTax = await this.getTax(taxId);
      if (!originalTax) {
        throw new Error('Original tax not found');
      }

      // Generate new code
      const newCode = await this.generateTaxCode(originalTax.name, 'COPY');

      const newTaxData: InsertTax = {
        ...originalTax,
        id: undefined as any,
        code: newCode,
        name: `${originalTax.name} (Copy)`,
        isActive: false, // Start as inactive
        totalCollected: '0.00',
        totalOrders: 0,
        lastUsedAt: undefined,
        changeHistory: [],
        createdAt: undefined,
        updatedAt: undefined,
        ...modifications,
      };

      return await this.createTax(newTaxData);
    } catch (error) {
      console.error(`❌ storage.duplicateTax: Error duplicating tax ${taxId}:`, error);
      throw error;
    }
  }

  // Placeholder implementations for remaining methods (to be implemented based on business needs)
  async getTaxStatistics(filters?: any): Promise<any> {
    // Implementation would involve complex aggregation queries
    return { totalTaxes: 0, activeTaxes: 0, totalCollected: 0, averageRate: 0 };
  }

  async getTaxPerformanceReport(taxId: string, dateRange?: any): Promise<any> {
    // Implementation would involve order history analysis
    return { tax: null, totalOrders: 0, totalCollected: 0 };
  }

  async getTaxAuditTrail(taxId?: string, limit?: number): Promise<any[]> {
    // Implementation would involve audit log queries
    return [];
  }

  async updateTaxUsageStats(taxId: string, orderValue: number, taxAmount: number): Promise<void> {
    // Implementation would update tax usage statistics
  }

  async archiveExpiredTaxes(): Promise<{ archived: number; errors: string[] }> {
    // Implementation would archive expired taxes
    return { archived: 0, errors: [] };
  }

  async syncTaxWithOrders(taxId: string): Promise<{ success: boolean; ordersUpdated: number }> {
    // Implementation would sync tax with existing orders
    return { success: true, ordersUpdated: 0 };
  }

  async recalculateTaxForOrders(taxId: string, orderIds?: string[]): Promise<{ success: boolean; ordersRecalculated: number; errors: string[] }> {
    // Implementation would recalculate taxes for orders
    return { success: true, ordersRecalculated: 0, errors: [] };
  }

  async validateTaxIntegrity(): Promise<{ valid: boolean; issues: string[]; fixedIssues: string[] }> {
    // Implementation would validate tax data integrity
    return { valid: true, issues: [], fixedIssues: [] };
  }

  // Promotional Media Implementation

  // Core CRUD operations
  async getPromotionalMedia(filters?: {
    isActive?: boolean;
    placement?: string;
    mediaType?: string;
    status?: string;
    moderationStatus?: string;
    campaignId?: string;
    tags?: string[];
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ media: PromotionalMedia[]; total: number }> {
    try {
      console.log('🔍 storage.getPromotionalMedia: Fetching promotional media with filters:', filters);
      
      const conditions: SQL[] = [];
      
      if (filters?.isActive !== undefined) {
        conditions.push(eq(promotionalMedia.isActive, filters.isActive));
      }
      
      if (filters?.placement) {
        conditions.push(eq(promotionalMedia.placement, filters.placement));
      }
      
      if (filters?.mediaType) {
        conditions.push(eq(promotionalMedia.mediaType, filters.mediaType));
      }
      
      if (filters?.status) {
        conditions.push(eq(promotionalMedia.status, filters.status));
      }
      
      if (filters?.moderationStatus) {
        conditions.push(eq(promotionalMedia.moderationStatus, filters.moderationStatus));
      }
      
      if (filters?.campaignId) {
        conditions.push(eq(promotionalMedia.campaignId, filters.campaignId));
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(promotionalMedia.title, searchTerm),
            ilike(promotionalMedia.description, searchTerm),
            ilike(promotionalMedia.campaignName, searchTerm)
          )
        );
      }
      
      if (filters?.dateFrom) {
        conditions.push(gte(promotionalMedia.createdAt, new Date(filters.dateFrom)));
      }
      
      if (filters?.dateTo) {
        conditions.push(lte(promotionalMedia.createdAt, new Date(filters.dateTo)));
      }

      // Build the query
      let query = db.select().from(promotionalMedia);
      
      if (conditions.length > 0) {
        query = query.where(combineConditions(conditions));
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';
      
      if (sortOrder === 'desc') {
        query = query.orderBy(desc(promotionalMedia[sortBy as keyof typeof promotionalMedia]));
      } else {
        query = query.orderBy(asc(promotionalMedia[sortBy as keyof typeof promotionalMedia]));
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      const media = await query;

      // Get total count
      let countQuery = db.select({ count: count() }).from(promotionalMedia);
      if (conditions.length > 0) {
        countQuery = countQuery.where(combineConditions(conditions));
      }
      const [{ count: total }] = await countQuery;

      console.log(`✅ storage.getPromotionalMedia: Found ${media.length} media items (total: ${total})`);
      return { media, total };
    } catch (error) {
      console.error('❌ storage.getPromotionalMedia: Error:', error);
      throw error;
    }
  }

  async getPromotionalMediaItem(id: string): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`🔍 storage.getPromotionalMediaItem: Looking for media with id: "${id}"`);
      const result = await db.select().from(promotionalMedia).where(eq(promotionalMedia.id, id)).limit(1);
      console.log(`✅ storage.getPromotionalMediaItem: Found ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.getPromotionalMediaItem: Error:', error);
      throw error;
    }
  }

  async createPromotionalMedia(data: PromotionalMediaCreateData & { createdBy: string }): Promise<PromotionalMedia> {
    try {
      console.log('🔨 storage.createPromotionalMedia: Creating promotional media:', data.title);
      
      const result = await db.insert(promotionalMedia).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log('✅ storage.createPromotionalMedia: Media created successfully:', result[0].id);
      return result[0];
    } catch (error) {
      console.error('❌ storage.createPromotionalMedia: Error:', error);
      throw error;
    }
  }

  async updatePromotionalMedia(id: string, data: Partial<PromotionalMediaUpdateData> & { lastModifiedBy: string }): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`🔧 storage.updatePromotionalMedia: Updating media ${id}`);
      
      const result = await db.update(promotionalMedia)
        .set({ 
          ...data, 
          updatedAt: new Date(),
          lastModifiedBy: data.lastModifiedBy 
        })
        .where(eq(promotionalMedia.id, id))
        .returning();
      
      console.log(`✅ storage.updatePromotionalMedia: Updated ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.updatePromotionalMedia: Error:', error);
      throw error;
    }
  }

  async deletePromotionalMedia(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ storage.deletePromotionalMedia: Deleting media ${id}`);
      
      // Check if media exists
      const existingMedia = await this.getPromotionalMediaItem(id);
      if (!existingMedia) {
        return { success: false, message: 'Media not found' };
      }

      // Soft delete by archiving
      await this.archivePromotionalMedia(id);
      
      console.log(`✅ storage.deletePromotionalMedia: Media ${id} archived successfully`);
      return { success: true, message: 'Media archived successfully' };
    } catch (error) {
      console.error('❌ storage.deletePromotionalMedia: Error:', error);
      return { success: false, message: 'Failed to delete media' };
    }
  }

  async archivePromotionalMedia(id: string): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`📦 storage.archivePromotionalMedia: Archiving media ${id}`);
      
      const result = await db.update(promotionalMedia)
        .set({ 
          status: 'archived',
          isActive: false,
          archivedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(promotionalMedia.id, id))
        .returning();
      
      console.log(`✅ storage.archivePromotionalMedia: Archived ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.archivePromotionalMedia: Error:', error);
      throw error;
    }
  }

  // Active media queries for public display
  async getActivePromotionalMedia(filters?: {
    placement?: string;
    userId?: string;
    userRole?: string;
    country?: string;
    state?: string;
    city?: string;
    limit?: number;
  }): Promise<PromotionalMedia[]> {
    try {
      console.log('🎯 storage.getActivePromotionalMedia: Fetching active media with filters:', filters);
      
      const conditions: SQL[] = [
        eq(promotionalMedia.isActive, true),
        eq(promotionalMedia.status, 'active'),
        eq(promotionalMedia.moderationStatus, 'approved')
      ];
      
      if (filters?.placement) {
        conditions.push(eq(promotionalMedia.placement, filters.placement));
      }

      // Check scheduling
      const now = new Date();
      conditions.push(
        or(
          eq(promotionalMedia.isScheduled, false),
          and(
            eq(promotionalMedia.isScheduled, true),
            or(
              sql`${promotionalMedia.startDate} IS NULL`,
              lte(promotionalMedia.startDate, now)
            ),
            or(
              sql`${promotionalMedia.endDate} IS NULL`,
              gte(promotionalMedia.endDate, now)
            )
          )
        )
      );

      const media = await db.select({
        id: promotionalMedia.id,
        title: promotionalMedia.title,
        description: promotionalMedia.description,
        mediaType: promotionalMedia.mediaType,
        mediaUrl: promotionalMedia.mediaUrl,
        thumbnailUrl: promotionalMedia.thumbnailUrl,
        autoPlay: promotionalMedia.autoPlay,
        loopEnabled: promotionalMedia.loopEnabled,
        mutedByDefault: promotionalMedia.mutedByDefault,
        showControls: promotionalMedia.showControls,
        allowPause: promotionalMedia.allowPause,
        clickAction: promotionalMedia.clickAction,
        clickUrl: promotionalMedia.clickUrl,
        placement: promotionalMedia.placement,
        displayOrder: promotionalMedia.displayOrder,
        priority: promotionalMedia.priority,
        isActive: promotionalMedia.isActive,
        duration: promotionalMedia.duration,
        dimensions: promotionalMedia.dimensions,
        fileSize: promotionalMedia.fileSize,
        mimeType: promotionalMedia.mimeType,
        isScheduled: promotionalMedia.isScheduled,
        startDate: promotionalMedia.startDate,
        endDate: promotionalMedia.endDate,
        createdAt: promotionalMedia.createdAt,
        updatedAt: promotionalMedia.updatedAt
      })
        .from(promotionalMedia)
        .where(combineConditions(conditions))
        .orderBy(desc(promotionalMedia.priority), asc(promotionalMedia.displayOrder))
        .limit(filters?.limit || 10);

      console.log(`✅ storage.getActivePromotionalMedia: Found ${media.length} active media items`);
      return media;
    } catch (error) {
      console.error('❌ storage.getActivePromotionalMedia: Error:', error);
      throw error;
    }
  }

  async getActiveMediaByPlacement(placement: string, userId?: string): Promise<PromotionalMedia[]> {
    return this.getActivePromotionalMedia({ placement, userId, limit: 5 });
  }

  async getTargetedMediaForUser(userId: string, placement?: string): Promise<PromotionalMedia[]> {
    try {
      console.log(`🎯 storage.getTargetedMediaForUser: Getting targeted media for user ${userId}`);
      
      // Get user details for targeting
      const user = await this.getUser(userId);
      if (!user) {
        return [];
      }

      // Get user order count for targeting
      const userOrders = await this.getOrdersByUser(userId);
      const orderCount = userOrders.length;

      const filters = {
        placement,
        userId,
        userRole: user.role,
        limit: 10
      };

      // TODO: Add more sophisticated targeting logic based on:
      // - User behavior
      // - Order history
      // - Geographic location
      // - Audience targeting rules
      
      return this.getActivePromotionalMedia(filters);
    } catch (error) {
      console.error('❌ storage.getTargetedMediaForUser: Error:', error);
      return [];
    }
  }

  // Analytics and tracking
  async createPromotionalMediaAnalytics(data: PromotionalMediaAnalyticsCreateData): Promise<PromotionalMediaAnalytics> {
    try {
      const result = await db.insert(promotionalMediaAnalytics).values({
        ...data,
        createdAt: new Date(),
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('❌ storage.createPromotionalMediaAnalytics: Error:', error);
      throw error;
    }
  }

  async trackMediaImpression(mediaId: string, context: {
    userId?: string;
    sessionId?: string;
    placement?: string;
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
    viewportSize?: { width: number; height: number };
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Create analytics record
      await this.createPromotionalMediaAnalytics({
        mediaId,
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: 'impression',
        placement: context.placement,
        deviceType: context.deviceType as any,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        viewportSize: context.viewportSize,
        metadata: context.metadata || {}
      });

      // Update media impression count
      await this.updateMediaMetrics(mediaId, { 
        impressions: 1,
        lastDisplayed: new Date()
      });
    } catch (error) {
      console.error('❌ storage.trackMediaImpression: Error:', error);
      // Don't throw error for analytics tracking failures
    }
  }

  async trackMediaClick(mediaId: string, context: {
    userId?: string;
    sessionId?: string;
    placement?: string;
    clickPosition?: { x: number; y: number };
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Create analytics record
      await this.createPromotionalMediaAnalytics({
        mediaId,
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: 'click',
        placement: context.placement,
        clickPosition: context.clickPosition,
        deviceType: context.deviceType as any,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        metadata: context.metadata || {}
      });

      // Update media click count
      await this.updateMediaMetrics(mediaId, { clicks: 1 });
    } catch (error) {
      console.error('❌ storage.trackMediaClick: Error:', error);
      // Don't throw error for analytics tracking failures
    }
  }

  async trackMediaEvent(mediaId: string, eventType: string, context: any): Promise<void> {
    try {
      await this.createPromotionalMediaAnalytics({
        mediaId,
        eventType: eventType as any,
        ...context
      });
    } catch (error) {
      console.error('❌ storage.trackMediaEvent: Error:', error);
      // Don't throw error for analytics tracking failures
    }
  }

  // Bulk operations
  async bulkOperatePromotionalMedia(operation: PromotionalMediaBulkOperationData): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log(`🔄 storage.bulkOperatePromotionalMedia: Performing ${operation.operation} on ${operation.mediaIds.length} items`);
      
      const errors: string[] = [];
      let updated = 0;

      for (const mediaId of operation.mediaIds) {
        try {
          switch (operation.operation) {
            case 'activate':
              await this.updatePromotionalMedia(mediaId, { 
                isActive: true,
                status: 'active',
                lastModifiedBy: 'system'
              });
              updated++;
              break;
            case 'deactivate':
              await this.updatePromotionalMedia(mediaId, { 
                isActive: false,
                status: 'paused',
                lastModifiedBy: 'system'
              });
              updated++;
              break;
            case 'archive':
              await this.archivePromotionalMedia(mediaId);
              updated++;
              break;
            case 'delete':
              const deleteResult = await this.deletePromotionalMedia(mediaId);
              if (deleteResult.success) {
                updated++;
              } else {
                errors.push(`Failed to delete media ${mediaId}: ${deleteResult.message}`);
              }
              break;
            case 'update_priority':
              if (operation.data?.priority !== undefined) {
                await this.updatePromotionalMedia(mediaId, { 
                  priority: operation.data.priority,
                  lastModifiedBy: 'system'
                });
                updated++;
              }
              break;
          }
        } catch (error) {
          errors.push(`Failed to update media ${mediaId}: ${error}`);
        }
      }

      console.log(`✅ storage.bulkOperatePromotionalMedia: Updated ${updated} items with ${errors.length} errors`);
      return {
        success: errors.length === 0,
        updated,
        errors,
      };
    } catch (error) {
      console.error('❌ storage.bulkOperatePromotionalMedia: Error:', error);
      return { success: false, updated: 0, errors: ['Bulk operation failed'] };
    }
  }

  async bulkActivateMedia(mediaIds: string[]): Promise<{ success: boolean; activated: number; errors: string[] }> {
    const result = await this.bulkOperatePromotionalMedia({
      operation: 'activate',
      mediaIds,
    });
    
    return {
      success: result.success,
      activated: result.updated,
      errors: result.errors,
    };
  }

  async bulkDeactivateMedia(mediaIds: string[]): Promise<{ success: boolean; deactivated: number; errors: string[] }> {
    const result = await this.bulkOperatePromotionalMedia({
      operation: 'deactivate',
      mediaIds,
    });
    
    return {
      success: result.success,
      deactivated: result.updated,
      errors: result.errors,
    };
  }

  async bulkArchiveMedia(mediaIds: string[]): Promise<{ success: boolean; archived: number; errors: string[] }> {
    const result = await this.bulkOperatePromotionalMedia({
      operation: 'archive',
      mediaIds,
    });
    
    return {
      success: result.success,
      archived: result.updated,
      errors: result.errors,
    };
  }

  // Analytics and statistics
  async getPromotionalMediaStatistics(filters?: PromotionalMediaStatisticsData): Promise<{
    totalMedia: number;
    activeMedia: number;
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    topPerformingMedia: Array<{
      id: string;
      title: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    performanceByType: Array<{
      mediaType: string;
      count: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    performanceByPlacement: Array<{
      placement: string;
      count: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    timeSeriesData: Array<{
      date: string;
      impressions: number;
      clicks: number;
      uniqueViews: number;
    }>;
  }> {
    try {
      console.log('📊 storage.getPromotionalMediaStatistics: Calculating statistics');
      
      // Basic counts
      const [totalResult] = await db.select({ count: count() }).from(promotionalMedia);
      const totalMedia = totalResult.count;

      const [activeResult] = await db.select({ count: count() })
        .from(promotionalMedia)
        .where(and(eq(promotionalMedia.isActive, true), eq(promotionalMedia.status, 'active')));
      const activeMedia = activeResult.count;

      // Get media with basic stats
      const mediaStats = await db.select({
        id: promotionalMedia.id,
        title: promotionalMedia.title,
        mediaType: promotionalMedia.mediaType,
        placement: promotionalMedia.placement,
        impressions: promotionalMedia.impressions,
        clicks: promotionalMedia.clicks,
      }).from(promotionalMedia);

      const totalImpressions = mediaStats.reduce((sum, item) => sum + (item.impressions || 0), 0);
      const totalClicks = mediaStats.reduce((sum, item) => sum + (item.clicks || 0), 0);
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Top performing media
      const topPerformingMedia = mediaStats
        .map(item => ({
          id: item.id,
          title: item.title,
          impressions: item.impressions || 0,
          clicks: item.clicks || 0,
          ctr: (item.impressions || 0) > 0 ? ((item.clicks || 0) / (item.impressions || 0)) * 100 : 0
        }))
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 10);

      // Performance by type
      const typeStats = new Map<string, { count: number; impressions: number; clicks: number }>();
      mediaStats.forEach(item => {
        const existing = typeStats.get(item.mediaType) || { count: 0, impressions: 0, clicks: 0 };
        typeStats.set(item.mediaType, {
          count: existing.count + 1,
          impressions: existing.impressions + (item.impressions || 0),
          clicks: existing.clicks + (item.clicks || 0)
        });
      });

      const performanceByType = Array.from(typeStats.entries()).map(([mediaType, stats]) => ({
        mediaType,
        count: stats.count,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }));

      // Performance by placement
      const placementStats = new Map<string, { count: number; impressions: number; clicks: number }>();
      mediaStats.forEach(item => {
        const existing = placementStats.get(item.placement) || { count: 0, impressions: 0, clicks: 0 };
        placementStats.set(item.placement, {
          count: existing.count + 1,
          impressions: existing.impressions + (item.impressions || 0),
          clicks: existing.clicks + (item.clicks || 0)
        });
      });

      const performanceByPlacement = Array.from(placementStats.entries()).map(([placement, stats]) => ({
        placement,
        count: stats.count,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }));

      // Time series data (placeholder - would need more complex query)
      const timeSeriesData: Array<{
        date: string;
        impressions: number;
        clicks: number;
        uniqueViews: number;
      }> = [];

      console.log(`✅ storage.getPromotionalMediaStatistics: Calculated stats for ${totalMedia} media items`);
      
      return {
        totalMedia,
        activeMedia,
        totalImpressions,
        totalClicks,
        averageCTR,
        topPerformingMedia,
        performanceByType,
        performanceByPlacement,
        timeSeriesData,
      };
    } catch (error) {
      console.error('❌ storage.getPromotionalMediaStatistics: Error:', error);
      throw error;
    }
  }

  async getMediaPerformanceReport(mediaId: string, dateRange?: { from: string; to: string }): Promise<{
    media: PromotionalMedia;
    totalImpressions: number;
    totalClicks: number;
    uniqueViews: number;
    averageCTR: number;
    averageViewDuration: number;
    deviceBreakdown: Array<{ deviceType: string; count: number; percentage: number }>;
    timeSeriesData: Array<{
      date: string;
      impressions: number;
      clicks: number;
      viewDuration: number;
    }>;
  }> {
    try {
      console.log(`📈 storage.getMediaPerformanceReport: Generating report for media ${mediaId}`);
      
      // Get media details
      const media = await this.getPromotionalMediaItem(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      // Get analytics data
      let analyticsQuery = db.select().from(promotionalMediaAnalytics)
        .where(eq(promotionalMediaAnalytics.mediaId, mediaId));

      if (dateRange) {
        analyticsQuery = analyticsQuery.where(
          and(
            eq(promotionalMediaAnalytics.mediaId, mediaId),
            gte(promotionalMediaAnalytics.createdAt, new Date(dateRange.from)),
            lte(promotionalMediaAnalytics.createdAt, new Date(dateRange.to))
          )
        );
      }

      const analytics = await analyticsQuery;

      // Calculate metrics
      const impressions = analytics.filter(a => a.eventType === 'impression');
      const clicks = analytics.filter(a => a.eventType === 'click');
      const uniqueViews = new Set(analytics.map(a => a.sessionId || a.userId).filter(Boolean)).size;
      
      const totalImpressions = impressions.length;
      const totalClicks = clicks.length;
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      
      const viewDurations = analytics
        .filter(a => a.viewDuration !== null && a.viewDuration !== undefined)
        .map(a => a.viewDuration || 0);
      const averageViewDuration = viewDurations.length > 0 
        ? viewDurations.reduce((sum, duration) => sum + duration, 0) / viewDurations.length 
        : 0;

      // Device breakdown
      const deviceStats = new Map<string, number>();
      analytics.forEach(a => {
        if (a.deviceType) {
          deviceStats.set(a.deviceType, (deviceStats.get(a.deviceType) || 0) + 1);
        }
      });

      const totalEvents = analytics.length;
      const deviceBreakdown = Array.from(deviceStats.entries()).map(([deviceType, count]) => ({
        deviceType,
        count,
        percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0
      }));

      // Time series data (simplified)
      const timeSeriesData: Array<{
        date: string;
        impressions: number;
        clicks: number;
        viewDuration: number;
      }> = [];

      console.log(`✅ storage.getMediaPerformanceReport: Generated report for media ${mediaId}`);
      
      return {
        media,
        totalImpressions,
        totalClicks,
        uniqueViews,
        averageCTR,
        averageViewDuration,
        deviceBreakdown,
        timeSeriesData,
      };
    } catch (error) {
      console.error('❌ storage.getMediaPerformanceReport: Error:', error);
      throw error;
    }
  }

  // Moderation and approval
  async updateModerationStatus(mediaId: string, status: string, notes?: string): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`🛡️ storage.updateModerationStatus: Updating moderation status for ${mediaId} to ${status}`);
      
      const result = await db.update(promotionalMedia)
        .set({ 
          moderationStatus: status,
          moderationNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(promotionalMedia.id, mediaId))
        .returning();
      
      console.log(`✅ storage.updateModerationStatus: Updated ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.updateModerationStatus: Error:', error);
      throw error;
    }
  }

  async getMediaForModeration(limit?: number): Promise<PromotionalMedia[]> {
    try {
      const media = await db.select()
        .from(promotionalMedia)
        .where(eq(promotionalMedia.moderationStatus, 'pending'))
        .orderBy(asc(promotionalMedia.createdAt))
        .limit(limit || 20);
      
      return media;
    } catch (error) {
      console.error('❌ storage.getMediaForModeration: Error:', error);
      throw error;
    }
  }

  async approveMedia(mediaId: string, approvedBy: string): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`✅ storage.approveMedia: Approving media ${mediaId} by ${approvedBy}`);
      
      const result = await db.update(promotionalMedia)
        .set({ 
          moderationStatus: 'approved',
          status: 'active',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(promotionalMedia.id, mediaId))
        .returning();
      
      console.log(`✅ storage.approveMedia: Approved ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.approveMedia: Error:', error);
      throw error;
    }
  }

  async rejectMedia(mediaId: string, rejectionNotes: string, rejectedBy: string): Promise<PromotionalMedia | undefined> {
    try {
      console.log(`❌ storage.rejectMedia: Rejecting media ${mediaId} by ${rejectedBy}`);
      
      const result = await db.update(promotionalMedia)
        .set({ 
          moderationStatus: 'rejected',
          status: 'draft',
          moderationNotes: rejectionNotes,
          lastModifiedBy: rejectedBy,
          updatedAt: new Date()
        })
        .where(eq(promotionalMedia.id, mediaId))
        .returning();
      
      console.log(`✅ storage.rejectMedia: Rejected ${result.length} items`);
      return result[0];
    } catch (error) {
      console.error('❌ storage.rejectMedia: Error:', error);
      throw error;
    }
  }

  // Scheduling and automation
  async getScheduledMedia(dateRange?: { from: string; to: string }): Promise<PromotionalMedia[]> {
    try {
      let conditions: SQL[] = [eq(promotionalMedia.isScheduled, true)];
      
      if (dateRange) {
        conditions.push(
          and(
            gte(promotionalMedia.startDate, new Date(dateRange.from)),
            lte(promotionalMedia.endDate, new Date(dateRange.to))
          )
        );
      }

      const media = await db.select()
        .from(promotionalMedia)
        .where(combineConditions(conditions))
        .orderBy(asc(promotionalMedia.startDate));
      
      return media;
    } catch (error) {
      console.error('❌ storage.getScheduledMedia: Error:', error);
      throw error;
    }
  }

  async activateScheduledMedia(): Promise<{ activated: number; deactivated: number }> {
    try {
      console.log('⏰ storage.activateScheduledMedia: Processing scheduled media');
      
      const now = new Date();
      let activated = 0;
      let deactivated = 0;

      // Activate media that should start now
      const toActivate = await db.select()
        .from(promotionalMedia)
        .where(
          and(
            eq(promotionalMedia.isScheduled, true),
            eq(promotionalMedia.status, 'draft'),
            lte(promotionalMedia.startDate, now),
            or(
              sql`${promotionalMedia.endDate} IS NULL`,
              gte(promotionalMedia.endDate, now)
            )
          )
        );

      for (const media of toActivate) {
        await this.updatePromotionalMedia(media.id, {
          status: 'active',
          isActive: true,
          lastModifiedBy: 'system'
        });
        activated++;
      }

      // Deactivate media that should end now
      const toDeactivate = await db.select()
        .from(promotionalMedia)
        .where(
          and(
            eq(promotionalMedia.isScheduled, true),
            eq(promotionalMedia.status, 'active'),
            lte(promotionalMedia.endDate, now)
          )
        );

      for (const media of toDeactivate) {
        await this.updatePromotionalMedia(media.id, {
          status: 'expired',
          isActive: false,
          lastModifiedBy: 'system'
        });
        deactivated++;
      }

      console.log(`✅ storage.activateScheduledMedia: Activated ${activated}, deactivated ${deactivated}`);
      return { activated, deactivated };
    } catch (error) {
      console.error('❌ storage.activateScheduledMedia: Error:', error);
      return { activated: 0, deactivated: 0 };
    }
  }

  async expireOutdatedMedia(): Promise<{ expired: number; archived: number }> {
    try {
      console.log('🕰️ storage.expireOutdatedMedia: Processing outdated media');
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      let expired = 0;
      let archived = 0;

      // Expire active media that has passed end date
      const toExpire = await db.select()
        .from(promotionalMedia)
        .where(
          and(
            eq(promotionalMedia.status, 'active'),
            lte(promotionalMedia.endDate, now)
          )
        );

      for (const media of toExpire) {
        await this.updatePromotionalMedia(media.id, {
          status: 'expired',
          isActive: false,
          lastModifiedBy: 'system'
        });
        expired++;
      }

      // Archive very old expired media
      const toArchive = await db.select()
        .from(promotionalMedia)
        .where(
          and(
            eq(promotionalMedia.status, 'expired'),
            lte(promotionalMedia.updatedAt, thirtyDaysAgo)
          )
        );

      for (const media of toArchive) {
        await this.archivePromotionalMedia(media.id);
        archived++;
      }

      console.log(`✅ storage.expireOutdatedMedia: Expired ${expired}, archived ${archived}`);
      return { expired, archived };
    } catch (error) {
      console.error('❌ storage.expireOutdatedMedia: Error:', error);
      return { expired: 0, archived: 0 };
    }
  }

  // Campaign management
  async getMediaByCampaign(campaignId: string, activeOnly?: boolean): Promise<PromotionalMedia[]> {
    try {
      let conditions: SQL[] = [eq(promotionalMedia.campaignId, campaignId)];
      
      if (activeOnly) {
        conditions.push(
          and(
            eq(promotionalMedia.isActive, true),
            eq(promotionalMedia.status, 'active')
          )
        );
      }

      const media = await db.select()
        .from(promotionalMedia)
        .where(combineConditions(conditions))
        .orderBy(asc(promotionalMedia.displayOrder));
      
      return media;
    } catch (error) {
      console.error('❌ storage.getMediaByCampaign: Error:', error);
      throw error;
    }
  }

  async getCampaignStatistics(campaignId: string): Promise<{
    totalMedia: number;
    activeMedia: number;
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    campaignPeriod: { startDate: string; endDate: string };
  }> {
    try {
      const campaignMedia = await this.getMediaByCampaign(campaignId);
      
      const totalMedia = campaignMedia.length;
      const activeMedia = campaignMedia.filter(m => m.isActive && m.status === 'active').length;
      const totalImpressions = campaignMedia.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = campaignMedia.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Calculate campaign period
      const startDates = campaignMedia.map(m => m.startDate).filter(Boolean) as Date[];
      const endDates = campaignMedia.map(m => m.endDate).filter(Boolean) as Date[];
      
      const campaignPeriod = {
        startDate: startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))).toISOString() : '',
        endDate: endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))).toISOString() : ''
      };

      return {
        totalMedia,
        activeMedia,
        totalImpressions,
        totalClicks,
        averageCTR,
        campaignPeriod,
      };
    } catch (error) {
      console.error('❌ storage.getCampaignStatistics: Error:', error);
      throw error;
    }
  }

  // Targeting and personalization
  async checkMediaTargeting(mediaId: string, userContext: {
    userId?: string;
    userRole?: string;
    orderCount?: number;
    location?: { country?: string; state?: string; city?: string };
  }): Promise<{ eligible: boolean; reasons: string[] }> {
    try {
      const media = await this.getPromotionalMediaItem(mediaId);
      if (!media) {
        return { eligible: false, reasons: ['Media not found'] };
      }

      const reasons: string[] = [];

      // Check basic eligibility
      if (!media.isActive) {
        reasons.push('Media is not active');
      }

      if (media.status !== 'active') {
        reasons.push(`Media status is ${media.status}`);
      }

      if (media.moderationStatus !== 'approved') {
        reasons.push('Media is not approved');
      }

      // Check targeting rules
      const targetAudience = media.targetAudience as any;
      
      if (targetAudience?.userRoles && userContext.userRole) {
        if (!targetAudience.userRoles.includes(userContext.userRole)) {
          reasons.push(`User role ${userContext.userRole} not in target audience`);
        }
      }

      if (targetAudience?.minimumOrderCount && userContext.orderCount !== undefined) {
        if (userContext.orderCount < targetAudience.minimumOrderCount) {
          reasons.push(`User order count ${userContext.orderCount} below minimum ${targetAudience.minimumOrderCount}`);
        }
      }

      if (targetAudience?.excludeUserIds && userContext.userId) {
        if (targetAudience.excludeUserIds.includes(userContext.userId)) {
          reasons.push('User is excluded from target audience');
        }
      }

      // Check geographic targeting
      const geoTargeting = media.geographicTargeting as any;
      
      if (geoTargeting?.countries && userContext.location?.country) {
        if (!geoTargeting.countries.includes(userContext.location.country)) {
          reasons.push(`Country ${userContext.location.country} not in target countries`);
        }
      }

      return { eligible: reasons.length === 0, reasons };
    } catch (error) {
      console.error('❌ storage.checkMediaTargeting: Error:', error);
      return { eligible: false, reasons: ['Targeting check failed'] };
    }
  }

  async getPersonalizedMedia(userId: string, placement?: string): Promise<PromotionalMedia[]> {
    return this.getTargetedMediaForUser(userId, placement);
  }

  // Cache and performance optimization
  async updateMediaMetrics(mediaId: string, metrics: {
    impressions?: number;
    clicks?: number;
    uniqueViews?: number;
    avgViewDuration?: number;
    lastDisplayed?: Date;
  }): Promise<void> {
    try {
      const updateData: any = { updatedAt: new Date() };
      
      if (metrics.impressions !== undefined) {
        updateData.impressions = sql`${promotionalMedia.impressions} + ${metrics.impressions}`;
      }
      
      if (metrics.clicks !== undefined) {
        updateData.clicks = sql`${promotionalMedia.clicks} + ${metrics.clicks}`;
      }
      
      if (metrics.uniqueViews !== undefined) {
        updateData.uniqueViews = sql`${promotionalMedia.uniqueViews} + ${metrics.uniqueViews}`;
      }
      
      if (metrics.avgViewDuration !== undefined) {
        updateData.avgViewDuration = metrics.avgViewDuration;
      }
      
      if (metrics.lastDisplayed) {
        updateData.lastDisplayed = metrics.lastDisplayed;
      }

      await db.update(promotionalMedia)
        .set(updateData)
        .where(eq(promotionalMedia.id, mediaId));
    } catch (error) {
      console.error('❌ storage.updateMediaMetrics: Error:', error);
      // Don't throw error for metrics updates
    }
  }

  async getMediaCacheStatus(mediaId: string): Promise<{
    cached: boolean;
    cacheExpiry: Date;
    loadTime: number;
  }> {
    // Placeholder implementation
    return {
      cached: true,
      cacheExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      loadTime: 0
    };
  }

  // Content management
  async duplicateMedia(mediaId: string, modifications?: Partial<PromotionalMediaCreateData>): Promise<PromotionalMedia> {
    try {
      console.log(`📋 storage.duplicateMedia: Duplicating media ${mediaId}`);
      
      const originalMedia = await this.getPromotionalMediaItem(mediaId);
      if (!originalMedia) {
        throw new Error('Original media not found');
      }

      const newMediaData: PromotionalMediaCreateData & { createdBy: string } = {
        ...originalMedia,
        id: undefined as any,
        title: `${originalMedia.title} (Copy)`,
        status: 'draft',
        moderationStatus: 'pending',
        isActive: false,
        impressions: 0,
        clicks: 0,
        uniqueViews: 0,
        conversionRate: 0,
        avgViewDuration: 0,
        lastDisplayed: undefined,
        loadTime: 0,
        errorRate: 0,
        bounceRate: 0,
        approvedBy: undefined,
        approvedAt: undefined,
        archivedAt: undefined,
        changeHistory: [],
        createdAt: undefined,
        updatedAt: undefined,
        createdBy: originalMedia.createdBy,
        ...modifications,
      };

      return await this.createPromotionalMedia(newMediaData);
    } catch (error) {
      console.error(`❌ storage.duplicateMedia: Error duplicating media ${mediaId}:`, error);
      throw error;
    }
  }

  async generateMediaPreview(mediaId: string): Promise<{ thumbnailUrl: string; previewUrl: string }> {
    try {
      const media = await this.getPromotionalMediaItem(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      // For now, return the existing URLs
      // In a real implementation, this would generate optimized previews
      return {
        thumbnailUrl: media.thumbnailUrl || media.mediaUrl,
        previewUrl: media.mediaUrl
      };
    } catch (error) {
      console.error('❌ storage.generateMediaPreview: Error:', error);
      throw error;
    }
  }

}

export const storage = new PostgresStorage();