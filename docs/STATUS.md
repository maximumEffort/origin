# Origin — Pickup-Here Status

_Last updated: 2026-04-29._

This file is the authoritative **"where are we right now"** for the Origin repo. If you're picking this back up after a break, start here. Open ADR-0001 (`docs/adr/0001-azure-uae-north-architecture.md`) and ADR-0002 (`docs/adr/0002-kyc-ocr-data-flow.md`) for the strategic picture; this file is the tactical tracker.

> **Stale-doc warning.** Before this update, STATUS.md sat 2 days behind. If the most recent code change is much newer than the timestamp above, the doc is drifting again — open a small PR to refresh it.

---

## TL;DR

- **Three apps live in production** — customer site (`origin-auto.ae`), admin (`admin.origin-auto.ae`), backend (`api.origin-auto.ae`). All on Azure UAE North + Vercel.
- **Real fleet** — 11 vehicles in Azure Postgres, served via `/v1/vehicles`.
- **All 7 P0 ship-blockers fixed today** — Stripe security, KYC role gate, deposit charging, booking validation, rental-only copy, fail-open guard, IaC drift handling.
- **6 audit P1-adjacent improvements shipped today** — auth rate limiting, ErrorLog persistence, admin pagination, dashboard SUM, vehicle image management, X-Request-ID middleware.
- **Container App ingress CORS** widened to include both Vercel preview domains (applied via `az containerapp ingress cors update` today).
- **V1 launch blockers** are now licensing + content (RTA Fleet Operator licence, VAT TRN, vehicle photos, real Stripe / Twilio / SendGrid credentials). **Code-side is launch-ready.**
- **Bicep ↔ Azure drift** is the one piece of tech debt — auto-deploy of `infra/**` is paused (manual dispatch only) until the template is reconciled with the manually-provisioned Azure state.

---

## Live Systems

| Surface | URL | State |
|---|---|---|
| **Customer site** | `https://origin-auto.ae` | Live on Vercel; points at `api.origin-auto.ae` (Azure backend). |
| **Admin dashboard** | `https://admin.origin-auto.ae` | Live on Vercel; httpOnly-cookie proxy to backend. |
| **Backend API (canonical)** | `https://api.origin-auto.ae/v1` | Live on Azure UAE North Container App. `/health/ready` returns `{"status":"ready"}`. |
| **Backend API (Container App FQDN, fallback)** | `https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1` | Same target, used as code default in `.env.example` if `NEXT_PUBLIC_API_URL` is unset. |
| **Database** | Azure PostgreSQL Flex `pg-origin-prod-uaenorth` | Canonical. Supabase EU is decommissioned; Railway backend is decommissioned (commits `5382053`, `d688236`). |

Vercel previews:
- `https://origin-customer.vercel.app` — customer
- `https://origin-admin.vercel.app` — admin

Both preview domains are in the Container App ingress CORS allow-list (5 origins total).

---

## Azure Resources (provisioned in UAE North)

All under subscription **`5edcba8f-db66-402d-86a3-d8b0a06c7655`**, resource group **`rg-origin-prod-uaenorth`**:

| Resource | Name | Notes |
|---|---|---|
| Container App | `ca-origin-backend-prod` | System-assigned managed identity. CORS allow-list: 5 origins (3 origin-auto.ae + 2 Vercel previews). Health probes at `/health/live` + `/health/ready`. Custom domain `api.origin-auto.ae` bound. |
| Container App Env | `cae-origin-prod-uaenorth` | |
| Container Registry | `acroriginprod` | Basic SKU. AcrPull granted to Container App identity. |
| PostgreSQL Flex Server | `pg-origin-prod-uaenorth` | Burstable B1ms, 32 GB, public access with `AllowAllAzureServices` rule. Database `origin`. **Canonical data lives here.** |
| Storage Account | `stororiginproduaenorth` | Containers: `kyc-documents` (private), `vehicle-imagery` (public), `kyc-ocr-raw` (private). |
| Key Vault | `kv-origin-prod-uaenorth` | RBAC mode. Seeded: `JWT-SECRET`, `JWT-REFRESH-SECRET`, `CORS-ALLOWED-ORIGINS`. Pending real values: Twilio, SendGrid, Stripe. |
| Document Intelligence | `di-origin-prod-uaenorth` | S0 tier. System-assigned MI. KYC OCR (ADR-0002). |
| Log Analytics | `log-origin-prod-uaenorth` | PerGB2018, 30-day retention. |
| Application Insights | `ai-origin-prod-uaenorth` | Workspace-based. |

