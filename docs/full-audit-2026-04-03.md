# Full 360 Audit — Origin Car Leasing Platform
**Date:** 2026-04-03
**Scope:** Website, Admin Dashboard, Backend API, Mobile App

---

## Overall Scores

| Area | Score | Status |
|---|---|---|
| Website | 82/100 | Good — placeholder text & trust signals blocking launch |
| Admin Dashboard | 55/100 | Functional UI, no backend integration |
| Backend API | 78/100 | Core endpoints done, critical lifecycle gaps |
| Mobile App | 60/100 | Scaffold complete, Firebase/Maps not configured |

---

## CRITICAL Issues

### C1. Placeholder text in legal pages
**Files:** `website/app/[locale]/privacy/page.tsx`, `website/app/[locale]/terms/page.tsx`, `website/app/[locale]/rta/page.tsx`
- `[Company Name]`, `[domain]`, `[Licence Number]` placeholders throughout
- Must be replaced with "Origin", "origin-auto.ae", actual RTA licence number
- **Labels:** `launch-blocker`, `compliance`

### C2. Incomplete Chinese locale (zh.json)
**File:** `website/locales/zh.json`
- Missing entire "home" section and most "about" keys
- Contains deprecation comment pointing to zh-CN.json
- Will break for Chinese locale users on homepage and about page
- **Labels:** `i18n`, `launch-blocker`

### C3. Missing trust signals on website
**Per CLAUDE.md requirements:** RTA badge, insurance partners, business licence, customer reviews should be visible
- No RTA badge on homepage or footer (only on /rta page with placeholder)
- No insurance partner logos/names anywhere
- No customer reviews/testimonials section
- Business licence number missing from footer
- **Labels:** `launch-blocker`, `compliance`

### C4. Placeholder contact info across website
- `website/app/[locale]/contact/ContactForm.tsx:79` — `info@companydomain.ae` (should be `info@origin-auto.ae`)
- `website/components/Footer.tsx:106,116` — Hardcoded `971500000000` phone
- `website/app/[locale]/page.tsx:306` — Same hardcoded phone number
- Multiple inconsistent phone numbers across site vs CLAUDE.md (`+971 52 143 9746`)
- **Labels:** `bug`

### C5. Admin dashboard uses only mock data
**File:** `admin/lib/data-store.tsx`
- All CRUD operations use in-memory React state with hardcoded seed data
- `admin/lib/api.ts` defines `apiRequest()` but it's never imported or called anywhere
- All data lost on page refresh
- Reports page (`admin/app/(dashboard)/reports/page.tsx:10-35`) has entirely fictional chart data
- Token storage mismatch: `api.ts` reads `localStorage.admin_token` but auth stores in HTTP-only cookie `admin_session`
- **Labels:** `enhancement`, `admin`

### C6. No document upload endpoint (backend)
**File:** `backend/src/customers/customers.controller.ts`
- Only `GET /customers/me/documents` exists — no POST endpoint for uploads
- No multipart/form-data handling anywhere
- Firebase Storage service imported but never used for file uploads
- Blocks entire KYC flow — customers cannot submit documents
- **Labels:** `launch-blocker`, `backend`

### C7. No booking-to-lease conversion
**File:** `backend/src/bookings/bookings.service.ts`
- Bookings can be APPROVED but no logic converts them to active Lease records
- No payment schedule auto-generation when lease starts
- **Labels:** `launch-blocker`, `backend`

### C8. Prisma schema bug — missing field
**File:** `backend/prisma/schema.prisma` (Customer model, lines 189-207)
- `kycRejectionReason` field referenced in `admin.service.ts:104` but not in schema
- Admin KYC rejection will crash at runtime
- **Labels:** `bug`, `backend`

---

## HIGH Issues

### H1. Missing locale key
- `pickupPlaceholder` key used in `website/app/[locale]/booking/BookingFlow.tsx:211` but not defined in any locale file
- **Labels:** `i18n`, `bug`

### H2. Payment initiation endpoints missing
- Checkout.com service fully implemented but no API endpoint to create payment sessions
- Tabby BNPL service complete but no customer-facing endpoint
- Webhook controller exists but no route to initiate checkout
- **Files:** `backend/src/integrations/checkout/`, `backend/src/integrations/tabby/`
- **Labels:** `backend`, `enhancement`

### H3. Notification services not wired to triggers
- WhatsApp, SendGrid, Firebase, Twilio services fully implemented
- None are called after booking approval, payment received, lease expiry, etc.
- NotificationLog table exists but never populated
- **Files:** `backend/src/integrations/whatsapp/`, `backend/src/integrations/sendgrid/`
- **Labels:** `backend`, `enhancement`

