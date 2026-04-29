# ADR-0001: Migrate backend infrastructure to Azure UAE North

**Status:** Accepted — executed 2026-04-26 → 2026-04-29. All five phases complete. See `docs/STATUS.md` for live state.
**Date:** 2026-04-26 (proposed) · 2026-04-29 (executed)
**Deciders:** Amr (Engineering), Bella Ma (GM, MENA Region)
**Related:** issues #21 (UAE migration), #49 (Bahrain → UAE), #50 (UAE provider eval)

---

## Context

Origin's backend currently runs on **Railway (US West)** with **Supabase EU Central** as the Postgres host. This worked for development but has three serious problems for V1 launch:

1. **PDPL non-compliance.** UAE Federal Decree-Law No. 45 of 2021 requires personal data to be processed inside the UAE unless cross-border transfer is justified by specific exemptions. Customer KYC documents (Emirates ID, driving licence, passport) are squarely in scope. Operating with US-hosted compute and EU-hosted DB at launch is a regulatory risk we cannot accept once real customers register.
2. **Trial credit running out.** Railway trial credits expire in ~4 days. The Hobby plan ($5/mo) is fine as a stopgap but isn't where we want to live.
3. **AWS UAE has been unusable.** Issue #49 was opened to migrate to AWS `me-central-1` once capacity stabilized. As of this ADR, `RunInstances` is still being throttled in the region with no AWS Health Dashboard ETA. AWS Bahrain (`me-south-1`) doesn't satisfy "data in UAE" for PDPL purposes and is also exhibiting reliability issues.

We have **Microsoft for Startups Founders Hub credits** active — $1,000 unlocked, $5,000 standard tier in review. This unblocks the migration on a budget that would otherwise be a real constraint pre-revenue.

### Constraints

- **Time:** target migration cutover **before public launch** (alongside RTA Fleet Operator Licence). 4–8 weeks.
- **Budget pre-launch:** stay inside Founders Hub credit pool. Realistic cap: $50/mo of Azure spend until launch.
- **Team size:** 1 engineer (Amr) + GM oversight. Operational complexity matters — fewer moving parts wins.
- **Stack lock-in:** FastAPI Python 3.12, Prisma Python, Postgres, Docker. Anything that re-platforms us off this stack is out.
- **Disaster recovery:** acceptable RPO 24h, RTO 4h for V1. Tighten post-launch.

### Non-functional requirements

- **Region affinity:** UAE-located primary region required (PDPL).
- **Compliance posture:** ISO 27001, SOC 2 Type II, GDPR, and a published PDPL stance from the provider.
- **Observability:** centralized logs + traces + alerts.
- **Secrets:** never in source, never in plaintext env vars on the host.
- **CI/CD:** push-to-main auto-deploys, with rollback in <5 min.

---

## Decision

**Migrate the production backend to Azure UAE North** using a managed-services-first topology:

| Concern | Service | Tier (V1) |
|---|---|---|
| Compute | **Azure Container Apps** | Consumption + Dedicated mix, 0.5 vCPU / 1 GB |
| Database | **Azure Database for PostgreSQL Flexible Server** | Burstable B1ms, 32 GB |
| Object storage | **Azure Blob Storage** | Standard, Hot tier, private container w/ SAS |
| Secrets | **Azure Key Vault** | Standard |
| Container registry | **Azure Container Registry** | Basic |
| Document OCR | **Azure AI Document Intelligence** | S0 (pay-per-page) |
| Observability | **Application Insights + Log Analytics** | Pay-as-you-go (5 GB/mo free) |
| Custom domain / WAF | **Azure Container App built-in custom domain** | Free initially. Upgrade to **Front Door Standard** post-launch when WAF + global routing matter. |
| Identity | **System-assigned Managed Identity** | — |

