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
│   ├── storage.bicep               Storage account + private kyc-documents + public vehicle-imagery
│   ├── postgres.bicep              Postgres Flexible Server, B1ms, 32 GB
│   ├── containerregistry.bicep     Basic ACR
│   └── containerapp.bicep          Container App Environment + Container App, managed identity, KV refs
└── parameters/
    └── prod.bicepparam             Tier 1 parameter values
```

Document Intelligence is **not** in this skeleton; it'll land in the KYC OCR feature PR
(separate ADR, separate module). Front Door is deferred per ADR-0001.

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

## After first deploy — populate the rest of Key Vault

The Bicep creates Key Vault with the foundational secrets. Twilio / SendGrid / Stripe etc. have to be set manually (we don't want them in source):

```powershell
$kv = "kv-origin-prod-uaenorth"

az keyvault secret set --vault-name $kv --name "TWILIO-ACCOUNT-SID"      --value "<value>"
az keyvault secret set --vault-name $kv --name "TWILIO-AUTH-TOKEN"        --value "<value>"
az keyvault secret set --vault-name $kv --name "TWILIO-VERIFY-SERVICE-SID" --value "<value>"
az keyvault secret set --vault-name $kv --name "SENDGRID-API-KEY"         --value "<value>"
az keyvault secret set --vault-name $kv --name "SENDGRID-FROM-EMAIL"      --value "noreply@origin-auto.ae"
az keyvault secret set --vault-name $kv --name "SENDGRID-FROM-NAME"       --value "Origin"
az keyvault secret set --vault-name $kv --name "STRIPE-SECRET-KEY"        --value "<value>"
az keyvault secret set --vault-name $kv --name "STRIPE-WEBHOOK-SECRET"    --value "<value>"
# DATABASE-URL initially still points at Supabase during parallel-deploy phase.
# After data migration, update it to the Azure Postgres URL.
az keyvault secret set --vault-name $kv --name "DATABASE-URL" --value "<supabase or azure pg url>"
az keyvault secret set --vault-name $kv --name "DIRECT-URL"   --value "<direct postgres url>"
```

Re-deploy to make the Container App pick up new secrets:

```powershell
az containerapp revision restart --name ca-origin-backend-prod --resource-group rg-origin-prod-uaenorth
```

## Updating the image after CI builds it

The Container App is created with a placeholder hello-world image. Once the CI workflow
(see `.github/workflows/deploy-azure-backend.yml` — coming in a separate PR) pushes the
real FastAPI image to ACR, redeploy with:

```powershell
az containerapp update `
  --name ca-origin-backend-prod `
  --resource-group rg-origin-prod-uaenorth `
  --image acroriginprod.azurecr.io/origin-backend:latest
```

## Known caveats / honest disclaimers

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
  the CI workflow once that lands.

## Cost on first deploy

Per ADR-0001 Tier 1: **~$36/mo**. Postgres B1ms ($16) is the biggest single line; the
rest is small. Founders Hub credits cover this for ~28 months.
