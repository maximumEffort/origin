-- Rollback for 20260426_kyc_ocr.
-- Run if Phase A backend turns out to be misconfigured and we need to back
-- out the schema change before customers see anything.

DROP INDEX IF EXISTS "documents_ocrStatus_idx";

ALTER TABLE "documents"
  DROP COLUMN IF EXISTS "reviewerOverrides",
  DROP COLUMN IF EXISTS "ocrFailureReason",
  DROP COLUMN IF EXISTS "ocrCompletedAt",
  DROP COLUMN IF EXISTS "ocrRequestedAt",
  DROP COLUMN IF EXISTS "ocrConfidence",
  DROP COLUMN IF EXISTS "ocrFields",
  DROP COLUMN IF EXISTS "ocrModel",
  DROP COLUMN IF EXISTS "ocrProvider",
  DROP COLUMN IF EXISTS "ocrStatus";

DROP TYPE IF EXISTS "OcrStatus";
