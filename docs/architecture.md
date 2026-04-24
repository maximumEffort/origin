# Technical Architecture

> Chinese Car Leasing Platform — Dubai, UAE

---

## System Overview

```
┌────────────────────────────────────────────────┐
│                  CLIENTS                          │
│  Website (Next.js)   Mobile App (Flutter)          │
│  Admin Dashboard     n8n Automation Engine         │
└──────────────────────────┬─────────────────────┘
                         │ HTTPS / REST API
┌──────────────────────────┴─────────────────────┐
│              BACKEND API                           │
│  Node.js / Express (or NestJS)                     │
│  REST endpoints • Auth • Business Logic             │
│  Webhook emitter (for n8n triggers)                │
└──────────────────────────┬─────────────────────┘
                         │
          ┌────────────┴────────────┐
          │                         │
┌─────────┴──────┐ ┌─────────┴──────┐
│  PostgreSQL DB  │ │  File Storage   │
│  (UAE region)  │ │  (UAE region)  │
└───────────────┘ └───────────────┘
  Vehicles, Customers      KYC docs, agreements,
  Leases, Payments         vehicle images
```

---

## Stack Decisions

### Frontend — Website

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR for SEO, built-in i18n routing, large ecosystem |
| Styling | **Tailwind CSS** + `tailwindcss-rtl` | Utility-first, RTL plugin for Arabic support |
| State | **Zustand** (lightweight) or React Query | Simple global state + server state caching |
| CMS | **Sanity** | Real-time, flexible schema, multilingual content support |
| Forms | **React Hook Form** + Zod | Type-safe validation |
| Maps | **Google Maps JS API** | Pickup/dropoff selection |
| Payments | **Checkout.com JS SDK** | Drop-in UI, AED support |

### Frontend — Mobile App

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Flutter 3** | Single codebase iOS + Android, Arabic RTL built-in |
| State | **Riverpod** | Flutter-native, testable, scales well |
| HTTP | **Dio** | Interceptors for auth headers, retry logic |
| Storage | **Hive** | Local caching, fast, no native dependencies |
| Maps | **Google Maps Flutter plugin** | |
| Push | **Firebase Cloud Messaging** | iOS + Android push notifications |

### Backend API

| Concern | Choice | Reason |
|---|---|---|
| Runtime | **Node.js** | Same language as frontend, large talent pool |
| Framework | **NestJS** | Structured, TypeScript-first, decorators, DI |
| ORM | **Prisma** | Type-safe, great DX, migration tooling |
| Database | **PostgreSQL** | Relational, JSONB support, battle-tested |
| Auth | **JWT** + OTP via Twilio | Stateless, phone-first login |
| Validation | **class-validator** (built into NestJS) | |
| Docs | **Swagger / OpenAPI** (auto-generated) | |
| Queue | **BullMQ** (Redis-backed) | Async jobs: PDF generation, notifications |

### Infrastructure

| Concern | Choice | Reason |
|---|---|---|
| Cloud | **Azure UAE North** (primary) | Dubai data residency, lowest latency |
| App hosting | **Azure App Service** or Docker + AKS | Containerised for portability |
| Database | **Azure Database for PostgreSQL** | Managed, automated backups |
| File storage | **Azure Blob Storage** (private container) | KYC docs, agreements, images |
| CDN | **Azure CDN** or Cloudflare | Fast image/asset delivery across UAE |
| CI/CD | **GitHub Actions** | Automate test, build, deploy on push |
| Secrets | **Azure Key Vault** | API keys, tokens, DB credentials |
| Monitoring | **Azure Monitor** + Sentry | Errors, performance, uptime |

### Automation

| Concern | Choice | Reason |
|---|---|---|
| Engine | **n8n** (self-hosted) | UAE data residency, cost-effective, visual workflows |
| Hosting | Same Azure UAE North server | Keeps all data in-region |
| Trigger | Webhooks from Backend API | Decoupled, reliable |

---

## Authentication Flow

```
1. User enters UAE phone number (+971XXXXXXXXX)
2. Backend sends OTP via Twilio SMS
3. User submits OTP
4. Backend verifies OTP → issues JWT (access token + refresh token)
5. All subsequent API calls include Bearer token in Authorization header
6. Refresh token rotates every 30 days
```

**Admin login:** Email + password (bcrypt hashed), 2FA recommended.

---

## Multilingual Architecture

### Website (Next.js)
- Use Next.js built-in i18n routing: `/en/...`, `/ar/...`, `/zh/...`
- All UI strings stored in JSON locale files: `locales/en.json`, `locales/ar.json`, `locales/zh.json`
- RTL toggled via `dir="rtl"` on `<html>` for Arabic, combined with Tailwind RTL plugin
- CMS content (car descriptions, marketing copy) stored in Sanity with language variants