### H4. Lease lifecycle incomplete
- No termination endpoint (LeaseStatus.TERMINATED_EARLY enum exists but unused)
- No automatic payment record generation
- No lease completion logic when endDate passes
- **File:** `backend/src/leases/leases.service.ts`
- **Labels:** `backend`, `enhancement`

### H5. Admin dashboard missing key features
- Settings don't persist (reset on page refresh)
- No role-based access control — all logged-in users have full access
- No document viewing/upload in customer management
- No lease renewal UI
- No booking delete operation
- **Labels:** `admin`, `enhancement`

### H6. Mobile app dependencies commented out
- `mobile-app/pubspec.yaml:39` — Firebase (firebase_core, firebase_messaging) commented out
- `mobile-app/pubspec.yaml:43` — Google Maps (google_maps_flutter) commented out
- No push notifications or location features until configured
- **Labels:** `mobile`, `enhancement`

### H7. Missing generateStaticParams on legal pages
- `website/app/[locale]/terms/page.tsx`, `privacy/page.tsx` missing `generateStaticParams`
- Pages may not pre-render correctly during build
- **Labels:** `bug`, `website`

### H8. CreateVehicleDto lacks enum validation
- `backend/src/admin/dto/create-vehicle.dto.ts:5,15-16` uses `@IsString` for brand/fuelType/transmission
- Should use `@IsEnum` to prevent invalid values like "TESLA"
- **Labels:** `backend`, `bug`

---

## MEDIUM Issues

### M1. Context not memoized in admin data store
- `admin/lib/data-store.tsx:204-212` — context value recreated every render
- Should use `useMemo()` to prevent unnecessary child re-renders
- **Labels:** `admin`, `performance`

### M2. Form validation weak in admin
- Vehicle and customer forms accept minimal validation
- No regex for plate formats, email, phone numbers
- Dates can be in past (insurance/RTA expiry)
- **Labels:** `admin`, `enhancement`

### M3. Admin auth security concerns
- `admin/middleware.ts:23` — fallback secret `'change-me-in-production'`
- Hardcoded credentials via env vars with no documentation
- No session refresh mechanism (8hr expiry, hard logout)
- **Labels:** `admin`, `security`

### M4. Cookie consent color mismatch
- `website/components/CookieConsent.tsx:74` uses `bg-[#1B5299]` instead of brand color
- **Labels:** `website`, `design`

### M5. Car images missing lazy loading
- `website/components/CarCard.tsx:48` — no `loading="lazy"` attribute
- **Labels:** `website`, `performance`

### M6. robots.txt fallback to example.com
- `website/app/robots.ts:4` — falls back to `https://example.com` if `NEXT_PUBLIC_SITE_URL` not set
- **Labels:** `website`, `bug`

### M7. Missing database indexes
- Payment: no index on (leaseId, dueDate)
- Booking: no index on (customerId, status)
- **Labels:** `backend`, `performance`

---

## PASS Areas (No action needed)

- **RTL support** — Excellent. All directional classes use RTL-safe utilities (ms-, me-, start-, end-)
- **Brand colors** — Correctly configured (#163478 navy, #C8920A bronze, #F5C200 gold)
- **WhatsApp CTA** — Floating button on every page, plus in-page CTAs
- **VAT display** — 5% VAT properly itemized on all pricing
- **Routing** — All links valid on both website and admin
- **Loading/empty states** — Skeleton loaders, empty state messages, error boundaries
- **Error handling** — Global HttpExceptionFilter, ValidationPipe, proper HTTP codes
- **Security foundations** — CSP with nonces, JWT auth, rate limiting (100 req/60s)
- **Responsive design** — Mobile-first approach, proper breakpoints throughout

---

## Recommended Priority Order

### Week 1 — Launch blockers
1. Fix all placeholder text (C1, C4)
2. Fix Prisma schema bug (C8)
3. Complete zh.json locale (C2)
4. Add missing locale keys (H1)
5. Add trust signals to homepage (C3)

### Week 2 — Core backend gaps
6. Add document upload endpoint (C6)
7. Implement booking→lease conversion (C7)
8. Add payment initiation endpoints (H2)
9. Add lease termination endpoint (H4)
10. Wire notification services to triggers (H3)

### Week 3 — Admin & mobile
11. Connect admin dashboard to backend API (C5)
12. Configure Firebase & Google Maps for mobile (H6)
13. Add RBAC to admin (H5)
14. Fix admin auth security (M3)

### Week 4 — Polish
15. Performance fixes (M1, M5, M7)
16. Design/accessibility fixes (M4)
17. Form validation improvements (M2)
18. robots.txt and build fixes (M6, H7)
