# Origin — Pickup-Here Status

_Last updated: 2026-04-26._

This file is the authoritative **"where are we right now"** for the Origin repo. If you're picking this back up after a break, start here. Open ADR-0001 (`docs/adr/0001-azure-uae-north-architecture.md`) for the strategic picture; this file is the tactical tracker.

---

## TL;DR

- **Phase 1 (Azure UAE North bring-up): done.** Backend is running on Azure Container Apps in `uaenorth`, serving live traffic. Health endpoint is green.
- **Phase 2 (parallel deploy): active.** Railway US backend is still up. Azure backend is also up. Customer + admin frontends on Vercel still point at Railway.
- **Phase 3–5 (data migration → DNS cutover → decommission): not yet started.** Blocked on user-side actions.
- **V1 launch blockers** are now mostly licensing + content tasks (RTA Fleet Operator licence, VAT TRN, vehicle photos, real Stripe/Twilio creds). Infra is no longer the bottleneck.

---

## Live Systems

| Surface | URL | State |
|---|---|---|
| **Azure backend (production target)** | `https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io` | Live — `/health/ready` returns `{"status":"ready"}`. Returns 14 vehicles from `/v1/vehicles`. |
| **Railway backend (legacy, still up)** | `https://car-leasing-business-production.up.railway.app` | Live — currently the canonical backend for both frontends. |
| Customer site | (Vercel project: `origin-customer`) | Pointing at **Railway** backend. Will flip to Azure during cutover. |
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
| Storage Account | `stororiginproduaenorth` | Two containers: `kyc-documents` (private), `vehicle-imagery` (public). CORS allow-list includes the canonical domains. |
| Key Vault | `kv-origin-prod-uaenorth` | RBAC mode. Seeded with `JWT-SECRET`, `JWT-REFRESH-SECRET`, `CORS-ALLOWED-ORIGINS`. Container App identity has `Key Vault Secrets User`. |
| Log Analytics | `log-origin-prod-uaenorth` | PerGB2018, 30-day retention. |
| Application Insights | `ai-origin-prod-uaenorth` | Workspace-based. |

Tier 1 monthly bill estimate: **~$36/month**, fully covered by the active **$1,000 Microsoft for Startups Founders Hub credit**.

> The standard $5K Founders Hub tier is still **in review** as of last check. Once approved, no infra action needed — the credit just stretches.

---

## Phase Tracker

