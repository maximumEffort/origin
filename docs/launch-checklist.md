> **⚠️ STALE — pre-rebuild (before 2026-05-02).** This document describes the v0 codebase that was wiped during the rebuild. It is kept for historical reference but is **not current**. For the live state see [`STATUS.md`](STATUS.md); for V1 design see [`architecture/rebuild-erd.md`](architecture/rebuild-erd.md).

---# Launch Checklist — Origin Car Rental Platform

> ⚠ **This checklist (dated 2026-03-31) is a generic V0 reference template.** Many items
> below are now done; some describe a stack that no longer matches reality (NestJS,
> Flutter, n8n). For **current launch readiness**, see `docs/STATUS.md`. This file is
> kept for completeness and as a reminder of items that are still open (RTA licence,
> VAT TRN, real Stripe/Twilio keys, vehicle photos, legal review, pen test).

**Platform:** Customer site (Next.js 15), Admin dashboard (Next.js 15), Backend API (FastAPI on Azure Container Apps). Mobile app and n8n automation engine are deferred.
**Target Launch Date:** Pending RTA Fleet Operator Licence (issue #16).
**Infrastructure Target:** Azure UAE North (Dubai) — **live**.
**Locales:** English (en), Arabic (ar — RTL), Simplified Chinese (zh-CN).

---

## 1. DNS & Domain

- [ ] Domain `[your-domain.ae]` registered (UAE registrar preferred)
- [ ] Nameservers configured to point to Vercel (frontends) and Azure UAE North (API backend at `api.origin-auto.ae`)
- [ ] SSL/TLS certificate provisioned (auto via Vercel + Azure)
- [ ] MX records configured for transactional email (SendGrid or SMTP provider)
- [ ] SPF, DKIM, DMARC records configured for email deliverability
- [ ] DNS propagation verified globally
- [ ] Subdomain for API configured: `api.[your-domain.ae]`
- [ ] Subdomain for admin dashboard configured: `admin.[your-domain.ae]`
- [ ] DNSSEC enabled (optional, for enhanced security)

---

## 2. Infrastructure

### Azure UAE North Setup
- [ ] Azure subscription created with billing alerts
- [ ] Resource group created: `origin-car-leasing-prod`
- [ ] App Service plan provisioned for NestJS backend
- [ ] PostgreSQL Flexible Server deployed in UAE North
- [ ] Network security group (NSG) configured to restrict inbound traffic
- [ ] Azure Key Vault created for secrets/environment variables
- [ ] Storage account provisioned for backups and document uploads

### Database & Cache
- [ ] PostgreSQL production database created and tested
- [ ] PostgreSQL automatic backups enabled (daily, 30-day retention)
- [ ] Redis instance provisioned (if used for session/rate-limit caching)
- [ ] Database connection pooling configured (Prisma pool settings)
- [ ] Data residency verified: all data stored in UAE North region

### Docker & Deployment
- [ ] Docker Compose file finalized and tested locally
- [ ] Docker images built and pushed to Azure Container Registry (ACR)
- [ ] Azure Container Instances or App Service configured to pull from ACR
- [ ] Environment variables securely injected via Azure Key Vault
- [ ] Health check endpoint configured for auto-restart

### CDN & Performance
- [ ] CDN (Azure Front Door or Vercel Edge) configured for static assets
- [ ] Cache headers optimized for images, CSS, JS
- [ ] Gzip/Brotli compression enabled on all text responses
- [ ] Image optimization service verified (WebP fallbacks, lazy loading)

---

## 3. Backend API (NestJS)

### Database
- [ ] Database schema migrated to production PostgreSQL (Prisma migrate)
- [ ] Seed script executed: fleet vehicles, lease terms, pricing tiers
- [ ] Database indexes created for frequently queried fields
- [ ] Test data removed from production database

### API Endpoints
- [ ] Health check endpoint `/health` returns 200 + version
- [ ] CORS configured to allow `https://[your-domain.ae]` and admin subdomain
- [ ] Mobile app origins whitelisted if applicable
- [ ] Preflight (OPTIONS) requests handled correctly

### Authentication & Security
- [ ] JWT secret rotated and stored in Azure Key Vault
- [ ] JWT expiry set (1 hour access, 7 days refresh)
- [ ] Refresh token endpoint tested
- [ ] Rate limiting on auth endpoints (5 failed logins → 15-min lockout)
- [ ] Rate limiting on public endpoints (100 req/min per IP)

### Webhooks for n8n
- [ ] Webhook endpoint for new bookings: `/webhooks/booking-created`
- [ ] Webhook endpoint for payment confirmation: `/webhooks/payment-confirmed`
- [ ] Webhook endpoint for KYC document upload: `/webhooks/kyc-uploaded`
- [ ] Webhook signature validation implemented (HMAC-SHA256)
- [ ] Webhook retry logic configured (exponential backoff)

---

## 4. Website (Next.js on Vercel)

### Deployment
- [ ] Vercel production project linked to `[your-domain.ae]`
- [ ] Custom domain added and SSL active
- [ ] Production environment variables set:
  - `NEXT_PUBLIC_API_URL=https://api.[your-domain.ae]`
  - `NEXT_PUBLIC_SITE_URL=https://[your-domain.ae]`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `NEXT_PUBLIC_CHECKOUT_COM_KEY`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Multilingual (next-intl)
- [ ] Locale detection working (browser preference → fallback EN)
- [ ] URL routing verified: `/en/`, `/ar/`, `/zh-CN/`
- [ ] hreflang links present in `<head>` for all locale variants
- [ ] All pages translated into all three languages
- [ ] RTL layout verified in Arabic version

### SEO & Performance
- [ ] Sitemap.xml accessible at `/sitemap.xml`
- [ ] Robots.txt configured (disallow staging/admin paths)
- [ ] Google Search Console linked and sitemap submitted
- [ ] Bing Webmaster Tools linked
- [ ] Open Graph and Twitter Card meta tags present
- [ ] JSON-LD structured data verified (Organization, LocalBusiness)
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] PageSpeed Insights score >= 90

