# `infra/` — Bicep for Azure UAE North production

Implements ADR-0001 (`docs/adr/0001-azure-uae-north-architecture.md`).
Provisions the Origin backend stack in `uaenorth` (Dubai).

## What's in here

```
infra/
├── README.md                       (this file)
├── main.bicep                      Subscription-scope entry point. Creates the RG, calls modules.
├── modules/
│   ├── observability.bicep         Log Analytics workspace + Application Insights
│   ├── keyvault.bicep              Key Vault (RBAC mode, no access policies)
│   ├── storage.bicep               Storage account + private kyc-documents + public vehicle-imagery + kyc-ocr-raw
│   ├── postgres.bicep              Postgres Flexible Server, B1ms, 32 GB
│   ├── containerregistry.bicep     Basic ACR
│   ├── containerapp.bicep          Container App Environment + Container App, managed identity, KV refs, ACR registry auth
│   ├── acr-roles.bicep             AcrPull role assignment for Container App MI → ACR
│   ├── docintel.bicep              Azure Document Intelligence S0 (ADR-0002)
│   └── docintel-roles.bicep        Cognitive Services User + Storage Blob roles for DI (ADR-0002)
├── parameters/
│   └── prod.bicepparam             Tier 1 parameter values
└── scripts/
    ├── setup-github-oidc.ps1       One-time OIDC federated credential setup
    └── migrate-db.sh               Supabase → Azure PG data migration (Phase 3)
```

Front Door is deferred per ADR-0001.

## Prerequisites (one-time, on your machine)

1. **Install the Azure CLI:** https://learn.microsoft.com/cli/azure/install-azure-cli-windows
2. **Log in:**
   ```powershell
   az login
   az account set --subscription "5edcba8f-db66-402d-86a3-d8b0a06c7655"
   ```
3. **Install the Bicep CLI** (Azure CLI bundles it; just confirm):
   ```powershell
   az bicep version
   ```
4. **Pick a Postgres admin password** and a JWT secret pair. You'll be prompted at deploy time. Use a password manager — these get stored in Key Vault and you should never need to type them again after first deploy.

## First deploy

```powershell
cd infra

# Lint + what-if (preview only — no resources created)
az deployment sub what-if `
  --location uaenorth `
  --template-file main.bicep `
  --parameters parameters/prod.bicepparam

# Apply
az deployment sub create `
  --location uaenorth `
  --template-file main.bicep `
  --parameters parameters/prod.bicepparam
```

You'll be prompted for:
- `postgresAdminPassword` — set a strong one, store in your password manager
- `jwtSecret`, `jwtRefreshSecret` — generate with `[Convert]::ToBase64String((1..32 | %{Get-Random -Maximum 256}))`

Postgres creation takes 10–20 min; everything else is sub-2-min. Total deploy: **~15–25 min**.

## After first deploy — populate secrets

The Bicep creates Key Vault with the foundational secrets (JWT, CORS). Integration secrets have to be set manually:

```powershell
$kv = "kv-origin-prod-uaenorth"

az keyvault secret set --vault-name $kv --name "TWILIO-ACCOUNT-SID"        --value "<value>"
az keyvault secret set --vault-name $kv --name "TWILIO-AUTH-TOKEN"          --value "<value>"
az keyvault secret set --vault-name $kv --name "TWILIO-VERIFY-SERVICE-SID" --value "<value>"
az keyvault secret set --vault-name $kv --name "SENDGRID-API-KEY"           --value "<value>"
az keyvault secret set --vault-name $kv --name "SENDGRID-FROM-EMAIL"        --value "noreply@origin-auto.ae"
az keyvault secret set --vault-name $kv --name "SENDGRID-FROM-NAME"         --value "Origin"
az keyvault secret set --vault-name $kv --name "STRIPE-SECRET-KEY"          --value "<value>"
az keyvault secret set --vault-name $kv --name "STRIPE-WEBHOOK-SECRET"      --value "<value>"
```

Set the database URL (initially Supabase during parallel-deploy, then Azure PG after migration):

```powershell
az containerapp secret set `
  --name ca-origin-backend-prod `
  --resource-group rg-origin-prod-uaenorth `
  --secrets `
    database-url="<postgres-url>" `
    direct-url="<postgres-url>"
```

Restart to pick up new secrets:

```powershell
az containerapp revision restart --name ca-origin-backend-prod --resource-group rg-origin-prod-uaenorth
```

## CI/CD workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-azure-infra.yml` | Push to `infra/**` on main, or manual | Runs `az deployment sub create` with Bicep |
| `deploy-azure-backend.yml` | Push to `apps/backend/**` on main, or manual | Builds Docker image via ACR, updates Container App, runs Prisma migrations |

Both use OIDC federated credentials — no long-lived Azure secrets in GitHub.

The old Railway workflow (`deploy-backend.yml`) has been decommissioned.

## Database migration (Supabase → Azure PG)

See `infra/scripts/migrate-db.sh` and `docs/runbooks/azure-cutover.md` for the full procedure.

## Known caveats

- This Bicep is a **skeleton, not battle-tested**. The first `az deployment sub create`
  will likely surface 1–2 errors — usually around resource name uniqueness (Storage
  Account names are globally unique) or RBAC role assignment ordering. Iterate from real
  error messages.
- **Postgres firewall rules** are set permissively at first deploy (allow all Azure
  services). Tighten to specific Container App outbound IPs once that's measured.
- **No private endpoints / VNet integration** in this skeleton (deferred per ADR-0001).
  Adequate for V1, must change before any SOC 2 audit.
- **No Front Door / WAF** (deferred per ADR-0001). Custom domain will bind directly to
  the Container App ingress.
- **Container App uses placeholder image** on first deploy. The real image flows in via
  the CI workflow on first `apps/backend/**` push.

## Cost on first deploy

Per ADR-0001 Tier 1: **~$36/mo**. Postgres B1ms ($16) is the biggest single line; the
rest is small. Founders Hub credits cover this for ~28 months.