### Phase 1 — Provision (DONE)
- [x] ADR-0001 merged (PR #64)
- [x] Bicep skeleton merged (PR #65)
- [x] OIDC + workflows merged (PR #67)
- [x] First deploy succeeded
- [x] Bicep hardening (AcrPull + `--identity system`) idempotent in main IaC

### Phase 2 — Parallel deploy (ACTIVE)
- [x] Backend image building + pushing to ACR via GitHub Actions on `main`
- [x] Container App revision rolling on each push to `apps/backend/**`
- [x] `/health/ready` green
- [x] Domain sweep — repo references all on `origin-auto.ae` (PR #69)
- [ ] Real secrets seeded (Twilio, SendGrid, Stripe) — see Task #26
- [ ] Custom domain `api.origin-auto.ae` bound to Container App — see Task #27

### Phase 3 — Data migration (NOT STARTED)
- [ ] Snapshot Supabase → restore into `pg-origin-prod-uaenorth`
- [ ] Run Prisma migrations on Azure Postgres
- [ ] Validate row counts + FK integrity
- [ ] Schedule cutover window (low-traffic, weekend)

### Phase 4 — DNS cutover (NOT STARTED)
- [ ] Lower TTLs at Etisalat 24h before window
- [ ] Repoint `api.origin-auto.ae` → Azure Container App
- [ ] Flip `NEXT_PUBLIC_API_URL` on both Vercel projects
- [ ] Re-register webhooks at new domain (Stripe, Twilio, SendGrid)

### Phase 5 — Decommission (NOT STARTED)
- [ ] Confirm 7 days of green Azure traffic
- [ ] Tear down Railway backend
- [ ] Pause / archive Supabase project (keep snapshot for compliance window)

---

## What needs human action next (cannot be automated)

1. **Bind custom domain `api.origin-auto.ae` to Container App.**
   Needs Etisalat DNS access to add the TXT validation record + CNAME. Once DNS is in place, the Bicep `customDomains[]` block on the Container App takes a one-line addition. Tracked as Task #27.

2. **Populate real secrets in Key Vault.**
   `kv-origin-prod-uaenorth` currently has placeholders for Twilio / SendGrid / Stripe. These need rotation anyway (see issue #19). Set them via `az keyvault secret set` once accounts are provisioned. Container App will pick them up on next revision. Tracked as Task #26.

3. **Microsoft for Startups Founders Hub — $5K standard tier.**
   Application is in review. No action unless asked for more docs.

4. **Plan data migration window.**
   This is when both backends point at the new Postgres. Pick a low-traffic window (Friday night UAE time is typical). Run plan in `docs/adr/0001-azure-uae-north-architecture.md` § Phase 3.

5. **Apply for licences (V1 launch blockers, none in this repo's control):**
   - RTA Fleet Operator Licence (issue #16) — without this, no rentals are legal.
   - UAE VAT registration / TRN (issue #15) — must be in footer + invoices.
   - UAE legal counsel review of Privacy Policy / Terms / RTA page (issue #17).
   - External pen test before public launch (issue #14).

---

## Open Launch Blockers (from GitHub Issues)

Sorted by V1 impact. Full list at `https://github.com/maximumEffort/origin/issues`.

| # | Title | Why it blocks launch |
|---|---|---|
| #16 | Obtain RTA Fleet Operator Licence; display on /rta page and footer | Hard legal blocker — operating without it risks regulatory action. |
| #15 | Register for UAE VAT; add TRN to footer and invoices | Required for invoices; 5% VAT must be itemised. |
| #17 | UAE legal counsel review of Privacy Policy, Terms, RTA page | Risk: shipped legal copy not reviewed by UAE counsel. |
| #18 | Source and upload real vehicle photography | Stub imagery currently — looks bad on hero / cards. |
| #19 | Rotate Stripe and Twilio credentials before launch | Production secrets must not be the dev rotation. |
| #14 | External penetration test before public launch | Compliance / due-diligence requirement. |
| #12 | Native Arabic speaker review of `locales/ar.json` | RTL launch quality blocker. |
| #13 | Native Chinese speaker review of `locales/zh-CN.json` | Same as above for `zh-CN`. |
| #9 | Rotate admin password from default | Security must-have before public launch. |
| #23 | Run Lighthouse audit and fix P0/P1 findings | Performance + a11y bar for launch. |
| #21 | Migrate backend + Postgres from Railway/Supabase to UAE VPS | Now actively in progress via Azure (Phases 1–5 above). Update / close once cutover completes. |
| #68 | Bad seed data: vehicle listed as "BYD WRX" | Data quality bug — BYD doesn't make a WRX (Subaru does), and this is an EV-only fleet but the row is `PETROL`. Fix during seed-data refresh. |

V2/V3 issues (not launch blockers, gated on licences) — #26 (Buy service), #27 (Lease-to-own).

---

## Recent merges (chronological, most recent first)

| PR | Title | Purpose |
|---|---|---|
| #69 | chore: sweep stale `originleasing.{ae,net}` → `origin-auto.ae` | Final domain consistency pass before cutover. |
| #67 | OIDC workflows + Bicep hardening | Replaces #66 (closed, stale). GitHub Actions deploy to Azure on push to `main`. |
| #65 | Bicep skeleton | Subscription-scope IaC for Phase 1. |
| #64 | ADR-0001 (Azure UAE North architecture) | Strategic decision doc. |
| #63 | fix(backend): copy prisma-python binary cache from builder to runtime stage | Final Railway deploy fix. |
| #62 | fix(backend): wrap `startCommand` in `sh -c` so `$PORT` expands | Railway deploy fix. |
| #61 | fix(backend): no-op `preDeployCommand` to bypass stale NestJS migration | Railway deploy fix. |
| #60 | fix(backend): explicitly clear stale NestJS-era `preDeployCommand` | Railway deploy fix. |
| #59 | fix(backend): add libatomic1 to Docker builder | Railway deploy fix (prisma-python's nodeenv). |
| #58 | fix(backend): copy `uv.lock` into Docker build context | Railway deploy fix. |

The PR #58–#63 chain together solved an end-to-end broken Railway deploy. With Azure as the new home, those fixes are still in the Dockerfile but the deploy target is no longer Railway.

---

## Repo map (key resources)

```
docs/
  STATUS.md                                   ← this file
  adr/0001-azure-uae-north-architecture.md    ← strategic ADR + 5-phase cutover plan
  api-integration-guide.md                    ← 3rd-party integrations playbook (Stripe, SendGrid, Twilio, Tabby)
  uae-infrastructure-setup.md                 ← (legacy) self-hosted UAE VPS plan, superseded by ADR-0001

infra/
  main.bicep                                  ← subscription-scope entry point
  modules/
    containerapp.bicep                        ← Container App + identity + CORS + KV/ACR role assignments
    containerregistry.bicep                   ← ACR (Basic, admin enabled for V1 convenience)
    keyvault.bicep                            ← KV in RBAC mode + seeded JWT/CORS secrets
    observability.bicep                       ← Log Analytics + App Insights
    postgres.bicep                            ← Flex B1ms + AllowAllAzureServices
    storage.bicep                             ← KYC (private) + vehicle (public) + CORS
  parameters/prod.bicepparam                  ← prod overrides; uses readEnvironmentVariable() for secrets
  scripts/setup-github-oidc.ps1               ← creates SP + federated creds on the repo

.github/workflows/
  deploy-azure-backend.yml                    ← on push to main on apps/backend/**
  deploy-azure-infra.yml                      ← on push to main on infra/**
  ci.yml                                      ← lint/test/typecheck for all three apps

apps/
  backend/                                    ← FastAPI + Prisma Python (canonical)
  customer/                                   ← Next.js 15 + next-intl + Tailwind (RTL ready)
  admin/                                      ← Next.js 14 + jose + httpOnly-cookie proxy
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

### Manually push a new image (bypassing CI)
```bash
az login
az acr build -t origin/backend:latest -t origin/backend:$(git rev-parse --short HEAD) \
  -r acroriginprod -f apps/backend/Dockerfile apps/backend
az containerapp update -n ca-origin-backend-prod -g rg-origin-prod-uaenorth \
  -i acroriginprod.azurecr.io/origin/backend:$(git rev-parse --short HEAD) \
  --revision-suffix sha-$(git rev-parse --short HEAD)
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
curl -sI https://origin-auto.ae | head -5     # post-DNS-cutover

# Admin (Vercel)
curl -sI https://admin.origin-auto.ae | head -5
```

---

## Notes for the next session

- **Don't recreate Azure resources.** Bicep is idempotent — running `deploy-azure-infra.yml` against an unchanged template is a no-op. If you see drift, run `what-if` first.
- **`docs/n8n-setup.md` references `origin.ae` (no `-auto`).** That's an older / different domain from the active workflow doc. It predates the Azure migration; treat as legacy until someone decides whether n8n is in scope for V1.
- **Railway backend is still spending money** (~$5/month on the Hobby plan). Tear down only after a 7-day clean window on Azure post-cutover.
- **Subscription rename in progress** — `Azure subscription 1` → `Origin Production`. Doesn't affect anything functionally.
- **Tenant has a non-standard Built-in Role GUID** for `Key Vault Secrets User`. The actual GUID `4633458b-17de-408a-b874-0445c86b69e6` is pinned in `infra/parameters/prod.bicepparam` as `keyVaultSecretsUserRoleGuid`. If a future deployment errors with `RoleDefinitionDoesNotExist`, that's the parameter to update.
- **Admin login email is still `admin@originleasing.ae`** — intentional, separate from the public-domain sweep. Migrating it requires backend DB + auth coordination; tracked in CLAUDE.md and a follow-up issue.