### Mobile App (Flutter)
- Use `flutter_localizations` + `intl` package
- ARB files for translations: `app_en.arb`, `app_ar.arb`, `app_zh.arb`
- RTL handled automatically by Flutter when locale is Arabic

### Backend API
- Accept `Accept-Language` header: `en`, `ar`, `zh`
- Error messages and notifications returned in the requested language
- Notification templates stored with language variants

---

## File Storage & Security

- KYC documents stored in **private** Azure Blob container — never publicly accessible
- Files accessed via **short-lived signed URLs** (15-minute expiry)
- All uploads scanned for malware before storage
- Filenames randomised (UUID-based) — no PII in URLs
- Lease agreement PDFs generated server-side, stored in same private bucket

---

## Payment Flow

```
1. Customer completes booking form
2. Backend calculates total (base + add-ons + 5% VAT)
3. Frontend initialises Checkout.com payment session
4. Customer pays (card / Apple Pay / Google Pay)
5. Checkout.com sends webhook to Backend
6. Backend verifies webhook signature → marks deposit as paid
7. Booking status → ‘submitted’
8. n8n triggered → WhatsApp confirmation sent to customer
9. Admin notified for KYC review + approval
```

---

## VAT Compliance

- VAT registration number stored in system config
- Every invoice must show: base amount, VAT amount (5%), total, VAT number
- PDFs generated server-side using a compliant invoice template
- All amounts stored in AED as `Decimal(10,2)` — no floating point

---

## Data Privacy (UAE Federal Decree-Law No. 45 of 2021)

- All personal data stored in UAE-region infrastructure
- Customers can request data export or deletion via the portal
- KYC documents deleted automatically after lease ends + 5-year retention period (legal minimum)
- Consent captured at registration for WhatsApp and marketing communications
- Audit log maintained for all data access events

---

## Webhook Architecture (for n8n)

The Backend API emits webhooks for key business events. n8n subscribes to these and triggers automation workflows.

| Event | Payload |
|---|---|
| `booking.submitted` | booking_id, customer_id, vehicle_id, total_aed |
| `booking.approved` | booking_id, lease_id, start_date |
| `booking.rejected` | booking_id, reason |
| `kyc.submitted` | customer_id, document_types[] |
| `kyc.approved` | customer_id |
| `kyc.rejected` | customer_id, reason |
| `payment.received` | payment_id, lease_id, amount_aed |
| `payment.overdue` | payment_id, lease_id, due_date |
| `lease.starting_soon` | lease_id, start_date, days_until (7 or 1) |
| `lease.ending_soon` | lease_id, end_date, days_until (7 or 1) |
| `lease.completed` | lease_id |
| `vehicle.insurance_expiring` | vehicle_id, expiry_date, days_until |
| `vehicle.rta_expiring` | vehicle_id, expiry_date, days_until |

All webhooks include a `X-Signature` header (HMAC-SHA256) for verification.

---

## Health Checks & Monitoring

All three services expose health check endpoints for monitoring and load balancer integration.

| Service | Endpoint | Type |
|---|---|---|
| Backend API | `GET /health` | Full check (DB + memory) |
| Backend API | `GET /health/live` | Liveness probe (process alive) |
| Backend API | `GET /health/ready` | Readiness probe (DB reachable) |
| Website | `GET /api/health` | Backend connectivity check |
| Admin Dashboard | `GET /api/health` | All services (server-side, no CORS) |

**Admin status page:** `/status` in the admin dashboard provides a visual overview of all service health, database latency, memory usage, and uptime. Auto-refreshes every 30 seconds.

**Monitoring script:** `scripts/health-check.sh` checks all three services from the CLI. Supports `--json` for CI/monitoring integration.

### Admin Authentication Architecture

The admin dashboard uses a **server-side proxy pattern** to avoid exposing JWT tokens to client-side JavaScript:

```
Browser → /api/auth/login → Backend API (auth/admin/login)
                          ↓
              Sets two httpOnly cookies:
              - admin_session (middleware auth)
              - admin_api_token (backend JWT)

Browser → /api/backend/[...path] → Backend API (authenticated)
              ↑ reads admin_api_token from httpOnly cookie
```

All backend API calls from the admin dashboard go through `/api/backend/...` proxy route, which reads the JWT from the httpOnly cookie. This eliminates XSS-vulnerable localStorage token storage.

---

## CI/CD Pipeline (GitHub Actions)

```
On push to main:
  1. Lint + type-check
  2. Run unit tests
  3. Build Docker image
  4. Push to Azure Container Registry
  5. Deploy to Azure App Service (staging)
  6. Run smoke tests
  7. Manual approval gate → deploy to production
```