### Security Headers
- [ ] Content-Security-Policy (CSP) configured
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured

### Compliance
- [ ] Cookie consent banner functional (all 3 languages)
- [ ] Privacy Policy page translated (EN/AR/zh-CN)
- [ ] Terms of Service page translated
- [ ] Cookie Policy page translated

---

## 5. Mobile App (Flutter)

### Build & Signing
- [ ] Release builds tested on iOS and Android
- [ ] Android keystore created and securely stored (not in repo)
- [ ] iOS signing certificate and provisioning profile ready
- [ ] Signing keys backed up to secure offline location

### Submissions
- [ ] Apple App Store submitted (see `docs/app-store-submission.md`)
- [ ] Google Play Store submitted (see `docs/app-store-submission.md`)
- [ ] Screenshots prepared for both stores (EN/AR/zh-CN)
- [ ] TestFlight beta tested by internal team
- [ ] Google Play internal testing track tested

### Push Notifications
- [ ] APNs certificate uploaded to Firebase
- [ ] FCM server key configured in backend
- [ ] Test push notification verified on both platforms

### Configuration
- [ ] API URL set to production
- [ ] Debug logging disabled in release builds
- [ ] Firebase SDK configured with production project

---

## 6. Admin Dashboard (React)

- [ ] Deployed to Azure App Service or Vercel
- [ ] Custom subdomain: `admin.[your-domain.ae]`
- [ ] Protected by JWT auth with backend
- [ ] Admin accounts created for team members
- [ ] Fleet management dashboard functional
- [ ] Customer management and KYC review workflow tested
- [ ] Booking approval/reject/assign workflow tested
- [ ] Reporting section generating basic reports

---

## 7. Payments (Checkout.com)

### Credentials
- [ ] Production API keys obtained (public + secret)
- [ ] API keys stored in Azure Key Vault
- [ ] Webhook signing key stored securely

### Payment Flow
- [ ] Payment widget integrated on website and mobile app
- [ ] Deposit calculated correctly
- [ ] VAT (5%) displayed separately on all invoices
- [ ] Webhook events handled: `payment_approved`, `payment_declined`, `payment_canceled`

