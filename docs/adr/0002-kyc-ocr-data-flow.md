# ADR-0002: KYC OCR data flow — Azure Document Intelligence

**Status:** Accepted — Phase A (backend) and Phase B (admin UI) shipped 2026-04-26. Phase C (customer pre-fill) deferred pending real upload pipeline. Feature flag `KYC_OCR_ENABLED=false` in production. See `docs/STATUS.md`.
**Date:** 2026-04-26 (proposed) · 2026-04-26 (Phase A+B merged)
**Deciders:** Amr (Engineering), Bella Ma (GM, MENA Region)
**Related:** ADR-0001 (Azure UAE North architecture), issues #17 (legal review), #16 (RTA licence). Tasks #17–#20.

---

## Context

KYC today is a thin wrapper around file upload. The customer uploads four documents — Emirates ID, UAE driving licence, visa copy, passport — and the admin manually reviews each one and flips a status enum.

**What's actually in the system right now:**

```
prisma/schema.prisma
  enum DocumentType { EMIRATES_ID | DRIVING_LICENCE | VISA | PASSPORT }
  enum DocumentStatus { PENDING | APPROVED | REJECTED | EXPIRED }
  enum KycStatus { PENDING | SUBMITTED | APPROVED | REJECTED }

  model Document {
    id, customerId, type, fileUrl, expiryDate, status,
    rejectionReason, uploadedAt, reviewedAt, reviewedBy
  }
```

```
apps/backend/src/origin_backend/customers/
  service.add_document(...)  → upserts a row, no extraction. Once a customer
                                has ≥2 documents, Customer.kycStatus auto-flips
                                PENDING → SUBMITTED.

apps/admin/app/(dashboard)/customers/page.tsx
  Detail modal shows document badges per type. Edit modal lets the admin
  flip each document's status manually. No image preview. No extracted
  fields. No comparison against customer-entered values.
```

**The problems this causes today:**

1. **The admin types nothing but reads everything.** Every approval is the admin opening the image, reading the Emirates ID number, comparing it character-by-character against what the customer typed. Slow and error-prone.
2. **The customer types more than they should.** They've already uploaded a clear photo of their Emirates ID, but they re-key full name, ID number, expiry date, DOB. Most attrition in the funnel is at this step.
3. **Bad data is invisible until it bites.** If a customer types `2025-04-30` for their driving licence expiry but the actual licence on the photo says `2024-04-30`, no system catches it. We discover the divergence at the rental counter.
4. **There's no audit trail of "what the document said".** The admin's approval is opaque — was it approved because the document's expiry was 2027, or because the admin missed that the document's expiry was last week? No record.

**What good looks like:**

- The customer uploads a clean photo. The system extracts the structured fields (full name, ID number, DOB, expiry, nationality) and pre-fills the form. The customer reviews/corrects, not types.
- The admin sees a side-by-side: image preview · OCR-extracted fields · customer-entered fields. Mismatches are highlighted. One-click approve when everything matches and confidence is high; manual review otherwise.
- Every document has a permanent record of the OCR result, the confidence per field, and (optionally) which fields the admin overrode at approval. This is the audit trail.

---

## Decision

**Use Azure AI Document Intelligence in `uaenorth` for all KYC OCR.** Specifically:

| Document | Model | Notes |
|---|---|---|
| Emirates ID | `prebuilt-idDocument` | Microsoft's prebuilt model recognizes Emirates ID as one of its supported ID types. Extracts: `FirstName`, `LastName`, `DocumentNumber`, `DateOfBirth`, `DateOfExpiration`, `Nationality`, `Sex`, `MachineReadableZone`. |
| Passport | `prebuilt-idDocument` | Same model handles MRZ-bearing passports across most issuing countries. |
| UAE Driving Licence | `prebuilt-document` (layout) + custom field-extraction rules **for V1**. Custom-trained model in V1.1. | No prebuilt UAE-DL classifier exists in Azure DI today. We use the layout model to get key-value pairs and apply field-name heuristics for `Licence No.`, `Issue Date`, `Expiry Date`, `Place of Issue`, `Date of Birth`. |
| Visa | `prebuilt-document` (layout) | Visa stickers vary too much for a custom model. We extract text + KV pairs and let the admin verify rather than auto-pre-fill. |

