-- Origin V1 genesis migration. Re-built 2026-05-02.
-- Source of truth: docs/architecture/rebuild-erd.md (v0.5).
-- Pre-condition: clean schema. Run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
-- before applying this migration on an existing Origin database.

-- ─── Enums ──────────────────────────────────────────────────────────

CREATE TYPE "Language" AS ENUM ('en', 'ar', 'zh-CN');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES', 'FLEET_MANAGER');
CREATE TYPE "ResidencyStatus" AS ENUM ('RESIDENT', 'VISITOR', 'GCC_RESIDENT');
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "KycDocStatus" AS ENUM ('UPLOADED', 'IN_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "OcrStatus" AS ENUM ('NOT_STARTED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "OcrJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "OcrProvider" AS ENUM ('AZURE_DI', 'LOCAL');
CREATE TYPE "OtpIdentityKind" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "OtpProvider" AS ENUM ('TWILIO_VERIFY', 'LOCAL');
CREATE TYPE "SubjectKind" AS ENUM ('USER', 'CUSTOMER');
CREATE TYPE "SessionRevokeReason" AS ENUM ('LOGOUT', 'ROTATED', 'REPLAY_DETECTED', 'ADMIN_FORCE', 'EXPIRED');
CREATE TYPE "PartyKind" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'AUTHORIZED_SIGNATORY', 'BOOKER', 'ACCOUNTS_PAYABLE');
CREATE TYPE "Brand" AS ENUM ('NIO', 'VOYAH', 'ZEEKR', 'BYD', 'XPENG', 'LI_AUTO', 'DENZA', 'MG', 'HONGQI');
CREATE TYPE "BodyType" AS ENUM ('SUV', 'SEDAN', 'MPV', 'COUPE', 'CROSSOVER', 'WAGON');
CREATE TYPE "Powertrain" AS ENUM ('EV', 'PHEV', 'HYBRID', 'ICE');
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIC', 'MANUAL', 'SINGLE_SPEED');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'RETIRED');
CREATE TYPE "HoldReason" AS ENUM ('BOOKING', 'LEASE', 'MAINTENANCE', 'MANUAL_BLOCK');
CREATE TYPE "HoldReferenceKind" AS ENUM ('BOOKING', 'LEASE', 'MAINTENANCE', 'NONE');
CREATE TYPE "RentalTier" AS ENUM ('SHORT_TERM', 'LONG_TERM');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "LeaseType" AS ENUM ('SHORT_TERM', 'LONG_TERM');
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED', 'DEFAULTED');
CREATE TYPE "MilestoneKind" AS ENUM ('START', 'MONTHLY_BILLING', 'RETURN_REMINDER', 'RETURN_COMPLETED', 'COMPLETION');
CREATE TYPE "MileageSource" AS ENUM ('PICKUP', 'RETURN', 'MID_LEASE', 'SELF_REPORT');
CREATE TYPE "MaintenanceKind" AS ENUM ('SERVICE', 'REPAIR', 'INSPECTION', 'TYRE_CHANGE', 'BATTERY_CHECK');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "PaymentKind" AS ENUM ('DEPOSIT', 'INVOICE_PAYMENT', 'PENALTY', 'MANUAL_CREDIT');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'CHECKOUT_COM', 'PAYTABS', 'CASH', 'BANK_TRANSFER');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "CommunicationKind" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "CommunicationProvider" AS ENUM ('SENDGRID', 'TWILIO_SMS', 'TWILIO_WHATSAPP');
CREATE TYPE "CommunicationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'SUPPRESSED');
CREATE TYPE "CommunicationPurpose" AS ENUM ('TRANSACTIONAL', 'NOTIFICATION', 'MARKETING');
CREATE TYPE "ConsentChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PHONE_CALL', 'POST');
CREATE TYPE "ConsentPurpose" AS ENUM ('MARKETING', 'SERVICE_UPDATES', 'RESEARCH');
CREATE TYPE "ConsentSource" AS ENUM ('REGISTRATION', 'PROFILE_UPDATE', 'ADMIN_IMPORT', 'UNSUBSCRIBE_LINK', 'INBOUND_REQUEST');
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "ActorKind" AS ENUM ('USER', 'CUSTOMER', 'SYSTEM');
CREATE TYPE "ServiceType" AS ENUM ('RENT', 'PURCHASE', 'LEASE_TO_OWN');