### Testing
- [ ] Successful payment end-to-end
- [ ] Failed payment handled gracefully
- [ ] Refund flow tested (full and partial)
- [ ] PCI DSS compliance verified (card data not stored by Origin)

---

## 8. WhatsApp & Communications

### WhatsApp Business API
- [ ] Business Account created and verified (Meta)
- [ ] Phone number registered and confirmed
- [ ] Message templates approved in all 3 languages:
  - Booking confirmation
  - Payment reminder (3 days, 1 day)
  - Lease start/end reminder
  - Renewal offer
  - KYC document required
  - Support welcome
- [ ] Inbound webhook configured in n8n

### SMS / OTP
- [ ] Twilio (or UAE provider) account set up
- [ ] OTP flow tested end-to-end
- [ ] Rate limiting on OTP requests (max 3 per 15 min)

### Email
- [ ] SendGrid (or SMTP) configured
- [ ] Transactional templates designed (EN/AR/zh-CN)
- [ ] Test emails sent and received

---

## 9. n8n Automations

### Deployment
- [ ] Self-hosted n8n deployed on Azure UAE North
- [ ] SSL configured for n8n UI access
- [ ] Admin account created with strong password

### Workflows Active
- [ ] Booking confirmation (WhatsApp + email)
- [ ] KYC upload alert (admin + customer notification)
- [ ] Payment due reminder sequence
- [ ] Lease start/end reminders
- [ ] Renewal offer (30 days before lease end)
- [ ] Vehicle return → maintenance checklist
- [ ] Insurance expiry alert (30 days)
- [ ] RTA registration renewal (60 days)
- [ ] Daily management summary
- [ ] Weekly fleet utilisation report
- [ ] Web form lead → CRM + sales WhatsApp
- [ ] Abandoned booking follow-up (2 hours)

### Configuration
- [ ] All webhook URLs updated to production domain
- [ ] All credentials configured via n8n credentials feature
- [ ] Each workflow tested end-to-end
- [ ] Error handling verified (WhatsApp fail → email fallback)

---

## 10. Security

### SSL & Encryption
- [ ] HTTPS everywhere (301 redirects from HTTP)
- [ ] TLS 1.2+ enforced
- [ ] Certificate auto-renewal configured

### Secrets Management
- [ ] No secrets in Git repository
- [ ] All secrets in Azure Key Vault or Vercel encrypted env vars
- [ ] Secrets rotated before launch
- [ ] API keys scoped to minimum permissions

### OWASP Top 10 Review
- [ ] A1 – Broken Access Control: RBAC implemented and tested
- [ ] A2 – Cryptographic Failures: passwords hashed, secrets encrypted
- [ ] A3 – Injection: parameterized queries (Prisma), input validation
- [ ] A5 – Security Misconfiguration: headers set, debug disabled, defaults changed
- [ ] A6 – Vulnerable Components: `npm audit` clean
- [ ] A9 – Logging & Monitoring: Sentry integrated

### UAE Data Protection Compliance
- [ ] Compliant with Federal Decree-Law No. 45 of 2021
- [ ] Data processing agreements in place with third-party processors
- [ ] Data retention policy defined
- [ ] Customer data deletion process documented
- [ ] Cross-border data transfer justified

---

## 11. Legal & Compliance

- [ ] RTA trade licence number displayed on website footer
- [ ] RTA compliance badge on car listings
- [ ] Insurance partner logos displayed (with approval)
- [ ] Privacy Policy compliant with UAE law (EN/AR/zh-CN)
- [ ] Terms of Service (EN/AR/zh-CN)
- [ ] Cookie Policy (EN/AR/zh-CN)
- [ ] Lease agreement template reviewed by legal
- [ ] VAT registration number on all invoices and pricing pages
- [ ] VAT (5%) itemised separately

---

## 12. Monitoring & Alerting

### Error Tracking
- [ ] Sentry DSN configured: website, backend, mobile app, admin dashboard
- [ ] Alert rules configured (Slack/email on new errors)
- [ ] Team members added to Sentry project

