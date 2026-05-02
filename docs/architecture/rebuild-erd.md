# Origin — Rebuild ERD & Module Boundaries (V1)

_Draft v0.4 — 2026-05-02. This document is the gating artifact before the rebuild starts. Nothing destructive runs until this is signed off._

_Revision history: v0.1 initial draft; v0.2 adds party model (B2C + B2B), `payments.kind`, denormalization rule (§3.5), outbox payload contract (§4.12); v0.3 adds `consents` table for PDPL audit trail, `correlation_id` for end-to-end tracing, `vehicle_images.country_id`, argon2id params; v0.4 adds session refresh-token rotation (`rotated_from_session_id`), Powertrain/ServiceType clarifying notes, organizations soft-delete invariant, KYC route facade documentation._

Snapshot of the pre-rebuild codebase: tag `pre-rebuild-2026-05-02` at commit `e296ff9` (also tip of `origin/main` at the time of writing — the commit ref is permanent regardless of the tag).

---

## 1. Reframe & ground rules

- **No real users.** Pre-launch. Deployment target only.
- **Same stack:** FastAPI + Prisma Python, PostgreSQL, Next.js 15 + Tailwind, Azure UAE North + Vercel. Workflows + Azure subscription + Vercel projects + custom domain stay.
- **Database is wiped and re-migrated.** Stock vehicles re-seeded later.
- **Build on `main`.** Workflows fire on every push; that's the feedback loop. No long-lived `rebuild/v2` branch.
- **API contract:** single versioned surface — `/api/v1/*` (public), `/api/admin/v1/*` (admin), `/api/webhooks/{provider}` (unversioned).
- **Lessons of v0 are baked in as defaults**, not bolted on:
  - JWT signed with PyJWT (HS256, 16+ char secret).
  - HttpOnly cookies, TTL aligned with backend JWT, auto-refresh on 401.
  - Stripe amounts derived server-side from booking, never trusted from client.
  - KYC review gated to `SALES`, not `FLEET_MANAGER`.
  - Production refuses to start without Azure Blob endpoint set.
  - Rate limiting on auth endpoints by default.
  - X-Request-ID middleware + ErrorLog persistence on every request.
  - Composite indices for known admin filter+sort patterns.
  - Server-derived pricing on every quote endpoint (no client price echoing).

---

## 2. Module decomposition

```
core/                 primitives, no domain logic
  kernel/             Money, ULID, errors, request context
  messaging/          Outbox + worker
  observability/      AuditLog, ErrorLog, RequestId

platform/             cross-cutting capabilities used by every product
  countries/          Country config, legal entities, KYC doc types
  identity/           Parties (B2C + B2B), customers, organizations, internal users, OTP, sessions, KYC docs
  inventory/          Vehicles, images, availability holds
  pricing/            Rate cards, mileage packages, add-ons, promo codes
  billing/            Invoices, payments, refunds, payment intents
  agreements/         Rental agreements, terms documents

products/             revenue-generating verticals
  rental/             V1 — bookings, leases, mileage readings, milestones
  lease_to_own/       V3 stub (empty) — licence-gated, schema reserves concept
  purchase/           V2 stub (empty) — licence-gated
  fleet_management/   Internal — maintenance records

services/             technical adapters to external systems
  communications/     Twilio + SendGrid + WhatsApp logs
  intelligence/       Azure Document Intelligence (OCR jobs)
  location/           Azure Maps (stateless, no tables)
  payments/           Stripe + future Checkout.com / PayTabs (stateless adapters; data in platform/billing)

gateways/             entry points
  public_api/         /api/v1 — customer-facing
  admin_api/          /api/admin/v1 — staff-facing, role-gated
  webhook_receiver/   /api/webhooks/{provider}
```

**Inter-module rules (enforced by linter, not just convention):**

1. A module's tables are **owned by that module**. Cross-module table joins are forbidden in queries.
2. Modules call each other through **service interfaces** (Python functions or classes exported from `module/service.py`), never by reaching into another module's repository.
3. Asynchronous coupling between modules goes through the **outbox**. Synchronous coupling is allowed only top-down (`gateways → products → platform → core`); never sideways or upward.
4. `core/` cannot import from anything else. `platform/` cannot import from `products/` or `services/`. `products/` and `services/` may import from `platform/` and `core/`. `gateways/` may import from anything.

---

## 3. Cross-cutting primitives

### 3.1 Money

Every monetary value is a pair: `(amount_minor BIGINT NOT NULL, currency_code CHAR(3) NOT NULL)`. No floats. No implicit currency.

- AED stored as fils (1 AED = 100 fils). 100 AED → `amount_minor = 10000`, `currency_code = 'AED'`.
- Currency on a transactional row defaults from `country.default_currency_code` at write time — never inherited at read time.
- Display formatting is the frontend's problem; backend always returns the pair.

### 3.2 Country dimension

Every transactional row has `country_id TEXT NOT NULL` referencing `countries(id)`. Lookup tables that are intrinsically global (e.g. `outbox_events`) may have it nullable. Audit/error logs may have it nullable for unauthenticated traffic.

`country` is resolved at the gateway layer:
- Public API: from the customer's session (or IP geo for anonymous browse).
- Admin API: from a `X-Country-Code` header, defaulting to the staff user's home country.
- Webhooks: from the provider's tenant id mapped via env config.

### 3.3 Audit columns

Every table except append-only logs has:
```
created_at  TIMESTAMP(3)  NOT NULL  DEFAULT NOW()
updated_at  TIMESTAMP(3)  NOT NULL  DEFAULT NOW()
created_by  TEXT          NULL                            -- user.id or customer.id
updated_by  TEXT          NULL
```

`AuditLog` and `ErrorLog` are append-only — `created_at` only.

### 3.4 IDs

- Primary keys: ULIDs as `TEXT`. Sortable by time, URL-safe, no plaintext info leak.
- `Booking.reference`: human-friendly `BK-{YEAR}-{8HEX}` retained for customer-facing display.
- `Invoice.invoice_number`: per-legal-entity sequence, formatted by `legal_entity.invoice_prefix`.

### 3.5 Denormalization rule

Source of truth for derived state (e.g. "is this booking's deposit paid?") is **always the source table** — `payments`, not a boolean on `bookings`. Computed booleans on transactional rows are forbidden.

If a denormalized timestamp is added for query performance (e.g. `bookings.deposit_paid_at`), it follows two rules:

1. **Exactly one writer.** Only the corresponding outbox subscriber (e.g. `PAYMENT_SUCCEEDED`) writes the field. Never the booking endpoint, the admin UI, the webhook handler, or a manual fix-up script.
2. **Reconciliation job.** A nightly task compares denormalized fields against their source-table-derived ground truth and flags drift to `error_logs` for ops review.

