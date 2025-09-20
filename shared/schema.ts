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

// Service Provider verification status (main table)
export const ServiceProviderVerificationStatus = z.enum([
  'pending', 
  'under_review', 
  'approved', 
  'rejected', 
  'suspended', 
  'resubmission_required'
]);
export type ServiceProviderVerificationStatusType = z.infer<typeof ServiceProviderVerificationStatus>;

// Document type schemas with proper validation
export const DocumentSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString()),
  verified: z.boolean().optional().default(false)
});

export const DocumentsSchema = z.object({
  businessLicense: DocumentSchema.optional(),
  idProof: DocumentSchema.optional(),
  certifications: z.array(DocumentSchema.extend({
    title: z.string().min(1)
  })).optional().default([]),
  aadhar: z.object({
    front: z.string().url().optional(),
    back: z.string().url().optional(),
    uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString()).optional(),
    verified: z.boolean().optional().default(false)
  }).optional(),
  photo: z.object({
    url: z.string().url().optional(),
    uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString()).optional(),
    verified: z.boolean().optional().default(false)
  }).optional(),
  licenses: z.array(z.object({
    url: z.string().url(),
    name: z.string().min(1),
    type: z.string().min(1),
    licenseNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString()),
    verified: z.boolean().optional().default(false)
  })).optional().default([]),
  insurance: z.object({
    url: z.string().url().optional(),
    policyNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString()).optional(),
    verified: z.boolean().optional().default(false)
  }).optional(),
  portfolio: z.array(z.object({
    url: z.string().url(),
    caption: z.string(),
    uploadedAt: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? val : val.toISOString())
  })).optional().default([])
});
export type DocumentsType = z.infer<typeof DocumentsSchema>;

// Status transition validation schema
export const StatusTransitionSchema = z.object({
  fromStatus: ServiceProviderVerificationStatus,
  toStatus: ServiceProviderVerificationStatus,
  reason: z.string().optional(),
  verifiedBy: z.string().optional()
});
export type StatusTransition = z.infer<typeof StatusTransitionSchema>;

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

// Service categories - Simplified to 2-level structure
export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"), // null for main categories (level 0), set for sub categories (level 1)
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  icon: text("icon"),
  imageUrl: text("image_url"), // Category image for better visual representation
  description: text("description"),
  level: integer("level").default(0), // 0=main category (Electrician), 1=sub category (Fan, Bulb)
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  serviceCount: integer("service_count").default(0), // Cache field for performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  parentIdx: index("sc_parent_idx").on(table.parentId),
  levelIdx: index("sc_level_idx").on(table.level),
  slugIdx: index("sc_slug_idx").on(table.slug),
  activeIdx: index("sc_active_idx").on(table.isActive),
}));

// Parts provider business information
export const partsProviderBusinessInfo = pgTable("parts_provider_business_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Business Details
  businessName: varchar("business_name").notNull(),
  businessType: varchar("business_type", { 
    enum: ["individual", "partnership", "private_limited", "public_limited", "llp"] 
  }).notNull(),
  businessAddress: jsonb("business_address").$type<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>(),
  
  // Tax and Legal
  gstNumber: varchar("gst_number"),
  panNumber: varchar("pan_number"),
  businessLicense: varchar("business_license"),
  tradeLicense: varchar("trade_license"),
  fssaiNumber: varchar("fssai_number"), // For food-related parts
  
  // Banking Details
  bankAccountNumber: varchar("bank_account_number"),
  bankName: varchar("bank_name"),
  bankBranch: varchar("bank_branch"),
  ifscCode: varchar("ifsc_code"),
  accountHolderName: varchar("account_holder_name"),
  
  // Business Verification
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status", {
    enum: ["pending", "documents_submitted", "under_review", "approved", "rejected"]
  }).default("pending"),
  verificationDocuments: jsonb("verification_documents").$type<{
    businessLicense?: { url: string; verified: boolean };
    gstCertificate?: { url: string; verified: boolean };
    panCard?: { url: string; verified: boolean };
    bankStatement?: { url: string; verified: boolean };
    tradeLicense?: { url: string; verified: boolean };
    insuranceCertificate?: { url: string; verified: boolean };
  }>(),
  
  // Operational Details
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }).default("0.00"),
  maxOrderValue: decimal("max_order_value", { precision: 10, scale: 2 }),
  processingTime: integer("processing_time").default(24), // in hours
  shippingAreas: jsonb("shipping_areas").$type<string[]>(),
  paymentTerms: varchar("payment_terms", {
    enum: ["immediate", "15_days", "30_days", "45_days"]
  }).default("immediate"),
  
  // Performance Metrics
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0.00"),
  totalOrders: integer("total_orders").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  totalProducts: integer("total_products").default(0),
  
  // Status
  isActive: boolean("is_active").default(true),
  suspensionReason: text("suspension_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("ppbi_user_idx").on(table.userId),
  gstIdx: index("ppbi_gst_idx").on(table.gstNumber),
  statusIdx: index("ppbi_status_idx").on(table.verificationStatus),
}));

// Parts inventory movements and stock history
export const partsInventoryMovements = pgTable("parts_inventory_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partId: varchar("part_id").references(() => parts.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Movement Details
  movementType: varchar("movement_type", {
    enum: ["stock_in", "stock_out", "adjustment", "damaged", "returned", "sold", "reserved", "unreserved"]
  }).notNull(),
  quantity: integer("quantity").notNull(), // Positive for in, negative for out
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  
  // References
  orderId: varchar("order_id").references(() => orders.id),
  supplierId: varchar("supplier_id"), // Reference to supplier if applicable
  
  // Details
  reason: text("reason"),
  notes: text("notes"),
  batchNumber: varchar("batch_number"),
  expiryDate: timestamp("expiry_date"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  partIdx: index("pim_part_idx").on(table.partId),
  providerIdx: index("pim_provider_idx").on(table.providerId),
  typeIdx: index("pim_type_idx").on(table.movementType),
  dateIdx: index("pim_date_idx").on(table.createdAt),
}));

// Parts bulk upload tracking
export const partsBulkUploads = pgTable("parts_bulk_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Upload Details
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"), // in bytes
  totalRows: integer("total_rows").default(0),
  
  // Processing Status
  status: varchar("status", {
    enum: ["uploaded", "processing", "completed", "failed", "partially_completed"]
  }).default("uploaded"),
  
  // Results
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  errors: jsonb("errors").$type<{
    row: number;
    field: string;
    message: string;
  }[]>(),
  
  // Processing Details
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  processingTime: integer("processing_time"), // in seconds
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  providerIdx: index("pbu_provider_idx").on(table.providerId),
  statusIdx: index("pbu_status_idx").on(table.status),
  dateIdx: index("pbu_date_idx").on(table.createdAt),
}));

// Parts suppliers/vendors management
export const partsSuppliers = pgTable("parts_suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Supplier Details
  name: varchar("name").notNull(),
  contactPerson: varchar("contact_person"),
  email: varchar("email"),
  phone: varchar("phone"),
  
  // Address
  address: jsonb("address").$type<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>(),
  
  // Business Details
  gstNumber: varchar("gst_number"),
  panNumber: varchar("pan_number"),
  paymentTerms: varchar("payment_terms"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("0.00"),
  
  // Performance Metrics
  totalOrders: integer("total_orders").default(0),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).default("0.00"),
  averageDeliveryTime: integer("avg_delivery_time").default(0), // in days
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }).default("0.00"),
  
  // Status
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdx: index("ps_provider_idx").on(table.providerId),
  gstIdx: index("ps_gst_idx").on(table.gstNumber),
}));

// Enhanced services with workflow steps and marketplace features
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  name: varchar("name").notNull(),
  slug: varchar("slug"), // nullable initially, will be backfilled
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  estimatedDuration: integer("estimated_duration"), // in minutes
  icon: text("icon"), // Legacy icon field for backward compatibility
  iconType: varchar("icon_type", { enum: ["emoji", "image"] }).default("emoji"),
  iconValue: text("icon_value"), // Stores emoji character or image URL
  images: jsonb("images").$type<string[]>(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalBookings: integer("total_bookings").default(0),
  isActive: boolean("is_active").default(true),
  
  // Enhanced marketplace features - all optional initially
  workflowSteps: jsonb("workflow_steps").$type<{
    step: string;
    description: string;
    estimatedMinutes: number;
  }[]>(),
  requirements: jsonb("requirements").$type<string[]>(),
  skillsRequired: jsonb("skills_required").$type<string[]>(),
  toolsRequired: jsonb("tools_required").$type<string[]>(),
  
  // Booking configuration - optional initially
  allowInstantBooking: boolean("allow_instant_booking").default(true),
  allowScheduledBooking: boolean("allow_scheduled_booking").default(true),
  advanceBookingDays: integer("advance_booking_days").default(7),
  
  // Test service flag - for admin testing and demo purposes
  isTestService: boolean("is_test_service").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("services_category_idx").on(table.categoryId),
  slugIdx: index("services_slug_idx").on(table.slug),
  activeIdx: index("services_active_idx").on(table.isActive),
  testServiceIdx: index("services_test_idx").on(table.isTestService),
}));

// Enhanced service providers with marketplace features
export const serviceProviders = pgTable("service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  // Legacy fields for backward compatibility (deprecated but kept)
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  
  // New optional fields
  businessName: varchar("business_name"),
  businessType: varchar("business_type", { enum: ["individual", "company"] }).default("individual"),
  
  // Skills and services - optional initially
  skills: jsonb("skills").$type<string[]>(),
  serviceIds: jsonb("service_ids").$type<string[]>(), // Array of service IDs they offer
  experienceYears: integer("experience_years").default(0),
  
  // Verification and ratings
  isVerified: boolean("is_verified").default(false),
  verificationLevel: varchar("verification_level", { 
    enum: ["none", "basic", "verified", "premium"] 
  }).default("none"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalCompletedOrders: integer("total_completed_orders").default(0),
  totalRatings: integer("total_ratings").default(0),
  
  // Availability and location - legacy field enhanced
  availability: jsonb("availability").$type<{
    [key: string]: { start: string; end: string; available: boolean }[];
  }>(),
  
  // New location features - optional initially
  currentLocation: jsonb("current_location").$type<{
    latitude: number;
    longitude: number;
    address: string;
    lastUpdated: string;
  }>(),
  serviceRadius: integer("service_radius").default(25), // km radius
  serviceAreas: jsonb("service_areas").$type<{
    name: string;
    coordinates: { lat: number; lng: number }[];
    cities: string[];
  }[]>(),
  
  // Legacy field
  serviceArea: jsonb("service_area").$type<{
    cities: string[];
    maxDistance: number;
  }>(),
  
  // Status and activity
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  lastActiveAt: timestamp("last_active_at"),
  
  // Documents and compliance - enhanced
  documents: jsonb("documents").$type<{
    aadhar?: {
      front?: string;
      back?: string;
      uploadedAt?: string;
      verified?: boolean;
    };
    photo?: {
      url?: string;
      uploadedAt?: string;
      verified?: boolean;
    };
    certificates?: {
      url: string;
      name: string;
      type: string;
      uploadedAt: string;
      verified?: boolean;
    }[];
    licenses?: {
      url: string;
      name: string;
      type: string;
      licenseNumber?: string;
      expiryDate?: string;
      uploadedAt: string;
      verified?: boolean;
    }[];
    insurance?: {
      url?: string;
      policyNumber?: string;
      expiryDate?: string;
      uploadedAt?: string;
      verified?: boolean;
    };
    portfolio?: {
      url: string;
      caption: string;
      uploadedAt: string;
    }[];
  }>(),

  // Enhanced verification tracking
  verificationStatus: varchar("verification_status", { 
    enum: ["pending", "under_review", "approved", "rejected", "suspended", "resubmission_required"] 
  }).default("pending"),
  verificationDate: timestamp("verification_date"),
  verifiedBy: varchar("verified_by").references(() => users.id), // Admin who verified
  rejectionReason: text("rejection_reason"),
  verificationNotes: text("verification_notes"), // Internal admin notes
  resubmissionReason: text("resubmission_reason"), // Feedback for provider on what to fix
  
  // Performance metrics - new optional fields
  responseTime: integer("avg_response_time").default(0), // seconds
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default("0.00"),
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("sp_user_idx").on(table.userId),
  categoryIdx: index("sp_category_idx").on(table.categoryId), // legacy index
  verifiedIdx: index("sp_verified_idx").on(table.isVerified),
  onlineIdx: index("sp_online_idx").on(table.isOnline),
  locationIdx: index("sp_location_idx").on(table.serviceRadius),
  ratingIdx: index("sp_rating_idx").on(table.rating),
}));

// Service Provider Profiles for order workflow system
export const serviceProviderProfiles = pgTable("service_provider_profiles", {
  providerId: varchar("provider_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  servicesOffered: jsonb("services_offered").$type<string[]>().notNull().default(sql`'[]'::jsonb`), // Array of service IDs they can provide
  coverageRadiusKm: integer("coverage_radius_km").notNull().default(25), // How far they travel (in kilometers)
  lastKnownLocation: jsonb("last_known_location").$type<{
    latitude: number;
    longitude: number;
    updatedAt: string;
  }>(), // JSONB with lat/lng coordinates
  onlineStatus: varchar("online_status", { 
    enum: ["online", "offline", "busy"] 
  }).notNull().default("offline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  providerIdx: index("spp_provider_idx").on(table.providerId),
  onlineStatusIdx: index("spp_online_status_idx").on(table.onlineStatus),
  coverageRadiusIdx: index("spp_coverage_radius_idx").on(table.coverageRadiusKm),
  servicesOfferedIdx: index("spp_services_offered_idx").on(table.servicesOffered),
  // Performance indexes for provider matching queries
  onlineServicesIdx: index("spp_online_services_idx").on(table.onlineStatus, table.servicesOffered),
  activeProvidersIdx: index("spp_active_providers_idx").on(table.onlineStatus, table.coverageRadiusKm),
}));

// Enhanced parts categories with hierarchy support
export const partsCategories = pgTable("parts_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique(),
  icon: text("icon"),
  description: text("description"),
  level: integer("level").default(0), // 0=main, 1=sub, 2=sub-sub
  sortOrder: integer("sort_order").default(0),
  
  // SEO
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  
  // Commission and Business
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"), // Platform commission %
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  parentIdx: index("parts_cat_parent_idx").on(table.parentId),
  slugIdx: index("parts_cat_slug_idx").on(table.slug),
  levelIdx: index("parts_cat_level_idx").on(table.level),
}));

// Enhanced parts inventory with comprehensive fields
export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => partsCategories.id),
  providerId: varchar("provider_id").references(() => users.id),
  name: varchar("name").notNull(),
  slug: varchar("slug"), // SEO-friendly URL slug
  description: text("description"),
  brand: varchar("brand"),
  model: varchar("model"),
  sku: varchar("sku").unique(), // Stock Keeping Unit
  barcode: varchar("barcode"),
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }), // MSRP/Original price
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // Provider's cost
  
  // Inventory Management
  stock: integer("stock").default(0),
  reservedStock: integer("reserved_stock").default(0), // Stock reserved for pending orders
  lowStockThreshold: integer("low_stock_threshold").default(10),
  reorderPoint: integer("reorder_point").default(5),
  reorderQuantity: integer("reorder_quantity").default(50),
  
  // Product Details
  images: jsonb("images").$type<string[]>(),
  specifications: jsonb("specifications").$type<Record<string, any>>(),
  features: jsonb("features").$type<string[]>(),
  compatibility: jsonb("compatibility").$type<{
    devices?: string[];
    models?: string[];
    brands?: string[];
  }>(),
  
  // Dimensions and Weight
  weight: decimal("weight", { precision: 8, scale: 3 }), // in kg
  dimensions: jsonb("dimensions").$type<{
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'mm' | 'inch';
  }>(),
  
  // Warranty and Service
  warrantyPeriod: integer("warranty_period"), // in months
  warrantyTerms: text("warranty_terms"),
  returnPolicy: text("return_policy"),
  
  // Performance Metrics
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalSold: integer("total_sold").default(0),
  totalReviews: integer("total_reviews").default(0),
  viewCount: integer("view_count").default(0),
  
  // SEO and Marketing
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  tags: jsonb("tags").$type<string[]>(),
  
  // Status and Availability
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  availabilityStatus: varchar("availability_status", { 
    enum: ["in_stock", "low_stock", "out_of_stock", "discontinued", "pre_order"] 
  }).default("in_stock"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastStockUpdate: timestamp("last_stock_update"),
}, (table) => ({
  skuIdx: index("parts_sku_idx").on(table.sku),
  categoryIdx: index("parts_category_idx").on(table.categoryId),
  providerIdx: index("parts_provider_idx").on(table.providerId),
  slugIdx: index("parts_slug_idx").on(table.slug),
  stockIdx: index("parts_stock_idx").on(table.stock),
  statusIdx: index("parts_status_idx").on(table.availabilityStatus),
}));

