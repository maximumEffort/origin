-- Enterprise modularization foundation:
-- country-aware records, currency-neutral money names, KYC document config,
-- legal entities, and a transactional outbox.

CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "defaultCurrencyCode" CHAR(3) NOT NULL,
    "vatRate" DECIMAL(4,4) NOT NULL,
    "phoneRegex" TEXT,
    "defaultLanguage" "Language" NOT NULL DEFAULT 'en',
    "enabledPaymentGateways" JSONB NOT NULL DEFAULT '[]',
    "kycConfig" JSONB NOT NULL DEFAULT '{}',
    "productFlags" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

CREATE TABLE "legal_entities" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeLicenceNumber" TEXT,
    "taxRegistrationNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_entities_countryId_idx" ON "legal_entities"("countryId");

CREATE TABLE "kyc_document_types" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT,
    "labelZh" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
    "ocrProvider" TEXT,
    "ocrModel" TEXT,
    "acceptedMimeTypes" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kyc_document_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kyc_document_types_countryId_code_key" ON "kyc_document_types"("countryId", "code");
CREATE INDEX "kyc_document_types_countryId_idx" ON "kyc_document_types"("countryId");

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");
CREATE INDEX "outbox_events_eventType_idx" ON "outbox_events"("eventType");
CREATE INDEX "outbox_events_countryId_idx" ON "outbox_events"("countryId");

INSERT INTO "countries" (
    "id",
    "code",
    "name",
    "defaultCurrencyCode",
    "vatRate",
    "phoneRegex",
    "enabledPaymentGateways",
    "kycConfig",
    "productFlags"
) VALUES (
    'country-ae',
    'AE',
    'United Arab Emirates',
    'AED',
    0.0500,
    '^\+9715\d{8}$',
    '["STRIPE","CHECKOUT_COM","TABBY"]',
    '{"ocrProvider":"azure_document_intelligence","requiresDocumentExpiry":true}',
    '{"rental":true,"purchase":false,"leaseToOwn":false,"fleetB2B":false}'
) ON CONFLICT ("code") DO NOTHING;

