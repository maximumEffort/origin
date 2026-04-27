-- ADR-0002: KYC OCR data flow
--
-- Adds OcrStatus enum + 9 columns to documents for Azure Document Intelligence
-- integration. Backwards-compatible: every existing row defaults to
-- ocrStatus = 'NOT_STARTED' with all other OCR columns NULL, so no app-level
-- changes are required to keep existing flows working until the
-- KYC_OCR_ENABLED feature flag is flipped.
--
-- Apply via:
--   psql "$DATABASE_URL" -f prisma/migrations/20260426_kyc_ocr/migration.sql
-- or:
--   uv run prisma db push        (regenerates client too)
--
-- Roll back: see migration.down.sql in this same directory.

-- ── Enum ────────────────────────────────────────────────────────────
CREATE TYPE "OcrStatus" AS ENUM (
  'NOT_STARTED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
);

-- ── Document columns ───────────────────────────────────────────────────────────
ALTER TABLE "documents"
  ADD COLUMN "ocrStatus"          "OcrStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "ocrProvider"        TEXT,
  ADD COLUMN "ocrModel"           TEXT,
  ADD COLUMN "ocrFields"          JSONB,
  ADD COLUMN "ocrConfidence"      DOUBLE PRECISION,
  ADD COLUMN "ocrRequestedAt"     TIMESTAMP(3),
  ADD COLUMN "ocrCompletedAt"     TIMESTAMP(3),
  ADD COLUMN "ocrFailureReason"   TEXT,
  ADD COLUMN "reviewerOverrides"  JSONB;

-- ── Index for the admin "OCR queue" view (find docs in PROCESSING / FAILED) ─
CREATE INDEX "documents_ocrStatus_idx" ON "documents"("ocrStatus");