// Orders table - Core order workflow system
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  addressId: varchar("address_id"), // Customer address reference
  
  // SECURITY FIX: Idempotency key for duplicate prevention (nullable for existing records)
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
  
  status: varchar("status", { 
    enum: ["pending_assignment", "matching", "assigned", "in_progress", "completed", "cancelled"] 
  }).default("pending_assignment"),
  providerId: varchar("provider_id").references(() => users.id), // Nullable, assigned provider ID
  acceptedAt: timestamp("accepted_at"), // When provider accepted
  acceptDeadlineAt: timestamp("accept_deadline_at").notNull(), // 5-minute deadline for provider response
  meta: jsonb("meta").$type<{
    basePrice?: number;
    totalAmount?: number;
    serviceFee?: number;
    taxes?: number;
    notes?: string;
    customerNotes?: string;
    specialRequirements?: string[];
    estimatedDuration?: number;
    urgencyLevel?: "normal" | "urgent";
    paymentMethod?: "online" | "cod" | "wallet";
    paymentStatus?: "pending" | "paid" | "failed" | "refunded";
    location?: {
      address: string;
      latitude: number;
      longitude: number;
      instructions?: string;
    };
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("orders_user_idx").on(table.userId),
  serviceIdx: index("orders_service_idx").on(table.serviceId),
  providerIdx: index("orders_provider_idx").on(table.providerId),
  // SECURITY: Unique index on idempotency key for duplicate prevention
  idempotencyIdx: index("orders_idempotency_idx").on(table.idempotencyKey),
  statusIdx: index("orders_status_idx").on(table.status),
  deadlineIdx: index("orders_deadline_idx").on(table.acceptDeadlineAt),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
}));

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

// Comprehensive coupons and promotions system
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Information
  code: varchar("code").unique().notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  // Discount Configuration
  type: varchar("type", { enum: ["percentage", "fixed_amount", "free_delivery", "service_specific"] }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
  
  // Validity Configuration
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isExpired: boolean("is_expired").default(false),
  
  // Usage Limits and Tracking with SECURITY CONSTRAINTS
  usageLimit: integer("usage_limit"), // Total usage limit (null = unlimited)
  usageCount: integer("usage_count").default(0).notNull(), // Current usage count - SECURITY: Cannot be negative
  maxUsagePerUser: integer("max_usage_per_user").default(1), // Per-user usage limit
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  
  // Targeting and Restrictions
  applicableServices: jsonb("applicable_services").$type<string[]>(), // Array of service IDs
  userRestrictions: jsonb("user_restrictions").$type<{
    newUsersOnly?: boolean;
    firstTimeOnly?: boolean;
    specificUsers?: string[]; // Array of user IDs
    excludeUsers?: string[]; // Array of user IDs to exclude
    minOrderCount?: number; // Minimum number of previous orders
    userTags?: string[]; // User tags/segments
  }>(),
  
  // Geographic and Category Restrictions
  serviceCategories: jsonb("service_categories").$type<string[]>(), // Array of category IDs
  regions: jsonb("regions").$type<string[]>(), // Array of supported regions/cities
  
  // Metadata and Tracking
  createdBy: varchar("created_by").references(() => users.id).notNull(), // Admin who created
  lastModifiedBy: varchar("last_modified_by").references(() => users.id), // Admin who last modified
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
  
  // Campaign and Analytics
  campaignName: varchar("campaign_name"), // Marketing campaign association
  priority: integer("priority").default(0), // Higher priority coupons apply first
  isPublic: boolean("is_public").default(true), // Whether to show in public listing
  
  // Auto-deactivation
  autoDeactivate: boolean("auto_deactivate").default(true), // Auto-deactivate when expired
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: varchar("deactivated_by").references(() => users.id),
  
  // Coupon Performance Metrics
  totalSavings: decimal("total_savings", { precision: 15, scale: 2 }).default("0.00"), // Total money saved by users
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }), // Avg order value with this coupon
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }), // Validation to usage rate
}, (table) => ({
  codeIdx: index("coupons_code_idx").on(table.code),
  activeIdx: index("coupons_active_idx").on(table.isActive),
  validFromIdx: index("coupons_valid_from_idx").on(table.validFrom),
  validUntilIdx: index("coupons_valid_until_idx").on(table.validUntil),
  typeIdx: index("coupons_type_idx").on(table.type),
  createdByIdx: index("coupons_created_by_idx").on(table.createdBy),
  campaignIdx: index("coupons_campaign_idx").on(table.campaignName),
  usageCountIdx: index("coupons_usage_count_idx").on(table.usageCount),
}));

// Coupon usage tracking for detailed analytics
export const couponUsage = pgTable("coupon_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").references(() => coupons.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  
  // Usage Details
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }).notNull(),
  savingsPercent: decimal("savings_percent", { precision: 5, scale: 2 }),
  
  // Context
  usedAt: timestamp("used_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  
  // Validation Status
  validationStatus: varchar("validation_status", { 
    enum: ["valid", "expired", "usage_limit_exceeded", "user_limit_exceeded", "min_order_not_met", "service_not_applicable"] 
  }).default("valid"),
}, (table) => ({
  couponIdx: index("cu_coupon_idx").on(table.couponId),
  userIdx: index("cu_user_idx").on(table.userId),
  orderIdx: index("cu_order_idx").on(table.orderId),
  usedAtIdx: index("cu_used_at_idx").on(table.usedAt),
}));

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  conversationId: varchar("conversation_id"), // For AI conversations
  senderId: varchar("sender_id").references(() => users.id),
  receiverId: varchar("receiver_id").references(() => users.id),
  content: text("content").notNull(), // Renamed from message for consistency
  message: text("message").notNull(), // Keep for backward compatibility
  messageType: varchar("message_type", { enum: ["text", "image", "location", "user", "ai", "system"] }).default("text"),
  attachments: jsonb("attachments").$type<string[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // For AI conversation context
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  timestamp: timestamp("timestamp").defaultNow(), // For AI conversations
}, (table) => ({
  conversationIdx: index("cm_conversation_idx").on(table.conversationId),
  senderIdx: index("cm_sender_idx").on(table.senderId),
  typeIdx: index("cm_type_idx").on(table.messageType),
}));

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
  phoneCallNotifications: boolean("phone_call_notifications").default(false), // Phone ring notifications for providers
  
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
  
  // Phone notification specific settings
  phoneCallFrequencyLimit: integer("phone_call_frequency_limit").default(10), // Max calls per hour
  phoneCallQuietHoursEnabled: boolean("phone_call_quiet_hours_enabled").default(true),
  phoneCallMinInterval: integer("phone_call_min_interval").default(60), // Minimum seconds between calls
  
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
// Enhanced Service Bookings - Replaces and extends orders for services
export const serviceBookings = pgTable("service_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  
  // Booking type and scheduling
  bookingType: varchar("booking_type", { enum: ["instant", "scheduled"] }).notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
  scheduledAt: timestamp("scheduled_at"),
  
  // Location details
  serviceLocation: jsonb("service_location").$type<{
    type: "current" | "alternate";
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
    landmarkDetails?: string;
  }>().notNull(),
  
  // Service details
  serviceDetails: jsonb("service_details").$type<{
    basePrice: number;
    estimatedDuration: number;
    workflowSteps: string[];
    specialRequirements?: string[];
  }>(),
  
  // Conversation integration
  conversationId: varchar("conversation_id"), // Link to AI conversation that led to booking
  
  // Customer inputs
  notes: text("notes"),
  attachments: jsonb("attachments").$type<string[]>(),
  urgency: varchar("urgency", { enum: ["low", "normal", "high", "urgent"] }).default("normal"),
  
  // Status and workflow - ENHANCED with new state machine
  status: varchar("status", { 
    enum: ["pending", "requested", "matching", "matched", "accepted", "enroute", 
           "arrived", "started", "in_progress", "work_completed", "payment_pending", 
           "completed", "cancelled", "refunded",
           // Legacy statuses for backward compatibility
           "provider_search", "provider_assigned", "provider_on_way", "work_in_progress"] 
  }).default("pending"),
  
  // Provider assignment and matching
  assignedProviderId: varchar("assigned_provider_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  assignmentMethod: varchar("assignment_method", { enum: ["auto", "manual", "customer_choice"] }),
  matchingExpiresAt: timestamp("matching_expires_at"), // 5-minute timer for matching
  candidateCount: integer("candidate_count").default(0), // Number of providers notified
  
  // Radius escalation tracking for Urban Company-style expansion
  currentSearchRadius: integer("current_search_radius").default(15), // Current search radius in km
  searchWave: integer("search_wave").default(1), // 1=15km, 2=25km, 3=30km, 4=35km, 5=50km
  maxSearchRadius: integer("max_search_radius").default(50), // Maximum radius to search
  radiusExpansionHistory: jsonb("radius_expansion_history").$type<{
    wave: number;
    radius: number;
    providersFound: number;
    expandedAt: string;
  }[]>().default(sql`'[]'::jsonb`), // Track expansion history
  pendingOffers: integer("pending_offers").default(0), // Current number of pending provider offers
  
  // Pricing and payment
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { enum: ["online", "cod", "wallet"] }),
  paymentStatus: varchar("payment_status", { enum: ["pending", "paid", "failed", "refunded"] }).default("pending"),
  
  // Completion and feedback
  completedAt: timestamp("completed_at"),
  customerRating: integer("customer_rating"),
  customerReview: text("customer_review"),
  providerRating: integer("provider_rating"),
  providerReview: text("provider_review"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("sb_user_idx").on(table.userId),
  serviceIdx: index("sb_service_idx").on(table.serviceId),
  providerIdx: index("sb_provider_idx").on(table.assignedProviderId),
  statusIdx: index("sb_status_idx").on(table.status),
  typeIdx: index("sb_type_idx").on(table.bookingType),
  scheduledIdx: index("sb_scheduled_idx").on(table.scheduledAt),
  matchingExpiresIdx: index("sb_matching_expires_idx").on(table.matchingExpiresAt),
  
  // Radius escalation indexes for provider matching optimization
  searchRadiusIdx: index("sb_search_radius_idx").on(table.currentSearchRadius),
  searchWaveIdx: index("sb_search_wave_idx").on(table.searchWave),
  pendingOffersIdx: index("sb_pending_offers_idx").on(table.pendingOffers),
  
  // Composite indexes for efficient matching queries
  statusRadiusIdx: index("sb_status_radius_idx").on(table.status, table.currentSearchRadius),
  statusWaveIdx: index("sb_status_wave_idx").on(table.status, table.searchWave),
  statusMatchingExpiresIdx: index("sb_status_matching_expires_idx").on(table.status, table.matchingExpiresAt),
  
  // Performance index for orders needing matching (removed NOW() for immutability)
  needsMatchingIdx: index("sb_needs_matching_idx").on(table.status, table.matchingExpiresAt).where(sql`status IN ('pending', 'provider_search')`),
}));

// Provider Job Requests - Race-to-accept system for order workflow with TTL enforcement
export const providerJobRequests = pgTable("provider_job_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  status: varchar("status", { 
    enum: ["pending", "sent", "accepted", "declined", "expired"] 
  }).default("pending"),
  sentAt: timestamp("sent_at"), // When request was sent to provider
  respondedAt: timestamp("responded_at"), // When provider responded (accepted/declined)
  expiresAt: timestamp("expires_at").notNull(), // TTL: 5 minutes from sentAt
  priority: integer("priority").notNull(), // 1 = primary, 2 = first backup, etc.
  
  // Distance and travel time for provider context
  distanceKm: decimal("distance_km", { precision: 5, scale: 2 }), // Distance from provider to service location
  estimatedTravelTime: integer("estimated_travel_time"), // Minutes to reach service location
  
  // Provider acceptance details
  quotedPrice: decimal("quoted_price", { precision: 10, scale: 2 }), // Provider's quoted price (if different from base)
  estimatedArrival: timestamp("estimated_arrival"), // When provider expects to arrive
  acceptanceNotes: text("acceptance_notes"), // Provider's notes on acceptance
  declineReason: text("decline_reason"), // Reason for declining (if declined)
  
  // Phone notification tracking fields
  phoneCallId: varchar("phone_call_id"), // Twilio call ID for phone notification
  phoneNotificationSent: boolean("phone_notification_sent").default(false), // Whether phone notification was sent
  phoneNotificationTimestamp: timestamp("phone_notification_timestamp"), // When phone notification was sent/attempted
  phoneNotificationError: text("phone_notification_error"), // Error message if phone notification failed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orderIdx: index("pjr_order_idx").on(table.orderId),
  providerIdx: index("pjr_provider_idx").on(table.providerId),
  statusIdx: index("pjr_status_idx").on(table.status),
  priorityIdx: index("pjr_priority_idx").on(table.priority),
  orderProviderIdx: index("pjr_order_provider_idx").on(table.orderId, table.providerId),
  orderStatusPriorityIdx: index("pjr_order_status_priority_idx").on(table.orderId, table.status, table.priority),
  
  // TTL and expiry indexes for 5-minute timer enforcement
  expiresAtIdx: index("pjr_expires_at_idx").on(table.expiresAt),
  statusExpiresIdx: index("pjr_status_expires_idx").on(table.status, table.expiresAt),
  
  // CRITICAL: Partial unique index to ensure only one accepted request per order
  orderAcceptedUniqueIdx: index("pjr_order_accepted_unique_idx").on(table.orderId).where(sql`status = 'accepted'`),
  
  // Performance indexes for TTL queries and race-to-accept
  sentStatusPriorityIdx: index("pjr_sent_status_priority_idx").on(table.status, table.priority).where(sql`status = 'sent'`),
  activeOffersIdx: index("pjr_active_offers_idx").on(table.status, table.expiresAt).where(sql`status = 'sent'`),
  expiredOffersIdx: index("pjr_expired_offers_idx").on(table.expiresAt, table.status).where(sql`status IN ('sent', 'expired')`),
  
  // Distance and travel time indexes for provider context
  distanceIdx: index("pjr_distance_idx").on(table.distanceKm),
  travelTimeIdx: index("pjr_travel_time_idx").on(table.estimatedTravelTime),
  
  // Unique constraint to prevent duplicate offers to same provider for same order
  unique: [table.orderId, table.providerId],
}));

// Service Workflow Tracking - Real-time status updates
export const serviceWorkflow = pgTable("service_workflow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => serviceBookings.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Workflow status
  currentStep: varchar("current_step", {
    enum: ["assigned", "on_the_way", "arrived", "work_started", "work_in_progress", 
           "work_completed", "payment_collected", "completed"]
  }).notNull(),
  
  // Location tracking
  providerLocation: jsonb("provider_location").$type<{
    latitude: number;
    longitude: number;
    address?: string;
    lastUpdated: string;
  }>(),
  
  // Time tracking
  startedAt: timestamp("started_at").defaultNow(),
  arrivedAt: timestamp("arrived_at"),
  workStartedAt: timestamp("work_started_at"),
  workCompletedAt: timestamp("work_completed_at"),
  totalDuration: integer("total_duration"), // minutes
  
  // Work details
  workPhotos: jsonb("work_photos").$type<{
    before?: string[];
    during?: string[];
    after?: string[];
  }>(),
  workNotes: text("work_notes"),
  materialsUsed: jsonb("materials_used").$type<{
    item: string;
    quantity: number;
    cost?: number;
  }[]>(),
  
  // Issues and delays
  issues: jsonb("issues").$type<{
    type: string;
    description: string;
    resolvedAt?: string;
  }[]>(),
  delays: jsonb("delays").$type<{
    reason: string;
    minutes: number;
    timestamp: string;
  }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  bookingIdx: index("sw_booking_idx").on(table.bookingId),
  providerIdx: index("sw_provider_idx").on(table.providerId),
  stepIdx: index("sw_step_idx").on(table.currentStep),
  activeIdx: index("sw_active_idx").on(table.bookingId, table.currentStep),
}));

// Provider Performance Metrics - Real-time analytics
export const providerMetrics = pgTable("provider_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Time period
  date: varchar("date").notNull(), // YYYY-MM-DD format
  
  // Job metrics
  jobsReceived: integer("jobs_received").default(0),
  jobsAccepted: integer("jobs_accepted").default(0),
  jobsCompleted: integer("jobs_completed").default(0),
  jobsCancelled: integer("jobs_cancelled").default(0),
  
  // Performance metrics
  avgResponseTime: integer("avg_response_time").default(0), // seconds
  avgTravelTime: integer("avg_travel_time").default(0), // minutes
  avgJobDuration: integer("avg_job_duration").default(0), // minutes
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }).default("0.00"),
  
  // Financial metrics
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  avgJobValue: decimal("avg_job_value", { precision: 10, scale: 2 }).default("0.00"),
  
  // Quality metrics
  avgRating: decimal("avg_rating", { precision: 3, scale: 2 }).default("0.00"),
  totalRatings: integer("total_ratings").default(0),
  customersServed: integer("customers_served").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdx: index("pm_provider_idx").on(table.providerId),
  dateIdx: index("pm_date_idx").on(table.date),
  providerDateIdx: index("pm_provider_date_idx").on(table.providerId, table.date),
}));