**Where it runs:** Document Intelligence resource `di-origin-prod-uaenorth` (already named in ADR-0001). UAE North region. Data does not leave UAE — important for PDPL.

**Where it sits in the flow:** Triggered server-side **after** upload, **asynchronously**. The customer doesn't wait on it. Backend writes the OCR result back to the `Document` row when done.

**Where the customer experiences it:** the upload screen. After upload, the form auto-fills extracted fields with a "we read this from your document — confirm or correct" treatment.

**Where the admin experiences it:** a redesigned KYC review screen with side-by-side image preview, OCR fields (confidence-shaded green/amber/red), customer-entered fields, and a one-click approve when everything matches.

---

## Options Considered

### Option A: Azure AI Document Intelligence (recommended)

| Dimension | Assessment |
|---|---|
| Region | `uaenorth` ✓ — same region as Postgres + Blob, no cross-border data flow |
| Emirates ID coverage | Native via `prebuilt-idDocument` |
| Driving licence coverage | Layout-only in V1; can custom-train in V1.1 |
| Arabic support | Yes (text extraction works on Arabic-scripted fields) |
| Cost | $1.50 per 1,000 pages on prebuilt-idDocument; $1.00 per 1,000 on layout. Effectively free at our volume. |
| SDK | First-party Python SDK, async-friendly |
| Auth | Managed identity ✓ — no key juggling |
| Compliance posture | Azure inherits the published PDPL stance Origin Hub committed to |

**Pros:** Stays inside our existing Azure stack. No new vendor relationship. No additional data residency story to defend.
**Cons:** UAE driving licence requires custom training to get to per-field extraction (V1.1 work, not V1).

### Option B: AWS Textract

| Dimension | Assessment |
|---|---|
| Region | `me-south-1` (Bahrain) — **not in UAE** ⚠ — same PDPL concern that drove ADR-0001 |
| ID document support | `AnalyzeID` API; Emirates ID supported |
| Driving licence | Generic table extraction only |
| Cost | Comparable |

**Pros:** Best ID-document API of the three.
**Cons:** Region. Same problem we just spent two weeks solving. Hard pass.

### Option C: Google Cloud Document AI

| Dimension | Assessment |
|---|---|
| Region | `me-central2` (Saudi) or multi-region; no UAE-resident option |
| ID coverage | "Identity Document Processor" supports passports/MRZ; weaker on regional IDs |
| Cost | Slightly higher |

**Pros:** Strong layout extraction.
**Cons:** Same residency problem.

### Option D: Onfido / Persona / Veriff (full IDV vendor)

| Dimension | Assessment |
|---|---|
| Surface | Full identity verification — OCR + face match + liveness + sanctions |
| Pricing | $1–$5 per verification |
| Lock-in | Heavy. Their SDK takes over the upload flow. |
| Region | Most have UAE customers but data-residency contracts are bespoke |

**Pros:** End-to-end IDV including liveness and PEP/sanctions screening that we'll eventually need anyway.
**Cons:** $1–$5 per verification × launch volume = real money. Locks us into their UI. Adds vendor risk we haven't priced. Best deferred until we have customer volume + a compliance officer to scope it properly. Track as a future ADR (-0007 IDV vendor).

### Option E: Tesseract (self-host)

**Cons:** Quality on Emirates ID is poor without our own training pipeline. We'd be building Document Intelligence from scratch. Not free when you count engineering time.

---

## Trade-off Analysis

This isn't a close call. ADR-0001 already chose Azure-in-UAE-North for the same data-residency reason that disqualifies Textract and Document AI here. Onfido is the only other serious contender, and it's overscoped for V1 — we don't need liveness or sanctions screening until we have transaction volume.

**Decision:** Azure Document Intelligence, `uaenorth`, `prebuilt-idDocument` for Emirates ID + passport, `prebuilt-document` (layout) + heuristics for UAE driving licence and visa. Plan to custom-train a UAE-DL model in V1.1 once we have ~100 real licence samples to train on.

---

## Schema additions

