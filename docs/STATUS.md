# Origin — Pickup-Here Status

_Last updated: 2026-04-27._

This file is the authoritative **"where are we right now"** for the Origin repo. If you're picking this back up after a break, start here. Open ADR-0001 (`docs/adr/0001-azure-uae-north-architecture.md`) and ADR-0002 (`docs/adr/0002-kyc-ocr-data-flow.md`) for the strategic picture; this file is the tactical tracker.

---

## TL;DR

- **Azure UAE North backend**: live and serving. `/health/ready` green.
- **KYC OCR Phase A (backend)**: merged. Schema + Azure Document Intelligence + 4 endpoints + 17 tests, gated by `KYC_OCR_ENABLED=false`.
- **KYC OCR Phase B (admin UI)**: merged. `/customers/{id}/kyc` review page with three-column layout, confidence badges, per-field overrides.
- **KYC OCR Phase C (customer pre-fill)**: deferred — needs the customer upload pipeline to actually push files to backend storage first (current flow only collects metadata client-side).
- **Customer copy**: swept "lease/buy" → "rental" across all 3 locales; inflated stats removed; live on origin-customer.vercel.app.
- **Phase 3-5 (data migration → DNS cutover → decommission)**: not yet started. Blocked on user-side actions.
- **V1 launch blockers** are now licensing + content (RTA Fleet Operator licence, VAT TRN, vehicle photos, real Stripe/Twilio creds). Infra is no longer the bottleneck.

---

## Live Systems

| Surface | URL | State |
|---|---|---|
| **Azure backend (production target)** | `https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io` | Live — `/health/ready` returns `{"status":"ready"}`. Returns 14 vehicles from `/v1/vehicles`. |
| **Railway backend (legacy, still up)** | `https://car-leasing-business-production.up.railway.app` | Live — currently the canonical backend for both frontends. |
| Customer site | `https://origin-customer.vercel.app` | Pointing at **Railway** backend. Will flip to Azure during cutover. |
| Admin site | (Vercel project: `origin-admin`) | Pointing at **Railway** backend. |
| Database (current) | Supabase EU (pooler URL with `?pgbouncer=true&connection_limit=1`) | Both Railway and Azure backends share this. |
| Database (target) | Azure PostgreSQL Flexible Server `pg-origin-prod-uaenorth` | Provisioned, empty. Waiting on data migration. |

> **Why two backends are live at once:** intentional, parallel-deploy phase. Railway keeps serving real traffic until DNS flips; Azure absorbs synthetic / smoke traffic and gets observability time. See ADR-0001 § "Cutover Plan".

---

## Azure Resources (provisioned in UAE North)

All under subscription **`5edcba8f-db66-402d-86a3-d8b0a06c7655`**, resource group **`rg-origin-prod-uaenorth`**:

| Resource | Name | Notes |
|---|---|---|
| Container App | `ca-origin-backend-prod` | System-assigned managed identity. CORS policy seeded with `origin-auto.ae` + `admin.origin-auto.ae`. Health probes at `/health/live` and `/health/ready`. |
| Container App Env | `cae-origin-prod-uaenorth` | |
| Container Registry | `acroriginprod` | Basic SKU. AcrPull granted to Container App identity; `--identity system` registered. |
| PostgreSQL Flexible Server | `pg-origin-prod-uaenorth` | Burstable B1ms, 32 GB, public access with `AllowAllAzureServices` rule. Database name: `origin`. |
| Storage Account | `stororiginproduaenorth` | Three containers: `kyc-documents` (private), `vehicle-imagery` (public), `kyc-ocr-raw` (private, ADR-0002). CORS allow-list includes the canonical domains. |
| Key Vault | `kv-origin-prod-uaenorth` | RBAC mode. Seeded with `JWT-SECRET`, `JWT-REFRESH-SECRET`, `CORS-ALLOWED-ORIGINS`. Container App identity has `Key Vault Secrets User`. |
| **Document Intelligence** | `di-origin-prod-uaenorth` | **NEW (ADR-0002).** S0 tier. System-assigned MI. Container App MI has `Cognitive Services User` here, `Storage Blob Data Contributor` on the storage account. Provisioned by `infra/modules/docintel.bicep` + `docintel-roles.bicep`. |
| Log Analytics | `log-origin-prod-uaenorth` | PerGB2018, 30-day retention. |
| Application Insights | `ai-origin-prod-uaenorth` | Workspace-based. |

Tier 1 monthly bill estimate: **~$36–40/month**, fully covered by the active **$1,000 Microsoft for Startups Founders Hub credit**. Document Intelligence cost is <$1/month at launch volume (per ADR-0002).