This keeps denormalization a performance optimization, not a time bomb.

---

## 4. ERD by module

### 4.1 `platform/countries`

**`countries`** — first-class config record per country we operate in.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | `country-ae`, `country-sa` … |
| `code` | `CHAR(2)` UNIQUE | ISO-3166 alpha-2 |
| `name` | `TEXT` | "United Arab Emirates" |
| `default_currency_code` | `CHAR(3)` | `AED` |
| `vat_rate` | `DECIMAL(4,4)` | `0.0500` for UAE |
| `phone_regex` | `TEXT` | E.164 regex for the country |
| `default_language` | `Language` enum | `en`/`ar`/`zh-CN` |
| `enabled_payment_gateways` | `JSONB` | `["stripe", "checkout_com"]` |
| `kyc_config` | `JSONB` | per-country KYC rules |
| `product_flags` | `JSONB` | `{"rental": true, "purchase": false, "lease_to_own": false}` |
| `is_active` | `BOOLEAN` | |
| audit cols | | |

**`legal_entities`** — operating entity per country (CLAUDE.md table).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `name` | `TEXT` | "Shanghai Car Rental LLC" |
| `trade_licence_number` | `TEXT` NULL | |
| `tax_registration_number` | `TEXT` NULL | UAE TRN, etc. |
| `address`, `city`, `contact_email`, `contact_phone` | `TEXT` NULL | |
| `invoice_prefix` | `TEXT` NOT NULL DEFAULT `'INV'` | |
| `is_default` | `BOOLEAN` | one default per country |
| `is_active` | `BOOLEAN` | |
| audit cols | | |

Index: `(country_id)`. Partial unique: `(country_id) WHERE is_default`.

**`kyc_document_types`** — what KYC docs are required, per country.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `code` | `TEXT` | `EMIRATES_ID`, `UAE_DL`, `PASSPORT`, `VISA` |
| `label_en`, `label_ar`, `label_zh` | `TEXT` | |
| `is_required` | `BOOLEAN` | |
| `requires_expiry` | `BOOLEAN` | |
| `ocr_provider` | `TEXT` NULL | `azure_di` |
| `ocr_model` | `TEXT` NULL | `prebuilt-idDocument`, custom model id |
| `accepted_mime_types` | `JSONB` | `["image/jpeg", "image/png", "application/pdf"]` |
| `config` | `JSONB` | per-doc-type extra rules |
| `sort_order` | `INTEGER` | |
| `is_active` | `BOOLEAN` | |
| audit cols | | |

Unique: `(country_id, code)`.

---

### 4.2 `platform/identity`

The identity layer has three concerns:

1. **Internal staff** (`users`) — Origin employees with admin access. Separate auth path; never a counterparty to a contract.
2. **External counterparties** (`parties`) — anyone who can be the legal counterparty to a booking, lease, or invoice. The base table; satellites are `customers` (individuals) and `organizations` (B2B).
3. **Auth** (`otp_codes`, `sessions`) — verification codes and JWT/refresh records.