```prisma
enum OcrStatus {
  NOT_STARTED      // default — file uploaded, OCR not yet enqueued
  PROCESSING       // job enqueued, awaiting Azure DI response
  COMPLETED        // result stored in ocrFields
  FAILED           // 3 retries exhausted, falls back to manual review
  SKIPPED          // type doesn't support OCR (e.g. visa V1) or feature flag off
}

model Document {
  // ... existing fields ...

  // OCR additions
  ocrStatus        OcrStatus @default(NOT_STARTED)
  ocrProvider      String?   // "azure-doc-intel" — track provider for future swap
  ocrModel         String?   // e.g. "prebuilt-idDocument", "prebuilt-document"
  ocrFields        Json?     // structured extraction; shape varies by document type
  ocrConfidence    Float?    // overall doc-level confidence 0..1
  ocrRequestedAt   DateTime?
  ocrCompletedAt   DateTime?
  ocrFailureReason String?   // populated on FAILED

  // Audit: what the admin overrode at approval time
  reviewerOverrides Json?    // null if admin accepted OCR as-is; otherwise per-field deltas
}
```

**`ocrFields` shape (Emirates ID example):**

```jsonc
{
  "documentType": "EMIRATES_ID",
  "modelId": "prebuilt-idDocument",
  "fields": {
    "firstName":    { "value": "Amr",        "confidence": 0.98 },
    "lastName":     { "value": "Sarhan",     "confidence": 0.97 },
    "documentNumber": { "value": "784-1990-1234567-8", "confidence": 0.94 },
    "dateOfBirth":  { "value": "1990-05-12", "confidence": 0.99 },
    "dateOfExpiration": { "value": "2027-04-30", "confidence": 0.99 },
    "nationality":  { "value": "EGY",        "confidence": 0.92 },
    "sex":          { "value": "M",          "confidence": 0.99 }
  },
  "rawDocumentResultUrl": "https://stororiginproduaenorth.blob.core.windows.net/kyc-ocr-raw/{documentId}.json"
}
```

We persist the **raw** Document Intelligence response (`analyzeResult`) to a separate blob container, `kyc-ocr-raw/`, so we can re-process older documents if we change extraction rules without re-running OCR (which costs money). The `ocrFields` column is the curated subset.

---

## Data flow

```
                     ┌──────────────────────┐
                     │ Customer uploads     │
                     │ /me/documents POST   │
                     └─────────┬────────────┘
                               │ writes Document row,
                               │ status=PENDING,
                               │ ocrStatus=NOT_STARTED
                               │
              ┌────────────────┴───────────────┐
              │ Backend enqueues OCR job        │
              │ (FastAPI BackgroundTask in V1;  │
              │  Service Bus queue in V1.1)     │
              └────────────────┬────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │ azure_doc_intel_client.        │
              │   begin_analyze_document()     │
              │   model=prebuilt-idDocument    │
              │   url=blob SAS for fileUrl     │
              └────────────────┬───────────────┘
                               │
                               │  ~3-8s typical end-to-end
                               ▼
              ┌────────────────────────────────┐
              │ Backend writes:                │
              │  - ocrFields (curated)         │
              │  - ocrConfidence               │
              │  - ocrCompletedAt              │
              │  - raw response → blob         │
              └────────────────┬───────────────┘
                               │
                               ▼
                  ┌───────────────────────────┐
                  │ Customer poll / SSE       │
                  │ Admin sees populated      │
                  │ fields on next list call  │
                  └───────────────────────────┘
```

**Why BackgroundTask (V1) and not Service Bus (V1.1):**
- BackgroundTask is in-process. If the Container App revision is killed mid-job, we lose the in-flight OCR. With KYC volumes <200/day at launch, retrying on next admin view is fine. Move to a real queue when volume justifies the operational complexity.
- The `ocrStatus = PROCESSING` record gives us idempotency: if a request is lost, a follow-up endpoint (`POST /admin/documents/{id}/reocr`) can re-trigger. We add this admin action in V1.

---

## API surface changes

**Backend — additions only, no breaking changes:**