Tier 1 monthly bill estimate: **~$36–40/month**. Covered by **$1,000 Microsoft for Startups Founders Hub credit** (active). $5K standard tier application in review.

OIDC service principal for GitHub Actions (object id `3de92676-3e63-4912-8a94-400fb59d1aa3`) was granted **Contributor** at subscription scope and **Role Based Access Control Administrator** at the resource-group scope on 2026-04-29 — required for `az deployment sub create` + role-assignment writes inside Bicep.

---

## Phase Tracker

### Azure UAE North migration (ADR-0001)

| Phase | Status |
|---|---|
| 1. Provision | ✅ Done |
| 2. Parallel deploy | ✅ Done |
| 3. Data migration (Supabase EU → Azure PG) | ✅ Done — canonical data is in Azure Postgres |
| 4. DNS cutover (`api.origin-auto.ae` → Azure) | ✅ Done — frontends use the canonical URL |
| 5. Decommission Railway | ✅ Done — `5382053 chore: remove decommissioned Railway config` |

### KYC OCR (ADR-0002)

| Phase | Status |
|---|---|
| A. Backend — schema + Azure DI + 4 endpoints + tests | ✅ Done (PR #73) |
| B. Admin review UI — `/customers/{id}/kyc` | ✅ Done (PR #74) |
| C. Customer pre-fill UX | ⏳ **Deferred.** Requires customer-side upload pipeline rework — currently Step 3 of `BookingFlow.tsx` collects metadata only, does not push files. Filing a follow-up: "implement real KYC file upload pipeline". |
| D. Flag flip in staging → prod | ⏳ Not started. Wait until C is complete. |
| E (V1.1). Custom UAE-DL trained model | ⏳ Future. Train once we have ~100 real licence samples. |

### Tech debt

| Item | Status |
|---|---|
| Bicep ↔ Azure state reconciliation | ⏳ Auto-trigger on `deploy-azure-infra.yml` is **disabled** (PR #145, manual dispatch only). The orphan modules (`docintel.bicep`, `docintel-roles.bicep`, `acr-roles.bicep`) live on disk but aren't wired from `main.bicep`. Each was attempted and surfaced a different drift error. Reconciliation work tracked separately and should be done post-launch. |
| `static-vehicles.test.ts` brand list | ✅ Aligned with current seed (PR #141) |
| BYD WRX → Seal seed data fix | ✅ Done (migration `20260427_fix_byd_wrx_seed_data`) |
| Admin login email is still `admin@originleasing.ae` | ⏳ Migrating requires backend DB + auth coordination. Not blocking. |

---

## Today's session — 2026-04-29 (5 PRs, 13 issues closed)

| PR | Issues closed | Summary |
|---|---|---|
| **#141** | #128, #129, #130, #131, #132, #133, #134 | 7 P0 ship-blockers. Stripe amount derived server-side; deposit-only checkout + lease seeding; production fail-open guard; KYC role gate (FLEET_MANAGER → SALES); booking validation (availability + KYC + overlap); rental-only copy + CI guard. |
| **#142** | #21, #112, #113, #114, #115, #116 | Audit improvements. Railway URL cleanup; ErrorLog + X-Request-ID middleware; auth rate limiting; admin vehicle image management; admin pagination; dashboard SUM at DB layer. |
| **#143** | — | Hotfix: split stacked Bicep decorators in `postgres.bicep` so it parses. |
| **#144** | — | Hotfix: drop unsupported `bypass: 'AzureServices'` on Document Intelligence (FormRecognizer Kind doesn't support Trusted Services). |
| **#145** | — | Unwire orphan Bicep modules from `main.bicep`; revert `containerapp.bicep` CORS / env-var parameterisation; remove `push: branches: [main]` trigger from `deploy-azure-infra.yml`. |

Plus operational steps in Cloud Shell:
- Granted OIDC SP `Contributor` (sub scope) + `Role Based Access Control Administrator` (RG scope)
- Applied CORS widening directly: `az containerapp ingress cors update -n ca-origin-backend-prod -g rg-origin-prod-uaenorth --allowed-origins ...`

---

## What needs human action next (cannot be automated)

V1 launch blockers — paperwork track:

1. **RTA Fleet Operator Licence** (issue #16) — long lead time, in progress.
2. **UAE VAT TRN registration** (issue #15) — required on every invoice.
3. **Real Stripe / Twilio / SendGrid live keys** — all currently placeholders in Key Vault. Set via `az keyvault secret set` once accounts are provisioned.
4. **Microsoft for Startups Founders Hub — $5K standard tier** — application in review.
5. **Real vehicle photos** — replace stock imagery (showroom shoot needed).
6. **Legal counsel review** of customer T&Cs (issue #17).
7. **Pen test** before public launch (issue #14).

Operational:

8. **Apply the KYC OCR migration to prod DB** (one-time, when ready to enable Phase A on the live system): `psql "$DATABASE_URL" -f apps/backend/prisma/migrations/20260426_kyc_ocr/migration.sql`. Idempotent on existing rows.
9. **Reconcile Bicep template with live Azure state** (post-launch). Each module currently on disk needs an `az resource show` diff against the live environment, then template adjustments to match. Once green, re-enable the `push:` trigger on `deploy-azure-infra.yml` and re-wire the orphan modules in `main.bicep`. Tracked drifts so far: postgres.bicep syntax (now fixed), docintel networkAcls bypass (fixed), ACR/DI/Storage role-assignment GUIDs, Container App env-var set.

---

## Repo map (key resources)

```
docs/
  STATUS.md                                   ← this file
  adr/0001-azure-uae-north-architecture.md    ← strategic ADR + 5-phase cutover plan (executed)
  adr/0002-kyc-ocr-data-flow.md               ← KYC OCR data flow (Azure DI, schema, UX) — Phase A+B merged
  api-integration-guide.md                    ← 3rd-party integrations playbook
  uae-infrastructure-setup.md                 ← (legacy) self-hosted UAE VPS plan, superseded by ADR-0001
  architecture.md                             ← (partly stale) high-level architecture; some sections predate the FastAPI rewrite

infra/
  main.bicep                                  ← subscription-scope entry point. Wires observability/keyvault/storage/postgres/acr/containerapp.
  modules/
    containerapp.bicep                        ← Container App + identity + KV/ACR role assignments
    containerregistry.bicep                   ← ACR (Basic, admin enabled for V1 convenience)
    docintel.bicep                            ← Document Intelligence S0 (ADR-0002) — ⚠ on disk, not currently wired
    docintel-roles.bicep                      ← Cognitive Services User + Storage Blob Data Contributor — ⚠ on disk, not currently wired
    acr-roles.bicep                           ← AcrPull for Container App MI — ⚠ on disk, not currently wired
    keyvault.bicep                            ← KV in RBAC mode + seeded JWT/CORS secrets
    observability.bicep                       ← Log Analytics + App Insights
    postgres.bicep                            ← Flex B1ms + AllowAllAzureServices
    storage.bicep                             ← KYC + vehicle + kyc-ocr-raw containers + CORS
  parameters/prod.bicepparam                  ← prod overrides; uses readEnvironmentVariable() for secrets
  scripts/setup-github-oidc.ps1               ← creates SP + federated creds on the repo

.github/workflows/
  ci.yml                                      ← lint/test/typecheck for all three apps + #133 forbidden-words guard
  deploy-azure-backend.yml                    ← on push to main on apps/backend/**
  deploy-azure-infra.yml                      ← MANUAL DISPATCH ONLY (auto-trigger removed in #145)

apps/
  backend/                                    ← FastAPI + Prisma Python (canonical)
    src/origin_backend/
      auth/                                   ← OTP + admin login + rate limiting (#113)
      bookings/                               ← booking validation + state transitions
      kyc/                                    ← OCR module (ADR-0002 Phase A)
      payments/                               ← Stripe PaymentIntent — server-derived amount (#128)
      common/
        ratelimit.py                          ← per-IP rate limiter on auth endpoints (#113)
        error_log.py                          ← ErrorLog persistence (#112)
        request_context.py                    ← X-Request-ID middleware (#112)
    prisma/
      schema.prisma                           ← 24 enums, 17 models — single source of truth
      migrations/
        20260426_kyc_ocr/                     ← schema for ADR-0002 Phase A
        20260427_fix_byd_wrx_seed_data/       ← BYD WRX → Seal correction
        20260428_fleet_brands_and_deposit/    ← +9 brands, deposit field
    seed_fleet.py + seed_raw.py               ← seed scripts (production seeds 11 vehicles)
  customer/                                   ← Next.js 15 + next-intl + Tailwind (RTL ready)
  admin/                                      ← Next.js 15 + jose + httpOnly-cookie proxy + pagination (#115)
```

---

## How to pick this up (concrete commands)

### Smoke test the live backend
```bash
curl -s https://api.origin-auto.ae/health/ready
# expect: {"status":"ready"}

curl -s 'https://api.origin-auto.ae/v1/vehicles?limit=2'
# expect: array of 2 vehicles
```

### Trigger a backend redeploy (no code change)
Push any commit touching `apps/backend/**`. The `deploy-azure-backend.yml` workflow handles ACR build + Container App revision update.

### Manually trigger an infra deploy (post-reconciliation)
```bash
gh workflow run "Deploy infra (Azure Bicep)" --ref main
```
Or: GitHub Actions tab → Deploy infra (Azure Bicep) → Run workflow → main.

### Apply the KYC OCR schema migration to prod
```bash
# One-time. Backwards-compatible (defaults all existing rows to ocrStatus='NOT_STARTED').
psql "$DATABASE_URL" -f apps/backend/prisma/migrations/20260426_kyc_ocr/migration.sql
```

### Flip KYC OCR on (after Phase C ships and you've watched it in staging)
```bash
az containerapp update \
  -n ca-origin-backend-prod -g rg-origin-prod-uaenorth \
  --set-env-vars KYC_OCR_ENABLED=true
```

### Update a Key Vault secret
```bash
az keyvault secret set --vault-name kv-origin-prod-uaenorth \
  --name "STRIPE-SECRET-KEY" --value "sk_live_..."
# Container App auto-references it on next revision.
```

### Re-run health check end-to-end
```bash
curl -s https://api.origin-auto.ae/health/ready
curl -sI https://origin-auto.ae | head -5
curl -sI https://admin.origin-auto.ae | head -5
```

### Run backend tests
```bash
cd apps/backend
uv sync
uv run prisma generate
uv run pytest
# expect green
```

---

## Notes for the next session

- **Don't recreate Azure resources.** Bicep is idempotent — but main.bicep currently wires only observability/keyvault/storage/postgres/acr/containerapp. The orphan modules need reconciliation before re-wiring.
- **`deploy-azure-infra` is manual-only.** A `git push` to `main` that touches `infra/**` will *not* auto-fire a deploy any more.
- **Customer-side upload pipeline is the next major piece** for KYC OCR Phase C. The booking flow's Step 3 currently stubs uploads.
- **Phase A is dormant on disk.** The schema migration and backend module are merged but `KYC_OCR_ENABLED=false`. Customer behaviour is unchanged. Flip the flag only after Phase C and a staging soak.
- **`docs/n8n-setup.md` references `origin.ae` (no `-auto`).** Fixed in this update — should now read `origin-auto.ae`.
- **`docs/architecture.md` has stale stack claims** (Node.js / Express / NestJS / App Service). Updated to FastAPI + Container Apps in this update.
- **`docs/launch-checklist.md` (dated 2026-03-31)** is a generic V0 template. Many items are now done; the file is kept for reference but `STATUS.md` is the source of truth on launch readiness.
- **Admin login email is still `admin@originleasing.ae`** — intentional for now, separate from the public-domain sweep. Migrating requires backend DB + auth coordination; tracked in CLAUDE.md.

---

## Recent merges (chronological, most recent first)

| PR | Title | Date |
|---|---|---|
| **#145** | chore(infra): unwire orphan Bicep modules + disable deploy-infra auto-trigger | 2026-04-29 |
| **#144** | fix(infra): drop unsupported Trusted Services bypass on Document Intelligence | 2026-04-29 |
| **#143** | fix(infra): unblock deploy-azure-infra — split stacked Bicep decorators | 2026-04-29 |
| **#142** | feat: ErrorLog + rate limiting + admin pagination + dashboard SUM (#21, #112–#116) | 2026-04-29 |
| **#141** | fix: land 7 P0 ship-blockers (#128–#134) | 2026-04-29 |
| **#74** | feat(admin): KYC OCR review UI — Phase B (ADR-0002) | 2026-04-26 |
| **#73** | feat(backend+infra): KYC OCR Phase A — schema + Azure DI + endpoints (ADR-0002) | 2026-04-26 |
| **#72** | fix(customer): sweep "lease/buy" copy → "rental" + drop inflated stats | 2026-04-26 |
| **#71** | docs(adr): ADR-0002 — KYC OCR data flow (Azure Document Intelligence) | 2026-04-26 |
| **#70** | docs: add STATUS.md — pickup-here document | 2026-04-26 |
| **#69** | chore: sweep stale `originleasing.{ae,net}` → `origin-auto.ae` | 2026-04-26 |
| **#67** | OIDC workflows + Bicep hardening | 2026-04-25 |
| **#65** | Bicep skeleton | 2026-04-24 |
| **#64** | ADR-0001 (Azure UAE North architecture) | 2026-04-24 |
