# `infra/` — Bicep for Azure UAE North production

Implements ADR-0001 (`docs/adr/0001-azure-uae-north-architecture.md`).
Provisions the Origin backend stack in `uaenorth` (Dubai).

## What's in here

```
infra/
├── README.md                       (this file)
├── main.bicep                      Subscription-scope entry point. Creates the RG, calls modules.
├── modules/
│   ├── observability.bicep         Log Analytics workspace + Application Insights         [wired]
│   ├── keyvault.bicep              Key Vault (RBAC mode, no access policies)              [wired]
│   ├── storage.bicep               Storage account + KYC + vehicle imagery + kyc-ocr-raw  [wired]
│   ├── postgres.bicep              Postgres Flexible Server, B1ms, 32 GB                  [wired]
│   ├── containerregistry.bicep     Basic ACR                                              [wired]
│   ├── containerapp.bicep          Container App Environment + Container App + KV refs   [wired]
│   ├── docintel.bicep              Document Intelligence S0 (KYC OCR — ADR-0002)         [⚠ orphan]
│   ├── docintel-roles.bicep        Cognitive Services User + Storage role assignments    [⚠ orphan]
│   └── acr-roles.bicep             AcrPull for Container App MI                          [⚠ orphan]
└── parameters/
    └── prod.bicepparam             Tier 1 parameter values + CORS allow-list
```

> **Bicep ↔ Azure drift, post-launch tech debt.** Document Intelligence, ACR role
> assignments, and DI role assignments **are live in Azure** (provisioned via CLI during
> the rapid migration). The corresponding Bicep modules exist on disk but are **not
> wired** from `main.bicep` because each one surfaced a drift error when re-applied
> against the live state (resource-name conflicts, role-GUID stability, deployment-script
> ordering). PR #145 deliberately removed them from `main.bicep` and disabled the
> auto-trigger on `deploy-azure-infra.yml` so a casual `git push` to `main` will not
> attempt to reconcile. Reconciliation work is tracked in `docs/STATUS.md` and should be
> done after V1 launch — `az resource show` each live resource, diff against the module,
> adjust the template, then re-wire one at a time. Front Door is still deferred per
> ADR-0001.

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

The Container App was created with a placeholder hello-world image on first deploy.
The CI workflow `.github/workflows/deploy-azure-backend.yml` now builds + pushes the
real FastAPI image to ACR on every push to `main` that touches `apps/backend/**`. To
deploy a specific tag manually:

```powershell
az containerapp update `
  --name ca-origin-backend-prod `
  --resource-group rg-origin-prod-uaenorth `
  --image acroriginprod.azurecr.io/origin-backend:latest
```

## Known caveats / honest disclaimers

- **Template ↔ live drift.** Several resources (Document Intelligence, ACR role
  assignments, Storage CORS rules) currently exist in Azure but are not represented in
  the wired Bicep tree. See the orphan-modules note above. Reconciling is post-launch
  tech debt.
- **`deploy-azure-infra.yml` is manual-dispatch only.** The `push:` trigger was removed
  in PR #145 to prevent drift errors from the orphan modules from blocking unrelated
  pushes. Run via the GitHub Actions tab when you want to apply Bicep.
- **Postgres firewall rules** are set permissively (allow all Azure services). Tighten
  to specific Container App outbound IPs once that's measured.
- **No private endpoints / VNet integration** (deferred per ADR-0001). Adequate for V1,
  must change before any SOC 2 audit.
- **No Front Door / WAF** (deferred per ADR-0001). Custom domain `api.origin-auto.ae`
  binds directly to the Container App ingress.

## Cost on first deploy

Per ADR-0001 Tier 1: **~$36/mo**. Postgres B1ms ($16) is the biggest single line; the
rest is small. Founders Hub credits cover this for ~28 months.
