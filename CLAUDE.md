# Origin — Project Instructions

## Overview

**Origin** is the brand and platform for Chinese EV services in the UAE, beginning with car rental. This repo contains the customer-facing and admin web applications.

**Current scope of this repo:** car rental only, operated under Shanghai Car Rental LLC (Abu Dhabi). Other services, surfaces (mobile app, backend, automations), and entities may be added later — do not refactor prematurely for them.

---

---

## V1 Scope — Rental Only

At launch, Origin offers **rental only** (short and long-term). Outright purchase (Buy) and lease-to-own (Lease) are **out of scope** until the corresponding UAE licences are obtained:

| Service | Licence needed | Status |
|---|---|---|
| **Rent** | RTA Fleet Operator Licence | In progress (launch blocker) |
| Buy | UAE commercial dealership licence | Not yet applied for — see v2 milestone |
| Lease-to-own | UAE finance/leasing licence (Central Bank regulated) | Not yet applied for — see v3 milestone |

The backend `ServiceType` enum `{ SELL, RENT, LEASE }` is retained for forward compatibility. When Buy or Lease licences are obtained, enabling the service is a UI toggle, not a schema migration. **Do not remove these enum values or the related columns.**

Customer-facing copy should say "rent" / "rental" — never "buy", "lease", "own your own", or imply financial products. Violating this risks regulatory action from UAE authorities.

## Legal Entities

Origin is an umbrella brand covering four related entities. The operating entity for a given service determines the legal footer, invoice header, VAT TRN, and compliance metadata:

| Location | Entity | Activity |
|---|---|---|
| **Abu Dhabi (Mainland)** | Shanghai Car Rental LLC | Car Rental — **current service** |
| Dubai (Jebel Ali Freezone) | Origin West Asia Trading | General Trading |
| Hong Kong | China Procurement Services Group Company Limited | General Trading (parent) |
| Egypt | Asas | Logistics Services |

When a service is added for a different entity, introduce an `entities.ts` config block and reference it from legal/footer components. Do not hardcode entity details in components.

**Key contact:** Bella Ma, General Manager of MENA Region
**Office:** Creek Harbour, Horizon Tower 2, Unit 2502, Dubai
**Phone (UAE):** +971 52 143 9746
**Admin email:** admin@originleasing.ae *(backend login username; separate from new domain — see issue)*
**Primary domain:** origin-auto.ae (registered with Etisalat, DNS via Etisalat nameservers)

---

## Brand Identity

- **Wordmark:** "Origin" in bold italic serif, deep navy
- **Tagline:** "Environmental Protection Starts With Us"
- **Positioning:** Premium Chinese car services — modern, trustworthy, eco-aligned

### Colours
- Primary navy: `#163478` (brand) / `#0E2356` (brand-dark) / `#E6EEF8` (brand-light)
- Accent gold: `#C8920A` (gold) / `#F5C200` (gold-bright) / `#FDF3DC` (gold-light) / `#966A07` (gold-text, WCAG AA on white)
- Hero background: `#060B14`

### Fonts
- Latin: **Inter**
- Arabic: **Noto Sans Arabic** (loaded only on `ar` locale)
- Chinese: **Noto Sans SC** (loaded only on `zh-CN` locale)

Full design system in `design/DESIGN_SYSTEM.md`.

---

## Fleet — Chinese EV Brands

- **NIO** — ES6, ES7, ES8, ET7 (premium electric)
- **Voyah / 岚图** — Free, Dreamer (electric SUVs/MPVs)
- **Zeekr / 极氪** — X (electric crossovers)
- **BYD** — fleet arriving (AED 120K–150K range)

## Service Model

The data model supports three services via `ServiceType` enum `{ SELL, RENT, LEASE }`, but **only `RENT` is active in V1**:
- **Rent** — 1–24 months, monthly + daily rate, km limit, add-ons *(V1 — live)*
- ~~Buy~~ — AED 1,000 reservation fee + test drive *(V2 — pending dealership licence)*
- ~~Lease-to-own~~ — 20% down + 12–36 months + buy-out *(V3 — pending finance licence)*