### Uptime
- [ ] Uptime monitoring configured (UptimeRobot or similar)
- [ ] Health checks for: website, API, admin dashboard
- [ ] Alerts for downtime (email + SMS)

### Database & Backups
- [ ] Automated daily backups (30-day retention)
- [ ] Backup restoration tested
- [ ] Point-in-time recovery enabled

---

## 13. Content & SEO

### Fleet Data
- [ ] All vehicles added with complete details (make, model, year, rates, images)
- [ ] Pricing tiers and lease terms configured
- [ ] High-quality images (minimum 5 per vehicle, WebP optimized)

### Translations
- [ ] All user-facing text translated (EN/AR/zh-CN)
- [ ] Translations reviewed by native speakers
- [ ] Arabic RTL verified visually
- [ ] Chinese characters render correctly

### Structured Data
- [ ] JSON-LD Organization schema on homepage
- [ ] JSON-LD LocalBusiness schema (Dubai address, phone)
- [ ] Schema validation passed (Google testing tool)

### Google Business Profile
- [ ] Profile created and verified (Dubai address)
- [ ] Hours, phone, website URL added
- [ ] Category: Car Rental / Car Leasing

---

## 14. Pre-Launch Testing

### Cross-Browser
- [ ] Chrome (desktop + mobile)
- [ ] Safari (desktop + mobile)
- [ ] Firefox (desktop + mobile)
- [ ] Edge (desktop)

### Responsive Design
- [ ] Breakpoints: 320px, 768px, 1024px, 1440px
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets minimum 48x48px

### RTL Layout (Arabic)
- [ ] Text direction right-to-left confirmed
- [ ] Margins/padding swapped correctly
- [ ] Flex/grid direction reversed
- [ ] Images/icons positioned correctly

### Accessibility (WCAG 2.1 AA)
- [ ] Color contrast minimum 4.5:1
- [ ] Keyboard navigation working
- [ ] Focus indicators visible
- [ ] Alt text on all images
- [ ] Heading hierarchy correct

### E2E User Journeys
- [ ] Browse → select vehicle → view detail page
- [ ] Calculate lease cost → verify VAT line item
- [ ] Register → OTP verify → upload KYC documents
- [ ] Book vehicle → pay deposit → receive confirmation
- [ ] Admin: review KYC → approve → assign vehicle

---

## 15. Launch Day

- [ ] DNS cutover to production domains
- [ ] Monitor DNS propagation globally
- [ ] Verify website at `https://[your-domain.ae]`
- [ ] Verify API at `https://api.[your-domain.ae]/health`
- [ ] Verify health endpoints: `/health`, `/health/live`, `/health/ready`
- [ ] Verify admin status page at `https://admin.[your-domain.ae]/status`
- [ ] Run `./scripts/health-check.sh` to confirm all services are healthy
- [ ] Monitor error rates (Sentry) — target zero critical errors
- [ ] Monitor payment processing — test transaction confirms integration
- [ ] Send WhatsApp broadcast to early signups
- [ ] Social media announcement
- [ ] Team on-call for 24 hours post-launch

---

## 16. Post-Launch (Week 1)

- [ ] Daily error review in Sentry
- [ ] Monitor WhatsApp support channel
- [ ] Check App Store and Google Play reviews
- [ ] Record performance baselines (Core Web Vitals, API p95 latency)
- [ ] Verify first automated daily/weekly reports from n8n
- [ ] VAT calculation verified on real transactions
- [ ] Stakeholder update: launch metrics, signups, payments, issues
- [ ] Plan Week 2+ priorities (features, bug fixes)

---

## Success Criteria

- Website loads in < 3 seconds on 4G mobile
- API responds with < 200ms latency (p95)
- Zero critical security vulnerabilities
- All 3 languages rendered correctly
- Payment flow works end-to-end
- WhatsApp messages delivered correctly
- Mobile app published on both stores
- Admin dashboard functional
- Legal docs in place (privacy, terms, cookie policy)
- All health checks passing (`/health`, `/health/live`, `/health/ready`)
- Admin status page shows all services as "Healthy"
- Database query latency < 10ms on health check

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-31  
**Next Review:** Post-launch Week 1