-- ─── Tables — platform/countries ────────────────────────────────────

CREATE TABLE "countries" (
  "id" TEXT NOT NULL,
  "code" CHAR(2) NOT NULL,
  "name" TEXT NOT NULL,
  "default_currency_code" CHAR(3) NOT NULL,
  "vat_rate" DECIMAL(4,4) NOT NULL,
  "phone_regex" TEXT,
  "default_language" "Language" NOT NULL DEFAULT 'en',
  "enabled_payment_gateways" JSONB NOT NULL DEFAULT '[]',
  "kyc_config" JSONB NOT NULL DEFAULT '{}',
  "product_flags" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

CREATE TABLE "legal_entities" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trade_licence_number" TEXT,
  "tax_registration_number" TEXT,
  "address" TEXT,
  "city" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "legal_entities_country_id_idx" ON "legal_entities"("country_id");

CREATE TABLE "kyc_document_types" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label_en" TEXT NOT NULL,
  "label_ar" TEXT,
  "label_zh" TEXT,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "requires_expiry" BOOLEAN NOT NULL DEFAULT false,
  "ocr_provider" TEXT,
  "ocr_model" TEXT,
  "accepted_mime_types" JSONB NOT NULL DEFAULT '[]',
  "config" JSONB NOT NULL DEFAULT '{}',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_document_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kyc_document_types_country_id_code_key" ON "kyc_document_types"("country_id", "code");
CREATE INDEX "kyc_document_types_country_id_idx" ON "kyc_document_types"("country_id");

-- ─── Tables — platform/identity ─────────────────────────────────────

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone_e164" TEXT,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "parties" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "kind" "PartyKind" NOT NULL,
  "display_name" TEXT NOT NULL,
  "tax_registration_number" TEXT,
  "billing_email" TEXT,
  "billing_address" TEXT,
  "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "parties_country_id_kind_kyc_status_idx" ON "parties"("country_id", "kind", "kyc_status");

CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone_e164" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "dob" DATE,
  "nationality_iso2" CHAR(2),
  "residency_status" "ResidencyStatus" NOT NULL,
  "preferred_language" "Language" NOT NULL DEFAULT 'en',
  "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customers_country_id_email_key" ON "customers"("country_id", "email");
CREATE UNIQUE INDEX "customers_country_id_phone_e164_key" ON "customers"("country_id", "phone_e164");

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_name" TEXT NOT NULL,
  "trade_licence_number" TEXT,
  "industry" TEXT,
  "employee_count_band" TEXT,
  "payment_terms_days" INTEGER NOT NULL DEFAULT 0,
  "primary_signatory_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_country_id_trade_licence_number_key" ON "organizations"("country_id", "trade_licence_number");

CREATE TABLE "organization_members" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_members_organization_id_customer_id_key" ON "organization_members"("organization_id", "customer_id");
CREATE INDEX "organization_members_customer_id_idx" ON "organization_members"("customer_id");

CREATE TABLE "consents" (
  "id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "channel" "ConsentChannel" NOT NULL,
  "purpose" "ConsentPurpose" NOT NULL,
  "granted_at" TIMESTAMP(3),
  "withdrawn_at" TIMESTAMP(3),
  "source" "ConsentSource" NOT NULL,
  "evidence_blob_url" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consents_party_id_channel_purpose_idx" ON "consents"("party_id", "channel", "purpose");

CREATE TABLE "otp_codes" (
  "id" TEXT NOT NULL,
  "identity_kind" "OtpIdentityKind" NOT NULL,
  "identity" TEXT NOT NULL,
  "code_hash" TEXT,
  "provider" "OtpProvider" NOT NULL,
  "provider_sid" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumed_at" TIMESTAMP(3),
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "otp_codes_identity_expires_at_idx" ON "otp_codes"("identity", "expires_at");

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "subject_kind" "SubjectKind" NOT NULL,
  "subject_id" TEXT NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "rotated_from_session_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "revoke_reason" "SessionRevokeReason",
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sessions_subject_kind_subject_id_idx" ON "sessions"("subject_kind", "subject_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_rotated_from_session_id_idx" ON "sessions"("rotated_from_session_id");

CREATE TABLE "kyc_documents" (
  "id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "document_type_code" TEXT NOT NULL,
  "blob_url" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" BIGINT NOT NULL,
  "expires_on" DATE,
  "status" "KycDocStatus" NOT NULL DEFAULT 'UPLOADED',
  "ocr_status" "OcrStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "ocr_payload" JSONB NOT NULL DEFAULT '{}',
  "reviewer_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "reject_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kyc_documents_party_id_idx" ON "kyc_documents"("party_id");
CREATE INDEX "kyc_documents_status_country_id_idx" ON "kyc_documents"("status", "country_id");

-- ─── Tables — platform/inventory ────────────────────────────────────

CREATE TABLE "vehicles" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "brand" "Brand" NOT NULL,
  "model" TEXT NOT NULL,
  "model_year" INTEGER NOT NULL,
  "body_type" "BodyType" NOT NULL,
  "powertrain" "Powertrain" NOT NULL,
  "trim" TEXT,
  "plate_number" TEXT NOT NULL,
  "vin" TEXT,
  "color" TEXT NOT NULL,
  "transmission" "Transmission" NOT NULL,
  "seats" INTEGER NOT NULL,
  "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "odometer_km" INTEGER NOT NULL DEFAULT 0,
  "primary_image_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");
CREATE INDEX "vehicles_country_id_status_idx" ON "vehicles"("country_id", "status");
CREATE INDEX "vehicles_brand_model_idx" ON "vehicles"("brand", "model");

CREATE TABLE "vehicle_images" (
  "id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "blob_url" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "alt_en" TEXT,
  "alt_ar" TEXT,
  "alt_zh" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_images_vehicle_id_sort_order_idx" ON "vehicle_images"("vehicle_id", "sort_order");

CREATE TABLE "vehicle_availability_holds" (
  "id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "reason" "HoldReason" NOT NULL,
  "reference_kind" "HoldReferenceKind" NOT NULL DEFAULT 'NONE',
  "reference_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "vehicle_availability_holds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_availability_holds_vehicle_id_start_at_end_at_idx" ON "vehicle_availability_holds"("vehicle_id", "start_at", "end_at");

-- ─── Tables — platform/pricing ──────────────────────────────────────

CREATE TABLE "rental_rate_cards" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "vehicle_id" TEXT,
  "tier" "RentalTier" NOT NULL,
  "daily_rate_minor" BIGINT NOT NULL,
  "monthly_rate_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "rental_rate_cards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rental_rate_cards_country_id_vehicle_id_tier_valid_from_idx" ON "rental_rate_cards"("country_id", "vehicle_id", "tier", "valid_from");

CREATE TABLE "mileage_packages" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "included_km_per_month" INTEGER NOT NULL,
  "overage_rate_per_km_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "mileage_packages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mileage_packages_country_id_is_active_idx" ON "mileage_packages"("country_id", "is_active");

CREATE TABLE "add_ons" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label_en" TEXT NOT NULL,
  "label_ar" TEXT,
  "label_zh" TEXT,
  "kind" TEXT NOT NULL,
  "price_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "billing_cadence" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "add_ons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "add_ons_country_id_code_key" ON "add_ons"("country_id", "code");

CREATE TABLE "promo_codes" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discount_kind" TEXT NOT NULL,
  "discount_value" DECIMAL(10,2) NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "max_uses" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promo_codes_country_id_code_key" ON "promo_codes"("country_id", "code");

-- ─── Tables — products/rental + platform/billing ────────────────────

CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "booked_by_customer_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "mileage_package_id" TEXT,
  "add_ons" JSONB NOT NULL DEFAULT '[]',
  "pickup_location" TEXT,
  "dropoff_location" TEXT,
  "notes" TEXT,
  "currency_code" CHAR(3) NOT NULL,
  "subtotal_minor" BIGINT NOT NULL,
  "vat_minor" BIGINT NOT NULL,
  "deposit_minor" BIGINT NOT NULL,
  "total_minor" BIGINT NOT NULL,
  "submitted_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "expired_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");
CREATE INDEX "bookings_party_id_status_idx" ON "bookings"("party_id", "status");
CREATE INDEX "bookings_booked_by_customer_id_status_idx" ON "bookings"("booked_by_customer_id", "status");
CREATE INDEX "bookings_vehicle_id_start_date_end_date_idx" ON "bookings"("vehicle_id", "start_date", "end_date");

CREATE TABLE "leases" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "primary_driver_customer_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "lease_type" "LeaseType" NOT NULL,
  "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "actual_end_date" DATE,
  "currency_code" CHAR(3) NOT NULL,
  "monthly_rate_minor" BIGINT NOT NULL,
  "daily_rate_minor" BIGINT NOT NULL,
  "deposit_held_minor" BIGINT NOT NULL,
  "deposit_refunded_minor" BIGINT NOT NULL DEFAULT 0,
  "included_km_per_month" INTEGER NOT NULL,
  "overage_rate_per_km_minor" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leases_booking_id_key" ON "leases"("booking_id");
CREATE INDEX "leases_party_id_status_idx" ON "leases"("party_id", "status");
CREATE INDEX "leases_primary_driver_customer_id_status_idx" ON "leases"("primary_driver_customer_id", "status");
CREATE INDEX "leases_vehicle_id_status_idx" ON "leases"("vehicle_id", "status");

CREATE TABLE "lease_milestones" (
  "id" TEXT NOT NULL,
  "lease_id" TEXT NOT NULL,
  "kind" "MilestoneKind" NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lease_milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lease_milestones_lease_id_kind_idx" ON "lease_milestones"("lease_id", "kind");

CREATE TABLE "mileage_readings" (
  "id" TEXT NOT NULL,
  "lease_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "odometer_km" INTEGER NOT NULL,
  "source" "MileageSource" NOT NULL,
  "recorded_by_user_id" TEXT,
  "evidence_blob_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mileage_readings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mileage_readings_lease_id_recorded_at_idx" ON "mileage_readings"("lease_id", "recorded_at");

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "lease_id" TEXT,
  "invoice_number" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "subtotal_minor" BIGINT NOT NULL,
  "vat_minor" BIGINT NOT NULL,
  "total_minor" BIGINT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "pdf_blob_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_party_id_status_idx" ON "invoices"("party_id", "status");
CREATE INDEX "invoices_legal_entity_id_issued_at_idx" ON "invoices"("legal_entity_id", "issued_at");

CREATE TABLE "invoice_lines" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "description_en" TEXT NOT NULL,
  "description_ar" TEXT,
  "description_zh" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_amount_minor" BIGINT NOT NULL,
  "line_total_minor" BIGINT NOT NULL,
  "vat_rate" DECIMAL(4,4) NOT NULL,
  "tax_code" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "kind" "PaymentKind" NOT NULL,
  "invoice_id" TEXT,
  "lease_id" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "provider_payment_id" TEXT,
  "amount_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "captured_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_kind_invoice_check" CHECK (("kind" = 'INVOICE_PAYMENT') = ("invoice_id" IS NOT NULL)),
  CONSTRAINT "payments_kind_lease_check" CHECK (("kind" = 'DEPOSIT') = ("lease_id" IS NOT NULL))
);
CREATE INDEX "payments_party_id_captured_at_idx" ON "payments"("party_id", "captured_at");
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_lease_id_kind_idx" ON "payments"("lease_id", "kind");
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id") WHERE "provider_payment_id" IS NOT NULL;

CREATE TABLE "payment_intents" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "provider_intent_id" TEXT NOT NULL,
  "client_secret" TEXT,
  "amount_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "status" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_intents_provider_intent_id_key" ON "payment_intents"("provider_intent_id");

CREATE TABLE "refunds" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "provider_refund_id" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rental_agreements" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "lease_id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "pdf_blob_url" TEXT NOT NULL,
  "signed_at" TIMESTAMP(3) NOT NULL,
  "signed_ip" TEXT,
  "signature_method" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "rental_agreements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rental_agreements_lease_id_key" ON "rental_agreements"("lease_id");

CREATE TABLE "terms_documents" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "content_md" TEXT NOT NULL,
  "effective_from" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "terms_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "terms_documents_country_id_legal_entity_id_kind_version_key" ON "terms_documents"("country_id", "legal_entity_id", "kind", "version");

-- ─── Tables — products/fleet_management ─────────────────────────────

CREATE TABLE "vehicle_maintenance_records" (
  "id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "kind" "MaintenanceKind" NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "odometer_km" INTEGER NOT NULL,
  "cost_minor" BIGINT NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "vendor" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_by" TEXT,
  CONSTRAINT "vehicle_maintenance_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vehicle_maintenance_records_vehicle_id_started_at_idx" ON "vehicle_maintenance_records"("vehicle_id", "started_at");

-- ─── Tables — services/communications + intelligence ────────────────

CREATE TABLE "communication_logs" (
  "id" TEXT NOT NULL,
  "country_id" TEXT,
  "correlation_id" TEXT,
  "party_id" TEXT,
  "kind" "CommunicationKind" NOT NULL,
  "purpose" "CommunicationPurpose" NOT NULL,
  "template_code" TEXT NOT NULL,
  "recipient_email" TEXT,
  "recipient_phone" TEXT,
  "subject" TEXT,
  "body_preview" TEXT NOT NULL,
  "provider" "CommunicationProvider" NOT NULL,
  "provider_message_id" TEXT,
  "status" "CommunicationStatus" NOT NULL DEFAULT 'QUEUED',
  "suppressed_reason" TEXT,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "communication_logs_template_code_sent_at_idx" ON "communication_logs"("template_code", "sent_at");
CREATE INDEX "communication_logs_party_id_sent_at_idx" ON "communication_logs"("party_id", "sent_at");
CREATE INDEX "communication_logs_correlation_id_idx" ON "communication_logs"("correlation_id");

CREATE TABLE "ocr_jobs" (
  "id" TEXT NOT NULL,
  "kyc_document_id" TEXT NOT NULL,
  "provider" "OcrProvider" NOT NULL,
  "model" TEXT NOT NULL,
  "status" "OcrJobStatus" NOT NULL DEFAULT 'QUEUED',
  "output" JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ocr_jobs_kyc_document_id_idx" ON "ocr_jobs"("kyc_document_id");

-- ─── Tables — core/messaging + observability ────────────────────────

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "country_id" TEXT,
  "correlation_id" TEXT,
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");
CREATE INDEX "outbox_events_event_type_idx" ON "outbox_events"("event_type");
CREATE INDEX "outbox_events_correlation_id_idx" ON "outbox_events"("correlation_id");

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "country_id" TEXT,
  "actor_kind" "ActorKind" NOT NULL,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "target_kind" TEXT,
  "target_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actor_kind_actor_id_created_at_idx" ON "audit_logs"("actor_kind", "actor_id", "created_at");
CREATE INDEX "audit_logs_target_kind_target_id_created_at_idx" ON "audit_logs"("target_kind", "target_id", "created_at");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

CREATE TABLE "error_logs" (
  "id" TEXT NOT NULL,
  "country_id" TEXT,
  "request_id" TEXT,
  "status_code" INTEGER NOT NULL,
  "route" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "error_logs_created_at_idx" ON "error_logs"("created_at");
CREATE INDEX "error_logs_request_id_idx" ON "error_logs"("request_id");

-- ─── Foreign keys ───────────────────────────────────────────────────

ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_document_types" ADD CONSTRAINT "kyc_document_types_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parties" ADD CONSTRAINT "parties_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_id_fkey" FOREIGN KEY ("id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_primary_signatory_id_fkey" FOREIGN KEY ("primary_signatory_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consents" ADD CONSTRAINT "consents_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rotated_from_session_id_fkey" FOREIGN KEY ("rotated_from_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_availability_holds" ADD CONSTRAINT "vehicle_availability_holds_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_availability_holds" ADD CONSTRAINT "vehicle_availability_holds_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_rate_cards" ADD CONSTRAINT "rental_rate_cards_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_rate_cards" ADD CONSTRAINT "rental_rate_cards_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mileage_packages" ADD CONSTRAINT "mileage_packages_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_customer_id_fkey" FOREIGN KEY ("booked_by_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mileage_package_id_fkey" FOREIGN KEY ("mileage_package_id") REFERENCES "mileage_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_primary_driver_customer_id_fkey" FOREIGN KEY ("primary_driver_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lease_milestones" ADD CONSTRAINT "lease_milestones_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mileage_readings" ADD CONSTRAINT "mileage_readings_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mileage_readings" ADD CONSTRAINT "mileage_readings_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terms_documents" ADD CONSTRAINT "terms_documents_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terms_documents" ADD CONSTRAINT "terms_documents_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_maintenance_records" ADD CONSTRAINT "vehicle_maintenance_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_kyc_document_id_fkey" FOREIGN KEY ("kyc_document_id") REFERENCES "kyc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Seed: UAE country ──────────────────────────────────────────────

INSERT INTO "countries" (
  "id", "code", "name", "default_currency_code", "vat_rate", "phone_regex",
  "default_language", "enabled_payment_gateways", "kyc_config", "product_flags"
) VALUES (
  'country-ae',
  'AE',
  'United Arab Emirates',
  'AED',
  0.0500,
  '^\+971[0-9]{8,9}$',
  'en',
  '["stripe"]'::jsonb,
  '{"required_documents": ["EMIRATES_ID", "UAE_DL", "PASSPORT", "VISA"]}'::jsonb,
  '{"rental": true, "purchase": false, "lease_to_own": false}'::jsonb
);

INSERT INTO "legal_entities" (
  "id", "country_id", "name", "is_default", "invoice_prefix"
) VALUES (
  'le-ae-shanghai-car-rental',
  'country-ae',
  'Shanghai Car Rental LLC',
  true,
  'INV-AE'
);

INSERT INTO "kyc_document_types" (
  "id", "country_id", "code", "label_en", "label_ar", "label_zh",
  "is_required", "requires_expiry", "ocr_provider", "ocr_model",
  "accepted_mime_types", "sort_order"
) VALUES
  ('kdt-ae-eid', 'country-ae', 'EMIRATES_ID', 'Emirates ID', 'الهوية الإماراتية', '阿联酋身份证', true, true, 'azure_di', 'prebuilt-idDocument', '["image/jpeg", "image/png", "application/pdf"]'::jsonb, 1),
  ('kdt-ae-dl',  'country-ae', 'UAE_DL',      'UAE Driving Licence', 'رخصة القيادة الإماراتية', '阿联酋驾驶执照', true, true, 'azure_di', 'prebuilt-idDocument', '["image/jpeg", "image/png", "application/pdf"]'::jsonb, 2),
  ('kdt-ae-pp',  'country-ae', 'PASSPORT',    'Passport', 'جواز السفر', '护照', true, true, 'azure_di', 'prebuilt-idDocument', '["image/jpeg", "image/png", "application/pdf"]'::jsonb, 3),
  ('kdt-ae-vis', 'country-ae', 'VISA',        'Visa', 'تأشيرة', '签证', false, true, 'azure_di', 'prebuilt-idDocument', '["image/jpeg", "image/png", "application/pdf"]'::jsonb, 4);
