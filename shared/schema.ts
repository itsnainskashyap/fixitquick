import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  decimal, 
  boolean, 
  jsonb,
  index,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["user", "service_provider", "parts_provider", "admin"] }).default("user"),
  isVerified: boolean("is_verified").default(false),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  fixiPoints: integer("fixi_points").default(0),
  location: jsonb("location").$type<{
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    pincode: string;
  }>(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP challenges for SMS authentication
export const otpChallenges = pgTable("otp_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").notNull(),
  codeHash: varchar("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0),
  lastSentAt: timestamp("last_sent_at").defaultNow(),
  resendCount: integer("resend_count").default(0),
  ip: varchar("ip"),
  userAgent: varchar("user_agent"),
  status: varchar("status", { enum: ["sent", "verified", "expired"] }).default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  phoneIdx: index("otp_phone_idx").on(table.phone),
  statusIdx: index("otp_status_idx").on(table.status),
  expiresIdx: index("otp_expires_idx").on(table.expiresAt),
}));

// User sessions for JWT refresh token management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(), // SECURITY FIX: Store sessionId for proper token rotation
  userId: varchar("user_id").references(() => users.id).notNull(),
  refreshTokenHash: varchar("refresh_token_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  ip: varchar("ip"),
  userAgent: varchar("user_agent"),
}, (table) => ({
  userIdIdx: index("session_user_id_idx").on(table.userId),
  expiresIdx: index("session_expires_idx").on(table.expiresAt),
  tokenIdx: index("session_token_idx").on(table.refreshTokenHash),
  sessionIdIdx: index("session_session_id_idx").on(table.sessionId), // SECURITY FIX: Index for sessionId lookups
}));