```
GET  /v1/customers/me/documents          # existing — extended response shape
       Response now includes:
       { id, type, fileUrl, ocrStatus, ocrFields?, ocrConfidence?, ... }

POST /v1/customers/me/documents          # existing — enqueues OCR after upsert
                                         # response unchanged at submit time

GET  /v1/customers/me/documents/{id}     # NEW — single-doc fetch for polling
                                         #       (so the customer screen can refresh
                                         #        OCR status without re-listing)

POST /v1/admin/documents/{id}/reocr      # NEW — admin re-trigger (ocrStatus reset)
POST /v1/admin/documents/{id}/approve    # NEW — explicit approve action,
                                         # accepts optional `overrides: {field: value}`
                                         # writes reviewerOverrides for audit
POST /v1/admin/documents/{id}/reject     # NEW — explicit reject + reason
```

The existing PATCH-style status flips on the admin remain for backwards compat for V1 but are deprecated in favor of the explicit approve/reject endpoints.

---

## Customer UX impact

**Before:**

```
[upload box]  → upload Emirates ID
[name field]  → type "Amr Sarhan"
[id field]    → type "784-1990-1234567-8"
[expiry]      → type "2027-04-30"
[submit]
```

**After:**

```
[upload box]  → upload Emirates ID
                    ↓ ~5 seconds, "Reading your document…"
[name field]  → pre-filled "Amr Sarhan" with confirm icon · editable
[id field]    → pre-filled "784-1990-1234567-8" with confirm icon · editable
[expiry]      → pre-filled "2027-04-30" · editable
[submit]      → enabled when all fields confirmed
```

If OCR confidence on a field is low (<0.85), the field is **not** pre-filled — we show a "we couldn't read this clearly, please type it" treatment. Trust the customer over a low-confidence guess.

**i18n:** all OCR-related strings go through `next-intl`. EN, AR (RTL), zh-CN strings added in the same PR as the customer-side change.

---

## Admin UX impact

The customers detail modal is replaced by a dedicated KYC review page (`/customers/[id]/kyc`):

```
┌──────────────────────┬──────────────────────┬─────────────────────┐
│  Image Preview        │  OCR extracted        │  Customer entered    │
│  (zoom + rotate)      │  ────────────         │  ─────────────       │
│                       │  Name: Amr Sarhan ✓   │  Name: Amr Sarhan    │
│  [emirates id image]  │  ID:   784-1990-…  ✓  │  ID:   784-1990-…    │
│                       │  DOB:  1990-05-12  ✓  │  DOB:  1990-05-12    │
│                       │  Exp:  2027-04-30  ⚠  │  Exp:  2026-04-30 ⚠  │
│                       │  Nat:  EGY         ✓  │  Nat:  EGY           │
│                       │                       │                       │
│                       │  Confidence: 96%      │  [Approve]  [Reject] │
└──────────────────────┴──────────────────────┴─────────────────────┘
```