---

## Phase Tracker

### Azure UAE North migration (ADR-0001)

| Phase | Status |
|---|---|
| 1. Provision | ✅ Done (PRs #64, #65, #67) |
| 2. Parallel deploy | 🟢 Active. Backend image rolling on push to `apps/backend/**`. Real secrets + custom domain still pending. |
| 3. Data migration | ⏳ Not started. Blocked on scheduling a window. |
| 4. DNS cutover | ⏳ Not started. Needs Etisalat DNS access. |
| 5. Decommission Railway | ⏳ Not started. Wait 7 days post-cutover. |

### KYC OCR (ADR-0002)

| Phase | Status |
|---|---|
| A. Backend — schema + Azure DI + 4 endpoints + tests | ✅ Done (PR #73). Schema migration ready in `prisma/migrations/20260426_kyc_ocr/`. Feature flag `KYC_OCR_ENABLED=false`. |
| B. Admin review UI — `/customers/{id}/kyc` | ✅ Done (PR #74). Three-column layout, confidence badges, per-field overrides, approve/reject/reocr. |
| C. Customer pre-fill UX | ⏳ **Deferred.** Requires customer-side upload pipeline rework (see "Phase C blocker" below). `priceSuffix` i18n key already added; pluralization fix on the booking page is the only remaining piece of light scope. |
| D. Flag flip in staging → prod | ⏳ Not started. Wait until C is complete and we've watched OCR results in non-prod. |
| E (V1.1). Custom UAE-DL trained model | ⏳ Future. Train once we have ~100 real licence samples. |

#### Phase C blocker

The customer booking flow (`apps/customer/app/[locale]/booking/BookingFlow.tsx` Step 3) currently only **collects file metadata** into client-side `docs` state. There's no actual `POST /v1/customers/me/documents` call from this UI today — the upload pipeline is stubbed. Phase C as designed in ADR-0002 (auto-pre-fill from OCR) requires:

1. Real file upload to the storage backend (likely via SAS URL pattern documented in ADR-0001)
2. Then `POST /me/documents` with the resulting `fileUrl`
3. Then poll `GET /me/documents/{id}` for OCR completion
4. Then pre-fill the form

That's a separate-PR refactor of the upload flow, not just additive UI. **Recommend filing a follow-up issue** "implement real KYC file upload pipeline" before Phase C.

---

## What needs human action next (cannot be automated)

1. **Bind custom domain `api.origin-auto.ae` to Container App.** Needs Etisalat DNS access. Once DNS is in place, the Bicep `customDomains[]` block on the Container App takes a one-line addition. Tracked as Task #27.
2. **Populate real secrets in Key Vault.** Twilio / SendGrid / Stripe placeholders need rotation (issue #19). Set via `az keyvault secret set` once accounts are provisioned. Tracked as Task #26.
3. **Microsoft for Startups Founders Hub — $5K standard tier.** Application is in review.
4. **Plan data migration window.** Pick a low-traffic window (Friday night UAE time is typical).
5. **Apply for licences (V1 launch blockers, none in this repo's control):** RTA Fleet Operator (issue #16), UAE VAT/TRN (issue #15), legal counsel review (issue #17), pen test (issue #14).
6. **Apply the KYC OCR migration to prod DB** (one-time, when ready to enable Phase A on the live system): `psql "$DATABASE_URL" -f prisma/migrations/20260426_kyc_ocr/migration.sql`. Idempotent on existing rows.
7. **Fix BYD WRX seed (#68).** Needs DB access. Either via admin API once admin login is confirmed working, or directly via psql to Supabase.

---

## Open Launch Blockers (from GitHub Issues)

Sorted by V1 impact.

| # | Title | Status |
|---|---|---|
| #16 | Obtain RTA Fleet Operator Licence | 🔴 In progress (external) |
| #15 | Register for UAE VAT; add TRN to footer/invoices | 🔴 Pending |
| #17 | UAE legal counsel review of Privacy/Terms/RTA pages | 🔴 Pending |
| #18 | Source and upload real vehicle photography | 🟡 Mockups OK; real photos pending |
| #19 | Rotate Stripe/Twilio credentials before launch | 🟡 Pending — see action item #2 above |
| #14 | External penetration test before public launch | 🔴 Pending |
| #12 | Native Arabic speaker review of `locales/ar.json` | 🟡 Pending |
| #13 | Native Chinese speaker review of `locales/zh-CN.json` | 🟡 Pending |
| #9 | Rotate admin password from default | 🔴 Pending |
| #23 | Run Lighthouse audit and fix P0/P1 findings | 🔴 Pending |
| #21 | Migrate backend + Postgres from Railway/Supabase to UAE | 🟢 In progress via Azure (Phases 1–5 above) |
| #68 | Bad seed data: vehicle listed as "BYD WRX" | 🟡 Needs DB access |

V2/V3 issues (not launch blockers, gated on licences) — #26 (Buy service), #27 (Lease-to-own).

---

## Recent merges (chronological, most recent first)

| PR | Title | Purpose |
|---|---|---|
| **#74** | feat(admin): KYC OCR review UI — Phase B (ADR-0002) | Admin `/customers/{id}/kyc` page with three-column layout, confidence badges, approve/reject/reocr |
| **#73** | feat(backend+infra): KYC OCR Phase A — schema + Azure DI + endpoints (ADR-0002) | 21-file PR — schema migration, Bicep DI module, backend `kyc/` module, 4 endpoints, 17 tests, all gated by `KYC_OCR_ENABLED=false` |
| **#72** | fix(customer): sweep "lease/buy" copy → "rental" + drop inflated stats | All three locales swept — CLAUDE.md compliance + UAE consumer-protection. Live on origin-customer.vercel.app. |
| **#71** | docs(adr): ADR-0002 — KYC OCR data flow (Azure Document Intelligence) | Strategic doc locking in provider, schema, async data flow, UX, PDPL story, 5-phase rollout |
| #70 | docs: add STATUS.md — pickup-here document | This file (predecessor) |
| #69 | chore: sweep stale `originleasing.{ae,net}` → `origin-auto.ae` | Final domain consistency pass before cutover |
| #67 | OIDC workflows + Bicep hardening | GitHub Actions deploy to Azure on push to `main` |
| #65 | Bicep skeleton | Subscription-scope IaC for Phase 1 |
| #64 | ADR-0001 (Azure UAE North architecture) | Strategic decision doc |
| #58–63 | Railway deploy fix chain | uv.lock, libatomic1, $PORT, prisma cache, NestJS preDeployCommand cleanup |

---

## Repo map (key resources)

```
docs/
  STATUS.md                                   ← this file
  adr/0001-azure-uae-north-architecture.md    ← strategic ADR + 5-phase cutover plan
  adr/0002-kyc-ocr-data-flow.md               ← KYC OCR data flow (Azure DI, schema, UX)
  api-integration-guide.md                    ← 3rd-party integrations playbook (Stripe, SendGrid, Twilio, Tabby)
  uae-infrastructure-setup.md                 ← (legacy) self-hosted UAE VPS plan, superseded by ADR-0001

infra/
  main.bicep                                  ← subscription-scope entry point
  modules/
    containerapp.bicep                        ← Container App + identity + CORS + KV/ACR role assignments + KYC OCR env vars
    containerregistry.bicep                   ← ACR (Basic, admin enabled for V1 convenience)
    docintel.bicep                            ← Document Intelligence S0 (ADR-0002)
    docintel-roles.bicep                      ← Cognitive Services User + Storage Blob Data Contributor for Container App MI
    keyvault.bicep                            ← KV in RBAC mode + seeded JWT/CORS secrets
    observability.bicep                       ← Log Analytics + App Insights
    postgres.bicep                            ← Flex B1ms + AllowAllAzureServices
    storage.bicep                             ← KYC (private) + vehicle (public) + kyc-ocr-raw (private) + CORS
  parameters/prod.bicepparam                  ← prod overrides; uses readEnvironmentVariable() for secrets
  scripts/setup-github-oidc.ps1               ← creates SP + federated creds on the repo

.github/workflows/
  deploy-azure-backend.yml                    ← on push to main on apps/backend/**
  deploy-azure-infra.yml                      ← on push to main on infra/**
  ci.yml                                      ← lint/test/typecheck for all three apps

apps/
  backend/                                    ← FastAPI + Prisma Python (canonical)
    src/origin_backend/
      kyc/                                    ← OCR module (ADR-0002 Phase A)
        ocr.py                                ← Azure DI client wrapper
        service.py                            ← state machine + admin actions
        router.py                             ← /v1/admin/documents/{id}/{reocr,approve,reject}
        schemas.py                            ← Pydantic shapes
    prisma/
      schema.prisma                           ← OcrStatus enum + 9 OCR columns on Document
      migrations/20260426_kyc_ocr/            ← forward + rollback SQL
  customer/                                   ← Next.js 15 + next-intl + Tailwind (RTL ready)
  admin/                                      ← Next.js 14 + jose + httpOnly-cookie proxy
    app/(dashboard)/customers/[id]/kyc/       ← KYC review page (ADR-0002 Phase B)
    components/ConfidenceBadge.tsx            ← OCR confidence pill
    lib/api-kyc.ts                            ← typed KYC API client
```

---

## How to pick this up (concrete commands)

### Smoke test the live Azure backend
```bash
curl -s https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/health/ready
# expect: {"status":"ready"}

curl -s 'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1/vehicles?limit=2'
# expect: array of 2 vehicles
```

### Trigger a backend redeploy (no code change)
Push any commit touching `apps/backend/**`. The `deploy-azure-backend.yml` workflow handles ACR build + Container App revision update.

### Apply the KYC OCR schema migration to prod
```bash
# One-time. Backwards-compatible (defaults all existing rows to ocrStatus='NOT_STARTED').
psql "$DATABASE_URL" -f apps/backend/prisma/migrations/20260426_kyc_ocr/migration.sql

# Roll back if needed:
# psql "$DATABASE_URL" -f apps/backend/prisma/migrations/20260426_kyc_ocr/migration.down.sql
```

### Flip KYC OCR on (after Phase C ships and you've watched it in staging)
```bash
az containerapp update \
  -n ca-origin-backend-prod -g rg-origin-prod-uaenorth \
  --set-env-vars KYC_OCR_ENABLED=true
# Or update prod.bicepparam and run deploy-azure-infra.yml.
```

### Update a Key Vault secret
```bash
az keyvault secret set --vault-name kv-origin-prod-uaenorth \
  --name "STRIPE-SECRET-KEY" --value "sk_live_..."
# Container App auto-references it on next revision.
```

### Run Bicep what-if (preview a change locally)
```bash
$env:PG_ADMIN_PWD = "<get from KV>"
$env:JWT_SECRET = "<get from KV>"
$env:JWT_REFRESH_SECRET = "<get from KV>"

az deployment sub what-if --location uaenorth \
  --template-file infra/main.bicep \
  --parameters infra/parameters/prod.bicepparam
```

### Re-run health check end-to-end
```bash
# Backend
curl -s https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/health/ready

# Customer (Vercel)
curl -sI https://origin-customer.vercel.app | head -5

# Admin (Vercel)
curl -sI https://origin-admin.vercel.app | head -5
```

### Manually run KYC OCR backend tests
```bash
cd apps/backend
uv sync
uv run prisma generate
uv run pytest tests/test_kyc_router.py -v
# expect 17/17 passing
```

---

## Notes for the next session

- **Don't recreate Azure resources.** Bicep is idempotent — running `deploy-azure-infra.yml` against an unchanged template is a no-op. If you see drift, run `what-if` first.
- **Document Intelligence's `Cognitive Services User` role GUID** is `a574d5d0-ad88-4d2b-ae57-bf67dc12c0a9` per Microsoft docs. If your tenant returns a different GUID (the way `Key Vault Secrets User` did), update `cognitiveServicesUserRoleGuid` in `prod.bicepparam`.
- **Customer-side upload pipeline is the next major piece.** The booking flow's Step 3 currently stubs uploads. Real upload (likely via SAS URL → POST /me/documents) is what unblocks Phase C of the KYC OCR work AND fixes the "AED 8,500 months" pluralization bug remnant in `BookingFlow.tsx` (the i18n key `priceSuffix` is already there waiting).
- **Phase A is dormant on disk.** The schema migration and backend module are merged but `KYC_OCR_ENABLED=false`. Customer behavior is unchanged. Flip the flag only after Phase C and a staging soak.
- **`docs/n8n-setup.md` references `origin.ae` (no `-auto`).** That's an older / different domain from the active workflow doc. It predates the Azure migration; treat as legacy until someone decides whether n8n is in scope for V1.
- **Railway backend is still spending money** (~$5/month on the Hobby plan). Tear down only after a 7-day clean window on Azure post-cutover.
- **Tenant has a non-standard Built-in Role GUID** for `Key Vault Secrets User`. The actual GUID `4633458b-17de-408a-b874-0445c86b69e6` is pinned in `infra/parameters/prod.bicepparam`. If a future deployment errors with `RoleDefinitionDoesNotExist`, that's the parameter to update.
- **Admin login email is still `admin@originleasing.ae`** — intentional, separate from the public-domain sweep. Migrating it requires backend DB + auth coordination; tracked in CLAUDE.md and a follow-up issue.
- **BYD WRX seed bug (#68)** still needs DB access to fix. The row is real production data, not in any seed file in the repo.