// Service categories
export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  icon: text("icon"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sub-services within categories
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  name: varchar("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  estimatedDuration: integer("estimated_duration"), // in minutes
  icon: text("icon"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalBookings: integer("total_bookings").default(0),
  isActive: boolean("is_active").default(true),
  requirements: jsonb("requirements").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service providers and their offered services
export const serviceProviders = pgTable("service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  isVerified: boolean("is_verified").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalCompletedOrders: integer("total_completed_orders").default(0),
  availability: jsonb("availability").$type<{
    [key: string]: { start: string; end: string; available: boolean }[];
  }>(),
  serviceArea: jsonb("service_area").$type<{
    cities: string[];
    maxDistance: number;
  }>(),
  documents: jsonb("documents").$type<{
    aadhar: string;
    photo: string;
    certificates?: string[];
  }>(),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parts categories
export const partsCategories = pgTable("parts_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  icon: text("icon"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parts inventory
export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => partsCategories.id),
  providerId: varchar("provider_id").references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  images: jsonb("images").$type<string[]>(),
  specifications: jsonb("specifications").$type<Record<string, any>>(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalSold: integer("total_sold").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders for services and parts
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["service", "parts"] }).notNull(),
  status: varchar("status", { 
    enum: ["pending", "accepted", "in_progress", "completed", "cancelled", "refunded"] 
  }).default("pending"),
  items: jsonb("items").$type<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: "service" | "part";
  }[]>(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  serviceProviderId: varchar("service_provider_id").references(() => users.id),
  partsProviderId: varchar("parts_provider_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  location: jsonb("location").$type<{
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
  }>(),
  paymentMethod: varchar("payment_method", { enum: ["online", "cod", "wallet"] }),
  paymentStatus: varchar("payment_status", { enum: ["pending", "paid", "failed", "refunded"] }).default("pending"),
  razorpayOrderId: varchar("razorpay_order_id"),
  notes: text("notes"),
  rating: integer("rating"),
  review: text("review"),
  photos: jsonb("photos").$type<{
    before?: string[];
    after?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["credit", "debit"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: varchar("category", { enum: ["topup", "payment", "refund", "withdrawal", "commission", "redemption", "penalty", "bonus"] }).default("payment"),
  orderId: varchar("order_id").references(() => orders.id),
  reference: varchar("reference"), // External payment ID, transfer reference, etc.
  paymentMethod: varchar("payment_method", { enum: ["card", "upi", "netbanking", "wallet", "cash", "mock"] }),
  status: varchar("status", { enum: ["pending", "completed", "failed", "cancelled"] }).default("completed"),
  metadata: jsonb("metadata").$type<{
    paymentGateway?: string;
    gatewayTransactionId?: string;
    failureReason?: string;
    refundReason?: string;
    commissionRate?: number;
    bonusType?: string;
    notes?: string;
  }>(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Coupons and promotions
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  type: varchar("type", { enum: ["percentage", "fixed"] }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  senderId: varchar("sender_id").references(() => users.id),
  receiverId: varchar("receiver_id").references(() => users.id),
  message: text("message").notNull(),
  messageType: varchar("message_type", { enum: ["text", "image", "location"] }).default("text"),
  attachments: jsonb("attachments").$type<string[]>(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  type: varchar("type", { enum: ["order", "payment", "promotion", "system"] }).notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  isRead: boolean("is_read").default(false),
  fcmToken: varchar("fcm_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  revieweeId: varchar("reviewee_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  photos: jsonb("photos").$type<string[]>(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User addresses for multiple delivery locations
export const userAddresses = pgTable("user_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { enum: ["home", "work", "other"] }).default("home"),
  title: varchar("title"), // "Home", "Office", "John's Place"
  fullName: varchar("full_name").notNull(),
  phone: varchar("phone"),
  addressLine1: varchar("address_line1").notNull(),
  addressLine2: varchar("address_line2"),
  landmark: varchar("landmark"),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  pincode: varchar("pincode").notNull(),
  country: varchar("country").default("India"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isDefault: boolean("is_default").default(false),
  instructions: text("instructions"), // Special delivery instructions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ua_user_id_idx").on(table.userId),
  defaultIdx: index("ua_default_idx").on(table.userId, table.isDefault),
  pincodeIdx: index("ua_pincode_idx").on(table.pincode),
}));

// User notification preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  
  // Channel preferences
  pushNotifications: boolean("push_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  whatsappNotifications: boolean("whatsapp_notifications").default(true),
  
  // Category preferences
  orderUpdates: boolean("order_updates").default(true),
  promotions: boolean("promotions").default(true),
  serviceReminders: boolean("service_reminders").default(true),
  paymentAlerts: boolean("payment_alerts").default(true),
  securityAlerts: boolean("security_alerts").default(true),
  newsAndUpdates: boolean("news_and_updates").default(false),
  
  // Timing preferences
  quietHoursStart: varchar("quiet_hours_start"), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end"), // "07:00"
  timezone: varchar("timezone").default("Asia/Kolkata"),
  
  // Sound preferences
  soundEnabled: boolean("sound_enabled").default(true),
  vibrationEnabled: boolean("vibration_enabled").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("unp_user_id_idx").on(table.userId),
}));

// User locale and region preferences for language/region switching
export const userLocalePreferences = pgTable("user_locale_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  
  // Language preferences
  language: varchar("language", { 
    enum: ["hi", "en", "mr", "bn", "ta", "te", "gu", "kn", "ml", "or", "pa", "ur"] 
  }).default("en"), // hi=Hindi, en=English, mr=Marathi, bn=Bengali, ta=Tamil, etc.
  fallbackLanguage: varchar("fallback_language").default("en"),
  
  // Region and location preferences
  country: varchar("country").default("IN"), // ISO country code (IN for India)
  state: varchar("state"), // Indian states: "Delhi", "Maharashtra", "Karnataka", etc.
  city: varchar("city"), // Major cities: "New Delhi", "Mumbai", "Bangalore", etc.
  region: varchar("region"), // Geographic regions: "North India", "South India", "West India", etc.
  
  // Service area preferences
  serviceRadius: integer("service_radius").default(25), // km radius for service availability
  preferredServiceAreas: jsonb("preferred_service_areas").$type<string[]>(), // ["Indiranagar", "Koramangala"]
  
  // Locale formatting preferences
  dateFormat: varchar("date_format").default("DD/MM/YYYY"), // Indian date format
  timeFormat: varchar("time_format").default("24h"), // 12h or 24h
  numberFormat: varchar("number_format").default("indian"), // "indian" (lakhs/crores) or "international"
  currencyCode: varchar("currency_code").default("INR"), // INR, USD, etc.
  currencyFormat: varchar("currency_format").default("symbol"), // "symbol" (₹), "code" (INR)
  
  // Cultural preferences
  calendar: varchar("calendar").default("gregorian"), // "gregorian", "hindi", "regional"
  weekStartsOn: integer("week_starts_on").default(1), // 0=Sunday, 1=Monday (India typically starts Monday)
  festivals: jsonb("festivals").$type<string[]>(), // ["Diwali", "Holi", "Eid", "Christmas"]
  
  // Content preferences
  contentPreference: varchar("content_preference").default("local"), // "local", "national", "international"
  showLocalProviders: boolean("show_local_providers").default(true),
  showRegionalOffers: boolean("show_regional_offers").default(true),
  
  // Auto-detection settings
  autoDetectLocation: boolean("auto_detect_location").default(true),
  autoDetectLanguage: boolean("auto_detect_language").default(false), // Manual override for language
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ulp_user_id_idx").on(table.userId),
  languageIdx: index("ulp_language_idx").on(table.language),
  regionIdx: index("ulp_region_idx").on(table.country, table.state, table.city),
  serviceAreaIdx: index("ulp_service_area_idx").on(table.serviceRadius),
}));

// Indian states and cities reference data
export const indianRegions = pgTable("indian_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: varchar("state").notNull(),
  stateCode: varchar("state_code").notNull(), // "DL", "MH", "KA", etc.
  city: varchar("city").notNull(),
  cityType: varchar("city_type", { enum: ["metro", "tier1", "tier2", "tier3"] }).default("tier2"),
  region: varchar("region"), // "North", "South", "West", "East", "Central", "Northeast"
  
  // Service availability
  isServiceAvailable: boolean("is_service_available").default(false),
  isPartsAvailable: boolean("is_parts_available").default(false),
  
  // Geographic data
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  pincode: varchar("pincode"),
  
  // Localization data
  displayNameHi: varchar("display_name_hi"), // Hindi name of the city
  displayNameLocal: varchar("display_name_local"), // Local language name
  
  // Service metadata
  averageServiceTime: integer("average_service_time"), // minutes
  serviceCoverage: decimal("service_coverage", { precision: 5, scale: 2 }), // percentage
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  stateIdx: index("ir_state_idx").on(table.state),
  cityIdx: index("ir_city_idx").on(table.city),
  serviceIdx: index("ir_service_idx").on(table.isServiceAvailable, table.isPartsAvailable),
  regionIdx: index("ir_region_idx").on(table.region),
  pincodeIdx: index("ir_pincode_idx").on(table.pincode),
}));

// App settings and configuration
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(),
  value: jsonb("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User payment methods
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
  type: varchar("type", { enum: ["card", "upi", "netbanking", "wallet"] }).notNull(),
  
  // Card details (if type is card)
  cardBrand: varchar("card_brand"), // visa, mastercard, amex, etc.
  cardLast4: varchar("card_last4"),
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardCountry: varchar("card_country"),
  
  // UPI details (if type is upi)
  upiId: varchar("upi_id"),
  
  // Bank details (if type is netbanking)
  bankName: varchar("bank_name"),
  
  // Common fields
  nickname: varchar("nickname"), // "Personal Visa", "Work Card", etc.
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Security and metadata
  fingerprint: varchar("fingerprint"), // Stripe fingerprint for duplicate detection
  billingAddress: jsonb("billing_address").$type<{
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
}, (table) => ({
  userIdIdx: index("pm_user_id_idx").on(table.userId),
  stripeIdIdx: index("pm_stripe_id_idx").on(table.stripePaymentMethodId),
  typeIdx: index("pm_type_idx").on(table.type),
  defaultIdx: index("pm_default_idx").on(table.userId, table.isDefault),
}));

// Stripe customers table for storing Stripe customer data
export const stripeCustomers = pgTable("stripe_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id").notNull().unique(),
  
  // Customer details synced from Stripe
  email: varchar("email"),
  name: varchar("name"),
  phone: varchar("phone"),
  
  // Default payment method
  defaultPaymentMethodId: varchar("default_payment_method_id"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("sc_user_id_idx").on(table.userId),
  stripeIdIdx: index("sc_stripe_id_idx").on(table.stripeCustomerId),
}));

// Payment intents tracking
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  
  // Payment details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("inr").notNull(),
  status: varchar("status", { 
    enum: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"]
  }).notNull(),
  
  // Payment method details
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  paymentMethodType: varchar("payment_method_type"),
  
  // Transaction details
  description: text("description"),
  receiptEmail: varchar("receipt_email"),
  
  // Stripe specific data
  clientSecret: varchar("client_secret"),
  cancelReason: varchar("cancel_reason"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  canceledAt: timestamp("canceled_at"),
}, (table) => ({
  stripeIdIdx: index("pi_stripe_id_idx").on(table.stripePaymentIntentId),
  userIdIdx: index("pi_user_id_idx").on(table.userId),
  orderIdIdx: index("pi_order_id_idx").on(table.orderId),
  statusIdx: index("pi_status_idx").on(table.status),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true, createdAt: true });
export const insertOtpChallengeSchema = createInsertSchema(otpChallenges).omit({ id: true, createdAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStripeCustomerSchema = createInsertSchema(stripeCustomers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentIntentSchema = createInsertSchema(paymentIntents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserLocalePreferencesSchema = createInsertSchema(userLocalePreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIndianRegionSchema = createInsertSchema(indianRegions).omit({ id: true, createdAt: true, updatedAt: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type PartsCategory = typeof partsCategories.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type InsertOtpChallenge = z.infer<typeof insertOtpChallengeSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type InsertStripeCustomer = z.infer<typeof insertStripeCustomerSchema>;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UserLocalePreferences = typeof userLocalePreferences.$inferSelect;
export type InsertUserLocalePreferences = z.infer<typeof insertUserLocalePreferencesSchema>;
export type IndianRegion = typeof indianRegions.$inferSelect;
export type InsertIndianRegion = z.infer<typeof insertIndianRegionSchema>;