- **Green check** = OCR field matches customer field, confidence ≥ 0.85.
- **Amber warning** = mismatch, but plausible (e.g. customer-typo'd one digit).
- **Red flag** = mismatch on a hard field (DOB, ID number) or confidence < 0.7 — block one-click approve, force the admin to look at the image.

**One-click approve:** when every field is green, "Approve" submits. Otherwise the admin must explicitly override per field, and those overrides get written to `reviewerOverrides` for audit.

---

## Privacy / PDPL

- Document Intelligence runs in `uaenorth`. OCR happens in-region. Document bytes do not leave UAE.
- The raw Azure DI response (`kyc-ocr-raw/`) is stored in the same UAE-resident Blob account, private container, no public access. SAS URLs are short-lived (15 min) for admin preview.
- The `ocrFields` JSON contains personal data (name, ID number, DOB) — already a PDPL-relevant field set on the customer table. No new residency boundary introduced.
- Customer right to deletion (PDPL Article 12): when a customer is deleted, both the Document row, the source file in `kyc-documents/`, and the raw OCR JSON in `kyc-ocr-raw/` are deleted. The `ocrFields` JSON disappears with the row (cascade).
- Logs **never** include `ocrFields` or extracted PII. Audit log entries reference `documentId` only.

---

## Cost

Azure DI prebuilt-idDocument: $1.50 per 1,000 pages.
Azure DI prebuilt-document: $1.00 per 1,000 pages.

Origin V1 launch volume (per ADR-0001 sizing): ~50–200 KYC submissions/month, ~3 documents/customer = 150–600 pages/month.

**Estimated monthly OCR cost: <$1.00.** Effectively free until we hit ~100K pages/month. Founders Hub credit absorbs it without rounding.

---

## Failure handling

| Failure | Response |
|---|---|
| Azure DI 5xx (transient) | Retry with exponential backoff (1s, 4s, 16s). After 3 tries → `ocrStatus = FAILED`, admin sees the document with no pre-filled fields and reviews manually. |
| Azure DI 400 / unsupported document | `ocrStatus = FAILED`, `ocrFailureReason` populated. Admin notified via the UI. Manual review path still works. |
| Field-confidence < 0.7 across the board | Don't pre-fill the customer form. Admin sees `ocrFields` but with all fields amber/red. |
| Image is blurry / partial / wrong document | Same as above — low confidence. Admin can re-request via "ask customer to re-upload". |
| Container App restart mid-job | Job lost. Admin sees `ocrStatus = PROCESSING` longer than expected; can hit `POST /admin/documents/{id}/reocr` to re-trigger. (V1.1 with Service Bus removes this entirely.) |
| Customer never returns to confirm pre-fill | Document still saves; admin reviews against extracted vs. nothing. Customer eventually completes flow on next visit. |

OCR is **never** a hard dependency on the KYC flow. Every code path that benefits from OCR also has a no-OCR fallback.

---

## Phased rollout

**Phase A — Schema + backend integration (1 PR, gated by feature flag).**
- Migration: add OCR columns to `Document`, add `OcrStatus` enum.
- New backend module `origin_backend/kyc/ocr.py` wrapping the Azure SDK.
- New `kyc-ocr-raw` blob container in Bicep.
- Add Azure DI resource to `infra/main.bicep` (referencing the existing `di-origin-prod-uaenorth` from ADR-0001).
- Background-task hook on document upsert; new endpoints (`/me/documents/{id}` poll, `/admin/documents/{id}/reocr`).
- Feature flag `KYC_OCR_ENABLED=false` by default — schema in, but the upsert path doesn't enqueue OCR until the flag flips.
- Backend tests against a fixture-mocked Azure DI client.

**Phase B — Admin review UI (1 PR).**
- New page `/customers/[id]/kyc` with the three-column layout above.
- StatusBadge / ConfidenceBadge components.
- Image preview component (handles JPG/PNG/PDF; uses SAS URLs).
- Approve/reject endpoints wired in.

**Phase C — Customer pre-fill UX (1 PR).**
- Auto-poll OCR status after upload (SSE-or-poll, decided in build).
- Pre-fill form fields with confirm/edit treatment.
- i18n strings for EN/AR/zh-CN.
- Customer-side tests.

**Phase D — Flip the flag in staging, then prod.** No code change, just env var rotation. Watch metrics for 1 week.

**Phase E (V1.1) — UAE driving licence custom model.** Once we have ~100 real licence images in `kyc-documents/`, train a custom DI model. Replace the heuristics-based extractor for `DRIVING_LICENCE`.

---

## Action items

1. [ ] **Land this ADR.** Reviewer: Amr (eng). Bella sign-off not required — this sits inside the cost ceiling already approved in ADR-0001.
2. [ ] **Add `di-origin-prod-uaenorth` (Document Intelligence S0) to `infra/main.bicep`.** Provisional — already namechecked in ADR-0001 but not yet provisioned.
3. [ ] **Add `kyc-ocr-raw` private container to `infra/modules/storage.bicep`.**
4. [ ] **Phase A PR:** schema migration + backend OCR module + endpoints + flag-gated upsert hook + tests. (Task #18.)
5. [ ] **Phase B PR:** admin KYC review page. (Task #19.)
6. [ ] **Phase C PR:** customer pre-fill UX + i18n + tests. (Task #20.)
7. [ ] **Update `docs/STATUS.md`** to add a "KYC OCR" subsection under Phase 2 once Phase A merges.
8. [ ] **File V1.1 follow-up issue** for custom UAE driving licence model training — gather samples first.
9. [ ] **Coordinate with Bella** on whether we want a per-document customer-facing disclaimer ("we read this document automatically — by submitting you confirm the extracted data") for legal review (ties to issue #17).

---

## Consequences

### What becomes easier
- Admin KYC review is ~5× faster on the happy path; image preview + extracted fields + match indicators replace manual character-by-character verification.
- Customer onboarding has fewer typing fields → less abandonment.
- Bad data is caught at submit time, not at the rental counter.
- We have a real audit trail per document — what the document said, what the customer typed, what the admin overrode.

### What becomes harder
- The schema has more columns. Each Document row is heavier (≈2 KB vs ≈400 bytes today).
- One more piece of infra to monitor (Document Intelligence quotas + latency).
- One more service contributing to PDPL data-flow diagrams. The diagram doesn't grow much — it stays in `uaenorth` — but it grows.
- We commit to Azure DI as the OCR layer. Swapping providers later is non-trivial because of the structured-result shape, even with `ocrProvider` tracked.

### What we'll need to revisit
- **V1.1 — Custom UAE-DL model.** Train once we have ~100 real licence images.
- **V1.2 — Service Bus queue** instead of in-process BackgroundTask, when daily KYC submissions exceed ~200 or when a single revision restart costing us ~10 jobs starts mattering.
- **Future ADR — full IDV vendor (Onfido / Persona / Veriff).** When liveness checks, sanctions/PEP screening, or document anti-fraud become required (likely tied to whatever the RTA Fleet Operator audit asks for).
- **Future ADR — face-match between Emirates ID photo and a customer selfie.** Out of scope for V1 but a natural follow-on once the OCR plumbing exists.

---

## Appendix: shape of `ocrFields` per document type

```jsonc
// EMIRATES_ID  (model: prebuilt-idDocument)
{
  "documentType": "EMIRATES_ID",
  "modelId": "prebuilt-idDocument",
  "fields": {
    "firstName":          { "value": "string", "confidence": 0..1 },
    "lastName":           { "value": "string", "confidence": 0..1 },
    "documentNumber":     { "value": "784-YYYY-XXXXXXX-X", "confidence": 0..1 },
    "dateOfBirth":        { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "dateOfExpiration":   { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "nationality":        { "value": "ISO-3", "confidence": 0..1 },
    "sex":                { "value": "M|F", "confidence": 0..1 }
  }
}

// PASSPORT  (model: prebuilt-idDocument)
{
  "documentType": "PASSPORT",
  "modelId": "prebuilt-idDocument",
  "fields": {
    "firstName":          { "value": "string", "confidence": 0..1 },
    "lastName":           { "value": "string", "confidence": 0..1 },
    "documentNumber":     { "value": "string", "confidence": 0..1 },
    "dateOfBirth":        { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "dateOfExpiration":   { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "countryRegion":      { "value": "ISO-3", "confidence": 0..1 },
    "machineReadableZone":{ "value": "raw MRZ string", "confidence": 0..1 }
  }
}

// DRIVING_LICENCE  (model: prebuilt-document; V1 heuristic extraction)
{
  "documentType": "DRIVING_LICENCE",
  "modelId": "prebuilt-document",
  "fields": {
    "fullName":           { "value": "string", "confidence": 0..1 },
    "licenceNumber":      { "value": "string", "confidence": 0..1 },
    "dateOfBirth":        { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "issueDate":          { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "expiryDate":         { "value": "YYYY-MM-DD", "confidence": 0..1 },
    "placeOfIssue":       { "value": "string", "confidence": 0..1 },
    "vehicleClasses":     { "value": ["3","6"], "confidence": 0..1 }
  }
}

// VISA  (model: prebuilt-document; layout only in V1)
{
  "documentType": "VISA",
  "modelId": "prebuilt-document",
  "fields": {
    "rawText":            { "value": "string", "confidence": 0..1 },
    "keyValuePairs":      [ /* DI's KV-pair output, untransformed */ ]
  }
}
```
