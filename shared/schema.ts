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

// Service categories - Enhanced for infinite hierarchy
export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"), // nullable for backward compatibility
  name: varchar("name").notNull(),
  slug: varchar("slug"), // nullable initially, will be backfilled
  icon: text("icon"),
  imageUrl: text("image_url"), // Category image for better visual representation
  description: text("description"),
  level: integer("level").default(0), // 0=category, 1=sub-category, 2=service-type
  sortOrder: integer("sort_order").default(0),
  categoryPath: text("category_path"), // Full hierarchy path (e.g., "/technology/mobile-repair/iphone-repair")
  depth: integer("depth").default(0), // Alternative to level for nesting depth
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  parentIdx: index("sc_parent_idx").on(table.parentId),
  levelIdx: index("sc_level_idx").on(table.level),
  slugIdx: index("sc_slug_idx").on(table.slug),
  pathIdx: index("sc_path_idx").on(table.categoryPath),
  depthIdx: index("sc_depth_idx").on(table.depth),
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

// Service Provider Profiles for onboarding system
export const serviceProviderProfiles = pgTable("service_provider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Business Information
  businessName: varchar("business_name").notNull(),
  businessType: varchar("business_type", { enum: ["individual", "company"] }).notNull(),
  contactName: varchar("contact_name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email"),
  
  // Service Details
  serviceCategories: jsonb("service_categories").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  serviceAreas: jsonb("service_areas").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  
  // Address Information
  address: jsonb("address").$type<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  
  // Document Management
  documents: jsonb("documents").$type<{
    businessLicense?: { url: string; filename: string; uploadedAt: string };
    idProof?: { url: string; filename: string; uploadedAt: string };
    certifications?: Array<{ url: string; filename: string; title: string; uploadedAt: string }>;
  }>().notNull().default(sql`'{}'::jsonb`),
  
  // Verification Status
  verificationStatus: varchar("verification_status", {
    enum: ["draft", "documents_submitted", "under_review", "approved", "rejected"]
  }).notNull().default("draft"),
  rejectionReason: text("rejection_reason"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => sql`now()`),
}, (table) => ({
  userIdIdx: index("spp_user_id_idx").on(table.userId),
  verificationStatusIdx: index("spp_verification_status_idx").on(table.verificationStatus),
  businessTypeIdx: index("spp_business_type_idx").on(table.businessType),
  createdAtIdx: index("spp_created_at_idx").on(table.createdAt),
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
  
  // Status and workflow
  status: varchar("status", { 
    enum: ["pending", "provider_search", "provider_assigned", "provider_on_way", 
           "work_in_progress", "work_completed", "payment_pending", "completed", 
           "cancelled", "refunded"] 
  }).default("pending"),
  
  // Provider assignment
  assignedProviderId: varchar("assigned_provider_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  assignmentMethod: varchar("assignment_method", { enum: ["auto", "manual", "customer_choice"] }),
  
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
}));

// Provider Job Requests - Race-to-accept system
export const providerJobRequests = pgTable("provider_job_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => serviceBookings.id).notNull(),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  
  // Request details
  sentAt: timestamp("sent_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Provider response
  status: varchar("status", { 
    enum: ["sent", "viewed", "accepted", "declined", "expired", "cancelled"] 
  }).default("sent"),
  respondedAt: timestamp("responded_at"),
  responseTime: integer("response_time"), // seconds
  
  // Location and distance
  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
  estimatedTravelTime: integer("estimated_travel_time"), // minutes
  
  // Provider specifics
  quotedPrice: decimal("quoted_price", { precision: 10, scale: 2 }),
  estimatedArrival: timestamp("estimated_arrival"),
  providerNotes: text("provider_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingIdx: index("pjr_booking_idx").on(table.bookingId),
  providerIdx: index("pjr_provider_idx").on(table.providerId),
  statusIdx: index("pjr_status_idx").on(table.status),
  expiresIdx: index("pjr_expires_idx").on(table.expiresAt),
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
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertServiceBookingSchema = createInsertSchema(serviceBookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderJobRequestSchema = createInsertSchema(providerJobRequests).omit({ id: true, createdAt: true });

// Enhanced parts management insert schemas
export const insertPartsCategorySchema = createInsertSchema(partsCategories).omit({ id: true, createdAt: true });
export const insertPartsProviderBusinessInfoSchema = createInsertSchema(partsProviderBusinessInfo).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartsInventoryMovementSchema = createInsertSchema(partsInventoryMovements).omit({ id: true, createdAt: true });
export const insertPartsBulkUploadSchema = createInsertSchema(partsBulkUploads).omit({ id: true, createdAt: true });
export const insertPartsSupplierSchema = createInsertSchema(partsSuppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceWorkflowSchema = createInsertSchema(serviceWorkflow).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderMetricsSchema = createInsertSchema(providerMetrics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, updatedAt: true, timestamp: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true, createdAt: true });
export const insertServiceProviderProfileSchema = createInsertSchema(serviceProviderProfiles).omit({ id: true, createdAt: true, updatedAt: true });
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
export type PartsProviderBusinessInfo = typeof partsProviderBusinessInfo.$inferSelect;
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

// Insert schemas for new tables
export const insertUserReferralSchema = createInsertSchema(userReferrals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralRecordSchema = createInsertSchema(referralRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserAgreementSchema = createInsertSchema(userAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountDeletionRequestSchema = createInsertSchema(accountDeletionRequests).omit({ id: true, createdAt: true, updatedAt: true });

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

// API operation types
export type ReferralCodeGenerateData = z.infer<typeof referralCodeGenerateSchema>;
export type ReferralRecordCreateData = z.infer<typeof referralRecordCreateSchema>;
export type ReferralRecordUpdateData = z.infer<typeof referralRecordUpdateSchema>;
export type UserAgreementUpdateData = z.infer<typeof userAgreementUpdateSchema>;
export type DataExportRequestCreateData = z.infer<typeof dataExportRequestCreateSchema>;
export type AccountDeletionRequestCreateData = z.infer<typeof accountDeletionRequestCreateSchema>;

// API operation types for Service Provider Profiles
export type ServiceProviderProfileUpdateData = z.infer<typeof serviceProviderProfileUpdateSchema>;
export type ServiceProviderDocumentSubmissionData = z.infer<typeof serviceProviderDocumentSubmissionSchema>;
export type ServiceProviderStatusUpdateData = z.infer<typeof serviceProviderStatusUpdateSchema>;

// Enum types for consistent usage
export type ServiceProviderBusinessType = z.infer<typeof serviceProviderBusinessTypeEnum>;