// Support tickets system
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number").notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Ticket details
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { 
    enum: ["technical", "billing", "account", "service", "parts", "general"] 
  }).default("general"),
  priority: varchar("priority", { 
    enum: ["low", "medium", "high", "urgent"] 
  }).default("medium"),
  status: varchar("status", { 
    enum: ["open", "assigned", "in_progress", "pending_customer", "resolved", "closed"] 
  }).default("open"),
  
  // Assignment
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  
  // Related information
  orderId: varchar("order_id").references(() => orders.id),
  attachments: jsonb("attachments").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  
  // Resolution tracking
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  resolutionNotes: text("resolution_notes"),
  
  // Customer feedback
  customerRating: integer("customer_rating"), // 1-5 stars
  customerFeedback: text("customer_feedback"),
  agentRating: integer("agent_rating"), // 1-5 stars for agent performance
  
  // Metadata
  source: varchar("source", { enum: ["web", "mobile", "email", "phone", "chat", "whatsapp"] }).default("web"),
  urgentReason: text("urgent_reason"), // Reason if marked as urgent
  escalatedAt: timestamp("escalated_at"),
  escalationReason: text("escalation_reason"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ticketNumberIdx: index("st_ticket_number_idx").on(table.ticketNumber),
  userIdIdx: index("st_user_id_idx").on(table.userId),
  statusIdx: index("st_status_idx").on(table.status),
  priorityIdx: index("st_priority_idx").on(table.priority),
  categoryIdx: index("st_category_idx").on(table.category),
  assignedAgentIdx: index("st_assigned_agent_idx").on(table.assignedAgentId),
  createdAtIdx: index("st_created_at_idx").on(table.createdAt),
}));

// Support ticket messages (conversation thread)
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  senderType: varchar("sender_type", { enum: ["customer", "agent", "system"] }).notNull(),
  
  // Message content
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<string[]>(),
  messageType: varchar("message_type", { 
    enum: ["text", "image", "file", "system_update", "status_change", "assignment"] 
  }).default("text"),
  
  // Visibility and flags
  isInternal: boolean("is_internal").default(false), // Internal notes between agents
  isAutoResponse: boolean("is_auto_response").default(false),
  
  // Metadata
  readAt: timestamp("read_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ticketIdIdx: index("stm_ticket_id_idx").on(table.ticketId),
  senderIdIdx: index("stm_sender_id_idx").on(table.senderId),
  senderTypeIdx: index("stm_sender_type_idx").on(table.senderType),
  createdAtIdx: index("stm_created_at_idx").on(table.createdAt),
}));

// FAQ system
export const faq = pgTable("faq", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Content
  category: varchar("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  answerHtml: text("answer_html"), // Rich HTML version
  
  // Organization
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  keywords: jsonb("keywords").$type<string[]>().default(sql`'[]'::jsonb`), // For search optimization
  sortOrder: integer("sort_order").default(0),
  
  // Engagement metrics
  helpfulCount: integer("helpful_count").default(0),
  notHelpfulCount: integer("not_helpful_count").default(0),
  viewCount: integer("view_count").default(0),
  
  // Status
  isPublished: boolean("is_published").default(true),
  isPopular: boolean("is_popular").default(false), // Manually marked as popular
  
  // Author information
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at"),
}, (table) => ({
  categoryIdx: index("faq_category_idx").on(table.category),
  publishedIdx: index("faq_published_idx").on(table.isPublished),
  popularIdx: index("faq_popular_idx").on(table.isPopular),
  createdAtIdx: index("faq_created_at_idx").on(table.createdAt),
}));

// Callback requests for phone support
export const supportCallbackRequests = pgTable("support_callback_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Contact details
  contactNumber: varchar("contact_number").notNull(),
  preferredTime: varchar("preferred_time", { 
    enum: ["now", "morning", "afternoon", "evening", "specific_time"] 
  }).default("now"),
  specificTime: timestamp("specific_time"), // If preferred_time is "specific_time"
  
  // Request details
  reason: text("reason").notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  additionalNotes: text("additional_notes"),
  ticketId: varchar("ticket_id").references(() => supportTickets.id), // Optional link to existing ticket
  
  // Status tracking
  status: varchar("status", { 
    enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"] 
  }).default("pending"),
  
  // Agent assignment
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  
  // Call tracking
  callStartedAt: timestamp("call_started_at"),
  callEndedAt: timestamp("call_ended_at"),
  callDuration: integer("call_duration"), // in minutes
  callNotes: text("call_notes"),
  
  // Resolution
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpAt: timestamp("follow_up_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("scr_user_id_idx").on(table.userId),
  statusIdx: index("scr_status_idx").on(table.status),
  assignedAgentIdx: index("scr_assigned_agent_idx").on(table.assignedAgentId),
  createdAtIdx: index("scr_created_at_idx").on(table.createdAt),
}));

// Support agent availability and status
export const supportAgents = pgTable("support_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  
  // Agent details
  agentName: varchar("agent_name").notNull(),
  agentEmail: varchar("agent_email").notNull(),
  department: varchar("department", { 
    enum: ["general", "technical", "billing", "escalation"] 
  }).default("general"),
  
  // Skills and specializations
  skills: jsonb("skills").$type<string[]>().default(sql`'[]'::jsonb`),
  languages: jsonb("languages").$type<string[]>().default(sql`'["en"]'::jsonb`),
  maxConcurrentTickets: integer("max_concurrent_tickets").default(10),
  
  // Status and availability
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  status: varchar("status", { 
    enum: ["available", "busy", "away", "offline"] 
  }).default("offline"),
  statusMessage: text("status_message"),
  
  // Performance metrics
  totalTicketsHandled: integer("total_tickets_handled").default(0),
  averageResponseTime: integer("average_response_time").default(0), // in minutes
  averageResolutionTime: integer("average_resolution_time").default(0), // in hours
  customerRating: decimal("customer_rating", { precision: 3, scale: 2 }).default("0.00"),
  
  // Schedule
  workingHours: jsonb("working_hours").$type<{
    timezone: string;
    schedule: Record<string, { start: string; end: string; available: boolean }>;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at"),
}, (table) => ({
  userIdIdx: index("sa_user_id_idx").on(table.userId),
  departmentIdx: index("sa_department_idx").on(table.department),
  statusIdx: index("sa_status_idx").on(table.status),
  isActiveIdx: index("sa_is_active_idx").on(table.isActive),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
// Original schema for internal use
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });

// API-specific schema for POST operations (omits server-computed fields)
export const apiCreateServiceCategorySchema = createInsertSchema(serviceCategories).omit({ 
  id: true, 
  createdAt: true, 
  slug: true,      // Server generates from name
  level: true,     // Server computes from parentId
  serviceCount: true // Server maintains this cache field
});

// API-specific schema for PATCH operations (only allows updating specific fields)
export const apiUpdateServiceCategorySchema = createInsertSchema(serviceCategories).omit({ 
  id: true, 
  createdAt: true,
  slug: true,      // Server generates from name
  level: true,     // Server computes from parentId  
  serviceCount: true // Server maintains this cache field
}).partial(); // Make all fields optional for PATCH
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertServiceBookingSchema = createInsertSchema(serviceBookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderJobRequestSchema = createInsertSchema(providerJobRequests).omit({ id: true, createdAt: true, updatedAt: true });

// Enhanced parts management insert schemas
export const insertPartsCategorySchema = createInsertSchema(partsCategories).omit({ id: true, createdAt: true });
export const insertPartsProviderBusinessInfoSchema = createInsertSchema(partsProviderBusinessInfo).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartsInventoryMovementSchema = createInsertSchema(partsInventoryMovements).omit({ id: true, createdAt: true });
export const insertPartsBulkUploadSchema = createInsertSchema(partsBulkUploads).omit({ id: true, createdAt: true });
export const insertPartsSupplierSchema = createInsertSchema(partsSuppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceWorkflowSchema = createInsertSchema(serviceWorkflow).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderMetricsSchema = createInsertSchema(providerMetrics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });

// CRITICAL FIX: API schema aligned with ACTUAL Checkout frontend payload structure
export const orderCreateApiSchema = z.object({
  // Order type for server processing logic
  type: z.enum(['service', 'parts'], {
    required_error: 'Order type is required',
    invalid_type_error: 'Order type must be service or parts'
  }),
  
  // Items array matching EXACT frontend structure
  items: z.array(z.object({
    id: z.string().min(1, 'Item ID is required'),
    name: z.string().min(1, 'Item name is required'),
    price: z.number()
      .min(0, 'Item price cannot be negative')
      .max(999999.99, 'Item price too high'),
    quantity: z.number()
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(100, 'Quantity cannot exceed 100'),
    type: z.enum(['service', 'part'], {
      required_error: 'Item type is required',
      invalid_type_error: 'Item type must be service or part'
    }),
    categoryId: z.string().optional(),
    serviceId: z.string().optional(),
    partId: z.string().optional()
  }))
    .min(1, 'At least one item is required')
    .max(50, 'Too many items in order'),
  
  // Total amount as string (frontend sends this way)
  totalAmount: z.string()
    .min(1, 'Total amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Total amount must be a valid positive number'),
  
  // Location object at root level (matching frontend)
  location: z.object({
    address: z.string().min(1, 'Address is required').max(500),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    instructions: z.string().max(200).optional()
  }),
  
  // Scheduled time for service orders
  scheduledAt: z.string().nullable().optional(),
  
  // Payment method validation
  paymentMethod: z.enum(['online', 'cod', 'wallet'], {
    required_error: 'Payment method is required',
    invalid_type_error: 'Invalid payment method'
  }),
  
  // Coupon handling (optional)
  couponCode: z.string()
    .min(1, 'Coupon code cannot be empty when provided')
    .max(50, 'Coupon code too long')
    .nullable()
    .optional(),
  
  // Coupon discount amount
  couponDiscount: z.number()
    .min(0, 'Coupon discount cannot be negative')
    .max(9999999.99, 'Coupon discount too high')
    .optional()
    .default(0),
  
  // Customer notes  
  notes: z.string()
    .max(500, 'Notes too long')
    .optional(),
  
  // SECURITY: Idempotency key for duplicate prevention
  idempotencyKey: z.string()
    .min(1, 'Idempotency key is required')
    .max(255, 'Idempotency key too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid idempotency key format')
})

// Export the type for TypeScript usage
export type OrderCreateApiData = z.infer<typeof orderCreateApiSchema>;

// Parts Provider Dashboard Types
export const PartsProviderStatsSchema = z.object({
  totalProducts: z.number(),
  activeProducts: z.number(),
  totalOrders: z.number(),
  pendingOrders: z.number(),
  completedOrders: z.number(),
  totalRevenue: z.string(),
  lowStockAlerts: z.number(),
  outOfStockItems: z.number(),
  totalSuppliers: z.number(),
  averageRating: z.string(),
});

export const PartsProviderOrderSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  totalAmount: z.string(),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.string(),
  })),
});

export const PartsProviderLowStockAlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  currentStock: z.number(),
  lowStockThreshold: z.number(),
  price: z.string(),
});

export const PartsProviderTopProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  totalSold: z.number(),
  price: z.string(),
  stock: z.number(),
  rating: z.string(),
});

export const PartsProviderRecentActivitySchema = z.object({
  id: z.string(),
  partId: z.string(),
  movementType: z.string(),
  quantity: z.number(),
  reason: z.string(),
  createdAt: z.string(),
});

export const PartsProviderBusinessInfoSchema = z.object({
  businessName: z.string(),
  verificationStatus: z.string(),
  isVerified: z.boolean(),
  totalRevenue: z.string(),
  totalOrders: z.number(),
  averageRating: z.string(),
}).nullable();

export const PartsProviderDashboardDataSchema = z.object({
  stats: PartsProviderStatsSchema,
  recentOrders: z.array(PartsProviderOrderSchema),
  lowStockAlerts: z.array(PartsProviderLowStockAlertSchema),
  topProducts: z.array(PartsProviderTopProductSchema),
  recentActivity: z.array(PartsProviderRecentActivitySchema),
  businessInfo: PartsProviderBusinessInfoSchema,
});

// Export types for TypeScript usage
export type PartsProviderStats = z.infer<typeof PartsProviderStatsSchema>;
export type PartsProviderOrder = z.infer<typeof PartsProviderOrderSchema>;
export type PartsProviderLowStockAlert = z.infer<typeof PartsProviderLowStockAlertSchema>;
export type PartsProviderTopProduct = z.infer<typeof PartsProviderTopProductSchema>;
export type PartsProviderRecentActivity = z.infer<typeof PartsProviderRecentActivitySchema>;
export type PartsProviderBusinessInfo = z.infer<typeof PartsProviderBusinessInfoSchema>;
export type PartsProviderDashboardData = z.infer<typeof PartsProviderDashboardDataSchema>;

export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  usageCount: true,
  isExpired: true,
  totalSavings: true,
  averageOrderValue: true,
  conversionRate: true,
  deactivatedAt: true,
  deactivatedBy: true
});

export const insertCouponUsageSchema = createInsertSchema(couponUsage).omit({ 
  id: true, 
  usedAt: true 
});
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, updatedAt: true, timestamp: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true, createdAt: true });
export const insertServiceProviderProfileSchema = createInsertSchema(serviceProviderProfiles).omit({ providerId: true, createdAt: true, updatedAt: true });
export const insertOtpChallengeSchema = createInsertSchema(otpChallenges).omit({ id: true, createdAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStripeCustomerSchema = createInsertSchema(stripeCustomers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentIntentSchema = createInsertSchema(paymentIntents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserLocalePreferencesSchema = createInsertSchema(userLocalePreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIndianRegionSchema = createInsertSchema(indianRegions).omit({ id: true, createdAt: true, updatedAt: true });

// Support system insert schemas
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, ticketNumber: true, createdAt: true, updatedAt: true });
export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({ id: true, createdAt: true });
export const insertFaqSchema = createInsertSchema(faq).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportCallbackRequestSchema = createInsertSchema(supportCallbackRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportAgentSchema = createInsertSchema(supportAgents).omit({ id: true, createdAt: true, updatedAt: true });

// Phone notification system insert schemas - moved to end of file after table definitions

// Support system validation schemas for API endpoints
export const supportTicketCategoryEnum = z.enum(['technical', 'billing', 'account', 'service', 'parts', 'general']);
export const supportTicketPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const supportTicketStatusEnum = z.enum(['open', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed']);
export const supportCallbackPriorityEnum = z.enum(['low', 'medium', 'high']);
export const supportCallbackStatusEnum = z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']);
export const supportAgentStatusEnum = z.enum(['available', 'busy', 'away', 'offline']);
export const supportAgentDepartmentEnum = z.enum(['general', 'technical', 'billing', 'escalation']);

// Frontend/API validation schemas for support ticket operations
export const supportTicketCreateSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject cannot exceed 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters'),
  category: supportTicketCategoryEnum.default('general'),
  priority: supportTicketPriorityEnum.default('medium'),
  orderId: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  source: z.enum(['web', 'mobile', 'email', 'phone', 'chat', 'whatsapp']).default('web'),
});

export const supportTicketUpdateSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject cannot exceed 200 characters').optional(),
  status: supportTicketStatusEnum.optional(),
  priority: supportTicketPriorityEnum.optional(),
  assignedAgentId: z.string().optional(),
  resolutionNotes: z.string().max(1000, 'Resolution notes cannot exceed 1000 characters').optional(),
  customerRating: z.number().min(1).max(5).optional(),
  customerFeedback: z.string().max(1000, 'Customer feedback cannot exceed 1000 characters').optional(),
  agentRating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Support ticket message validation
export const supportTicketMessageCreateSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    size: z.number(),
    mimeType: z.string(),
  })).optional(),
  messageType: z.enum(['text', 'image', 'file', 'system_update', 'status_change', 'assignment']).default('text'),
  // Note: isInternal is controlled server-side based on user role, not accepted from client
});

// Support callback request validation
export const supportCallbackRequestCreateSchema = z.object({
  preferredTime: z.string().refine(val => {
    // Accept specific ISO datetime or predefined slots
    if (['now', 'morning', 'afternoon', 'evening'].includes(val)) return true;
    return !isNaN(Date.parse(val));
  }, {
    message: 'Invalid preferred time format',
  }),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters'),
  contactNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in international E.164 format'),
  priority: supportCallbackPriorityEnum.default('medium'),
  additionalNotes: z.string().max(1000, 'Additional notes cannot exceed 1000 characters').optional(),
  ticketId: z.string().optional(),
});

export const supportCallbackRequestUpdateSchema = z.object({
  status: supportCallbackStatusEnum.optional(),
  scheduledTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid scheduled time format',
  }).optional(),
  assignedAgentId: z.string().optional(),
  callDuration: z.number().min(0).optional(),
  callNotes: z.string().max(1000, 'Call notes cannot exceed 1000 characters').optional(),
  resolutionNotes: z.string().max(2000, 'Resolution cannot exceed 2000 characters').optional(),
  followUpRequired: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// FAQ validation schemas
export const faqCreateSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question cannot exceed 500 characters'),
  answer: z.string().min(20, 'Answer must be at least 20 characters').max(5000, 'Answer cannot exceed 5000 characters'),
  answerHtml: z.string().optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category cannot exceed 100 characters'),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  sortOrder: z.number().min(0).optional(),
  isPublished: z.boolean().default(false),
});

