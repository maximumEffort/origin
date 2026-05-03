# Origin — Pickup-Here Status

_Last updated: 2026-05-02._

**This is the single authoritative "where are we right now" for the Origin repo.**
If you're picking this up cold, start here. After this, open:
- [`docs/architecture/rebuild-erd.md`](architecture/rebuild-erd.md) — V1 schema + module design (v0.5, signed off)
- [`docs/adr/0001-azure-uae-north-architecture.md`](adr/0001-azure-uae-north-architecture.md) — strategic infra ADR (still valid)
- [`docs/adr/0002-kyc-ocr-data-flow.md`](adr/0002-kyc-ocr-data-flow.md) — KYC OCR data flow (the schema piece was wiped in the rebuild and is being re-built; the data-flow shape is unchanged)

Several other documents under `docs/` are **pre-rebuild and now stale**. They carry a banner at the top pointing back here. Do not treat them as current.

---

## TL;DR (read this if nothing else)

- **The codebase was rebuilt from scratch on 2026-05-02.** Pre-rebuild snapshot is preserved at commit `e296ff9` (https://github.com/maximumeffort/origin/commit/e296ff9). All 70+ commits of v0 history remain reachable in git — nothing was force-deleted.
- **The rebuild is a modular monolith** following `docs/architecture/rebuild-erd.md` v0.5. 36 tables, 42 enums, organised into `core / platform / products / services / gateways`.
- **Backend is live.** `https://api.origin-auto.ae/health/ready` returns 200 against the new V1 image (`acroriginprod.azurecr.io/origin-backend:587da4a...`).
- **Database was wiped.** `pg-origin-prod-uaenorth.public` was dropped and re-migrated on 2026-05-02. Only seed data exists: country `AE`, legal entity `Shanghai Car Rental LLC`, 4 KYC document types. **No real customers, vehicles, bookings, or leases.** The 11 vehicles previously in the DB were intentionally dropped; they will be reseeded later.
- **Frontends are wiped.** `apps/customer/` and `apps/admin/` are gone. Vercel deployments still serve their last successful pre-rebuild revision (which calls v0 `/v1/*` API routes that no longer exist; both sites are broken from a user POV until rebuilt).
- **V1 launch is paperwork-gated, not code-gated.** RTA Fleet Operator Licence + VAT TRN + real Stripe/Twilio/SendGrid creds + showroom photos are all blockers. The rebuild itself is unblocked technically.

---

## Live systems (right now)

| Surface | URL | State |
|---|---|---|
| **Backend API (V1)** | `https://api.origin-auto.ae/api/v1` | ✅ marker endpoint returns `{"surface":"public","version":"v1"}` |
| **Backend admin API** | `https://api.origin-auto.ae/api/admin/v1` | ✅ marker endpoint returns `{"surface":"admin","version":"v1"}` |
| **Backend webhooks** | `https://api.origin-auto.ae/api/webhooks` | ✅ mounted (no providers wired yet) |
| **Backend health** | `https://api.origin-auto.ae/health/{live,ready}` | ✅ `ready` = `{"status":"ready"}` |
| **Legacy `/v1/*` paths** | `https://api.origin-auto.ae/v1/*` | ❌ all gone (the v0 routes are not preserved; new surface is `/api/v1/*`) |
| **Customer site** | `https://origin-auto.ae` | ❌ stale revision, calls dead v0 endpoints |
| **Admin dashboard** | `https://admin.origin-auto.ae` | ❌ stale revision, same |
| **PostgreSQL** | `pg-origin-prod-uaenorth` | ✅ V1 schema. Seed: country-AE, legal entity Shanghai Car Rental LLC, 4 KYC doc types. |

---

## What's actually implemented in V1 (code)

```
apps/backend/
  prisma/
    schema.prisma                            ✅ 36 models, 42 enums, full v0.5 ERD
    migrations/20260502120000_v1_genesis/    ✅ applied to prod DB
  src/origin_backend/
    main.py                                  ✅ FastAPI mounted with /health, /api/v1, /api/admin/v1, /api/webhooks
    config.py                                ✅ pydantic-settings, prod-startup guards
    health/                                  ✅ /health/{live,ready}
    core/
      kernel/                                ✅ Money primitive, ULID ids, error envelope
      messaging/                              ✅ outbox.enqueue() + event constants (worker NOT yet running)
      observability/                          ✅ X-Request-ID middleware
      persistence.py                         ✅ Prisma client lifecycle
    platform/
      countries/                             🟡 module exists, no service.py yet
      identity/                              🟡 module exists, no service.py yet
      inventory/                             🟡 module exists, no service.py yet
      pricing/                               🟡 module exists, no service.py yet
      billing/                               🟡 module exists, no service.py yet
      agreements/                            🟡 module exists, no service.py yet
    products/
      rental/                                🟡 events.py wired; no service.py
      lease_to_own/, purchase/               ⏸ stubs (V2/V3 licences gated)
      fleet_management/                       🟡 module exists
    services/
      communications/                         🟡 module exists
      intelligence/                           🟡 module exists (Azure DI integration deferred)
      location/                              🟡 module exists
      payments/                              🟡 module exists (Stripe deferred)
      storage/                               🟡 module exists (Azure Blob deferred)
    gateways/
      public_api/                            🟡 marker endpoint only
      admin_api/                             🟡 marker endpoint only
      webhook_receiver/                      🟡 marker endpoint only
  tests/
    test_smoke.py                            ✅ Money + ULID + health + router-mount tests
```

**Translation:** the skeleton is in place and CI/deploy/health all work. The actual business logic in each module is **not yet written**. That's days 2–13 of `rebuild-erd.md` §8.

---

## The plan (and where we are in it)

Source: `docs/architecture/rebuild-erd.md` §8.

| Day | Deliverable | Status |
|---|---|---|
| **1** | Wipe + scaffold + DB rebuild + health green | ✅ **DONE 2026-05-02** |
| 2–3 | `core` JWT/passwords + `platform/countries` + `platform/identity` (auth flows, OTP via Twilio Verify, sessions, KYC docs CRUD) | ⏸ next |
| 4–5 | `platform/inventory` + `platform/pricing` (vehicle CRUD, image upload to Azure Blob, rate cards, quote endpoint) | ⏸ |
| 6–7 | `products/rental` happy path (booking → quote → submit → admin confirm → lease). Outbox worker live. | ⏸ |
| 8–9 | `platform/billing` + `services/payments` (invoice generation, Stripe PaymentIntent, deposit charge, monthly milestone billing) | ⏸ |
| 10–11 | `services/intelligence` + KYC review (Azure DI, admin approve/reject) | ⏸ |
| 12–13 | `services/communications` (Twilio SMS, SendGrid, WhatsApp) — outbox subscribers wired | ⏸ |
| 14–17 | Customer Next.js app rebuilt (trilingual + RTL from day 1) | ⏸ |
| 18–21 | Admin Next.js app rebuilt | ⏸ |
| 22–25 | Reporting endpoints, Bicep reconciliation, Lighthouse pass, smoke | ⏸ |
| 26+ | Reseed fleet, RTA licence cutover, go-live | ⏸ |

**6 calendar weeks** to relaunch parity from 2026-05-02 (4 weeks compressed work + buffer).

---

## Open architectural decisions (D1–D7 from `rebuild-erd.md` §7)

These are **defaults** that ship unless overridden. None are blocking; flag any you want changed.

| # | Decision | Default |
|---|---|---|
| D1 | Pricing snapshot vs rate-card lookup | Snapshot at lease creation |
| D2 | OTP table when Twilio Verify is the prod path | Keep table as request log; `code_hash` null when provider = `TWILIO_VERIFY` |
| D3 | Multi-currency now or later | Schema ready; no FX in V1, reports group by currency |
| D4 | Soft-delete scope | Only `parties` (covers customers + organizations) and `users`. Everything else state-machined |
| D5 | Outbox worker — same Container App or sidecar | In-process for V1; sidecar in V1.5 |
| D6 | Stripe vs Checkout.com vs PayTabs | Stripe PaymentIntent for V1; Checkout.com as second provider in V1.1 |
| D7 | Admin email | Clean to `admin@origin-auto.ae` with forced reset on first login. Bootstrap via env var on first deploy. |

---

## V1 lessons baked in as defaults (not bolted on)

These were audit findings against the v0 code (issues #135–#139). In V1 they are simply **the way things are**:

- JWT signed with **PyJWT** (HS256, ≥16-char secret) — not `python-jose`
- HttpOnly cookies, TTL aligned with backend JWT, auto-refresh on 401
- Stripe amounts derived **server-side** from booking — never trusted from client
- KYC review gated to `SALES`, not `FLEET_MANAGER`
- Production refuses to start without `AZURE_STORAGE_BLOB_ENDPOINT` set
- Per-IP rate limiting on auth endpoints by default
- `X-Request-ID` middleware → outbox `correlation_id` → comms `correlation_id` → audit/error `request_id`
- `Money` is `(amount_minor BIGINT, currency_code CHAR(3))` everywhere — never floats, never implicit AED
- `country_id` is a first-class FK on every transactional row (multi-country from day 0)
- Denormalisation rule: source of truth is the source table; one-writer policy for any denormalised timestamp; nightly reconciliation
- Outbox payload contract: 8 KB hard cap, denormalised for subscribers (not full row snapshots)
- PDPL consent audit trail via the `consents` table from day 1 (not just `marketing_opt_in` boolean)
- `PHEV ≠ HYBRID` in customer filters; `HYBRID` = HEV (non-plug-in)

---

## Pre-rebuild backup

The pre-rebuild codebase is preserved as **commit `e296ff9`**:
- GitHub: https://github.com/maximumeffort/origin/commit/e296ff9
- Tree browse: https://github.com/maximumeffort/origin/tree/e296ff9
- Local: `git checkout e296ff9` from any clone

A friendly tag `pre-rebuild-2026-05-02` was created locally pointing to the same commit but **was not pushed** (the sandbox session lacked write-tag permission). To create the tag on GitHub:

```bash
git fetch origin
git tag pre-rebuild-2026-05-02 e296ff9
git push origin pre-rebuild-2026-05-02
```

This is optional — the commit ref is the actual backup. The tag is just convenient navigation.

---

## How to pick this up (concrete commands)

### Smoke-test the live backend
```bash
curl -s https://api.origin-auto.ae/health/ready
# expect: {"status":"ready"}

curl -s https://api.origin-auto.ae/api/v1/
# expect: {"surface":"public","version":"v1"}
```

### Watch the most recent CI / deploy run
```bash
# Requires a fine-grained PAT with Actions:Read on the repo, set as $GITHUB_TOKEN.
gh run list --repo maximumeffort/origin --limit 5
gh run watch --repo maximumeffort/origin
```

Or via the REST API:
```bash
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/maximumeffort/origin/actions/runs?branch=main&per_page=3" \
  | jq -r '.workflow_runs[] | "\(.name) #\(.run_number) sha=\(.head_sha[0:7]) \(.status) \(.conclusion // "—")"'
```

### Trigger a backend redeploy (no code change)
Push any commit touching `apps/backend/**`. Workflow `deploy-azure-backend.yml` handles ACR build + migrations Container App Job + revision roll.

### Inspect the migration job
```bash
az containerapp job show -n caj-origin-migrations -g rg-origin-prod-uaenorth \
  --query 'properties.template.containers[0].{image:image, command:command, args:args}'

# Latest 3 executions
az containerapp job execution list -n caj-origin-migrations -g rg-origin-prod-uaenorth \
  --query "sort_by([], &properties.startTime) | [-3:].{name:name, status:properties.status, start:properties.startTime}" \
  -o table
```

### Inspect container logs (Log Analytics)
```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  -n log-origin-prod-uaenorth -g rg-origin-prod-uaenorth --query customerId -o tsv)

# API container
az monitor log-analytics query --workspace "$WORKSPACE_ID" \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'ca-origin-backend-prod' | where TimeGenerated > ago(30m) | project TimeGenerated, Log_s | order by TimeGenerated desc | take 100" \
  -o tsv

# Migration job
az monitor log-analytics query --workspace "$WORKSPACE_ID" \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerJobName_s == 'caj-origin-migrations' | where TimeGenerated > ago(2h) | project TimeGenerated, Log_s | order by TimeGenerated desc | take 200" \
  -o tsv
```

### Connect to the production DB
```bash
DATABASE_URL=$(az containerapp secret show -n ca-origin-backend-prod -g rg-origin-prod-uaenorth \
  --secret-name database-url --query value -o tsv)

psql "$DATABASE_URL" -c '\dt'
psql "$DATABASE_URL" -c "SELECT * FROM countries;"
```

### Set / rotate a secret
```bash
az keyvault secret set --vault-name kv-origin-prod-uaenorth \
  --name "STRIPE-SECRET-KEY" --value "sk_live_..."
# Container App auto-references it on next revision.
```

---

## Recent commits (chronological, most recent first)

```
587da4a  fix(backend): install libatomic1 + nodejs in image; pre-generate Prisma at build  ← V1 LIVE
0b067ef  fix(backend): ruff check + format clean
5c96e45  fix(backend): drop @db.Decimal entirely — prisma-client-py rejects the modifier itself
303dbe9  fix(backend): unblock prisma generate (Decimal → Float)
ecb09bc  fix(backend): treat as application not package — drop hatchling, use PYTHONPATH
63cff2d  fix(ci+deploy): unblock V1 genesis pipeline
923d014  feat: Phase B genesis — wipe v0 codebase, scaffold V1 modular backend
e02a608  docs(architecture): rebuild ERD v0.5 — input normalization, country-coded BK ref, blob path convention
e9d7f2c  docs(architecture): rebuild ERD v0.4 — session rotation, soft-delete invariant, enum clarifiers
fb3355b  docs(architecture): rebuild ERD v0.3 — consents, correlation_id, vehicle_images country
ad89fbe  docs(architecture): rebuild ERD v0.2 — party model, payments.kind, denormalization rule
7fb59be  docs(architecture): rebuild ERD + module boundaries draft
e296ff9  Implement Modular Boundaries for Enterprise Country Foundation  ← PRE-REBUILD BACKUP
```

---

## Stale documents

The following pre-rebuild docs carry a banner at the top pointing back to this file. Read with that context — they describe v0:

- `docs/architecture.md`
- `docs/api-design.md`
- `docs/api-integration-guide.md`
- `docs/data-model.md` *(superseded by `docs/architecture/rebuild-erd.md`)*
- `docs/integrations.md`
- `docs/launch-checklist.md`
- `docs/n8n-setup.md`
- `docs/runbooks/azure-cutover.md` *(historical — cutover already happened)*
- `docs/uae-infrastructure-setup.md` *(superseded by ADR-0001)*
- `docs/full-audit-2026-04-03.md` *(point-in-time audit; do not act on it)*

These are kept for historical reference but should not be used to decide what to build. **`docs/architecture/rebuild-erd.md` v0.5 is the design source of truth.**

---

## Notes for the next session

- **Day 2 of `rebuild-erd.md` §8 is the immediate next step.** Auth backbone (`core` JWT/passwords + `platform/identity` service + auth gateways).
- **Bootstrap admin user** isn't in the DB yet. The first deploy after Day 2 should include a one-shot mechanism (recommendation: env-var-driven seed in `lifespan` if no admin user exists).
- **No outbox worker is running yet.** `outbox.enqueue()` writes events; nothing drains them. Wire the worker in Day 6–7 with `products/rental`.
- **No real Twilio/Stripe/SendGrid/Azure Blob/Document Intelligence credentials are set in Key Vault.** Day 2+ services will use a `LOCAL` fallback path (codes returned in dev response, blobs stubbed) until real keys land.
- **Frontends will fail to redeploy on Vercel** until rebuilt in days 14–21. The previous deployment serves as the public face, and it's calling dead `/v1/*` endpoints. Acceptable for the rebuild window per the user's "I don't care if the websites go down" sign-off.
- **`docs/STATUS.md` was 3+ days stale before today.** The previous version was a v0 tracker that no longer matched reality. Refresh this file at the end of every working day, or whenever a major piece lands.