KYC docs hang off `parties` (not `customers`) because organizations also have KYC obligations (trade licence, signatory's EID).

**`users`** — internal staff (admin, sales, fleet_manager, super_admin).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | a user belongs to one country at a time; multi-country staff get duplicated rows |
| `email` | `TEXT` UNIQUE | |
| `phone_e164` | `TEXT` NULL | |
| `password_hash` | `TEXT` | argon2id; parameters self-encoded in hash. Target: `m=65536, t=3, p=4` (~150ms on B1ms tier). Lives in `platform.identity.passwords` module, not schema. |
| `role` | `UserRole` enum | `SUPER_ADMIN`, `ADMIN`, `SALES`, `FLEET_MANAGER` |
| `is_active` | `BOOLEAN` | |
| `last_login_at` | `TIMESTAMP(3)` NULL | |
| `deleted_at` | `TIMESTAMP(3)` NULL | soft delete |
| audit cols | | |

**`parties`** — the legal counterparty to a booking, lease, or invoice. Both individuals and organizations have a row here.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | shared with the satellite row in `customers` or `organizations` |
| `country_id` | `TEXT` FK | resident or registration country |
| `kind` | `PartyKind` enum | `INDIVIDUAL`, `ORGANIZATION` |
| `display_name` | `TEXT` | full name or legal name |
| `tax_registration_number` | `TEXT` NULL | UAE TRN, etc. |
| `billing_email` | `TEXT` NULL | invoice destination |
| `billing_address` | `TEXT` NULL | |
| `kyc_status` | `KycStatus` enum | aggregate KYC state for the party |
| `deleted_at` | `TIMESTAMP(3)` NULL | soft delete |
| audit cols | | |

Index: `(country_id, kind, kyc_status)`.

**`customers`** — individual person profile. Satellite of `parties` for `kind = 'INDIVIDUAL'`. Login identities live here.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK / FK → `parties.id` | shared key (table inheritance pattern) |
| `country_id` | `TEXT` FK | denormalised from `parties.country_id`, immutable after insert |
| `email` | `TEXT` | login identity |
| `phone_e164` | `TEXT` | login identity |
| `full_name` | `TEXT` | |
| `dob` | `DATE` NULL | |
| `nationality_iso2` | `CHAR(2)` NULL | |
| `residency_status` | `ResidencyStatus` enum | `RESIDENT`, `VISITOR`, `GCC_RESIDENT` |
| `preferred_language` | `Language` enum | |
| `marketing_opt_in` | `BOOLEAN` | |
| audit cols | | |

Unique: `(country_id, email)`, `(country_id, phone_e164)`. Same email/phone allowed across different countries.

**`organizations`** — company profile. Satellite of `parties` for `kind = 'ORGANIZATION'`. V1 admin can create these; customer-facing org-booking flows ship in V1.x (issue #91).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK / FK → `parties.id` | shared key |
| `country_id` | `TEXT` FK | denormalised, immutable |
| `legal_name` | `TEXT` | "Acme Trading LLC" |
| `trade_licence_number` | `TEXT` NULL | UAE trade licence |
| `industry` | `TEXT` NULL | free text or ISIC code |
| `employee_count_band` | `TEXT` NULL | `1-10`, `11-50`, `51-200`, `200+` |
| `payment_terms_days` | `INTEGER` NOT NULL DEFAULT `0` | 0 = upfront, 30 = net-30 |
| `primary_signatory_id` | `TEXT` FK → `customers.id` NULL | the human authorised to sign on behalf |
| audit cols | | |

Unique: `(country_id, trade_licence_number) WHERE trade_licence_number IS NOT NULL`.

**Soft-delete invariant** (enforced at the service layer, not via DB trigger): a customer who holds an active `primary_signatory_id` on any non-deleted organization cannot be soft-deleted until the role is reassigned. The `parties.deleted_at` write path checks this rule and returns a structured error if the invariant would break. DB triggers are intentionally avoided — silent FK rewriting on soft-delete is hard to debug.

**`organization_members`** — humans authorised to act on behalf of an organization.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `organization_id` | `TEXT` FK → `organizations.id` | |
| `customer_id` | `TEXT` FK → `customers.id` | the human (also a party in their own right) |
| `role` | `OrganizationMemberRole` enum | `OWNER`, `AUTHORIZED_SIGNATORY`, `BOOKER`, `ACCOUNTS_PAYABLE` |
| `is_active` | `BOOLEAN` | |
| audit cols | | |

Unique: `(organization_id, customer_id)`. Index: `(customer_id)` — answers "what orgs is this person a member of?".

**`consents`** — append-mostly audit trail of communication consents per party. Powers PDPL/GDPR compliance: when did this person consent, via what surface, when did they withdraw.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `party_id` | `TEXT` FK → `parties.id` | |
| `channel` | `ConsentChannel` enum | `EMAIL`, `SMS`, `WHATSAPP`, `PHONE_CALL`, `POST` |
| `purpose` | `ConsentPurpose` enum | `MARKETING`, `SERVICE_UPDATES`, `RESEARCH` |
| `granted_at` | `TIMESTAMP(3)` NULL | |
| `withdrawn_at` | `TIMESTAMP(3)` NULL | |
| `source` | `ConsentSource` enum | `REGISTRATION`, `PROFILE_UPDATE`, `ADMIN_IMPORT`, `UNSUBSCRIBE_LINK`, `INBOUND_REQUEST` |
| `evidence_blob_url` | `TEXT` NULL | screenshot / signed form (for double-opt-in or written consent) |
| `ip_address`, `user_agent` | `TEXT` NULL | |
| audit cols | | |

Index: `(party_id, channel, purpose)`, `(withdrawn_at) WHERE withdrawn_at IS NULL`.

Send-time rule (enforced in `services/communications`):
- `purpose = TRANSACTIONAL` (booking confirmation, OTP, receipt) bypasses consent — lawful basis is contract performance.
- `purpose = NOTIFICATION` / `MARKETING` requires an active grant: latest row for `(party_id, channel, purpose=MARKETING)` has `granted_at IS NOT NULL AND withdrawn_at IS NULL`. Otherwise `communication_logs.suppressed_reason = 'CONSENT_MISSING'`.

`customers.marketing_opt_in` becomes a derived flag (denormalized for UI speed) — flips by an outbox subscriber on the latest `consents` row, per §3.5 one-writer rule.

**`otp_codes`** — verification codes (request log; Twilio Verify is the prod path).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `identity_kind` | `OtpIdentityKind` enum | `EMAIL`, `PHONE` |
| `identity` | `TEXT` | the email or E.164 phone |
| `code_hash` | `TEXT` NULL | bcrypt of the 6-digit code (LOCAL provider only); null for Twilio Verify |
| `provider` | `OtpProvider` enum | `TWILIO_VERIFY`, `LOCAL` |
| `provider_sid` | `TEXT` NULL | Twilio Verify SID |
| `expires_at` | `TIMESTAMP(3)` | |
| `attempts` | `INTEGER` | |
| `consumed_at` | `TIMESTAMP(3)` NULL | |
| `ip_address` | `TEXT` NULL | |
| audit cols | | |

Index: `(identity, expires_at)`.

**`sessions`** — JWT/refresh management. Refresh-token rotation supported via `rotated_from_session_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | matches JWT `jti` |
| `subject_kind` | `SubjectKind` enum | `USER` (staff) or `CUSTOMER` (individual person) |
| `subject_id` | `TEXT` | `users.id` or `customers.id` |
| `refresh_token_hash` | `TEXT` | sha256 |
| `rotated_from_session_id` | `TEXT` FK → `sessions.id` NULL | set on rotation; the previous session that issued this one |
| `expires_at` | `TIMESTAMP(3)` | |
| `revoked_at` | `TIMESTAMP(3)` NULL | non-null after rotation OR explicit logout OR replay detection |
| `revoke_reason` | `SessionRevokeReason` enum NULL | `LOGOUT`, `ROTATED`, `REPLAY_DETECTED`, `ADMIN_FORCE`, `EXPIRED` |
| `ip_address`, `user_agent` | `TEXT` NULL | |
| audit cols | | |

Index: `(subject_kind, subject_id)`, `(expires_at)`, `(rotated_from_session_id)`.

V1: refresh just extends the session in place (no rotation). V1.1 turns on rotation: each refresh creates a new session row with `rotated_from_session_id = old.id`, marks the old `revoked_at = NOW(), revoke_reason = 'ROTATED'`. Reuse of an already-rotated refresh token = `REPLAY_DETECTED` → revoke entire chain. Schema is ready; logic ships in V1.1.

A session subject is always a **person** (staff or individual customer). When a customer acts on behalf of an organization, the API resolves it via an `X-Acting-As-Organization-Id` header → checked against `organization_members` → the resulting booking carries `party_id = organization.id` and `booked_by_customer_id = customer.id`. Sessions never authenticate as an organization directly.

**`kyc_documents`** — uploaded KYC files. Hangs off `parties` so both individuals and organizations are covered.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `party_id` | `TEXT` FK → `parties.id` | who the doc is about |
| `country_id` | `TEXT` FK | denormalised for query speed |
| `document_type_code` | `TEXT` | resolves to `(country_id, code)` on `kyc_document_types` |
| `blob_url` | `TEXT` | Azure Blob private container URL |
| `mime_type` | `TEXT` | |
| `file_size_bytes` | `BIGINT` | |
| `expires_on` | `DATE` NULL | document expiry (DL, EID, trade licence) |
| `status` | `KycDocStatus` enum | `UPLOADED`, `IN_REVIEW`, `APPROVED`, `REJECTED` |
| `ocr_status` | `OcrStatus` enum | `NOT_STARTED`, `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `SKIPPED` |
| `ocr_payload` | `JSONB` | parsed fields from OCR |
| `reviewer_user_id` | `TEXT` FK NULL | who approved/rejected |
| `reviewed_at` | `TIMESTAMP(3)` NULL | |
| `reject_reason` | `TEXT` NULL | |
| audit cols | | |

Index: `(party_id)`, `(status, country_id)`.

For an individual customer: `party_id` = the customer's own party row. For an organization: trade licence sits under the org's `party_id`; the authorised signatory's personal docs (EID, DL) live under their own `party_id` as a customer. Org KYC approval requires both the org's docs **and** the signatory's docs to be `APPROVED`.

---

### 4.3 `platform/inventory`

**`vehicles`** — the fleet.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | which country's fleet |
| `legal_entity_id` | `TEXT` FK | which entity owns/operates the vehicle |
| `brand` | `Brand` enum | `NIO`, `VOYAH`, `ZEEKR`, `BYD`, `XPENG`, `LI_AUTO`, `DENZA`, `MG`, `HONGQI` |
| `model` | `TEXT` | "ES6", "Free", "X", "Seal" |
| `model_year` | `INTEGER` | |
| `body_type` | `BodyType` enum | `SUV`, `SEDAN`, `MPV`, `COUPE`, `CROSSOVER`, `WAGON` |
| `powertrain` | `Powertrain` enum | `EV`, `PHEV`, `HYBRID`, `ICE` |
| `trim` | `TEXT` NULL | |
| `plate_number` | `TEXT` UNIQUE | |
| `vin` | `TEXT` UNIQUE NULL | |
| `color` | `TEXT` | |
| `transmission` | `Transmission` enum | `AUTOMATIC`, `MANUAL`, `SINGLE_SPEED` |
| `seats` | `INTEGER` | |
| `status` | `VehicleStatus` enum | `AVAILABLE`, `RESERVED`, `RENTED`, `MAINTENANCE`, `RETIRED` |
| `odometer_km` | `INTEGER` | |
| `primary_image_url` | `TEXT` NULL | denormalised for list endpoints |
| audit cols | | |

Index: `(country_id, status)`, `(brand, model)`.

**`vehicle_images`** — gallery, ordered.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `vehicle_id` | `TEXT` FK | |
| `country_id` | `TEXT` FK | denormalised from vehicle, immutable. Future-proof for per-country blob storage when KSA/Egypt expansion forces data residency. |
| `blob_url` | `TEXT` | public container |
| `sort_order` | `INTEGER` | |
| `alt_en`, `alt_ar`, `alt_zh` | `TEXT` NULL | |
| `is_primary` | `BOOLEAN` | |
| audit cols | | |

Index: `(vehicle_id, sort_order)`.

**`vehicle_availability_holds`** — single source of truth for "is this car free between X and Y?".

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `vehicle_id` | `TEXT` FK | |
| `country_id` | `TEXT` FK | |
| `start_at` | `TIMESTAMP(3)` | inclusive |
| `end_at` | `TIMESTAMP(3)` | exclusive |
| `reason` | `HoldReason` enum | `BOOKING`, `LEASE`, `MAINTENANCE`, `MANUAL_BLOCK` |
| `reference_kind` | `HoldReferenceKind` enum | `BOOKING`, `LEASE`, `MAINTENANCE`, `NONE` |
| `reference_id` | `TEXT` NULL | the booking/lease/maintenance id |
| `notes` | `TEXT` NULL | |
| audit cols | | |

Index: `(vehicle_id, start_at, end_at)`. Excludes overlapping `BOOKING` and `LEASE` holds via app-level check on insert (Postgres GIST exclusion constraints are an option but slower).

---

### 4.4 `platform/pricing`

**`rental_rate_cards`** — price-per-day or per-month for a vehicle (or global default).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `vehicle_id` | `TEXT` FK NULL | NULL = applies to all vehicles in country |
| `tier` | `RentalTier` enum | `SHORT_TERM`, `LONG_TERM` |
| `daily_rate_minor` | `BIGINT` | |
| `monthly_rate_minor` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `valid_from` | `DATE` | |
| `valid_to` | `DATE` NULL | NULL = open-ended |
| `is_active` | `BOOLEAN` | |
| audit cols | | |

Index: `(country_id, vehicle_id, tier, valid_from)`.

**`mileage_packages`**, **`add_ons`**, **`promo_codes`** — straightforward, country-scoped, soft-deletable.

---

### 4.5 `platform/billing`

**`invoices`** — billable obligation issued by a legal entity to a party.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `legal_entity_id` | `TEXT` FK | which entity issues |
| `party_id` | `TEXT` FK → `parties.id` | who is billed |
| `lease_id` | `TEXT` FK NULL | the lease this invoice belongs to (rental V1) |
| `invoice_number` | `TEXT` UNIQUE | `INV-2026-000001`, per-legal-entity sequence |
| `issued_at` | `TIMESTAMP(3)` | |
| `due_at` | `TIMESTAMP(3)` | |
| `currency_code` | `CHAR(3)` | |
| `subtotal_minor`, `vat_minor`, `total_minor` | `BIGINT` | |
| `status` | `InvoiceStatus` enum | `DRAFT`, `ISSUED`, `PAID`, `OVERDUE`, `VOID` |
| `pdf_blob_url` | `TEXT` NULL | rendered PDF |
| audit cols | | |

Index: `(party_id, status)`, `(legal_entity_id, issued_at DESC)`, partial `(due_at) WHERE status IN ('ISSUED', 'OVERDUE')`.

**`invoice_lines`** — line items.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `invoice_id` | `TEXT` FK | |
| `description_en`, `description_ar`, `description_zh` | `TEXT` | trilingual |
| `quantity` | `INTEGER` | |
| `unit_amount_minor` | `BIGINT` | |
| `line_total_minor` | `BIGINT` | derived but stored |
| `vat_rate` | `DECIMAL(4,4)` | snapshot at issuance |
| `tax_code` | `TEXT` NULL | for FTA-compliant invoicing |
| `sort_order` | `INTEGER` | |

**`payments`** — money received from a party, regardless of what it pays for.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `party_id` | `TEXT` FK | who paid |
| `kind` | `PaymentKind` enum | `DEPOSIT`, `INVOICE_PAYMENT`, `PENALTY`, `MANUAL_CREDIT` |
| `invoice_id` | `TEXT` FK NULL | required when `kind = 'INVOICE_PAYMENT'`; null otherwise |
| `lease_id` | `TEXT` FK NULL | required when `kind = 'DEPOSIT'` (deposit is per-lease) |
| `provider` | `PaymentProvider` enum | `STRIPE`, `CHECKOUT_COM`, `PAYTABS`, `CASH`, `BANK_TRANSFER` |
| `provider_payment_id` | `TEXT` NULL | Stripe `pi_xxx`, etc. |
| `amount_minor` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `status` | `PaymentStatus` enum | `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` |
| `captured_at` | `TIMESTAMP(3)` NULL | |
| `metadata` | `JSONB` | provider-specific extras |
| audit cols | | |

Constraints: `(kind = 'INVOICE_PAYMENT') ↔ (invoice_id IS NOT NULL)`; `(kind = 'DEPOSIT') ↔ (lease_id IS NOT NULL)`. Enforced via `CHECK` clauses.

Index: `(party_id, captured_at DESC)`, `(invoice_id)`, `(lease_id, kind)`. Unique partial: `(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL` — protects against double-recording the same Stripe payment.

**`payment_intents`** — provider-side intent record (3DS, off-session, etc.).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `payment_id` | `TEXT` FK NULL | linked once captured |
| `provider` | `PaymentProvider` enum | |
| `provider_intent_id` | `TEXT` UNIQUE | Stripe `pi_xxx` |
| `client_secret` | `TEXT` NULL | held briefly; cleared on webhook resolution |
| `amount_minor` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `status` | `TEXT` | provider-specific status echo |
| `expires_at` | `TIMESTAMP(3)` NULL | |
| audit cols | | |

**`refunds`** — refund issued against a payment.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `payment_id` | `TEXT` FK | |
| `amount_minor` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `reason` | `TEXT` | |
| `provider_refund_id` | `TEXT` NULL | |
| `status` | `RefundStatus` enum | `PENDING`, `SUCCEEDED`, `FAILED` |
| audit cols | | |

Key design points:
- `invoices.legal_entity_id NOT NULL` — every invoice is issued by a specific legal entity (Shanghai Car Rental LLC for UAE rental, etc.). Footer/TRN/branding flows from this.
- `invoice_number` generated per-legal-entity from a sequence: `INV-2026-000001`. Sequences are per legal entity, not global.
- Multi-invoice batch payment (`payment_invoice_links`) is **deferred to V1.1**; V1 keeps the simple "one payment, one obligation" link via `kind` + `invoice_id`/`lease_id`.
- Payment state is sourced from `payments.status` via webhook updates only — never written from booking endpoints or admin UI directly. See §3.5.

---

### 4.6 `platform/agreements`

**`rental_agreements`** — signed contract per lease.
**`terms_documents`** — versioned content for ToS, privacy, rental agreement template, etc., per legal entity.

Both keyed by `(country_id, legal_entity_id, version)`. `effective_from` makes "what version was active when this agreement was signed?" answerable forever.

---

### 4.7 `products/rental`

**`bookings`** — pre-lease quote that a party is reserving.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `reference` | `TEXT` UNIQUE | `BK-2026-A1B2C3D4` |
| `party_id` | `TEXT` FK → `parties.id` | the legal counterparty (individual or organization) |
| `booked_by_customer_id` | `TEXT` FK → `customers.id` | the human who clicked "book"; equals `party_id` for B2C, an org member for B2B |
| `vehicle_id` | `TEXT` FK | |
| `status` | `BookingStatus` enum | `DRAFT`, `SUBMITTED`, `CONFIRMED`, `CANCELLED`, `EXPIRED` |
| `start_date`, `end_date` | `DATE` | inclusive/exclusive |
| `duration_days` | `INTEGER` | derived but stored |
| `mileage_package_id` | `TEXT` FK NULL | |
| `add_ons` | `JSONB` | `[{add_on_id, quantity}]` snapshot at booking time |
| `pickup_location`, `dropoff_location` | `TEXT` NULL | |
| `notes` | `TEXT` NULL | |
| `currency_code` | `CHAR(3)` | |
| `subtotal_minor`, `vat_minor`, `deposit_minor`, `total_minor` | `BIGINT` | snapshot at submission |
| `submitted_at`, `confirmed_at`, `cancelled_at`, `expired_at` | `TIMESTAMP(3)` NULL | |
| audit cols | | |

Index: `(party_id, status)`, `(booked_by_customer_id, status)`, `(vehicle_id, start_date, end_date)`.

**`leases`** — confirmed rental contract.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK | |
| `legal_entity_id` | `TEXT` FK | |
| `booking_id` | `TEXT` FK UNIQUE | one lease per booking |
| `party_id` | `TEXT` FK → `parties.id` | the legal counterparty |
| `primary_driver_customer_id` | `TEXT` FK → `customers.id` | the person physically using the car (= `party_id` for B2C; nominated org member for B2B) |
| `vehicle_id` | `TEXT` FK | |
| `lease_type` | `LeaseType` enum | `SHORT_TERM` (<30d), `LONG_TERM` (≥30d) |
| `status` | `LeaseStatus` enum | `ACTIVE`, `COMPLETED`, `TERMINATED`, `DEFAULTED` |
| `start_date`, `end_date` | `DATE` | |
| `actual_end_date` | `DATE` NULL | when returned |
| `currency_code` | `CHAR(3)` | |
| `monthly_rate_minor`, `daily_rate_minor` | `BIGINT` | snapshotted from rate card |
| `deposit_held_minor`, `deposit_refunded_minor` | `BIGINT` | |
| `included_km_per_month` | `INTEGER` | snapshotted from mileage_package |
| `overage_rate_per_km_minor` | `BIGINT` | snapshotted |
| audit cols | | |

Index: `(party_id, status)`, `(primary_driver_customer_id, status)`, `(vehicle_id, status)`.

**`lease_milestones`** — scheduled events (monthly billing, return reminder, completion).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `lease_id` | `TEXT` FK | |
| `kind` | `MilestoneKind` enum | `START`, `MONTHLY_BILLING`, `RETURN_REMINDER`, `RETURN_COMPLETED`, `COMPLETION` |
| `due_at` | `TIMESTAMP(3)` | |
| `completed_at` | `TIMESTAMP(3)` NULL | |
| `payload` | `JSONB` | kind-specific data |
| audit cols | | |

Index: `(lease_id, kind)`, `(due_at) WHERE completed_at IS NULL`.

**`mileage_readings`** — odometer at pickup, return, mid-lease.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `lease_id` | `TEXT` FK | |
| `recorded_at` | `TIMESTAMP(3)` | |
| `odometer_km` | `INTEGER` | |
| `source` | `MileageSource` enum | `PICKUP`, `RETURN`, `MID_LEASE`, `SELF_REPORT` |
| `recorded_by_user_id` | `TEXT` FK NULL | |
| `evidence_blob_url` | `TEXT` NULL | photo of the dashboard |
| audit cols | | |

Index: `(lease_id, recorded_at)`.

---

### 4.8 `products/lease_to_own` and `products/purchase`

V1: empty schemas (no tables). Module folders exist with `__init__.py` only. They reserve the namespace and product flag, ready for V2/V3 when licences land. Keeping the enum value in `services.product_flags` is enough — no schema cost to defer.

---

### 4.9 `products/fleet_management`

**`vehicle_maintenance_records`** — service history.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `vehicle_id` | `TEXT` FK | |
| `kind` | `MaintenanceKind` enum | `SERVICE`, `REPAIR`, `INSPECTION`, `TYRE_CHANGE`, `BATTERY_CHECK` |
| `started_at`, `completed_at` | `TIMESTAMP(3)` | |
| `odometer_km` | `INTEGER` | |
| `cost_minor` | `BIGINT` | |
| `currency_code` | `CHAR(3)` | |
| `vendor` | `TEXT` NULL | service centre |
| `notes` | `TEXT` NULL | |
| audit cols | | |

When `started_at < completed_at AND completed_at IS NULL`, a corresponding `vehicle_availability_holds` row keeps the car off the rental market.

---

### 4.10 `services/communications`

**`communication_logs`** — every outbound message attempt (including suppressed).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK NULL | |
| `correlation_id` | `TEXT` NULL | matches outbox `correlation_id` / HTTP `X-Request-ID` |
| `party_id` | `TEXT` FK NULL | who's being addressed (anonymous comms allowed) |
| `kind` | `CommunicationKind` enum | `EMAIL`, `SMS`, `WHATSAPP` |
| `purpose` | `CommunicationPurpose` enum | `TRANSACTIONAL`, `NOTIFICATION`, `MARKETING` |
| `template_code` | `TEXT` | `BOOKING_CONFIRMATION`, `OTP`, `PAYMENT_DUE`, etc. |
| `recipient_email`, `recipient_phone` | `TEXT` NULL | one or the other |
| `subject` | `TEXT` NULL | |
| `body_preview` | `TEXT` | first 500 chars |
| `provider` | `CommunicationProvider` enum | `SENDGRID`, `TWILIO_SMS`, `TWILIO_WHATSAPP` |
| `provider_message_id` | `TEXT` NULL | |
| `status` | `CommunicationStatus` enum | `QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED`, `SUPPRESSED` |
| `suppressed_reason` | `TEXT` NULL | `CONSENT_MISSING`, `HARD_BOUNCE_BLOCKLISTED`, `RATE_LIMIT`, etc. — set when `status='SUPPRESSED'` |
| `sent_at`, `delivered_at`, `failed_at` | `TIMESTAMP(3)` NULL | |
| `error_message` | `TEXT` NULL | |
| audit cols | | |

Index: `(template_code, sent_at DESC)`, `(party_id, sent_at DESC)`, `(correlation_id)`.

Suppressed rows are recorded explicitly — "we'd have sent X but didn't because Y". Auditable evidence that we honoured a withdrawn consent.

---

### 4.11 `services/intelligence`

**`ocr_jobs`** — Document Intelligence runs.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `kyc_document_id` | `TEXT` FK | |
| `provider` | `OcrProvider` enum | `AZURE_DI`, `LOCAL` |
| `model` | `TEXT` | `prebuilt-idDocument`, custom model id |
| `status` | `OcrJobStatus` enum | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` |
| `output` | `JSONB` | parsed fields |
| `error_message` | `TEXT` NULL | |
| `started_at`, `completed_at` | `TIMESTAMP(3)` NULL | |
| audit cols | | |

---

### 4.12 `core/messaging`

**`outbox_events`** — the event bus.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK NULL | |
| `correlation_id` | `TEXT` NULL | matches `X-Request-ID` of the originating HTTP request — links event to user action and downstream effects |
| `event_type` | `TEXT` | `BOOKING_SUBMITTED`, `LEASE_STARTED`, `KYC_APPROVED` |
| `aggregate_type` | `TEXT` | `Booking`, `Lease`, `Customer` |
| `aggregate_id` | `TEXT` | |
| `payload` | `JSONB` | |
| `status` | `OutboxEventStatus` enum | `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED` |
| `attempts` | `INTEGER` | |
| `last_error` | `TEXT` NULL | |
| `available_at` | `TIMESTAMP(3)` | |
| `processed_at` | `TIMESTAMP(3)` NULL | |
| `created_at` | `TIMESTAMP(3)` | append-only |

Index: `(status, available_at)`, `(event_type)`, `(correlation_id)`.

End-to-end trace: `X-Request-ID` (HTTP) → `outbox_events.correlation_id` → `communication_logs.correlation_id` → `audit_logs.request_id` → `error_logs.request_id`. Single id threads through every system effect of one user click.

Worker process: a long-running async task in the same Container App (or a sidecar Container App later) polls `WHERE status='PENDING' AND available_at <= now()` with `FOR UPDATE SKIP LOCKED`, dispatches to subscribers (in-process service functions registered at startup), updates status. Exponential backoff on failure; dead-letter after N attempts.

Subscribers (V1):
- `BOOKING_SUBMITTED` → email party; SMS booker; admin notification
- `BOOKING_CONFIRMED` → create lease; email rental agreement; charge deposit
- `KYC_APPROVED` → email party; admin notification
- `LEASE_STARTED` → email party; create month-1 invoice
- `LEASE_MONTHLY_BILLING_DUE` → create invoice; email party
- `PAYMENT_SUCCEEDED` → mark invoice paid (or `bookings.deposit_paid_at`); email receipt
- `PAYMENT_FAILED` → email party; admin notification

**Payload contract:**

- Payloads contain **what subscribers need to act**, no more, no less: aggregate id plus the denormalized fields a subscriber would otherwise look up (recipient email/phone for notifications, currency + amount for receipts, vehicle plate for confirmation copy).
- Payloads are **not snapshots of the source row**. Drop fields no subscriber needs.
- **Hard cap: 8 KB per payload.** If a subscriber needs more, it queries by id.
- Every event type has a typed schema in `core/messaging/events.py` and a registered list of subscribers. Adding an event type without subscribers is a code smell flagged in CI.
- Payloads serialize money as `{ "amount_minor": 10000, "currency_code": "AED" }`, never as a single number.

---

### 4.13 `core/observability`

**`audit_logs`** — append-only record of admin actions.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK NULL | |
| `actor_kind` | `ActorKind` enum | `USER`, `CUSTOMER`, `SYSTEM` |
| `actor_id` | `TEXT` NULL | |
| `action` | `TEXT` | `kyc.approve`, `lease.terminate`, `vehicle.update` |
| `target_kind` | `TEXT` NULL | `Customer`, `Lease`, `Vehicle` |
| `target_id` | `TEXT` NULL | |
| `payload` | `JSONB` | request body, before/after diff |
| `ip_address`, `user_agent` | `TEXT` NULL | |
| `request_id` | `TEXT` NULL | matches X-Request-ID middleware |
| `created_at` | `TIMESTAMP(3)` | |

Index: `(actor_kind, actor_id, created_at DESC)`, `(target_kind, target_id, created_at DESC)`.

**`error_logs`** — append-only errors caught by middleware.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | |
| `country_id` | `TEXT` FK NULL | |
| `request_id` | `TEXT` | |
| `status_code` | `INTEGER` | |
| `route`, `method` | `TEXT` | |
| `message` | `TEXT` | |
| `stack` | `TEXT` NULL | |
| `payload` | `JSONB` NULL | |
| `created_at` | `TIMESTAMP(3)` | |

Index: `(created_at DESC)`, `(request_id)`.

---

## 5. Enums (consolidated)

```
Language               ENUM('en', 'ar', 'zh-CN')
UserRole               ENUM('SUPER_ADMIN', 'ADMIN', 'SALES', 'FLEET_MANAGER')
ResidencyStatus        ENUM('RESIDENT', 'VISITOR', 'GCC_RESIDENT')
KycStatus              ENUM('NOT_STARTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED')
KycDocStatus           ENUM('UPLOADED', 'IN_REVIEW', 'APPROVED', 'REJECTED')
OcrStatus              ENUM('NOT_STARTED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED')
OcrJobStatus           ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')
OcrProvider            ENUM('AZURE_DI', 'LOCAL')
OtpIdentityKind        ENUM('EMAIL', 'PHONE')
OtpProvider            ENUM('TWILIO_VERIFY', 'LOCAL')
SubjectKind            ENUM('USER', 'CUSTOMER')
SessionRevokeReason    ENUM('LOGOUT', 'ROTATED', 'REPLAY_DETECTED', 'ADMIN_FORCE', 'EXPIRED')
PartyKind              ENUM('INDIVIDUAL', 'ORGANIZATION')
OrganizationMemberRole ENUM('OWNER', 'AUTHORIZED_SIGNATORY', 'BOOKER', 'ACCOUNTS_PAYABLE')
Brand                  ENUM('NIO', 'VOYAH', 'ZEEKR', 'BYD', 'XPENG', 'LI_AUTO', 'DENZA', 'MG', 'HONGQI')
BodyType               ENUM('SUV', 'SEDAN', 'MPV', 'COUPE', 'CROSSOVER', 'WAGON')
Powertrain             ENUM('EV', 'PHEV', 'HYBRID', 'ICE')
                       -- EV: battery-only. PHEV: plug-in hybrid (chargeable + ICE).
                       -- HYBRID: HEV (regen-only, no plug). ICE: combustion-only.
                       -- Customer-facing "EV only" filter MUST exclude PHEV.
Transmission           ENUM('AUTOMATIC', 'MANUAL', 'SINGLE_SPEED')
VehicleStatus          ENUM('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'RETIRED')
HoldReason             ENUM('BOOKING', 'LEASE', 'MAINTENANCE', 'MANUAL_BLOCK')
HoldReferenceKind      ENUM('BOOKING', 'LEASE', 'MAINTENANCE', 'NONE')
RentalTier             ENUM('SHORT_TERM', 'LONG_TERM')
BookingStatus          ENUM('DRAFT', 'SUBMITTED', 'CONFIRMED', 'CANCELLED', 'EXPIRED')
LeaseType              ENUM('SHORT_TERM', 'LONG_TERM')
LeaseStatus            ENUM('ACTIVE', 'COMPLETED', 'TERMINATED', 'DEFAULTED')
MilestoneKind          ENUM('START', 'MONTHLY_BILLING', 'RETURN_REMINDER', 'RETURN_COMPLETED', 'COMPLETION')
MileageSource          ENUM('PICKUP', 'RETURN', 'MID_LEASE', 'SELF_REPORT')
MaintenanceKind        ENUM('SERVICE', 'REPAIR', 'INSPECTION', 'TYRE_CHANGE', 'BATTERY_CHECK')
InvoiceStatus          ENUM('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID')
PaymentKind            ENUM('DEPOSIT', 'INVOICE_PAYMENT', 'PENALTY', 'MANUAL_CREDIT')
PaymentStatus          ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')
PaymentProvider        ENUM('STRIPE', 'CHECKOUT_COM', 'PAYTABS', 'CASH', 'BANK_TRANSFER')
RefundStatus           ENUM('PENDING', 'SUCCEEDED', 'FAILED')
CommunicationKind      ENUM('EMAIL', 'SMS', 'WHATSAPP')
CommunicationProvider  ENUM('SENDGRID', 'TWILIO_SMS', 'TWILIO_WHATSAPP')
CommunicationStatus    ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'SUPPRESSED')
CommunicationPurpose   ENUM('TRANSACTIONAL', 'NOTIFICATION', 'MARKETING')
ConsentChannel         ENUM('EMAIL', 'SMS', 'WHATSAPP', 'PHONE_CALL', 'POST')
ConsentPurpose         ENUM('MARKETING', 'SERVICE_UPDATES', 'RESEARCH')
ConsentSource          ENUM('REGISTRATION', 'PROFILE_UPDATE', 'ADMIN_IMPORT', 'UNSUBSCRIBE_LINK', 'INBOUND_REQUEST')
OutboxEventStatus      ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')
ActorKind              ENUM('USER', 'CUSTOMER', 'SYSTEM')
ServiceType            ENUM('RENT', 'PURCHASE', 'LEASE_TO_OWN')
                       -- Forward-compat per CLAUDE.md ("do not remove enum values").
                       -- NO TABLE USES THIS COLUMN in V1: each products/* module owns
                       -- its own tables (bookings/leases live in rental, future purchase
                       -- module will own its own purchases table). The discriminator is
                       -- the table name, not a column. Enum kept as a registry.
```

---

## 6. API surface (gateways)

```
/api/v1/                              public, customer-facing
  /auth/otp/request                   POST  body: {identityKind, identity}
  /auth/otp/verify                    POST  body: {identityKind, identity, code}
  /auth/refresh                       POST  cookie: refresh
  /auth/logout                        POST
  /me                                 GET, PATCH                                  customer profile
  /vehicles                           GET   query: filters, pagination
  /vehicles/{id}                      GET
  /quotes                             POST  body: rental quote inputs            (server-derived totals)
  /bookings                           GET, POST
  /bookings/{id}                      GET, PATCH
  /bookings/{id}/submit               POST
  /bookings/{id}/cancel               POST
  /payments/intent                    POST  body: {bookingId, kind: 'deposit'}    (Stripe PI created server-side)
  /kyc/document-types                 GET
  /kyc/documents                      GET, POST                                   POST = upload
  /kyc/documents/{id}                 GET, DELETE
  /leases                             GET                                          customer's own
  /leases/{id}                        GET
  /invoices                           GET                                          customer's own
  /invoices/{id}                      GET
  /invoices/{id}/pdf                  GET   redirect to signed Blob URL

/api/admin/v1/                        admin, role-gated by JWT role claim
  /auth/login                         POST
  /auth/logout                        POST
  /me                                 GET
  /dashboard                          GET                                          KPIs, SUM in DB
  /customers                          GET, POST
  /customers/{id}                     GET, PATCH
  /customers/{id}/kyc                 GET                                          KYC review surface (lists docs via party)
  /customers/{id}/kyc/{docId}/approve POST
  /customers/{id}/kyc/{docId}/reject  POST
  /organizations                      GET, POST                                    B2B accounts (admin-only in V1; customer flows V1.x)
  /organizations/{id}                 GET, PATCH
  /organizations/{id}/members         GET, POST
  /organizations/{id}/members/{mId}   PATCH, DELETE
  /organizations/{id}/kyc             GET                                          org KYC review (trade licence, etc.)
  /organizations/{id}/kyc/{docId}/approve POST
  /organizations/{id}/kyc/{docId}/reject  POST
  /vehicles                           GET, POST
  /vehicles/{id}                      GET, PATCH, DELETE
  /vehicles/{id}/images               GET, POST
  /vehicles/{id}/images/{imgId}       PATCH, DELETE
  /bookings                           GET
  /bookings/{id}/confirm              POST                                         creates lease, charges deposit
  /leases                             GET
  /leases/{id}                        GET, PATCH
  /leases/{id}/complete               POST                                         frees vehicle hold
  /leases/{id}/terminate              POST
  /leases/{id}/mileage                POST
  /maintenance                        GET, POST
  /maintenance/{id}                   PATCH
  /reporting/revenue                  GET   query: range, group_by
  /reporting/utilization              GET
  /reporting/payment-aging            GET
  /audit-logs                         GET   query: filters

/api/webhooks/                        unversioned; provider owns the shape
  /stripe                             POST  signature-verified
  /twilio                             POST  signature-verified
  /sendgrid                           POST  signature-verified
  /azure-di                           POST  shared-secret header

/health/live                          GET   liveness
/health/ready                         GET   readiness (DB connectivity)
```

All `/api/admin/v1/*` requires `Authorization: Bearer <jwt>` with role claim. Roles per-route in a single decorator table — no scattered ad-hoc checks.

All `/api/v1/*` requires either an authenticated session cookie or anonymous browse (vehicles only).

**KYC route facade:** `/customers/{id}/kyc/*` and `/organizations/{id}/kyc/*` are admin-UI ergonomics. Because `customers.id = parties.id` and `organizations.id = parties.id` (shared PK from the table-inheritance pattern in §4.2), both routes resolve to the same underlying query: `kyc_documents WHERE party_id = {id}`. The two routes exist so the admin UI can keep B2C and B2B navigation separate; they are not separate data paths. A dual-role person (B2C customer who is also a B2B signatory) has docs queryable via either route — it's the same `party_id`.

---

## 7. Open decisions for sign-off

### D1. Pricing snapshot vs. rate-card lookup

When a customer's lease is active for 12 months and we change the rate card mid-stream, what should happen to month-7 billing?

**Recommendation:** snapshot rate at lease creation onto the lease row (`monthly_rate_minor`, `daily_rate_minor`, `included_km_per_month`, `overage_rate_per_km_minor`). Rate-card changes only affect new bookings.

### D2. OTP table even with Twilio Verify

Twilio Verify means we don't need to store the code. But we do need to record that a verification was issued (rate-limit, audit). The `otp_codes` table holds the request log; `provider_sid` references the Twilio object. `code_hash` is null when `provider='TWILIO_VERIFY'`.

**Recommendation:** keep the table, allow `code_hash` to be null when provider is Twilio.

### D3. Multi-currency now or later?

Schema supports multi-currency from day 0 (every money field carries its currency). But the V1 product is UAE-only — every row will have `currency_code='AED'` for the foreseeable future.

**Recommendation:** schema is ready, but no FX conversion logic in V1. Reports always group by currency; cross-currency aggregation is V2 work.

### D4. Soft-delete scope

`deleted_at` lives on `parties` (so customer + organization deletion goes through one column) and on `users`. Leases, bookings, invoices, payments are append-only-ish — never deleted, only state-transitioned. Vehicles are `RETIRED`, not deleted.

**Recommendation:** soft-delete only on `parties` (covers individuals and orgs) and `users`. Everything else is state-machined.

### D5. Outbox worker — same Container App or sidecar?

V1: same Container App, started as a background asyncio task in `lifespan`. Cheap; latency tolerable.

V1.5: split into a separate Container App when worker load justifies it. Same image, different command (`python -m origin_backend.workers.outbox`).

**Recommendation:** start in-process, plan for split.

### D6. Stripe choice

CLAUDE.md → Stripe. Issue #117 → Checkout.com or PayTabs (regional). 

**Recommendation:** **Stripe PaymentIntent for V1** (already wired in `e296ff9`'s direction, AED supported, fastest path to live). Add Checkout.com as a second provider in V1.1 once UAE merchant agreement is in hand. The schema supports both via `payments.provider` enum from day 0.

### D7. Admin email migration

Current admin login is `admin@originleasing.ae`. Rebuild = clean DB = clean opportunity.

**Recommendation:** seed a single super-admin user `admin@origin-auto.ae` with a temporary password issued out-of-band; force password reset on first login. The `originleasing.ae` mailbox can stay as a forwarding address.

---

## 8. Sequencing (revised against ERD)

| Day | Deliverable |
|---|---|
| **1** | This doc signed. Wipe `apps/`, scaffold the module skeleton (empty `__init__.py` per module + service.py stubs), drop and re-migrate DB. Health endpoints green. |
| **2-3** | `core` + `platform/countries` + `platform/identity` (customers, users, OTP, sessions, KYC docs). Auth flows end-to-end with Twilio Verify in dev. |
| **4-5** | `platform/inventory` + `platform/pricing`. Vehicle CRUD, image upload to Azure Blob, rate cards seeded, quote endpoint. |
| **6-7** | `products/rental` happy path: draft booking → quote → submit → admin confirm → lease created. Outbox + worker live. |
| **8-9** | `platform/billing` + `services/payments`: invoice generation, Stripe PaymentIntent, deposit charge on confirm, monthly milestone billing. |
| **10-11** | `services/intelligence` + KYC review flow. Azure DI integration, admin approve/reject. |
| **12-13** | `services/communications`: Twilio SMS, SendGrid email, WhatsApp Business API stubs. Outbox subscribers wired. |
| **14-17** | Customer Next.js app rebuilt against new API. Trilingual + RTL from day 1. |
| **18-21** | Admin Next.js app rebuilt against new API. |
| **22-25** | Reporting endpoints, Bicep reconciliation, Lighthouse pass, smoke. |
| **26+** | Reseed fleet, RTA licence cutover, go-live. |

That's roughly 4 weeks of compressed work; pad to 6 calendar weeks.

---

## 9. What I need from you to proceed

Sign off on:

- [ ] Module decomposition (§2)
- [ ] Cross-cutting primitives (§3)
- [ ] ERD per module (§4) — or flag tables/columns to remove/add/rename
- [ ] Open decisions D1–D7 (§7) — confirm or override

Once signed: I tag, wipe `apps/`, scaffold the module tree, write the new Prisma schema + migration, drop and re-migrate the prod DB, push to `main`. Workflows redeploy automatically — Azure Container App will go red until the empty backend builds, which is expected and fine.

Anything you want changed, comment inline. Anything you want me to defer to V1.1 instead of V1, just mark it.