export const faqUpdateSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question cannot exceed 500 characters').optional(),
  answer: z.string().min(20, 'Answer must be at least 20 characters').max(5000, 'Answer cannot exceed 5000 characters').optional(),
  answerHtml: z.string().optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category cannot exceed 100 characters').optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  sortOrder: z.number().min(0).optional(),
  isPublished: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Support agent validation schemas
export const supportAgentCreateSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required').max(100, 'Agent name cannot exceed 100 characters'),
  agentEmail: z.string().email('Valid email address is required'),
  department: supportAgentDepartmentEnum.default('general'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  languages: z.array(z.string()).min(1, 'At least one language is required').default(['en']),
  maxConcurrentTickets: z.number().min(1).max(50).default(10),
  workingHours: z.object({
    timezone: z.string(),
    schedule: z.record(z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    })),
  }).optional(),
});

export const supportAgentUpdateSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required').max(100, 'Agent name cannot exceed 100 characters').optional(),
  agentEmail: z.string().email('Valid email address is required').optional(),
  department: supportAgentDepartmentEnum.optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required').optional(),
  languages: z.array(z.string()).min(1, 'At least one language is required').optional(),
  maxConcurrentTickets: z.number().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  status: supportAgentStatusEnum.optional(),
  statusMessage: z.string().max(100, 'Status message cannot exceed 100 characters').optional(),
  workingHours: z.object({
    timezone: z.string(),
    schedule: z.record(z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    })),
  }).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Support rating/feedback validation schema
export const supportTicketRatingSchema = z.object({
  customerRating: z.number().min(1).max(5),
  customerFeedback: z.string().max(1000, 'Feedback cannot exceed 1000 characters').optional(),
  agentRating: z.number().min(1).max(5).optional(),
  resolutionTime: z.enum(['very_fast', 'fast', 'acceptable', 'slow', 'very_slow']).optional(),
});

// Support statistics validation
export const supportStatsRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agentId: z.string().optional(),
  department: supportAgentDepartmentEnum.optional(),
});

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
export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
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
export type ServiceBooking = typeof serviceBookings.$inferSelect;
export type InsertServiceBooking = z.infer<typeof insertServiceBookingSchema>;
export type ProviderJobRequest = typeof providerJobRequests.$inferSelect;
export type InsertProviderJobRequest = z.infer<typeof insertProviderJobRequestSchema>;

// Enhanced parts management types
export type InsertPartsProviderBusinessInfo = z.infer<typeof insertPartsProviderBusinessInfoSchema>;
export type PartsInventoryMovement = typeof partsInventoryMovements.$inferSelect;
export type InsertPartsInventoryMovement = z.infer<typeof insertPartsInventoryMovementSchema>;
export type PartsBulkUpload = typeof partsBulkUploads.$inferSelect;
export type InsertPartsBulkUpload = z.infer<typeof insertPartsBulkUploadSchema>;
export type PartsSupplier = typeof partsSuppliers.$inferSelect;
export type InsertPartsSupplier = z.infer<typeof insertPartsSupplierSchema>;

// Support system types
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type FAQ = typeof faq.$inferSelect;
export type InsertFAQ = z.infer<typeof insertFaqSchema>;
export type SupportCallbackRequest = typeof supportCallbackRequests.$inferSelect;
export type InsertSupportCallbackRequest = z.infer<typeof insertSupportCallbackRequestSchema>;
export type SupportAgent = typeof supportAgents.$inferSelect;
export type InsertSupportAgent = z.infer<typeof insertSupportAgentSchema>;

// Support API operation types
export type SupportTicketCreateData = z.infer<typeof supportTicketCreateSchema>;
export type SupportTicketUpdateData = z.infer<typeof supportTicketUpdateSchema>;
export type SupportTicketMessageCreateData = z.infer<typeof supportTicketMessageCreateSchema>;
export type SupportCallbackRequestCreateData = z.infer<typeof supportCallbackRequestCreateSchema>;
export type SupportCallbackRequestUpdateData = z.infer<typeof supportCallbackRequestUpdateSchema>;
export type FAQCreateData = z.infer<typeof faqCreateSchema>;
export type FAQUpdateData = z.infer<typeof faqUpdateSchema>;
export type SupportAgentCreateData = z.infer<typeof supportAgentCreateSchema>;
export type SupportAgentUpdateData = z.infer<typeof supportAgentUpdateSchema>;
export type SupportTicketRatingData = z.infer<typeof supportTicketRatingSchema>;
export type SupportStatsRequestData = z.infer<typeof supportStatsRequestSchema>;

// Support enum types for consistent usage
export type SupportTicketCategory = z.infer<typeof supportTicketCategoryEnum>;
export type SupportTicketPriority = z.infer<typeof supportTicketPriorityEnum>;
export type SupportTicketStatus = z.infer<typeof supportTicketStatusEnum>;
export type SupportCallbackPriority = z.infer<typeof supportCallbackPriorityEnum>;
export type SupportCallbackStatus = z.infer<typeof supportCallbackStatusEnum>;
export type SupportAgentStatus = z.infer<typeof supportAgentStatusEnum>;
export type SupportAgentDepartment = z.infer<typeof supportAgentDepartmentEnum>;

// Service Provider Profile schemas and types
export type ServiceProviderProfile = typeof serviceProviderProfiles.$inferSelect;
export type InsertServiceProviderProfile = z.infer<typeof insertServiceProviderProfileSchema>;

// Service Provider Profile validation enums
export const serviceProviderBusinessTypeEnum = z.enum(['individual', 'company']);

// Profile update validation schema
export const serviceProviderProfileUpdateSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200, 'Business name cannot exceed 200 characters').optional(),
  businessType: serviceProviderBusinessTypeEnum.optional(),
  contactName: z.string().min(1, 'Contact name is required').max(100, 'Contact name cannot exceed 100 characters').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number cannot exceed 15 digits').optional(),
  email: z.string().email('Invalid email format').optional(),
  serviceCategories: z.array(z.string().uuid('Invalid service category ID')).min(1, 'At least one service category is required').optional(),
  serviceAreas: z.array(z.string().min(1, 'Service area cannot be empty')).min(1, 'At least one service area is required').optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
    city: z.string().min(1, 'City is required').max(100, 'City name too long'),
    state: z.string().min(1, 'State is required').max(100, 'State name too long'),
    postalCode: z.string().min(5, 'Postal code is required').max(10, 'Invalid postal code'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  }).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Document submission validation schema
export const serviceProviderDocumentSubmissionSchema = z.object({
  documentType: z.enum(['businessLicense', 'idProof', 'certifications']),
  url: z.string().url('Invalid document URL'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  title: z.string().min(1, 'Document title is required').max(100, 'Title too long').optional(), // Required for certifications
}).refine(data => {
  if (data.documentType === 'certifications' && !data.title) {
    return false;
  }
  return true;
}, {
  message: 'Title is required for certifications',
  path: ['title'],
});

// Status update validation schema (for admin use)
export const serviceProviderStatusUpdateSchema = z.object({
  verificationStatus: ServiceProviderVerificationStatus,
  rejectionReason: z.string().max(500, 'Rejection reason cannot exceed 500 characters').optional(),
}).refine(data => {
  if (data.verificationStatus === 'rejected' && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when status is rejected',
  path: ['rejectionReason'],
});

// Referral system tables
export const userReferrals = pgTable("user_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  referralCode: varchar("referral_code").notNull().unique(),
  referralLink: text("referral_link").notNull(),
  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  pendingReferrals: integer("pending_referrals").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  availableEarnings: decimal("available_earnings", { precision: 10, scale: 2 }).default("0.00"),
  pendingEarnings: decimal("pending_earnings", { precision: 10, scale: 2 }).default("0.00"),
  currentTier: varchar("current_tier").default("Bronze"),
  monthlyReferrals: integer("monthly_referrals").default(0),
  monthlyTarget: integer("monthly_target").default(5),
  lastResetAt: timestamp("last_reset_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("ur_user_id_idx").on(table.userId),
  referralCodeIdx: index("ur_referral_code_idx").on(table.referralCode),
  tierIdx: index("ur_tier_idx").on(table.currentTier),
}));

export const referralRecords = pgTable("referral_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(),
  friendId: varchar("friend_id").references(() => users.id),
  friendName: varchar("friend_name"),
  friendEmail: varchar("friend_email"),
  friendPhone: varchar("friend_phone"),
  status: varchar("status", { enum: ["pending", "completed", "cancelled"] }).default("pending"),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0.00"),
  serviceUsed: varchar("service_used"),
  completionDate: timestamp("completion_date"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  referrerIdx: index("rr_referrer_id_idx").on(table.referrerId),
  friendIdx: index("rr_friend_id_idx").on(table.friendId),
  statusIdx: index("rr_status_idx").on(table.status),
  createdAtIdx: index("rr_created_at_idx").on(table.createdAt),
}));