The customer + admin Vercel projects stay on Vercel (already there, working, no PDPL gap because they only render — they don't process customer data themselves). They simply repoint `NEXT_PUBLIC_API_URL` to `https://api.origin-auto.ae` after cutover.

Frontend infrastructure decisions are out of scope for this ADR.

---

## Options Considered

### Option A: Status quo — Railway US + Supabase EU

| Dimension | Assessment |
|---|---|
| Complexity | Low (already running) |
| Cost | $0–$10/mo on Hobby |
| PDPL compliance | **Fails** — no UAE residency story |
| Scalability | Sufficient for V1 |
| Lock-in | Moderate (Railway proprietary deploy) |

**Pros:** Zero migration effort. Already working.
**Cons:** Cannot launch publicly without addressing PDPL. Railway's UAE region is not on their roadmap. Supabase has no UAE region. Effectively a dead-end for a UAE-licenced operator.

### Option B: AWS me-central-1 (UAE region)

| Dimension | Assessment |
|---|---|
| Complexity | Medium (ECS Fargate + RDS + S3 + Secrets Manager) |
| Cost | ~$50–$80/mo at V1 sizing |
| PDPL compliance | Pass — UAE region |
| Scalability | Excellent |
| Reliability **today** | **Failing** — `RunInstances` throttled, ongoing |

**Pros:** Mature platform, broadest service catalog, our team's most familiar cloud.
**Cons:** The region is currently unusable. We'd be betting our launch date on AWS resolving capacity, with no committed timeline. Even if it stabilizes, we have no Founders-Hub-equivalent credit pool on AWS.

### Option C: Azure UAE North (recommended)

| Dimension | Assessment |
|---|---|
| Complexity | Medium (Container Apps + Postgres Flex + Blob + Key Vault) |
| Cost | ~$36/mo Tier 1, fully covered by Founders Hub credit |
| PDPL compliance | Pass — UAE region, published PDPL stance |
| Scalability | Excellent |
| Capacity **today** | Available |
| Credit alignment | **$1K immediate + $5K in review** — Tier 1 covered ~28 months |

**Pros:** Region available now. Credits cover V1 entirely. Container Apps is a clean drop-in for our existing Dockerfile (no app-code changes). Azure AI Document Intelligence is a strong match for KYC OCR — the same region as Postgres, which keeps document data in-region end-to-end.
**Cons:** Slightly higher friction than AWS for the team. Bicep is new for us. Some first-week ramp cost on Azure-isms.

### Option D: G42 Cloud (UAE sovereign)

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | Quote-based; typically more expensive than hyperscalers |
| PDPL compliance | Strongest possible (sovereign cloud) |
| Service catalog | Narrower; fewer managed services |
| Tooling maturity | Weaker docs, smaller community |
| Onboarding | Sales-led, slower |

**Pros:** Best optics for an Abu Dhabi-licenced entity. Government-backed. Genuine UAE sovereignty.
**Cons:** Onboarding takes weeks, not hours. No usable free/credit programme equivalent to Founders Hub. Building the same managed Postgres / object storage / secrets / OCR stack would be substantially more work and likely require self-managed components. Disproportionate operational overhead for a 1-engineer pre-revenue team.

### Option E: Oracle Cloud Abu Dhabi

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Generous always-free tier |
| PDPL compliance | Pass — Abu Dhabi region |
| Service catalog | Mature, but quirky (OCI vs hyperscaler norms) |
| Team familiarity | Low |
| Credit alignment | Always-free + $300 trial |

**Pros:** Real Abu Dhabi region. Strong free tier. OCI Database Service for Postgres is solid.
**Cons:** Smallest community/docs of the three viable UAE options. We'd be the only team in our circle on OCI. Higher debugging cost for unfamiliar tooling.

---

## Trade-off Analysis

The decision reduces to two real candidates: **Azure UAE North** and **Oracle Cloud Abu Dhabi**, with AWS removed by current capacity reality and G42 removed by operational friction.

The deciding factor is **velocity to launch**. Azure has:
- A documented $1K/$5K credit programme that's already approved
- Container Apps as a near-zero-effort path from our existing Dockerfile
- Document Intelligence as a first-party OCR service in the same region as our DB (Oracle would require third-party OCR)
- The most accessible documentation, tutorials, and AI tooling

Oracle would save money long-term ($0 always-free tier), but the team friction over the first 4 weeks (when we're trying to ship a launch) outweighs the credit savings. We can revisit Oracle for a **secondary read-replica region or DR region** once we've launched.

**Cost summary at V1 sizing (Tier 1):**

| Service | $/mo |
|---|---|
| Container App (0.5 vCPU / 1 GB, ~always-on) | ~$13 |
| Postgres Flex B1ms (32 GB SSD, 7-day PITR) | ~$16 |
| Blob Storage (~20 GB Hot + minor ops) | <$1 |
| Key Vault | ~$1 |
| Container Registry Basic | ~$5 |
| Application Insights (5 GB free + small overflow) | ~$5 |
| Document Intelligence (negligible until KYC volume ramps) | $0–$5 |
| Egress (under 100 GB free) | $0 |
| **Total** | **~$36–$40** |

Founders Hub $1K covers ~28 months at this rate. After standard-tier $5K lands, ~10 years of Tier 1. We will not run out of credits before launch.

---

## Resource topology

```
Region: uaenorth (Dubai)
└── rg-origin-prod-uaenorth
    ├── Identity & Secrets
    │   ├── kv-origin-prod-uaenorth          (Key Vault)
    │   └── (Container App's system-assigned managed identity)
    │
    ├── Data
    │   ├── pg-origin-prod-uaenorth          (Postgres Flex B1ms)
    │   │   └── private endpoint in vnet-origin-prod
    │   └── stororiginproduaenorth           (Storage Account)
    │       ├── kyc-documents/               (private, SAS-only)
    │       └── vehicle-imagery/             (read-public CDN-backed)
    │
    ├── Compute
    │   ├── acroriginprod                    (Container Registry Basic)
    │   ├── cae-origin-prod-uaenorth         (Container App Environment)
    │   │   └── log-origin-prod-uaenorth     (Log Analytics workspace)
    │   └── ca-origin-backend-prod           (Container App)
    │       ├── ingress: external, port 3001
    │       ├── min replicas: 1, max: 3
    │       └── secrets pulled from Key Vault via managed identity
    │
    ├── AI
    │   └── di-origin-prod-uaenorth          (Document Intelligence S0)
    │
    └── Observability
        └── ai-origin-prod-uaenorth          (Application Insights, attached to log workspace)

Custom domain:
  api.origin-auto.ae  →  ca-origin-backend-prod (Container App ingress, TLS via Azure-managed cert)
```

We **defer Front Door** to post-launch. Reasons:
- Container Apps already terminate TLS on the custom domain.
- Front Door adds ~$35/mo + bandwidth.
- We don't yet have multiple regions to route between.
- WAF can come later when we have the customer-facing traffic to justify it.

We **defer VNet integration with private endpoints** to post-launch unless required by audit. Initial setup uses Postgres firewall rules + Container App outbound IP allowlist. Reduces V1 complexity meaningfully.

---

## Naming convention

| Resource type | Pattern | Example |
|---|---|---|
| Resource group | `rg-{app}-{env}-{region}` | `rg-origin-prod-uaenorth` |
| Container App env | `cae-{app}-{env}-{region}` | `cae-origin-prod-uaenorth` |
| Container App | `ca-{app}-{component}-{env}` | `ca-origin-backend-prod` |
| Container Registry | `acr{app}{env}` (no dashes, lowercase, ≤50) | `acroriginprod` |
| Postgres Flex | `pg-{app}-{env}-{region}` | `pg-origin-prod-uaenorth` |
| Storage Account | `stor{app}{env}{region}` (no dashes, lowercase, ≤24) | `stororiginproduaenorth` |
| Key Vault | `kv-{app}-{env}-{region}` | `kv-origin-prod-uaenorth` |
| Document Intelligence | `di-{app}-{env}-{region}` | `di-origin-prod-uaenorth` |
| Log Analytics | `log-{app}-{env}-{region}` | `log-origin-prod-uaenorth` |
| Application Insights | `ai-{app}-{env}-{region}` | `ai-origin-prod-uaenorth` |

**Tags applied to all resources:**

```
env: production
app: origin
owner: amr.sarhan52@gmail.com
cost-center: shanghai-car-rental-llc
managed-by: bicep
```

---

## Infrastructure as Code

**Choice: Bicep, in `infra/` at repo root.**

Why Bicep over Terraform:
- First-party Azure tooling, fewer moving parts than `azurerm` provider versioning.
- Azure-only stack today. The cross-cloud benefit Terraform offers isn't relevant.
- Resource state lives in Azure Resource Manager, so we don't need a remote state backend.
- Smaller learning curve for a team new to IaC.

Why Bicep over click-ops:
- Reproducibility for staging/preview environments later.
- Diff in PRs.
- Disaster-recovery rebuild from source.

Layout:

```
infra/
├── main.bicep                  # parent module — references all others
├── modules/
│   ├── keyvault.bicep
│   ├── postgres.bicep
│   ├── storage.bicep
│   ├── containerapp.bicep
│   ├── docintel.bicep
│   └── observability.bicep
├── parameters/
│   └── prod.bicepparam         # tier sizing per env
└── README.md
```

Deployment via GitHub Actions on `main` push touching `infra/**` (or manual `workflow_dispatch`).

---

## CI/CD

Two new GitHub Actions workflows replace the current Railway flow:

### `.github/workflows/deploy-azure-infra.yml`
- Trigger: push to `main` touching `infra/**`, or manual.
- Steps: az login (OIDC, no long-lived secret), `az deployment group create` against `main.bicep`.

### `.github/workflows/deploy-azure-backend.yml`
- Trigger: push to `main` touching `apps/backend/**`.
- Steps: az login → docker build → docker push to ACR → `az containerapp update --image …`.
- Replaces `.github/workflows/deploy-backend.yml` (the Railway one) at cutover.

Federated credentials (no `AZURE_CREDENTIALS` JSON secret) — GitHub-OIDC service principal with **Contributor** at the resource-group scope only.

---

## Cutover plan

Five phases, ordered by reversibility (most reversible first):

**Phase 1 — Provision infrastructure (no traffic).** Land the Bicep + GitHub Actions; provision all resources in UAE North. Container App runs the FastAPI image but with `DATABASE_URL` still pointed at Supabase. Smoke-test `*.azurecontainerapps.io/health/ready`. **Reversible:** delete the resource group, no production impact.

**Phase 2 — Parallel deploy.** Both Railway and Azure deploy on every push to `main`. Vercel still points at Railway. Watch for divergence in logs / errors for 1 week. **Reversible:** disable Azure workflow, no production impact.

**Phase 3 — Data migration.** Quiet-window `pg_dump` from Supabase → `pg_restore` to Azure Postgres. Validate row counts and a sample of business records. Update Container App `DATABASE_URL` → Azure Postgres. Container App still on a `*.azurecontainerapps.io` URL; Vercel still points at Railway. Real users still hit Railway/Supabase. **Reversible:** flip Container App `DATABASE_URL` back to Supabase.

**Phase 4 — DNS cutover.** Bind `api.origin-auto.ae` to the Container App. Update Vercel `NEXT_PUBLIC_API_URL` to `https://api.origin-auto.ae/v1` on both customer and admin projects. Vercel auto-redeploys. Real customer traffic now hits Azure UAE North end-to-end. **Reversible** within DNS TTL (~1h) by repointing the subdomain back to Railway URL.

**Phase 5 — Decommission Railway.** Wait 7 days post-cutover. Confirm zero Railway traffic. Disable the Railway workflow, then delete the Railway service. **Last reversible step** — once we delete Railway state, we're committed.

A separate runbook (`docs/runbooks/azure-cutover.md`) will hold the exact commands per phase.

---

## Consequences

### What becomes easier
- **PDPL compliance** is in a defensible posture. Customer KYC docs, profile data, and booking history are all in UAE North.
- **Cost predictability** improves — Founders Hub credits are a known pool with known burn.
- **AI features unlock** — Azure Document Intelligence and Azure OpenAI are first-party services in the same region, simplifying the KYC OCR build (issue #18 prep).
- **Observability** consolidates — Application Insights gives us request traces, dependency maps, and error grouping for free that we don't have today.
- **Disaster recovery story** materializes — Postgres PITR + Bicep IaC means a region rebuild is a few hours, not a week.

### What becomes harder
- **Two clouds during the cutover window.** For 1–2 weeks we operate Railway and Azure in parallel.
- **Bicep ramp-up.** First-week tax of ~1 day to get fluent.
- **Cost visibility per service** is more granular and requires more attention than Railway's single bill.
- **DNS coordination** — `origin-auto.ae` is registered with Etisalat; subdomain CNAME setup requires a coordinated change with whoever holds the registrar credentials (Bella).

### What we'll need to revisit
- **Front Door + WAF** post-launch when we want bot protection and global edge.
- **Multi-region** failover (likely Bahrain or West Europe as warm standby) once revenue justifies the doubled compute cost.
- **Reserved instances / Savings Plans** at the 12-month mark — 30–60% discount on compute and Postgres if we commit.
- **Private endpoints + VNet integration** before any audit (SOC 2, ISO 27001) — V1 firewall-rules-only posture is fine for pre-launch but won't survive an enterprise customer's security questionnaire.
- **Data export tooling** — give customers a self-serve "download my data" path to honor PDPL data-subject-access requests.

---

## Action Items

1. [ ] **Verify Founders Hub Azure subscription is created and $1K credit is applied.** Owner: Amr. Blocks everything below.
2. [ ] **Land this ADR.** Reviewers: Amr (eng), Bella (business sign-off on cost ceiling).
3. [ ] **Create `infra/main.bicep` + module skeletons.** Separate PR.
4. [ ] **Create the two GitHub Actions workflows** (`deploy-azure-infra.yml`, `deploy-azure-backend.yml`) with OIDC federated credential. Separate PR.
5. [ ] **Provision Phase 1** — apply Bicep, smoke-test Container App on `*.azurecontainerapps.io`. Validate `/health/ready` returns 200 with `DATABASE_URL` still on Supabase.
6. [ ] **Run Phase 2 in parallel** for 1 week, monitoring for divergence.
7. [ ] **Coordinate with Bella** to access the Etisalat DNS dashboard for the `api.origin-auto.ae` CNAME at Phase 4.
8. [ ] **Schedule data migration window** with Bella — ideally a Friday evening UAE time when traffic is lowest.
9. [ ] **Write `docs/runbooks/azure-cutover.md`** before Phase 3.
10. [ ] **Apply for the $5K standard tier upgrade** in Founders Hub (separate workflow from this ADR).
11. [ ] **Close issue #50** (UAE provider eval) once this ADR merges, citing this doc as the resolution.
12. [ ] **Update issue #21** (UAE migration) with link to this ADR, set milestone to V1 launch.
13. [ ] **Update `docs/launch-checklist.md`** Section 2 (Infrastructure) to reference this ADR instead of the placeholder Azure section.

---

## Appendix: deferred decisions

These are out of scope for this ADR but will need their own ADRs when the time comes:

- **ADR-0002:** Multi-region strategy (when revenue justifies)
- **ADR-0003:** Private endpoints + VNet topology (before SOC 2 audit)
- **ADR-0004:** Customer file uploads — direct-to-Blob with SAS vs through-backend (will be decided in the KYC OCR feature spec, but worth pulling out as an architecture-level choice)
- **ADR-0005:** Logging retention + redaction policy (PDPL data-subject-access right needs a story for log data too)