---

## Languages & Localisation

Supported: **English** (en), **Arabic** (ar, RTL), **Simplified Chinese** (zh-CN).

**Rules:**
- Never hardcode user-facing strings — always go through the i18n layer (`next-intl`).
- Design UI components to support LTR and RTL from the start; retrofitting RTL is expensive.
- Currency: **AED (د.إ)** — always display with 5% VAT itemised separately.
- Date format: **DD/MM/YYYY** (UAE standard).
- Phone format: **+971 5X XXX XXXX**.
- Use native Tailwind RTL utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `rtl:`, `ltr:`) — no `tailwindcss-rtl` plugin.

---

## UAE Compliance

- **RTA** (Roads and Transport Authority, Dubai) — all rental vehicles RTA-registered. Lease agreements must comply with Dubai rental/leasing laws.
- **VAT** — 5% itemised on all lease fees and invoices. TRN displayed in footer and on all customer-facing pages.
- **KYC documents required:**
  - Emirates ID (UAE residents)
  - Valid UAE driving licence (or recognised international)
  - Visa copy (non-citizens)
  - Passport copy
- **Insurance** — comprehensive insurance included or offered with every lease; third-party liability minimum required by law.
- **Data privacy** — UAE Federal Data Protection Law (Federal Decree-Law No. 45 of 2021).

---

## Tech Stack

| Surface | Folder | Stack |
|---|---|---|
| Customer site | `apps/customer/` | Next.js 15 (App Router), next-intl, Tailwind, Stripe, Sentry |
| Admin dashboard | `apps/admin/` | Next.js 14 (App Router), jose (JWT), httpOnly-cookie proxy to backend |
| Backend API | `apps/backend/` | NestJS 10, Prisma 5, PostgreSQL, JWT, Stripe webhooks, Twilio Verify, SendGrid |

All three apps live in this monorepo. Both frontends consume the backend via `NEXT_PUBLIC_API_URL`. The backend is currently hosted on Railway (US) — migration to UAE infrastructure (AWS Lightsail me-central-1) is tracked in issue #21.

---

## Workspace Commands

This is an **npm workspace**. From the repo root:

```bash
npm install                 # install all deps for all three apps

npm run customer:dev        # customer site on :3000
npm run admin:dev           # admin on :3002
npm run backend:dev         # backend API on :3001 (needs DATABASE_URL set)

npm run -w customer lint    # lint one app
npm run type-check          # type-check all apps
npm run build               # build all apps
npm test                    # run all tests
```

---

## Key Decisions Worth Preserving

- **Country config** (to be introduced) — centralize VAT rate, phone regex, currency, KYC docs in one file. UAE active; add SA/EG when expanding.
- **Admin auth pattern** — backend JWT in httpOnly cookie, all admin API calls via `/api/backend/[...path]` server-side proxy. Never expose backend token to client JS.
- **OTP production-safe** — Twilio Verify end-to-end in prod; dev fallback with DB-hashed codes, never logs in prod.
- **Per-request CSP nonce** — middleware generates nonce, sets `x-nonce` header, Next.js 15 auto-injects for inline scripts.
- **Three locales from day one** — never add a fourth without a strong reason; `en` / `ar` / `zh-CN` are set.

---

## Notes for AI Assistance

- Always consider trilingual + RTL implications when designing any UI or content.
- Always flag VAT and RTA compliance where relevant.
- Current service is rental under **Shanghai Car Rental LLC** — all footer/legal copy should reference that entity unless otherwise scoped.
- When suggesting third-party services, prefer those with UAE/GCC presence and AED support.
- The Chinese car market in UAE is **growing fast** — frame recommendations with this tailwind in mind.
- Repo will gain more surfaces over time (mobile, backend, automations). Don't refactor prematurely for them; don't hardcode against their absence either.
