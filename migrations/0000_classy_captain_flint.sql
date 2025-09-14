CREATE TABLE "app_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar,
	"sender_id" varchar,
	"receiver_id" varchar,
	"message" text NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"attachments" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"type" varchar NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_discount" numeric(10, 2),
	"usage_limit" integer,
	"used_count" integer DEFAULT 0,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "indian_regions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar NOT NULL,
	"state_code" varchar NOT NULL,
	"city" varchar NOT NULL,
	"city_type" varchar DEFAULT 'tier2',
	"region" varchar,
	"is_service_available" boolean DEFAULT false,
	"is_parts_available" boolean DEFAULT false,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"pincode" varchar,
	"display_name_hi" varchar,
	"display_name_local" varchar,
	"average_service_time" integer,
	"service_coverage" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" varchar NOT NULL,
	"body" text NOT NULL,
	"type" varchar NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"fcm_token" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"items" jsonb,
	"total_amount" numeric(10, 2) NOT NULL,
	"service_provider_id" varchar,
	"parts_provider_id" varchar,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"location" jsonb,
	"payment_method" varchar,
	"payment_status" varchar DEFAULT 'pending',
	"razorpay_order_id" varchar,
	"notes" text,
	"rating" integer,
	"review" text,
	"photos" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar NOT NULL,
	"code_hash" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_sent_at" timestamp DEFAULT now(),
	"resend_count" integer DEFAULT 0,
	"ip" varchar,
	"user_agent" varchar,
	"status" varchar DEFAULT 'sent',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar,
	"provider_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0,
	"images" jsonb,
	"specifications" jsonb,
	"rating" numeric(3, 2) DEFAULT '0.00',
	"total_sold" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parts_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"icon" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_payment_intent_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"order_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'inr' NOT NULL,
	"status" varchar NOT NULL,
	"payment_method_id" varchar,
	"payment_method_type" varchar,
	"description" text,
	"receipt_email" varchar,
	"client_secret" varchar,
	"cancel_reason" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"canceled_at" timestamp,
	CONSTRAINT "payment_intents_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_payment_method_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"card_brand" varchar,
	"card_last4" varchar,
	"card_exp_month" integer,
	"card_exp_year" integer,
	"card_country" varchar,
	"upi_id" varchar,
	"bank_name" varchar,
	"nickname" varchar,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"fingerprint" varchar,
	"billing_address" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "provider_job_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"status" varchar DEFAULT 'sent',
	"responded_at" timestamp,
	"response_time" integer,
	"distance_km" numeric(6, 2),
	"estimated_travel_time" integer,
	"quoted_price" numeric(10, 2),
	"estimated_arrival" timestamp,
	"provider_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar NOT NULL,
	"date" varchar NOT NULL,
	"jobs_received" integer DEFAULT 0,
	"jobs_accepted" integer DEFAULT 0,
	"jobs_completed" integer DEFAULT 0,
	"jobs_cancelled" integer DEFAULT 0,
	"avg_response_time" integer DEFAULT 0,
	"avg_travel_time" integer DEFAULT 0,
	"avg_job_duration" integer DEFAULT 0,
	"on_time_percentage" numeric(5, 2) DEFAULT '0.00',
	"total_earnings" numeric(10, 2) DEFAULT '0.00',
	"avg_job_value" numeric(10, 2) DEFAULT '0.00',
	"avg_rating" numeric(3, 2) DEFAULT '0.00',
	"total_ratings" integer DEFAULT 0,
	"customers_served" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar,
	"reviewer_id" varchar,
	"reviewee_id" varchar,
	"rating" integer NOT NULL,
	"comment" text,
	"photos" jsonb,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service_id" varchar NOT NULL,
	"booking_type" varchar NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"scheduled_at" timestamp,
	"service_location" jsonb NOT NULL,
	"service_details" jsonb,
	"notes" text,
	"attachments" jsonb,
	"urgency" varchar DEFAULT 'normal',
	"status" varchar DEFAULT 'pending',
	"assigned_provider_id" varchar,
	"assigned_at" timestamp,
	"assignment_method" varchar,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar,
	"payment_status" varchar DEFAULT 'pending',
	"completed_at" timestamp,
	"customer_rating" integer,
	"customer_review" text,
	"provider_rating" integer,
	"provider_review" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" varchar,
	"name" varchar NOT NULL,
	"slug" varchar,
	"icon" text,
	"description" text,
	"level" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"category_id" varchar,
	"business_name" varchar,
	"business_type" varchar DEFAULT 'individual',
	"skills" jsonb,
	"service_ids" jsonb,
	"experience_years" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"verification_level" varchar DEFAULT 'none',
	"rating" numeric(3, 2) DEFAULT '0.00',
	"total_completed_orders" integer DEFAULT 0,
	"total_ratings" integer DEFAULT 0,
	"availability" jsonb,
	"current_location" jsonb,
	"service_radius" integer DEFAULT 25,
	"service_areas" jsonb,
	"service_area" jsonb,
	"is_online" boolean DEFAULT false,
	"is_available" boolean DEFAULT true,
	"last_active_at" timestamp,
	"documents" jsonb,
	"avg_response_time" integer DEFAULT 0,
	"completion_rate" numeric(5, 2) DEFAULT '0.00',
	"on_time_rate" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_workflow" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"current_step" varchar NOT NULL,
	"provider_location" jsonb,
	"started_at" timestamp DEFAULT now(),
	"arrived_at" timestamp,
	"work_started_at" timestamp,
	"work_completed_at" timestamp,
	"total_duration" integer,
	"work_photos" jsonb,
	"work_notes" text,
	"materials_used" jsonb,
	"issues" jsonb,
	"delays" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar,
	"name" varchar NOT NULL,
	"slug" varchar,
	"description" text,
	"base_price" numeric(10, 2) NOT NULL,
	"estimated_duration" integer,
	"icon" text,
	"images" jsonb,
	"rating" numeric(3, 2) DEFAULT '0.00',
	"total_bookings" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"workflow_steps" jsonb,
	"requirements" jsonb,
	"skills_required" jsonb,
	"tools_required" jsonb,
	"allow_instant_booking" boolean DEFAULT true,
	"allow_scheduled_booking" boolean DEFAULT true,
	"advance_booking_days" integer DEFAULT 7,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_customer_id" varchar NOT NULL,
	"email" varchar,
	"name" varchar,
	"phone" varchar,
	"default_payment_method_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stripe_customers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar DEFAULT 'home',
	"title" varchar,
	"full_name" varchar NOT NULL,
	"phone" varchar,
	"address_line1" varchar NOT NULL,
	"address_line2" varchar,
	"landmark" varchar,
	"city" varchar NOT NULL,
	"state" varchar NOT NULL,
	"pincode" varchar NOT NULL,
	"country" varchar DEFAULT 'India',
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"is_default" boolean DEFAULT false,
	"instructions" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_locale_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"language" varchar DEFAULT 'en',
	"fallback_language" varchar DEFAULT 'en',
	"country" varchar DEFAULT 'IN',
	"state" varchar,
	"city" varchar,
	"region" varchar,
	"service_radius" integer DEFAULT 25,
	"preferred_service_areas" jsonb,
	"date_format" varchar DEFAULT 'DD/MM/YYYY',
	"time_format" varchar DEFAULT '24h',
	"number_format" varchar DEFAULT 'indian',
	"currency_code" varchar DEFAULT 'INR',
	"currency_format" varchar DEFAULT 'symbol',
	"calendar" varchar DEFAULT 'gregorian',
	"week_starts_on" integer DEFAULT 1,
	"festivals" jsonb,
	"content_preference" varchar DEFAULT 'local',
	"show_local_providers" boolean DEFAULT true,
	"show_regional_offers" boolean DEFAULT true,
	"auto_detect_location" boolean DEFAULT true,
	"auto_detect_language" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_locale_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"push_notifications" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"whatsapp_notifications" boolean DEFAULT true,
	"order_updates" boolean DEFAULT true,
	"promotions" boolean DEFAULT true,
	"service_reminders" boolean DEFAULT true,
	"payment_alerts" boolean DEFAULT true,
	"security_alerts" boolean DEFAULT true,
	"news_and_updates" boolean DEFAULT false,
	"quiet_hours_start" varchar,
	"quiet_hours_end" varchar,
	"timezone" varchar DEFAULT 'Asia/Kolkata',
	"sound_enabled" boolean DEFAULT true,
	"vibration_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"refresh_token_hash" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"ip" varchar,
	"user_agent" varchar,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user',
	"is_verified" boolean DEFAULT false,
	"wallet_balance" numeric(10, 2) DEFAULT '0.00',
	"fixi_points" integer DEFAULT 0,
	"location" jsonb,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"category" varchar DEFAULT 'payment',
	"order_id" varchar,
	"reference" varchar,
	"payment_method" varchar,
	"status" varchar DEFAULT 'completed',
	"metadata" jsonb,
	"balance_before" numeric(10, 2),
	"balance_after" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_provider_id_users_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_parts_provider_id_users_id_fk" FOREIGN KEY ("parts_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_parts_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."parts_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_job_requests" ADD CONSTRAINT "provider_job_requests_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_job_requests" ADD CONSTRAINT "provider_job_requests_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_metrics" ADD CONSTRAINT "provider_metrics_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_assigned_provider_id_users_id_fk" FOREIGN KEY ("assigned_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_workflow" ADD CONSTRAINT "service_workflow_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_workflow" ADD CONSTRAINT "service_workflow_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locale_preferences" ADD CONSTRAINT "user_locale_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ir_state_idx" ON "indian_regions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ir_city_idx" ON "indian_regions" USING btree ("city");--> statement-breakpoint
CREATE INDEX "ir_service_idx" ON "indian_regions" USING btree ("is_service_available","is_parts_available");--> statement-breakpoint
CREATE INDEX "ir_region_idx" ON "indian_regions" USING btree ("region");--> statement-breakpoint
CREATE INDEX "ir_pincode_idx" ON "indian_regions" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_challenges" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "otp_status_idx" ON "otp_challenges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "otp_expires_idx" ON "otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pi_stripe_id_idx" ON "payment_intents" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "pi_user_id_idx" ON "payment_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pi_order_id_idx" ON "payment_intents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pi_status_idx" ON "payment_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pm_user_id_idx" ON "payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pm_stripe_id_idx" ON "payment_methods" USING btree ("stripe_payment_method_id");--> statement-breakpoint
CREATE INDEX "pm_type_idx" ON "payment_methods" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pm_default_idx" ON "payment_methods" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE INDEX "pjr_booking_idx" ON "provider_job_requests" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "pjr_provider_idx" ON "provider_job_requests" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "pjr_status_idx" ON "provider_job_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pjr_expires_idx" ON "provider_job_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pm_provider_idx" ON "provider_metrics" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "pm_date_idx" ON "provider_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pm_provider_date_idx" ON "provider_metrics" USING btree ("provider_id","date");--> statement-breakpoint
CREATE INDEX "sb_user_idx" ON "service_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sb_service_idx" ON "service_bookings" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "sb_provider_idx" ON "service_bookings" USING btree ("assigned_provider_id");--> statement-breakpoint
CREATE INDEX "sb_status_idx" ON "service_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sb_type_idx" ON "service_bookings" USING btree ("booking_type");--> statement-breakpoint
CREATE INDEX "sb_scheduled_idx" ON "service_bookings" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "sc_parent_idx" ON "service_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "sc_level_idx" ON "service_categories" USING btree ("level");--> statement-breakpoint
CREATE INDEX "sc_slug_idx" ON "service_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sp_user_idx" ON "service_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sp_category_idx" ON "service_providers" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sp_verified_idx" ON "service_providers" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "sp_online_idx" ON "service_providers" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "sp_location_idx" ON "service_providers" USING btree ("service_radius");--> statement-breakpoint
CREATE INDEX "sp_rating_idx" ON "service_providers" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "sw_booking_idx" ON "service_workflow" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "sw_provider_idx" ON "service_workflow" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sw_step_idx" ON "service_workflow" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "sw_active_idx" ON "service_workflow" USING btree ("booking_id","current_step");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "services_slug_idx" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_active_idx" ON "services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "sc_user_id_idx" ON "stripe_customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sc_stripe_id_idx" ON "stripe_customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "ua_user_id_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ua_default_idx" ON "user_addresses" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE INDEX "ua_pincode_idx" ON "user_addresses" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "ulp_user_id_idx" ON "user_locale_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ulp_language_idx" ON "user_locale_preferences" USING btree ("language");--> statement-breakpoint
CREATE INDEX "ulp_region_idx" ON "user_locale_preferences" USING btree ("country","state","city");--> statement-breakpoint
CREATE INDEX "ulp_service_area_idx" ON "user_locale_preferences" USING btree ("service_radius");--> statement-breakpoint
CREATE INDEX "unp_user_id_idx" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "user_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "session_session_id_idx" ON "user_sessions" USING btree ("session_id");