INSERT INTO "legal_entities" (
    "id",
    "countryId",
    "name",
    "tradeLicenceNumber",
    "address",
    "city",
    "invoicePrefix",
    "isDefault"
) VALUES (
    'legal-entity-ae-default',
    'country-ae',
    'Shanghai Car Rental LLC',
    NULL,
    'United Arab Emirates',
    'Abu Dhabi',
    'AE-INV',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO "kyc_document_types" (
    "id",
    "countryId",
    "code",
    "labelEn",
    "labelAr",
    "labelZh",
    "isRequired",
    "requiresExpiry",
    "ocrProvider",
    "ocrModel",
    "acceptedMimeTypes",
    "sortOrder"
) VALUES
    ('kyc-ae-emirates-id', 'country-ae', 'EMIRATES_ID', 'Emirates ID', 'Emirates ID', '阿联酋身份证', true, true, 'azure_document_intelligence', 'prebuilt-idDocument', '["image/jpeg","image/png","application/pdf"]', 10),
    ('kyc-ae-driving-licence', 'country-ae', 'DRIVING_LICENCE', 'Driving Licence', 'Driving Licence', '驾驶执照', true, true, 'azure_document_intelligence', 'prebuilt-idDocument', '["image/jpeg","image/png","application/pdf"]', 20),
    ('kyc-ae-passport', 'country-ae', 'PASSPORT', 'Passport', 'Passport', '护照', false, true, 'azure_document_intelligence', 'prebuilt-idDocument', '["image/jpeg","image/png","application/pdf"]', 30),
    ('kyc-ae-visa', 'country-ae', 'VISA', 'Residence Visa', 'Residence Visa', '居留签证', false, true, 'azure_document_intelligence', 'prebuilt-idDocument', '["image/jpeg","image/png","application/pdf"]', 40)
ON CONFLICT ("countryId", "code") DO NOTHING;

ALTER TABLE "customers" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "vehicles" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "vehicles" ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'AED';
ALTER TABLE "bookings" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "bookings" ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'AED';
ALTER TABLE "leases" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "leases" ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'AED';
ALTER TABLE "payments" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "payments" ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'AED';
ALTER TABLE "invoices" ADD COLUMN "countryId" TEXT NOT NULL DEFAULT 'country-ae';
ALTER TABLE "invoices" ADD COLUMN "currencyCode" CHAR(3) NOT NULL DEFAULT 'AED';

ALTER TABLE "vehicles" RENAME COLUMN "priceAed" TO "price";
ALTER TABLE "vehicles" RENAME COLUMN "dailyRateAed" TO "dailyRate";
ALTER TABLE "vehicles" RENAME COLUMN "monthlyRateAed" TO "monthlyRate";
ALTER TABLE "vehicles" RENAME COLUMN "leaseMonthlyAed" TO "leaseMonthly";
ALTER TABLE "vehicles" RENAME COLUMN "depositAmountAed" TO "depositAmount";
ALTER TABLE "bookings" RENAME COLUMN "quotedTotalAed" TO "quotedTotal";
ALTER TABLE "bookings" RENAME COLUMN "vatAmountAed" TO "vatAmount";
ALTER TABLE "bookings" RENAME COLUMN "grandTotalAed" TO "grandTotal";
ALTER TABLE "bookings" RENAME COLUMN "depositAmountAed" TO "depositAmount";
ALTER TABLE "leases" RENAME COLUMN "monthlyRateAed" TO "monthlyRate";
ALTER TABLE "leases" RENAME COLUMN "downPaymentAed" TO "downPayment";
ALTER TABLE "payments" RENAME COLUMN "amountAed" TO "amount";
ALTER TABLE "payments" RENAME COLUMN "vatAmountAed" TO "vatAmount";
ALTER TABLE "payments" RENAME COLUMN "totalAed" TO "total";
ALTER TABLE "invoices" RENAME COLUMN "subtotalAed" TO "subtotal";
ALTER TABLE "invoices" RENAME COLUMN "vatAmountAed" TO "vatAmount";
ALTER TABLE "invoices" RENAME COLUMN "totalAed" TO "total";
ALTER TABLE "invoice_line_items" RENAME COLUMN "unitPriceAed" TO "unitPrice";
ALTER TABLE "invoice_line_items" RENAME COLUMN "totalAed" TO "total";

CREATE INDEX "customers_countryId_kycStatus_createdAt_idx" ON "customers"("countryId", "kycStatus", "createdAt" DESC);
CREATE INDEX "vehicles_countryId_status_createdAt_idx" ON "vehicles"("countryId", "status", "createdAt" DESC);
CREATE INDEX "bookings_countryId_customerId_idx" ON "bookings"("countryId", "customerId");
CREATE INDEX "bookings_countryId_vehicleId_idx" ON "bookings"("countryId", "vehicleId");
CREATE INDEX "bookings_countryId_status_createdAt_idx" ON "bookings"("countryId", "status", "createdAt" DESC);
CREATE INDEX "leases_countryId_customerId_idx" ON "leases"("countryId", "customerId");
CREATE INDEX "leases_countryId_vehicleId_idx" ON "leases"("countryId", "vehicleId");
CREATE INDEX "leases_countryId_status_createdAt_idx" ON "leases"("countryId", "status", "createdAt" DESC);
CREATE INDEX "payments_countryId_leaseId_idx" ON "payments"("countryId", "leaseId");
CREATE INDEX "payments_countryId_customerId_idx" ON "payments"("countryId", "customerId");
CREATE INDEX "invoices_countryId_customerId_idx" ON "invoices"("countryId", "customerId");

ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_document_types" ADD CONSTRAINT "kyc_document_types_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