// User legal agreements tracking
export const userAgreements = pgTable("user_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  termsOfService: jsonb("terms_of_service").$type<{
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  }>().default(sql`'{"accepted": false, "version": "1.0"}'::jsonb`),
  privacyPolicy: jsonb("privacy_policy").$type<{
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  }>().default(sql`'{"accepted": false, "version": "1.0"}'::jsonb`),
  cookiePolicy: jsonb("cookie_policy").$type<{
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  }>().default(sql`'{"accepted": false, "version": "1.0"}'::jsonb`),
  dataProcessing: jsonb("data_processing").$type<{
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  }>().default(sql`'{"accepted": false, "version": "1.0"}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("uag_user_id_idx").on(table.userId),
}));

// Data export requests
export const dataExportRequests = pgTable("data_export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  status: varchar("status", { enum: ["pending", "processing", "ready", "expired"] }).default("pending"),
  requestedData: jsonb("requested_data").$type<{
    profile?: boolean;
    orders?: boolean;
    payments?: boolean;
    support?: boolean;
    referrals?: boolean;
  }>().default(sql`'{"profile": true, "orders": true, "payments": true, "support": true, "referrals": true}'::jsonb`),
  downloadUrl: text("download_url"),
  downloadCount: integer("download_count").default(0),
  expiresAt: timestamp("expires_at"),
  readyAt: timestamp("ready_at"),
  processedBy: varchar("processed_by").references(() => users.id),
  fileSize: integer("file_size"), // in bytes
  format: varchar("format").default("json"), // json, csv, xml
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("der_user_id_idx").on(table.userId),
  statusIdx: index("der_status_idx").on(table.status),
  expiresAtIdx: index("der_expires_at_idx").on(table.expiresAt),
  createdAtIdx: index("der_created_at_idx").on(table.createdAt),
}));

// Account deletion requests
export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  reason: text("reason"),
  status: varchar("status", { enum: ["pending", "processing", "completed", "cancelled"] }).default("pending"),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  scheduledFor: timestamp("scheduled_for"), // Actual deletion date (30 days later)
  processedAt: timestamp("processed_at"),
  cancellationDeadline: timestamp("cancellation_deadline"),
  retentionData: jsonb("retention_data").$type<{
    keepOrders?: boolean;
    keepPayments?: boolean;
    keepSupport?: boolean;
    anonymizeData?: boolean;
  }>().default(sql`'{"keepOrders": true, "keepPayments": true, "keepSupport": true, "anonymizeData": true}'::jsonb`),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("adr_user_id_idx").on(table.userId),
  statusIdx: index("adr_status_idx").on(table.status),
  scheduledForIdx: index("adr_scheduled_for_idx").on(table.scheduledFor),
  createdAtIdx: index("adr_created_at_idx").on(table.createdAt),
}));

// Tax Categories for organizing taxes
export const taxCategories = pgTable("tax_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: varchar("name").notNull(),
  description: text("description"),
  code: varchar("code").notNull().unique(), // GST, VAT, SERVICE_FEE, etc.
  
  // Configuration
  defaultRate: decimal("default_rate", { precision: 10, scale: 4 }).default("0.0000"), // Default rate for this category
  applicableServices: jsonb("applicable_services").$type<string[]>().default(sql`'[]'::jsonb`), // Service IDs this applies to
  priority: integer("priority").default(0), // Order of application
  
  // Display and UI
  displayOrder: integer("display_order").default(0),
  color: varchar("color").default("#3B82F6"), // Hex color for UI
  icon: varchar("icon").default("Percent"), // Lucide icon name
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  codeIdx: index("tc_code_idx").on(table.code),
  activeIdx: index("tc_active_idx").on(table.isActive),
  priorityIdx: index("tc_priority_idx").on(table.priority),
  displayOrderIdx: index("tc_display_order_idx").on(table.displayOrder),
}));

// Taxes table for comprehensive tax management
export const taxes = pgTable("taxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: varchar("name").notNull(),
  description: text("description"),
  code: varchar("code").notNull().unique(), // CGST_9, SGST_9, SERVICE_FEE, etc.
  displayName: varchar("display_name").notNull(), // User-friendly name for invoices
  
  // Tax category relationship
  categoryId: varchar("category_id").references(() => taxCategories.id),
  
  // Tax configuration
  type: varchar("type", { enum: ["percentage", "fixed", "tiered"] }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(), // Percentage rate or fixed amount
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).default("0.00"), // Minimum tax amount
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }), // Maximum tax amount (null = no limit)
  
  // Tiered tax configuration (for complex tax structures)
  tierConfig: jsonb("tier_config").$type<{
    tiers: Array<{
      minOrderValue: number;
      maxOrderValue?: number;
      rate: number;
      type: "percentage" | "fixed";
    }>;
  }>(),
  
  // Applicability rules
  serviceCategories: jsonb("service_categories").$type<string[]>().default(sql`'[]'::jsonb`), // Service category IDs
  partCategories: jsonb("part_categories").$type<string[]>().default(sql`'[]'::jsonb`), // Part category IDs
  locationBased: boolean("location_based").default(false), // Whether tax is location-specific
  stateRestrictions: jsonb("state_restrictions").$type<string[]>().default(sql`'[]'::jsonb`), // State codes where applicable
  cityRestrictions: jsonb("city_restrictions").$type<string[]>().default(sql`'[]'::jsonb`), // City names where applicable
  
  // Business logic rules
  isPrimary: boolean("is_primary").default(false), // Primary taxes (like GST)
  priority: integer("priority").default(0), // Order of tax application (lower = first)
  combinable: boolean("combinable").default(true), // Can be combined with other taxes
  compoundable: boolean("compoundable").default(false), // Tax calculated on tax-inclusive amount
  
  // Validity period
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"), // null = no expiry
  
  // Order value thresholds
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }).default("0.00"), // Minimum order value for this tax
  maxOrderValue: decimal("max_order_value", { precision: 10, scale: 2 }), // Maximum order value for this tax
  
  // Tax exemption rules
  exemptionRules: jsonb("exemption_rules").$type<{
    userRoles?: string[]; // Exempted user roles
    serviceCodes?: string[]; // Exempted service codes
    orderTypes?: string[]; // Exempted order types
    minimumOrderValue?: number; // Exempt if order above this value
    promoCodeRequired?: string; // Promo code required for exemption
  }>(),
  
  // Display and calculation settings
  roundingRule: varchar("rounding_rule", { 
    enum: ["round", "ceil", "floor", "round_to_nearest_5", "round_to_nearest_10"] 
  }).default("round"),
  showOnInvoice: boolean("show_on_invoice").default(true),
  includeInTotal: boolean("include_in_total").default(true),
  taxableBaseIncludes: jsonb("taxable_base_includes").$type<{
    serviceAmount?: boolean;
    partAmount?: boolean;
    shippingAmount?: boolean;
    previousTaxes?: boolean;
  }>().default(sql`'{"serviceAmount": true, "partAmount": true, "shippingAmount": false, "previousTaxes": false}'::jsonb`),
  
  // Status and visibility
  isActive: boolean("is_active").default(true),
  isHidden: boolean("is_hidden").default(false), // Hidden from public tax breakdown
  requiresApproval: boolean("requires_approval").default(false), // Requires admin approval for changes
  
  // Compliance and legal
  legalReference: text("legal_reference"), // Legal reference or notification number
  hsn_sac_code: varchar("hsn_sac_code"), // HSN/SAC code for tax compliance
  gstType: varchar("gst_type", { enum: ["cgst", "sgst", "igst", "ugst", "cess"] }), // For Indian GST system
  
  // Analytics and tracking
  totalCollected: decimal("total_collected", { precision: 15, scale: 2 }).default("0.00"),
  totalOrders: integer("total_orders").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Change tracking
  changeHistory: jsonb("change_history").$type<Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>>().default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  codeIdx: index("tax_code_idx").on(table.code),
  categoryIdx: index("tax_category_idx").on(table.categoryId),
  typeIdx: index("tax_type_idx").on(table.type),
  activeIdx: index("tax_active_idx").on(table.isActive),
  priorityIdx: index("tax_priority_idx").on(table.priority),
  locationIdx: index("tax_location_idx").on(table.locationBased),
  validityIdx: index("tax_validity_idx").on(table.validFrom, table.validTo),
  primaryIdx: index("tax_primary_idx").on(table.isPrimary),
  gstTypeIdx: index("tax_gst_type_idx").on(table.gstType),
}));

// Promotional Media System for marketing and user engagement
export const promotionalMedia = pgTable("promotional_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  title: varchar("title").notNull(),
  description: text("description"),
  mediaType: varchar("media_type", { enum: ["image", "video"] }).notNull(),
  mediaUrl: text("media_url").notNull(), // Object storage URL
  thumbnailUrl: text("thumbnail_url"), // Thumbnail for videos, compressed for images
  originalFileName: varchar("original_file_name"), // Original uploaded file name
  
  // Media properties
  fileSize: integer("file_size"), // File size in bytes
  duration: integer("duration"), // Video duration in seconds (null for images)
  dimensions: jsonb("dimensions").$type<{
    width: number;
    height: number;
  }>(),
  mimeType: varchar("mime_type"), // image/jpeg, video/mp4, etc.
  
  // Configuration and display settings
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0), // Order in carousel
  placement: varchar("placement", { 
    enum: ["header", "profile", "sidebar", "banner", "modal", "fullscreen"] 
  }).default("header"),
  
  // Auto-play and interaction settings
  autoPlay: boolean("auto_play").default(true), // For videos
  loopEnabled: boolean("loop_enabled").default(true), // Seamless looping
  mutedByDefault: boolean("muted_by_default").default(true), // Browser compliance
  showControls: boolean("show_controls").default(false), // Video controls visibility
  allowPause: boolean("allow_pause").default(false), // Whether users can pause
  clickAction: varchar("click_action", {
    enum: ["none", "open_url", "show_modal", "track_only"]
  }).default("track_only"),
  clickUrl: text("click_url"), // URL to open on click
  
  // Targeting and audience
  targetAudience: jsonb("target_audience").$type<{
    userRoles?: string[]; // ["user", "service_provider", "admin"]
    newUsersOnly?: boolean; // Show only to new users
    returningUsersOnly?: boolean; // Show only to returning users
    minimumOrderCount?: number; // Minimum orders user should have
    excludeUserIds?: string[]; // Specific users to exclude
  }>().default(sql`'{}'::jsonb`),
  
  // Geographic targeting
  geographicTargeting: jsonb("geographic_targeting").$type<{
    countries?: string[]; // Country codes
    states?: string[]; // State names
    cities?: string[]; // City names
    excludeLocations?: string[]; // Locations to exclude
  }>().default(sql`'{}'::jsonb`),
  
  // Scheduling configuration
  isScheduled: boolean("is_scheduled").default(false),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  schedulingRules: jsonb("scheduling_rules").$type<{
    timeRanges?: Array<{ start: string; end: string }>; // ["09:00", "18:00"]
    daysOfWeek?: number[]; // [0, 1, 2, 3, 4] for Mon-Fri
    excludeDates?: string[]; // Specific dates to exclude
    timezoneOffset?: number; // UTC offset for scheduling
  }>().default(sql`'{}'::jsonb`),
  
  // Campaign management
  campaignId: varchar("campaign_id"), // Group related media items
  campaignName: varchar("campaign_name"),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  priority: integer("priority").default(0), // Higher priority shows first
  weight: integer("weight").default(1), // For weighted random selection
  
  // Analytics and tracking
  impressions: integer("impressions").default(0), // How many times displayed
  clicks: integer("clicks").default(0), // User interactions
  uniqueViews: integer("unique_views").default(0), // Unique user views
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
  avgViewDuration: integer("avg_view_duration").default(0), // Average seconds viewed
  lastDisplayed: timestamp("last_displayed"),
  
  // Performance metrics
  loadTime: integer("load_time").default(0), // Average load time in ms
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }).default("0.00"),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  // A/B Testing
  variant: varchar("variant").default("default"), // A, B, C, etc.
  testGroup: varchar("test_group"), // Test group identifier
  conversionGoal: varchar("conversion_goal"), // What success looks like
  
  // Business rules and compliance
  requiresAgeVerification: boolean("requires_age_verification").default(false),
  contentRating: varchar("content_rating", {
    enum: ["general", "teen", "mature", "adult"]
  }).default("general"),
  complianceFlags: jsonb("compliance_flags").$type<{
    gdprCompliant?: boolean;
    coppaCompliant?: boolean;
    accessibilityCompliant?: boolean;
    adStandards?: boolean;
  }>().default(sql`'{"gdprCompliant": true, "coppaCompliant": true}'::jsonb`),
  
  // Optimization settings
  preloadStrategy: varchar("preload_strategy", {
    enum: ["none", "metadata", "auto"]
  }).default("metadata"),
  compressionLevel: integer("compression_level").default(80), // 0-100
  enableLazyLoading: boolean("enable_lazy_loading").default(true),
  cacheTtl: integer("cache_ttl").default(3600), // Cache TTL in seconds
  
  // Status and lifecycle
  status: varchar("status", {
    enum: ["draft", "pending_review", "approved", "active", "paused", "expired", "archived"]
  }).default("draft"),
  moderationStatus: varchar("moderation_status", {
    enum: ["pending", "approved", "rejected", "flagged"]
  }).default("pending"),
  moderationNotes: text("moderation_notes"),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  archivedAt: timestamp("archived_at"),
  
  // Change tracking
  changeHistory: jsonb("change_history").$type<Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>>().default(sql`'[]'::jsonb`),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  createdByIdx: index("pm_created_by_idx").on(table.createdBy),
  mediaTypeIdx: index("pm_media_type_idx").on(table.mediaType),
  isActiveIdx: index("pm_is_active_idx").on(table.isActive),
  displayOrderIdx: index("pm_display_order_idx").on(table.displayOrder),
  placementIdx: index("pm_placement_idx").on(table.placement),
  statusIdx: index("pm_status_idx").on(table.status),
  scheduledIdx: index("pm_scheduled_idx").on(table.isScheduled, table.startDate, table.endDate),
  campaignIdx: index("pm_campaign_idx").on(table.campaignId),
  priorityIdx: index("pm_priority_idx").on(table.priority),
  impressionsIdx: index("pm_impressions_idx").on(table.impressions),
  clicksIdx: index("pm_clicks_idx").on(table.clicks),
  lastDisplayedIdx: index("pm_last_displayed_idx").on(table.lastDisplayed),
  moderationIdx: index("pm_moderation_idx").on(table.moderationStatus),
  createdAtIdx: index("pm_created_at_idx").on(table.createdAt),
  activeContentIdx: index("pm_active_content_idx").on(table.isActive, table.status, table.placement),
  performanceIdx: index("pm_performance_idx").on(table.impressions, table.clicks, table.conversionRate),
}));

// Promotional Media Analytics - Detailed tracking table
export const promotionalMediaAnalytics = pgTable("promotional_media_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaId: varchar("media_id").references(() => promotionalMedia.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // Can be null for anonymous tracking
  sessionId: varchar("session_id"), // Browser session identifier
  
  // Event tracking
  eventType: varchar("event_type", {
    enum: ["impression", "click", "play", "pause", "complete", "error", "load"]
  }).notNull(),
  eventValue: decimal("event_value", { precision: 10, scale: 2 }), // Associated value if any
  
  // Context information
  placement: varchar("placement"), // Where it was shown
  viewportSize: jsonb("viewport_size").$type<{ width: number; height: number }>(),
  deviceType: varchar("device_type", { enum: ["desktop", "tablet", "mobile"] }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  
  // Timing data
  viewDuration: integer("view_duration"), // How long viewed in seconds
  timeToFirstByte: integer("time_to_first_byte"), // Load performance
  domLoadTime: integer("dom_load_time"), // DOM rendering time
  
  // User behavior
  scrollDepth: integer("scroll_depth"), // How far user scrolled
  clickPosition: jsonb("click_position").$type<{ x: number; y: number }>(),
  interactionScore: decimal("interaction_score", { precision: 5, scale: 2 }).default("0.00"),
  
  // Attribution
  referrer: text("referrer"), // Previous page
  source: varchar("source"), // utm_source equivalent
  medium: varchar("medium"), // utm_medium equivalent  
  campaign: varchar("campaign"), // utm_campaign equivalent
  
  // Geographic data
  country: varchar("country"),
  state: varchar("state"),
  city: varchar("city"),
  timezone: varchar("timezone"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  mediaIdIdx: index("pma_media_id_idx").on(table.mediaId),
  userIdIdx: index("pma_user_id_idx").on(table.userId),
  sessionIdIdx: index("pma_session_id_idx").on(table.sessionId),
  eventTypeIdx: index("pma_event_type_idx").on(table.eventType),
  createdAtIdx: index("pma_created_at_idx").on(table.createdAt),
  deviceTypeIdx: index("pma_device_type_idx").on(table.deviceType),
  geographicIdx: index("pma_geographic_idx").on(table.country, table.state, table.city),
  performanceIdx: index("pma_performance_idx").on(table.mediaId, table.eventType, table.createdAt),
}));

// Insert schemas for new tables
export const insertUserReferralSchema = createInsertSchema(userReferrals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralRecordSchema = createInsertSchema(referralRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserAgreementSchema = createInsertSchema(userAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountDeletionRequestSchema = createInsertSchema(accountDeletionRequests).omit({ id: true, createdAt: true, updatedAt: true });

// Tax management insert schemas
export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaxSchema = createInsertSchema(taxes).omit({ id: true, createdAt: true, updatedAt: true });

// Promotional media insert schemas
export const insertPromotionalMediaSchema = createInsertSchema(promotionalMedia).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  impressions: true,
  clicks: true,
  uniqueViews: true,
  conversionRate: true,
  avgViewDuration: true,
  lastDisplayed: true,
  loadTime: true,
  errorRate: true,
  bounceRate: true,
  changeHistory: true
});
export const insertPromotionalMediaAnalyticsSchema = createInsertSchema(promotionalMediaAnalytics).omit({ 
  id: true, 
  createdAt: true 
});

// Validation schemas for API endpoints
export const referralCodeGenerateSchema = z.object({
  customCode: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores').optional(),
});

export const referralRecordCreateSchema = z.object({
  friendName: z.string().min(1).max(100),
  friendEmail: z.string().email().optional(),
  friendPhone: z.string().min(10).max(15).optional(),
  serviceUsed: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

export const referralRecordUpdateSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  earnings: z.number().min(0).optional(),
  serviceUsed: z.string().max(100).optional(),
  completionDate: z.string().datetime().optional(),
});

export const userAgreementUpdateSchema = z.object({
  termsOfService: z.object({
    accepted: z.boolean(),
    version: z.string(),
  }).optional(),
  privacyPolicy: z.object({
    accepted: z.boolean(),
    version: z.string(),
  }).optional(),
  cookiePolicy: z.object({
    accepted: z.boolean(),
    version: z.string(),
  }).optional(),
  dataProcessing: z.object({
    accepted: z.boolean(),
    version: z.string(),
  }).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one agreement must be provided for update',
});

export const dataExportRequestCreateSchema = z.object({
  requestedData: z.object({
    profile: z.boolean().optional(),
    orders: z.boolean().optional(),
    payments: z.boolean().optional(),
    support: z.boolean().optional(),
    referrals: z.boolean().optional(),
  }).optional(),
  format: z.enum(['json', 'csv', 'xml']).default('json'),
});

export const accountDeletionRequestCreateSchema = z.object({
  reason: z.string().max(1000).optional(),
  retentionData: z.object({
    keepOrders: z.boolean().optional(),
    keepPayments: z.boolean().optional(),
    keepSupport: z.boolean().optional(),
    anonymizeData: z.boolean().optional(),
  }).optional(),
});

// Tax Category validation schemas
export const taxCategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores'),
  defaultRate: z.number().min(0).max(100).optional(),
  applicableServices: z.array(z.string()).default([]),
  priority: z.number().int().min(0).default(0),
  displayOrder: z.number().int().min(0).default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').default("#3B82F6"),
  icon: z.string().default("Percent"),
  isActive: z.boolean().default(true),
});

export const taxCategoryUpdateSchema = taxCategoryCreateSchema.partial();

// Tax validation schemas
export const taxCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores'),
  displayName: z.string().min(1).max(100),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["percentage", "fixed", "tiered"]),
  rate: z.number().min(0),
  minAmount: z.number().min(0).default(0),
  maxAmount: z.number().min(0).optional(),
  tierConfig: z.object({
    tiers: z.array(z.object({
      minOrderValue: z.number().min(0),
      maxOrderValue: z.number().min(0).optional(),
      rate: z.number().min(0),
      type: z.enum(["percentage", "fixed"]),
    })),
  }).optional(),
  serviceCategories: z.array(z.string()).default([]),
  partCategories: z.array(z.string()).default([]),
  locationBased: z.boolean().default(false),
  stateRestrictions: z.array(z.string()).default([]),
  cityRestrictions: z.array(z.string()).default([]),
  isPrimary: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
  combinable: z.boolean().default(true),
  compoundable: z.boolean().default(false),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  minOrderValue: z.number().min(0).default(0),
  maxOrderValue: z.number().min(0).optional(),
  exemptionRules: z.object({
    userRoles: z.array(z.string()).optional(),
    serviceCodes: z.array(z.string()).optional(),
    orderTypes: z.array(z.string()).optional(),
    minimumOrderValue: z.number().min(0).optional(),
    promoCodeRequired: z.string().optional(),
  }).optional(),
  roundingRule: z.enum(["round", "ceil", "floor", "round_to_nearest_5", "round_to_nearest_10"]).default("round"),
  showOnInvoice: z.boolean().default(true),
  includeInTotal: z.boolean().default(true),
  taxableBaseIncludes: z.object({
    serviceAmount: z.boolean().optional(),
    partAmount: z.boolean().optional(),
    shippingAmount: z.boolean().optional(),
    previousTaxes: z.boolean().optional(),
  }).default({
    serviceAmount: true,
    partAmount: true,
    shippingAmount: false,
    previousTaxes: false,
  }),
  isActive: z.boolean().default(true),
  isHidden: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  legalReference: z.string().max(500).optional(),
  hsn_sac_code: z.string().max(50).optional(),
  gstType: z.enum(["cgst", "sgst", "igst", "ugst", "cess"]).optional(),
});

export const taxUpdateSchema = taxCreateSchema.partial();

// Tax calculation schemas
export const taxCalculationRequestSchema = z.object({
  orderValue: z.number().min(0),
  serviceCategories: z.array(z.string()).default([]),
  partCategories: z.array(z.string()).default([]),
  userLocation: z.object({
    state: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  userRole: z.string().optional(),
  promoCode: z.string().optional(),
  orderType: z.string().optional(),
});

// Bulk operations schemas
export const taxBulkOperationSchema = z.object({
  operation: z.enum(["activate", "deactivate", "delete", "update_priority"]),
  taxIds: z.array(z.string().uuid()).min(1),
  data: z.object({
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
  }).optional(),
});

export const taxStatisticsFiltersSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  stateFilter: z.string().optional(),
  typeFilter: z.enum(["percentage", "fixed", "tiered"]).optional(),
});

// Promotional Media validation schemas
export const promotionalMediaCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  mediaType: z.enum(["image", "video"]),
  mediaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  originalFileName: z.string().max(255).optional(),
  fileSize: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  dimensions: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }).optional(),
  mimeType: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  placement: z.enum(["header", "profile", "sidebar", "banner", "modal", "fullscreen"]).default("header"),
  autoPlay: z.boolean().default(true),
  loopEnabled: z.boolean().default(true),
  mutedByDefault: z.boolean().default(true),
  showControls: z.boolean().default(false),
  allowPause: z.boolean().default(false),
  clickAction: z.enum(["none", "open_url", "show_modal", "track_only"]).default("track_only"),
  clickUrl: z.string().url().optional(),
  targetAudience: z.object({
    userRoles: z.array(z.string()).optional(),
    newUsersOnly: z.boolean().optional(),
    returningUsersOnly: z.boolean().optional(),
    minimumOrderCount: z.number().int().min(0).optional(),
    excludeUserIds: z.array(z.string().uuid()).optional(),
  }).default({}),
  geographicTargeting: z.object({
    countries: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    excludeLocations: z.array(z.string()).optional(),
  }).default({}),
  isScheduled: z.boolean().default(false),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  schedulingRules: z.object({
    timeRanges: z.array(z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    excludeDates: z.array(z.string().date()).optional(),
    timezoneOffset: z.number().int().min(-12).max(14).optional(),
  }).default({}),
  campaignId: z.string().max(100).optional(),
  campaignName: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).default([]),
  priority: z.number().int().min(0).default(0),
  weight: z.number().int().min(1).default(1),
  requiresAgeVerification: z.boolean().default(false),
  contentRating: z.enum(["general", "teen", "mature", "adult"]).default("general"),
  complianceFlags: z.object({
    gdprCompliant: z.boolean().optional(),
    coppaCompliant: z.boolean().optional(),
    accessibilityCompliant: z.boolean().optional(),
    adStandards: z.boolean().optional(),
  }).default({ gdprCompliant: true, coppaCompliant: true }),
  preloadStrategy: z.enum(["none", "metadata", "auto"]).default("metadata"),
  compressionLevel: z.number().int().min(0).max(100).default(80),
  enableLazyLoading: z.boolean().default(true),
  cacheTtl: z.number().int().min(0).default(3600),
  status: z.enum(["draft", "pending_review", "approved", "active", "paused", "expired", "archived"]).default("draft"),
  moderationStatus: z.enum(["pending", "approved", "rejected", "flagged"]).default("pending"),
  moderationNotes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).default({}),
});

export const promotionalMediaUpdateSchema = promotionalMediaCreateSchema.partial();

export const promotionalMediaFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  placement: z.enum(["header", "profile", "sidebar", "banner", "modal", "fullscreen"]).optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  status: z.enum(["draft", "pending_review", "approved", "active", "paused", "expired", "archived"]).optional(),
  moderationStatus: z.enum(["pending", "approved", "rejected", "flagged"]).optional(),
  campaignId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["createdAt", "title", "displayOrder", "priority", "impressions", "clicks"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const promotionalMediaBulkOperationSchema = z.object({
  operation: z.enum(["activate", "deactivate", "delete", "archive", "update_priority"]),
  mediaIds: z.array(z.string().uuid()).min(1),
  data: z.object({
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
    status: z.enum(["draft", "pending_review", "approved", "active", "paused", "expired", "archived"]).optional(),
  }).optional(),
});

export const promotionalMediaAnalyticsCreateSchema = z.object({
  mediaId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().max(255).optional(),
  eventType: z.enum(["impression", "click", "play", "pause", "complete", "error", "load"]),
  eventValue: z.number().optional(),
  placement: z.string().max(50).optional(),
  viewportSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }).optional(),
  deviceType: z.enum(["desktop", "tablet", "mobile"]).optional(),
  userAgent: z.string().max(1000).optional(),
  ipAddress: z.string().max(45).optional(),
  viewDuration: z.number().int().min(0).optional(),
  timeToFirstByte: z.number().int().min(0).optional(),
  domLoadTime: z.number().int().min(0).optional(),
  scrollDepth: z.number().int().min(0).max(100).optional(),
  clickPosition: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
  }).optional(),
  interactionScore: z.number().min(0).max(100).optional(),
  referrer: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  medium: z.string().max(100).optional(),
  campaign: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  metadata: z.record(z.any()).default({}),
});

export const promotionalMediaActiveQuerySchema = z.object({
  placement: z.enum(["header", "profile", "sidebar", "banner", "modal", "fullscreen"]).optional(),
  userId: z.string().uuid().optional(),
  userRole: z.string().optional(),
  country: z.string().max(2).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const promotionalMediaStatisticsSchema = z.object({
  mediaIds: z.array(z.string().uuid()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  placement: z.enum(["header", "profile", "sidebar", "banner", "modal", "fullscreen"]).optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

// Type exports for new tables
export type UserReferral = typeof userReferrals.$inferSelect;
export type InsertUserReferral = z.infer<typeof insertUserReferralSchema>;
export type ReferralRecord = typeof referralRecords.$inferSelect;
export type InsertReferralRecord = z.infer<typeof insertReferralRecordSchema>;
export type UserAgreement = typeof userAgreements.$inferSelect;
export type InsertUserAgreement = z.infer<typeof insertUserAgreementSchema>;
export type DataExportRequest = typeof dataExportRequests.$inferSelect;
export type InsertDataExportRequest = z.infer<typeof insertDataExportRequestSchema>;
export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;
export type InsertAccountDeletionRequest = z.infer<typeof insertAccountDeletionRequestSchema>;

// Phone notification system types
export type PhoneCallLog = typeof phoneCallLogs.$inferSelect;
export type InsertPhoneCallLog = z.infer<typeof insertPhoneCallLogSchema>;
export type NotificationStatistics = typeof notificationStatistics.$inferSelect;
export type InsertNotificationStatistics = z.infer<typeof insertNotificationStatisticsSchema>;
export type ProviderPhoneNotificationSettings = typeof providerPhoneNotificationSettings.$inferSelect;
export type InsertProviderPhoneNotificationSettings = z.infer<typeof insertProviderPhoneNotificationSettingsSchema>;

// Tax management type exports
export type TaxCategory = typeof taxCategories.$inferSelect;
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;
export type Tax = typeof taxes.$inferSelect;
export type InsertTax = z.infer<typeof insertTaxSchema>;

// Promotional media type exports
export type PromotionalMedia = typeof promotionalMedia.$inferSelect;
export type InsertPromotionalMedia = z.infer<typeof insertPromotionalMediaSchema>;
export type PromotionalMediaAnalytics = typeof promotionalMediaAnalytics.$inferSelect;
export type InsertPromotionalMediaAnalytics = z.infer<typeof insertPromotionalMediaAnalyticsSchema>;

// API operation types
export type ReferralCodeGenerateData = z.infer<typeof referralCodeGenerateSchema>;
export type ReferralRecordCreateData = z.infer<typeof referralRecordCreateSchema>;
export type ReferralRecordUpdateData = z.infer<typeof referralRecordUpdateSchema>;
export type UserAgreementUpdateData = z.infer<typeof userAgreementUpdateSchema>;
export type DataExportRequestCreateData = z.infer<typeof dataExportRequestCreateSchema>;
export type AccountDeletionRequestCreateData = z.infer<typeof accountDeletionRequestCreateSchema>;

// Tax management API operation types
export type TaxCategoryCreateData = z.infer<typeof taxCategoryCreateSchema>;
export type TaxCategoryUpdateData = z.infer<typeof taxCategoryUpdateSchema>;
export type TaxCreateData = z.infer<typeof taxCreateSchema>;
export type TaxUpdateData = z.infer<typeof taxUpdateSchema>;
export type TaxCalculationRequestData = z.infer<typeof taxCalculationRequestSchema>;
export type TaxBulkOperationData = z.infer<typeof taxBulkOperationSchema>;
export type TaxStatisticsFiltersData = z.infer<typeof taxStatisticsFiltersSchema>;

// Promotional media API operation types
export type PromotionalMediaCreateData = z.infer<typeof promotionalMediaCreateSchema>;
export type PromotionalMediaUpdateData = z.infer<typeof promotionalMediaUpdateSchema>;
export type PromotionalMediaFiltersData = z.infer<typeof promotionalMediaFiltersSchema>;
export type PromotionalMediaBulkOperationData = z.infer<typeof promotionalMediaBulkOperationSchema>;
export type PromotionalMediaAnalyticsCreateData = z.infer<typeof promotionalMediaAnalyticsCreateSchema>;
export type PromotionalMediaActiveQueryData = z.infer<typeof promotionalMediaActiveQuerySchema>;
export type PromotionalMediaStatisticsData = z.infer<typeof promotionalMediaStatisticsSchema>;

// ========================================
// ORDER LIFECYCLE TYPE EXPORTS
// ========================================

// Table select types
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type OrderDocument = typeof orderDocuments.$inferSelect;
export type CancellationPolicy = typeof cancellationPolicies.$inferSelect;
export type OrderCancellation = typeof orderCancellations.$inferSelect;
export type ProviderAvailability = typeof providerAvailability.$inferSelect;
export type OrderLocationUpdate = typeof orderLocationUpdates.$inferSelect;
export type OrderChatMessage = typeof orderChatMessages.$inferSelect;
export type OrderRating = typeof orderRatings.$inferSelect;
export type ServiceSchedulingRule = typeof serviceSchedulingRules.$inferSelect;

// ========================================
// ORDER LIFECYCLE INSERT SCHEMAS
// ========================================

// Order Status History schemas
export const insertOrderStatusHistorySchema = z.object({
  orderId: z.string().uuid(),
  fromStatus: z.string().optional(),
  toStatus: z.string(),
  changedBy: z.string().uuid().optional(),
  changedByRole: z.enum(['customer', 'provider', 'admin', 'system']).default('system'),
  reason: z.string().optional(),
  metadata: z.any().optional(),
});

// Order Documents schemas
export const insertOrderDocumentSchema = z.object({
  orderId: z.string().uuid(),
  documentType: z.enum(['receipt', 'invoice', 'completion_certificate', 'warranty', 'before_photo', 'after_photo', 'work_evidence', 'payment_proof']),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  uploadedByRole: z.enum(['customer', 'provider', 'admin', 'system']).optional(),
  isPublic: z.boolean().default(false),
  metadata: z.any().optional(),
});

// Cancellation Policies schemas
export const insertCancellationPolicySchema = z.object({
  serviceId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  policyName: z.string(),
  description: z.string().optional(),
  freeHours: z.number().default(0),
  partialRefundHours: z.number().default(24),
  noRefundHours: z.number().default(2),
  freeRefundPercent: z.number().default(100),
  partialRefundPercent: z.number().default(50),
  noRefundPercent: z.number().default(0),
  providerPenaltyPercent: z.number().default(10),
  lateArrivalPenaltyPercent: z.number().default(5),
  emergencyExemption: z.boolean().default(true),
  weatherExemption: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

// Order Cancellations schemas
export const insertOrderCancellationSchema = z.object({
  orderId: z.string().uuid(),
  cancelledBy: z.string().uuid(),
  cancelledByRole: z.enum(['customer', 'provider', 'admin']),
  reason: z.enum(['customer_change', 'provider_unavailable', 'weather', 'emergency', 'technical_issue', 'payment_issue', 'other']),
  customReason: z.string().optional(),
  policyId: z.string().uuid().optional(),
  hoursBeforeService: z.number().optional(),
  appliedRefundPercent: z.number().optional(),
  refundAmount: z.number().optional(),
  penaltyAmount: z.number().optional(),
  refundStatus: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  refundTransactionId: z.string().optional(),
  processedAt: z.date().optional(),
});

// Provider Availability schemas
export const insertProviderAvailabilitySchema = z.object({
  providerId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  availabilityType: z.enum(['available', 'busy', 'break', 'unavailable']).default('available'),
  maxBookings: z.number().default(1),
  currentBookings: z.number().default(0),
  bufferMinutes: z.number().default(15),
  serviceRadius: z.number().default(25),
  preferredAreas: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(true),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
  notes: z.string().optional(),
});

// Order Location Updates schemas
export const insertOrderLocationUpdateSchema = z.object({
  orderId: z.string().uuid(),
  providerId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  bearing: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  status: z.enum(['enroute', 'arrived', 'working', 'break', 'returning']),
  address: z.string().optional(),
  landmark: z.string().optional(),
  distanceToCustomer: z.number().optional(),
  estimatedArrival: z.date().optional(),
  isSharedWithCustomer: z.boolean().default(true),
  shareLevel: z.enum(['exact', 'approximate', 'area_only']).default('approximate'),
  deviceInfo: z.any().optional(),
});

// Order Chat Messages schemas
export const insertOrderChatMessageSchema = z.object({
  orderId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: z.enum(['customer', 'provider', 'admin', 'system']),
  messageType: z.enum(['text', 'image', 'audio', 'video', 'location', 'document', 'system', 'status_update']).default('text'),
  content: z.string().min(1),
  metadata: z.any().optional(),
  attachments: z.array(z.string()).optional(),
  replyToId: z.string().uuid().optional(),
  threadId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isSystemMessage: z.boolean().default(false),
});

// Order Ratings schemas
export const insertOrderRatingSchema = z.object({
  orderId: z.string().uuid(),
  raterId: z.string().uuid(),
  raterRole: z.enum(['customer', 'provider']),
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5).optional(),
  timelinessRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  reviewText: z.string().max(1000).optional(),
  positives: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  isVerified: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

// Service Scheduling Rules schemas
export const insertServiceSchedulingRuleSchema = z.object({
  serviceId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  minAdvanceBookingHours: z.number().min(0).default(2),
  maxAdvanceBookingDays: z.number().min(1).default(30),
  estimatedDurationMinutes: z.number().min(15),
  bufferMinutes: z.number().min(0).default(15),
  availableDays: z.array(z.number().min(0).max(6)).default([1,2,3,4,5,6,0]),
  timeSlots: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    maxBookings: z.number().min(1).optional(),
  })),
  serviceRadius: z.number().min(1).default(25),
  maxDailyBookings: z.number().min(1).optional(),
  maxHourlyBookings: z.number().min(1).optional(),
  weatherDependent: z.boolean().default(false),
  seasonalAvailability: z.any().optional(),
  rushHours: z.any().optional(),
  rushHourMultiplier: z.number().default(1.5),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
});

// Insert types
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type InsertOrderDocument = z.infer<typeof insertOrderDocumentSchema>;
export type InsertCancellationPolicy = z.infer<typeof insertCancellationPolicySchema>;
export type InsertOrderCancellation = z.infer<typeof insertOrderCancellationSchema>;
export type InsertProviderAvailability = z.infer<typeof insertProviderAvailabilitySchema>;
export type InsertOrderLocationUpdate = z.infer<typeof insertOrderLocationUpdateSchema>;
export type InsertOrderChatMessage = z.infer<typeof insertOrderChatMessageSchema>;
export type InsertOrderRating = z.infer<typeof insertOrderRatingSchema>;
export type InsertServiceSchedulingRule = z.infer<typeof insertServiceSchedulingRuleSchema>;

// SECURITY: Order lifecycle validation schemas for RBAC endpoints
export const orderAcceptanceSchema = z.object({
  estimatedArrival: z.string().optional(),
  notes: z.string().max(500).optional(),
  requiresSpecialEquipment: z.boolean().optional().default(false),
  specialEquipmentNotes: z.string().max(200).optional(),
  estimatedDuration: z.number().min(15).max(480).optional(), // 15 minutes to 8 hours
  customPrice: z.number().min(0).optional(),
  priceJustification: z.string().max(300).optional()
});

export const orderDeclineSchema = z.object({
  reason: z.enum([
    'not_available',
    'outside_service_area',
    'insufficient_skills',
    'equipment_unavailable',
    'safety_concerns',
    'pricing_disagreement',
    'other'
  ]),
  customReason: z.string().min(10).max(300).optional(),
  suggestedAlternative: z.string().max(200).optional()
});

export const orderStatusUpdateSchema = z.object({
  notes: z.string().max(500).optional(),
  estimatedCompletion: z.string().optional(),
  workProgress: z.number().min(0).max(100).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  customerNotification: z.string().max(200).optional()
});

export const orderLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  timestamp: z.string().optional()
});

export const orderChatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  messageType: z.enum(['text', 'image', 'location', 'system']).default('text'),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'document', 'audio']),
    filename: z.string().optional()
  })).max(3).optional()
});

export type OrderAcceptanceData = z.infer<typeof orderAcceptanceSchema>;
export type OrderDeclineData = z.infer<typeof orderDeclineSchema>;
export type OrderStatusUpdateData = z.infer<typeof orderStatusUpdateSchema>;
export type OrderLocationUpdateData = z.infer<typeof orderLocationUpdateSchema>;
export type OrderChatMessageData = z.infer<typeof orderChatMessageSchema>;

// ========================================
// ENHANCED ORDER STATE MACHINE ENUMS
// ========================================

// Complete order state machine for service bookings
export const OrderStateEnum = z.enum([
  "requested",       // Initial customer request
  "matching",        // BackgroundMatcher is finding providers
  "matched",         // Provider found and job request sent
  "accepted",        // Provider accepted the job
  "assigned",        // Provider officially assigned to order
  "enroute",         // Provider is traveling to location
  "arrived",         // Provider has arrived at location
  "started",         // Work has begun
  "in_progress",     // Work is ongoing
  "work_completed",  // Work finished, awaiting payment/confirmation
  "completed",       // Order fully completed
  "cancelled",       // Order cancelled
  "refunded",        // Order refunded
  "failed"           // Order failed to complete
]);

export const CancellationReasonEnum = z.enum([
  "customer_change",
  "provider_unavailable", 
  "weather",
  "emergency",
  "technical_issue",
  "payment_issue",
  "quality_issue",
  "safety_concern",
  "other"
]);

export const RefundStatusEnum = z.enum([
  "pending",
  "processing", 
  "completed",
  "failed",
  "partial"
]);

// ========================================
// API OPERATION SCHEMAS
// ========================================

// Order state transition validation
export const orderStateTransitionSchema = z.object({
  fromState: OrderStateEnum,
  toState: OrderStateEnum,
  reason: z.string().optional(),
  metadata: z.object({
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    }).optional(),
    photos: z.array(z.string()).optional(),
    notes: z.string().optional(),
    estimatedTime: z.string().optional(),
    actualTime: z.string().optional(),
  }).optional(),
});

// Provider availability update schema
export const providerAvailabilityUpdateSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availabilityType: z.enum(["available", "busy", "break", "unavailable"]).optional(),
  maxBookings: z.number().min(1).optional(),
  bufferMinutes: z.number().min(0).optional(),
  serviceRadius: z.number().min(1).optional(),
  preferredAreas: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Location sharing update schema
export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  bearing: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  status: z.enum(["enroute", "arrived", "working", "break", "returning"]),
  address: z.string().optional(),
  landmark: z.string().optional(),
  shareLevel: z.enum(["exact", "approximate", "area_only"]).optional(),
});

// Chat message creation schema
export const orderChatMessageCreateSchema = z.object({
  orderId: z.string().uuid(),
  messageType: z.enum(["text", "image", "audio", "video", "location", "document", "system", "status_update"]).default("text"),
  content: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  replyToId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  metadata: z.object({
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    duration: z.number().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    workPhase: z.string().optional(),
    beforeAfter: z.enum(["before", "after", "during"]).optional(),
  }).optional(),
});

// Order rating creation schema
export const orderRatingCreateSchema = z.object({
  orderId: z.string().uuid(),
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5).optional(),
  timelinessRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  reviewText: z.string().max(1000).optional(),
  positives: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
});

// Order cancellation request schema
export const orderCancellationRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: CancellationReasonEnum,
  customReason: z.string().max(500).optional(),
}).refine(data => {
  if (data.reason === 'other' && !data.customReason) {
    return false;
  }
  return true;
}, {
  message: 'Custom reason is required when reason is "other"',
  path: ['customReason'],
});

// Service scheduling constraint schema
export const serviceSchedulingConstraintSchema = z.object({
  serviceId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  minAdvanceBookingHours: z.number().min(0).default(2),
  maxAdvanceBookingDays: z.number().min(1).default(30),
  estimatedDurationMinutes: z.number().min(15),
  bufferMinutes: z.number().min(0).default(15),
  availableDays: z.array(z.number().min(0).max(6)).default([1,2,3,4,5,6,0]),
  timeSlots: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    maxBookings: z.number().min(1).optional(),
  })),
  serviceRadius: z.number().min(1).default(25),
  maxDailyBookings: z.number().min(1).optional(),
  maxHourlyBookings: z.number().min(1).optional(),
  weatherDependent: z.boolean().default(false),
});

// ========================================
// API OPERATION TYPES
// ========================================

export type OrderStateTransitionData = z.infer<typeof orderStateTransitionSchema>;
export type ProviderAvailabilityUpdateData = z.infer<typeof providerAvailabilityUpdateSchema>;
export type LocationUpdateData = z.infer<typeof locationUpdateSchema>;
export type OrderChatMessageCreateData = z.infer<typeof orderChatMessageCreateSchema>;
export type OrderRatingCreateData = z.infer<typeof orderRatingCreateSchema>;
export type OrderCancellationRequestData = z.infer<typeof orderCancellationRequestSchema>;
export type ServiceSchedulingConstraintData = z.infer<typeof serviceSchedulingConstraintSchema>;

// API operation types for Service Provider Profiles
export type ServiceProviderProfileUpdateData = z.infer<typeof serviceProviderProfileUpdateSchema>;
export type ServiceProviderDocumentSubmissionData = z.infer<typeof serviceProviderDocumentSubmissionSchema>;
export type ServiceProviderStatusUpdateData = z.infer<typeof serviceProviderStatusUpdateSchema>;

// Enum types for consistent usage
export type ServiceProviderBusinessType = z.infer<typeof serviceProviderBusinessTypeEnum>;

// ========================================
// ORDER LIFECYCLE ENHANCEMENT TABLES
// ========================================

// Order Status History - Complete audit trail for service bookings
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull(),
  fromStatus: varchar("from_status"),
  toStatus: varchar("to_status").notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  changedByRole: varchar("changed_by_role", { enum: ["customer", "provider", "admin", "system"] }).default("system"),
  reason: text("reason"),
  metadata: jsonb("metadata").$type<{
    location?: { latitude: number; longitude: number; address?: string };
    estimatedTime?: string;
    actualTime?: string;
    photos?: string[];
    notes?: string;
    automaticTransition?: boolean;
    triggerEvent?: string;
  }>(),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdx: index("osh_order_idx").on(table.orderId),
  statusIdx: index("osh_status_idx").on(table.toStatus),
  timestampIdx: index("osh_timestamp_idx").on(table.timestamp),
  changedByIdx: index("osh_changed_by_idx").on(table.changedBy),
}));

// Order Documents and Receipts
export const orderDocuments = pgTable("order_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull(),
  documentType: varchar("document_type", { 
    enum: ["receipt", "invoice", "completion_certificate", "warranty", "before_photo", "after_photo", "work_evidence", "payment_proof"] 
  }).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  url: varchar("url").notNull(),
  fileName: varchar("file_name"),
  fileSize: integer("file_size"), // in bytes
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedByRole: varchar("uploaded_by_role", { enum: ["customer", "provider", "admin", "system"] }),
  isPublic: boolean("is_public").default(false), // Whether customer can view
  metadata: jsonb("metadata").$type<{
    coordinates?: { latitude: number; longitude: number };
    timestamp?: string;
    workPhase?: string;
    quality?: "before" | "after" | "during";
    tags?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdx: index("od_order_idx").on(table.orderId),
  typeIdx: index("od_type_idx").on(table.documentType),
  uploadedByIdx: index("od_uploaded_by_idx").on(table.uploadedBy),
  publicIdx: index("od_public_idx").on(table.isPublic),
}));

// Cancellation Policies and Rules
export const cancellationPolicies = pgTable("cancellation_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").references(() => services.id),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  policyName: varchar("policy_name").notNull(),
  description: text("description"),
  
  // Time-based rules
  freeHours: integer("free_hours").default(0), // Hours before service start for free cancellation
  partialRefundHours: integer("partial_refund_hours").default(24), // Hours for partial refund
  noRefundHours: integer("no_refund_hours").default(2), // Hours before no refund
  
  // Refund percentages
  freeRefundPercent: integer("free_refund_percent").default(100),
  partialRefundPercent: integer("partial_refund_percent").default(50),
  noRefundPercent: integer("no_refund_percent").default(0),
  
  // Provider penalties
  providerPenaltyPercent: integer("provider_penalty_percent").default(10), // If provider cancels
  lateArrivalPenaltyPercent: integer("late_arrival_penalty_percent").default(5),
  
  // Special rules
  emergencyExemption: boolean("emergency_exemption").default(true),
  weatherExemption: boolean("weather_exemption").default(true),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceIdx: index("cp_service_idx").on(table.serviceId),
  categoryIdx: index("cp_category_idx").on(table.categoryId),
  activeIdx: index("cp_active_idx").on(table.isActive),
}));

// Cancellation Records
export const orderCancellations = pgTable("order_cancellations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull().unique(),
  cancelledBy: varchar("cancelled_by").references(() => users.id).notNull(),
  cancelledByRole: varchar("cancelled_by_role", { enum: ["customer", "provider", "admin"] }).notNull(),
  reason: varchar("reason", { 
    enum: ["customer_change", "provider_unavailable", "weather", "emergency", "technical_issue", "payment_issue", "other"] 
  }).notNull(),
  customReason: text("custom_reason"),
  
  // Policy application
  policyId: varchar("policy_id").references(() => cancellationPolicies.id),
  hoursBeforeService: decimal("hours_before_service", { precision: 6, scale: 2 }),
  appliedRefundPercent: integer("applied_refund_percent"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }),
  
  // Processing
  refundStatus: varchar("refund_status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending"),
  refundTransactionId: varchar("refund_transaction_id"),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdx: index("oc_order_idx").on(table.orderId),
  cancelledByIdx: index("oc_cancelled_by_idx").on(table.cancelledBy),
  reasonIdx: index("oc_reason_idx").on(table.reason),
  refundStatusIdx: index("oc_refund_status_idx").on(table.refundStatus),
}));

// Provider Availability and Scheduling
export const providerAvailability = pgTable("provider_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Time slots
  dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday), null for specific dates
  specificDate: varchar("specific_date"), // YYYY-MM-DD for specific date overrides
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  
  // Availability type
  availabilityType: varchar("availability_type", { 
    enum: ["available", "busy", "break", "unavailable"] 
  }).default("available"),
  
  // Capacity and booking limits
  maxBookings: integer("max_bookings").default(1), // How many bookings can be accepted in this slot
  currentBookings: integer("current_bookings").default(0),
  bufferMinutes: integer("buffer_minutes").default(15), // Time between bookings
  
  // Location constraints
  serviceRadius: integer("service_radius").default(25), // km
  preferredAreas: jsonb("preferred_areas").$type<string[]>(),
  
  // Recurrence
  isRecurring: boolean("is_recurring").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  
  // Metadata
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdx: index("pa_provider_idx").on(table.providerId),
  dayTimeIdx: index("pa_day_time_idx").on(table.dayOfWeek, table.startTime),
  dateIdx: index("pa_date_idx").on(table.specificDate),
  typeIdx: index("pa_type_idx").on(table.availabilityType),
  capacityIdx: index("pa_capacity_idx").on(table.maxBookings, table.currentBookings),
}));

// Real-time Location Sharing
export const orderLocationUpdates = pgTable("order_location_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Location data
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // meters
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // meters
  bearing: decimal("bearing", { precision: 6, scale: 2 }), // degrees
  speed: decimal("speed", { precision: 6, scale: 2 }), // m/s
  
  // Contextual information
  status: varchar("status", { 
    enum: ["enroute", "arrived", "working", "break", "returning"] 
  }).notNull(),
  address: text("address"),
  landmark: varchar("landmark"),
  
  // Distance calculations
  distanceToCustomer: decimal("distance_to_customer", { precision: 8, scale: 2 }), // meters
  estimatedArrival: timestamp("estimated_arrival"),
  
  // Privacy and sharing
  isSharedWithCustomer: boolean("is_shared_with_customer").default(true),
  shareLevel: varchar("share_level", { enum: ["exact", "approximate", "area_only"] }).default("approximate"),
  
  // Metadata
  deviceInfo: jsonb("device_info").$type<{
    type?: "mobile" | "web" | "gps_device";
    userAgent?: string;
    batteryLevel?: number;
  }>(),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdx: index("olu_order_idx").on(table.orderId),
  providerIdx: index("olu_provider_idx").on(table.providerId),
  timestampIdx: index("olu_timestamp_idx").on(table.timestamp),
  statusIdx: index("olu_status_idx").on(table.status),
  sharedIdx: index("olu_shared_idx").on(table.isSharedWithCustomer),
}));

// Enhanced Chat Messages for Orders
export const orderChatMessages = pgTable("order_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  senderRole: varchar("sender_role", { enum: ["customer", "provider", "admin", "system"] }).notNull(),
  
  // Message content
  messageType: varchar("message_type", { 
    enum: ["text", "image", "audio", "video", "location", "document", "system", "status_update"] 
  }).default("text"),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    fileName?: string;
    fileSize?: number;
    duration?: number; // for audio/video
    coordinates?: { latitude: number; longitude: number };
    workPhase?: string;
    beforeAfter?: "before" | "after" | "during";
    isAutoGenerated?: boolean;
  }>(),
  
  // Attachments
  attachments: jsonb("attachments").$type<string[]>(),
  
  // Status and delivery
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  
  // Threading and replies
  replyToId: varchar("reply_to_id"),
  threadId: varchar("thread_id"), // For grouping related messages
  
  // Priority and urgency
  priority: varchar("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal"),
  isSystemMessage: boolean("is_system_message").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orderIdx: index("ocm_order_idx").on(table.orderId),
  senderIdx: index("ocm_sender_idx").on(table.senderId),
  typeIdx: index("ocm_type_idx").on(table.messageType),
  readIdx: index("ocm_read_idx").on(table.isRead),
  timestampIdx: index("ocm_timestamp_idx").on(table.createdAt),
  replyIdx: index("ocm_reply_idx").on(table.replyToId),
  systemIdx: index("ocm_system_idx").on(table.isSystemMessage),
}));

// Order Rating and Reviews (Enhanced)
export const orderRatings = pgTable("order_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => serviceBookings.id).notNull(),
  
  // Rater information
  raterId: varchar("rater_id").references(() => users.id).notNull(),
  raterRole: varchar("rater_role", { enum: ["customer", "provider"] }).notNull(),
  
  // Rating details
  overallRating: integer("overall_rating").notNull(), // 1-5
  qualityRating: integer("quality_rating"), // 1-5
  timelinessRating: integer("timeliness_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  professionalismRating: integer("professionalism_rating"), // 1-5
  valueRating: integer("value_rating"), // 1-5
  
  // Written feedback
  reviewText: text("review_text"),
  positives: jsonb("positives").$type<string[]>(), // What went well
  improvements: jsonb("improvements").$type<string[]>(), // What could be better
  
  // Media attachments
  photos: jsonb("photos").$type<string[]>(),
  videos: jsonb("videos").$type<string[]>(),
  
  // Verification and moderation
  isVerified: boolean("is_verified").default(false),
  isPublic: boolean("is_public").default(true),
  moderationStatus: varchar("moderation_status", { 
    enum: ["pending", "approved", "rejected", "flagged"] 
  }).default("pending"),
  moderationNotes: text("moderation_notes"),
  
  // Response and interaction
  helpfulVotes: integer("helpful_votes").default(0),
  flagCount: integer("flag_count").default(0),
  responseText: text("response_text"), // Provider response to customer review
  responseAt: timestamp("response_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orderIdx: index("or_order_idx").on(table.orderId),
  raterIdx: index("or_rater_idx").on(table.raterId),
  roleIdx: index("or_role_idx").on(table.raterRole),
  overallRatingIdx: index("or_overall_rating_idx").on(table.overallRating),
  publicIdx: index("or_public_idx").on(table.isPublic),
  moderationIdx: index("or_moderation_idx").on(table.moderationStatus),
  // Unique constraint: one rating per order per role
  uniqueOrderRaterRole: index("or_unique_order_rater_role").on(table.orderId, table.raterRole),
}));

// Service Scheduling Constraints
export const serviceSchedulingRules = pgTable("service_scheduling_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").references(() => services.id),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  
  // Time constraints
  minAdvanceBookingHours: integer("min_advance_booking_hours").default(2), // Minimum time before booking
  maxAdvanceBookingDays: integer("max_advance_booking_days").default(30), // Maximum days in advance
  estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
  bufferMinutes: integer("buffer_minutes").default(15), // Time between bookings
  
  // Availability windows
  availableDays: jsonb("available_days").$type<number[]>().default(sql`'[1,2,3,4,5,6,0]'::jsonb`), // 0-6, Sunday-Saturday
  timeSlots: jsonb("time_slots").$type<Array<{
    start: string; // "09:00"
    end: string;   // "18:00"
    maxBookings?: number;
  }>>(),
  
  // Geographic constraints
  serviceRadius: integer("service_radius").default(25), // km
  rushHourMultiplier: decimal("rush_hour_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  rushHours: jsonb("rush_hours").$type<Array<{
    start: string;
    end: string;
    days: number[];
  }>>(),
  
  // Weather and seasonal constraints
  weatherDependent: boolean("weather_dependent").default(false),
  seasonalAvailability: jsonb("seasonal_availability").$type<{
    summer?: boolean;
    monsoon?: boolean;
    winter?: boolean;
  }>(),
  
  // Capacity management
  maxDailyBookings: integer("max_daily_bookings"),
  maxHourlyBookings: integer("max_hourly_bookings"),
  
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher priority rules override lower
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceIdx: index("ssr_service_idx").on(table.serviceId),
  categoryIdx: index("ssr_category_idx").on(table.categoryId),
  activeIdx: index("ssr_active_idx").on(table.isActive),
  priorityIdx: index("ssr_priority_idx").on(table.priority),
}));

// Additional types for WebSocket communication and UI components

// Order status types
export type OrderStatus = "pending_assignment" | "matching" | "assigned" | "in_progress" | "completed" | "cancelled";
export type ServiceBookingStatus = "pending" | "provider_search" | "provider_assigned" | "provider_on_way" | 
  "work_in_progress" | "work_completed" | "payment_pending" | "completed" | "cancelled" | "refunded";
export type JobRequestStatus = "pending" | "sent" | "accepted" | "declined" | "expired";

// Provider information for real-time updates
export const ProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImage: z.string().url().optional(),
  profileImageUrl: z.string().url().optional(),
  rating: z.number().min(0).max(5).default(0),
  isOnline: z.boolean().default(false),
  currentLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    lastUpdated: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  totalReviews: z.number().optional(),
  completedJobs: z.number().optional(),
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

// Order data with provider information
export const OrderDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceId: z.string(),
  status: z.enum(["pending_assignment", "matching", "assigned", "in_progress", "completed", "cancelled"]),
  assignedProviderId: z.string().optional(),
  assignedAt: z.string().optional(),
  provider: ProviderInfoSchema.optional(),
  pendingOffers: z.number().optional().default(0),
  totalAmount: z.number().optional(),
  serviceLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    instructions: z.string().optional(),
  }).optional(),
  urgency: z.enum(["low", "normal", "high", "urgent"]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type OrderData = z.infer<typeof OrderDataSchema>;

// Service booking with enhanced details
export const ServiceBookingDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceId: z.string(),
  status: z.enum(["pending", "provider_search", "provider_assigned", "provider_on_way", 
    "work_in_progress", "work_completed", "payment_pending", "completed", "cancelled", "refunded"]),
  assignedProviderId: z.string().optional(),
  assignedAt: z.string().optional(),
  serviceLocation: z.object({
    type: z.enum(["current", "alternate"]),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    instructions: z.string().optional(),
    landmarkDetails: z.string().optional(),
  }),
  serviceDetails: z.object({
    basePrice: z.number(),
    estimatedDuration: z.number(),
    workflowSteps: z.array(z.string()),
    specialRequirements: z.array(z.string()).optional(),
  }).optional(),
  totalAmount: z.number(),
  urgency: z.enum(["low", "normal", "high", "urgent"]),
  customerName: z.string().optional(),
  serviceType: z.string().optional(),
  provider: ProviderInfoSchema.optional(),
  pendingOffers: z.number().optional().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ServiceBookingData = z.infer<typeof ServiceBookingDataSchema>;

// Job request for providers
export const JobRequestSchema = z.object({
  id: z.string(),
  orderId: z.string().optional(),
  bookingId: z.string(),
  providerId: z.string(),
  status: z.enum(["pending", "sent", "accepted", "declined", "expired"]),
  expiresAt: z.string(),
  sentAt: z.string(),
  respondedAt: z.string().optional(),
  distanceKm: z.number().optional(),
  priority: z.number().optional(),
  booking: ServiceBookingDataSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type JobRequest = z.infer<typeof JobRequestSchema>;

// Provider jobs data structure
export const ProviderJobsDataSchema = z.object({
  pendingOffers: z.array(JobRequestSchema),
  activeJobs: z.array(JobRequestSchema),
  recentJobs: z.array(JobRequestSchema),
  totalOffers: z.number().optional(),
  totalActive: z.number().optional(),
  totalCompleted: z.number().optional(),
});
export type ProviderJobsData = z.infer<typeof ProviderJobsDataSchema>;

// WebSocket event data types
export const WebSocketErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
});
export type WebSocketError = z.infer<typeof WebSocketErrorSchema>;

// Order assignment status data
export const OrderAssignmentStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  assignedProviderId: z.string().optional(),
  assignedAt: z.string().optional(),
  provider: ProviderInfoSchema.optional(),
  pendingOffers: z.number().optional().default(0),
  lastUpdate: z.string().optional(),
  estimatedArrival: z.string().optional(),
});
export type OrderAssignmentStatus = z.infer<typeof OrderAssignmentStatusSchema>;

// Phone call logs for tracking notification call attempts and outcomes
export const phoneCallLogs = pgTable("phone_call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Call details
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  jobRequestId: varchar("job_request_id").references(() => providerJobRequests.id),
  
  // Twilio integration
  twilioCallSid: varchar("twilio_call_sid"), // Twilio call identifier
  fromNumber: varchar("from_number").notNull(),
  toNumber: varchar("to_number").notNull(),
  
  // Call status and outcome
  status: varchar("status", {
    enum: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no_answer", "cancelled"]
  }).default("initiated"),
  duration: integer("duration"), // Call duration in seconds
  
  // Call attempt details
  attemptNumber: integer("attempt_number").default(1), // Which retry attempt this was
  maxAttempts: integer("max_attempts").default(3),
  retryAfter: timestamp("retry_after"), // When to retry if failed
  
  // Provider response tracking
  providerAnswered: boolean("provider_answered").default(false),
  answerTime: timestamp("answer_time"), // When provider answered
  hangupTime: timestamp("hangup_time"), // When call ended
  hangupReason: varchar("hangup_reason"), // "completed", "hung_up", "timeout", etc.
  
  // Job offer response correlation
  jobOfferAccepted: boolean("job_offer_accepted"),
  jobOfferDeclined: boolean("job_offer_declined"),
  responseReceivedAt: timestamp("response_received_at"), // When provider responded in app
  
  // Error tracking
  errorCode: varchar("error_code"), // Twilio error code if failed
  errorMessage: text("error_message"), // Detailed error message
  
  // Cost tracking
  costInCents: integer("cost_in_cents"), // Call cost from Twilio (in cents)
  currency: varchar("currency").default("USD"),
  
  // Metadata
  userAgent: varchar("user_agent"), // If triggered from web
  ipAddress: varchar("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdIdx: index("pcl_provider_id_idx").on(table.providerId),
  orderIdIdx: index("pcl_order_id_idx").on(table.orderId),
  jobRequestIdIdx: index("pcl_job_request_id_idx").on(table.jobRequestId),
  statusIdx: index("pcl_status_idx").on(table.status),
  twilioSidIdx: index("pcl_twilio_sid_idx").on(table.twilioCallSid),
  createdAtIdx: index("pcl_created_at_idx").on(table.createdAt),
  attemptNumberIdx: index("pcl_attempt_number_idx").on(table.attemptNumber),
}));

// Notification statistics for admin monitoring and analytics
export const notificationStatistics = pgTable("notification_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Time period tracking
  date: varchar("date").notNull(), // YYYY-MM-DD for daily stats
  hour: integer("hour"), // 0-23 for hourly stats (null for daily aggregates)
  
  // Phone call statistics
  totalPhoneCallsInitiated: integer("total_phone_calls_initiated").default(0),
  totalPhoneCallsAnswered: integer("total_phone_calls_answered").default(0),
  totalPhoneCallsCompleted: integer("total_phone_calls_completed").default(0),
  totalPhoneCallsFailed: integer("total_phone_calls_failed").default(0),
  totalPhoneCallsBusy: integer("total_phone_calls_busy").default(0),
  totalPhoneCallsNoAnswer: integer("total_phone_calls_no_answer").default(0),
  
  // Response correlation
  phoneCallsWithJobResponse: integer("phone_calls_with_job_response").default(0),
  phoneCallsWithJobAcceptance: integer("phone_calls_with_job_acceptance").default(0),
  phoneCallsWithJobDeclined: integer("phone_calls_with_job_declined").default(0),
  
  // Performance metrics
  averageCallDuration: decimal("average_call_duration", { precision: 8, scale: 2 }), // in seconds
  averageResponseTime: decimal("average_response_time", { precision: 8, scale: 2 }), // seconds from call to app response
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // percentage of calls answered
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }), // percentage leading to job response
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }), // percentage leading to job acceptance
  
  // Cost tracking
  totalCostInCents: integer("total_cost_in_cents").default(0),
  averageCostPerCall: decimal("average_cost_per_call", { precision: 8, scale: 4 }), // in dollars
  currency: varchar("currency").default("USD"),
  
  // Provider engagement
  uniqueProvidersContacted: integer("unique_providers_contacted").default(0),
  providersWhoAnswered: integer("providers_who_answered").default(0),
  providersWhoResponded: integer("providers_who_responded").default(0),
  
  // System health
  systemErrorCount: integer("system_error_count").default(0),
  twilioErrorCount: integer("twilio_error_count").default(0),
  retryAttempts: integer("retry_attempts").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dateIdx: index("ns_date_idx").on(table.date),
  dateHourIdx: index("ns_date_hour_idx").on(table.date, table.hour),
  createdAtIdx: index("ns_created_at_idx").on(table.createdAt),
}));

// Provider-specific phone notification settings (extends notification preferences)
export const providerPhoneNotificationSettings = pgTable("provider_phone_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull().unique(),
  
  // Phone notification preferences
  phoneNotificationsEnabled: boolean("phone_notifications_enabled").default(false),
  emergencyPhoneNotifications: boolean("emergency_phone_notifications").default(true), // Always call for urgent jobs
  
  // Phone numbers for notifications (can have multiple)
  primaryPhoneNumber: varchar("primary_phone_number"), // Main number for calls
  backupPhoneNumber: varchar("backup_phone_number"), // Backup if primary fails
  workPhoneNumber: varchar("work_phone_number"), // Business line
  
  // Notification timing preferences
  phoneCallQuietHoursEnabled: boolean("phone_call_quiet_hours_enabled").default(true),
  quietHoursStart: varchar("quiet_hours_start").default("22:00"), // No calls after 10 PM
  quietHoursEnd: varchar("quiet_hours_end").default("07:00"), // No calls before 7 AM
  timezone: varchar("timezone").default("Asia/Kolkata"),
  
  // Call frequency and limits
  maxCallsPerHour: integer("max_calls_per_hour").default(10),
  maxCallsPerDay: integer("max_calls_per_day").default(50),
  minTimeBetweenCalls: integer("min_time_between_calls").default(60), // seconds
  
  // Call retry configuration
  enableRetries: boolean("enable_retries").default(true),
  maxRetryAttempts: integer("max_retry_attempts").default(3),
  retryIntervalMinutes: integer("retry_interval_minutes").default(2),
  
  // Notification method preferences (prioritized order)
  preferredNotificationMethods: jsonb("preferred_notification_methods").$type<Array<"push" | "phone" | "sms" | "whatsapp">>()
    .default(sql`'["push", "phone"]'::jsonb`),
  
  // Voice message preferences
  voiceMessageLanguage: varchar("voice_message_language", {
    enum: ["en", "hi", "mr", "bn", "ta", "te", "gu", "kn", "ml", "or", "pa", "ur"]
  }).default("en"),
  useCustomVoiceMessage: boolean("use_custom_voice_message").default(false),
  customVoiceMessageUrl: varchar("custom_voice_message_url"), // URL to custom voice recording
  
  // Performance tracking
  totalCallsReceived: integer("total_calls_received").default(0),
  totalCallsAnswered: integer("total_calls_answered").default(0),
  totalJobsAccepted: integer("total_jobs_accepted").default(0),
  averageResponseTimeSeconds: decimal("average_response_time_seconds", { precision: 8, scale: 2 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  lastCallReceivedAt: timestamp("last_call_received_at"),
  lastCallAnsweredAt: timestamp("last_call_answered_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdIdx: index("ppns_provider_id_idx").on(table.providerId),
  enabledIdx: index("ppns_enabled_idx").on(table.phoneNotificationsEnabled),
  activeIdx: index("ppns_active_idx").on(table.isActive),
}));

// Service requests table for user suggestions of new services
export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  // Service request details
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  estimatedPrice: varchar("estimated_price"), // User's price estimate as text
  urgency: varchar("urgency", { enum: ["low", "medium", "high"] }).default("medium"),
  contactInfo: varchar("contact_info").notNull(),
  location: varchar("location"),
  
  // Admin processing
  status: varchar("status", { enum: ["pending", "under_review", "approved", "rejected", "implemented"] }).default("pending"),
  adminNotes: text("admin_notes"), // Admin's internal notes
  adminResponse: text("admin_response"), // Response sent to user
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  
  // Implementation tracking
  implementedAsServiceId: varchar("implemented_as_service_id").references(() => services.id),
  implementedAt: timestamp("implemented_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  userIdIdx: index("sr_user_id_idx").on(table.userId),
  statusIdx: index("sr_status_idx").on(table.status),
  categoryIdIdx: index("sr_category_id_idx").on(table.categoryId),
  urgencyIdx: index("sr_urgency_idx").on(table.urgency),
  createdAtIdx: index("sr_created_at_idx").on(table.createdAt),
}));

// Laundry Orders - Specialized table for laundry services with pickup/drop workflow
export const laundryOrders = pgTable("laundry_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id),
  
  // Order Details
  serviceType: varchar("service_type", { 
    enum: ["wash_fold", "wash_iron", "dry_cleaning", "stain_removal", "premium_care", "express_service"] 
  }).notNull(),
  priority: varchar("priority", { 
    enum: ["standard", "urgent", "express"] 
  }).default("standard"),
  
  // Pickup & Delivery
  pickupAddress: jsonb("pickup_address").$type<{
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
    contactPerson?: string;
    contactPhone?: string;
  }>().notNull(),
  deliveryAddress: jsonb("delivery_address").$type<{
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
    contactPerson?: string;
    contactPhone?: string;
  }>(),
  
  // Scheduling
  preferredPickupDate: timestamp("preferred_pickup_date").notNull(),
  preferredPickupTime: varchar("preferred_pickup_time").notNull(), // "09:00-12:00"
  preferredDeliveryDate: timestamp("preferred_delivery_date"),
  preferredDeliveryTime: varchar("preferred_delivery_time"), // "09:00-12:00"
  
  // Actual Timings
  actualPickupTime: timestamp("actual_pickup_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  
  // Status Tracking
  status: varchar("status", {
    enum: ["pending", "pickup_scheduled", "pickup_confirmed", "picked_up", "processing", "washing", "drying", "ironing", "quality_check", "ready_for_delivery", "out_for_delivery", "delivered", "completed", "cancelled", "refunded"]
  }).default("pending"),
  
  // Items and Pricing
  items: jsonb("items").$type<{
    type: string;
    name: string;
    quantity: number;
    unitPrice: number;
    specialInstructions?: string;
    stains?: string[];
  }[]>().default(sql`'[]'::jsonb`),
  
  totalWeight: decimal("total_weight", { precision: 5, scale: 2 }), // in kg
  estimatedWeight: decimal("estimated_weight", { precision: 5, scale: 2 }), // initial estimate
  
  // Pricing
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  weightCharges: decimal("weight_charges", { precision: 10, scale: 2 }).default("0.00"),
  expressCharges: decimal("express_charges", { precision: 10, scale: 2 }).default("0.00"),
  pickupDeliveryCharges: decimal("pickup_delivery_charges", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment
  paymentMethod: varchar("payment_method", { 
    enum: ["online", "cod", "wallet"] 
  }).default("online"),
  paymentStatus: varchar("payment_status", { 
    enum: ["pending", "paid", "failed", "refunded", "partial_refund"] 
  }).default("pending"),
  
  // Special Requirements
  specialInstructions: text("special_instructions"),
  allergyInfo: text("allergy_info"),
  stainDetails: jsonb("stain_details").$type<{
    location: string;
    type: string;
    description: string;
  }[]>(),
  
  // Quality and Damage
  beforePhotos: jsonb("before_photos").$type<string[]>(),
  afterPhotos: jsonb("after_photos").$type<string[]>(),
  damageReports: jsonb("damage_reports").$type<{
    itemName: string;
    damageType: string;
    description: string;
    photos: string[];
    reportedAt: string;
    compensation?: number;
  }[]>(),
  
  // Reviews and Rating
  customerRating: integer("customer_rating"), // 1-5
  customerReview: text("customer_review"),
  providerRating: integer("provider_rating"), // 1-5 (provider rates customer)
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
}, (table) => ({
  userIdx: index("laundry_orders_user_idx").on(table.userId),
  providerIdx: index("laundry_orders_provider_idx").on(table.providerId),
  statusIdx: index("laundry_orders_status_idx").on(table.status),
  pickupDateIdx: index("laundry_orders_pickup_date_idx").on(table.preferredPickupDate),
  priorityIdx: index("laundry_orders_priority_idx").on(table.priority),
  serviceTypeIdx: index("laundry_orders_service_type_idx").on(table.serviceType),
  createdAtIdx: index("laundry_orders_created_at_idx").on(table.createdAt),
}));

// Laundry Status Tracking - Detailed status history for transparency
export const laundryStatusHistory = pgTable("laundry_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => laundryOrders.id).notNull(),
  fromStatus: varchar("from_status"),
  toStatus: varchar("to_status").notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  notes: text("notes"),
  location: jsonb("location").$type<{
    latitude: number;
    longitude: number;
    address?: string;
  }>(),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  orderIdx: index("laundry_status_order_idx").on(table.orderId),
  timestampIdx: index("laundry_status_timestamp_idx").on(table.timestamp),
}));

// Enhanced Provider Notifications - Real-time notification system with phone integration
export const enhancedProviderNotifications = pgTable("enhanced_provider_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  type: varchar("type", {
    enum: ["new_order", "order_match", "pickup_reminder", "delivery_reminder", "payment_received", "customer_message", "system_alert", "rating_received", "phone_call_missed"]
  }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<{
    orderId?: string;
    customerId?: string;
    amount?: number;
    priority?: string;
    actionRequired?: boolean;
    expiresAt?: string;
    distance?: number;
    customerLocation?: { lat: number; lng: number };
  }>(),
  isRead: boolean("is_read").default(false),
  isUrgent: boolean("is_urgent").default(false),
  requiresPhoneCall: boolean("requires_phone_call").default(false),
  phoneCallAttempted: boolean("phone_call_attempted").default(false),
  phoneCallSuccessful: boolean("phone_call_successful").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  providerIdx: index("enhanced_provider_notifications_provider_idx").on(table.providerId),
  typeIdx: index("enhanced_provider_notifications_type_idx").on(table.type),
  isReadIdx: index("enhanced_provider_notifications_is_read_idx").on(table.isRead),
  urgentIdx: index("enhanced_provider_notifications_urgent_idx").on(table.isUrgent),
  phoneCallIdx: index("enhanced_provider_notifications_phone_call_idx").on(table.requiresPhoneCall),
  createdAtIdx: index("enhanced_provider_notifications_created_at_idx").on(table.createdAt),
}));

// Phone notification system insert schemas - defined after table definitions to avoid circular dependencies
export const insertPhoneCallLogSchema = createInsertSchema(phoneCallLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationStatisticsSchema = createInsertSchema(notificationStatistics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderPhoneNotificationSettingsSchema = createInsertSchema(providerPhoneNotificationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true, implementedAt: true });
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;

// Laundry system types
export type LaundryOrder = typeof laundryOrders.$inferSelect;
export type CreateLaundryOrderInput = typeof laundryOrders.$inferInsert;
export const insertLaundryOrderSchema = createInsertSchema(laundryOrders).omit({ id: true, createdAt: true, updatedAt: true });

export type LaundryStatusHistory = typeof laundryStatusHistory.$inferSelect;
export type CreateLaundryStatusHistoryInput = typeof laundryStatusHistory.$inferInsert;

export type EnhancedProviderNotification = typeof enhancedProviderNotifications.$inferSelect;
export type CreateEnhancedProviderNotificationInput = typeof enhancedProviderNotifications.$inferInsert;
