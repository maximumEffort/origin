# Runbook: Azure UAE North Cutover

Implements the five-phase cutover plan from [ADR-0001](../adr/0001-azure-uae-north-architecture.md).

**Owner:** Amr (Engineering)
**Approver:** Bella Ma (GM, MENA Region)
**Estimated duration:** 2–3 hours active work, spread across 1–2 weeks
**Risk level:** Medium (each phase is independently reversible)

---

## Pre-flight checklist

- [ ] Azure Founders Hub subscription active, $1K credit confirmed
- [ ] GitHub OIDC federated credential configured (ran `infra/scripts/setup-github-oidc.ps1`)
- [ ] GitHub repo vars set: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- [ ] GitHub repo secrets set: `PG_ADMIN_PWD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- [ ] Bella has Etisalat DNS dashboard access for `origin-auto.ae`
- [ ] Supabase connection string available
- [ ] pg_dump / psql (PostgreSQL 16 client) installed locally

---

## Phase 1 — Provision infrastructure (no traffic)

**Goal:** All Azure resources exist and pass basic smoke tests. No production traffic affected.

**Reversible:** Delete the resource group (`az group delete --name rg-origin-prod-uaenorth`).

### Steps

1. Trigger the infra workflow:
   ```bash
   # Push any change to infra/** on main, or:
   gh workflow run deploy-azure-infra.yml
   ```

2. Wait for completion (~15–25 min, Postgres is the bottleneck).

3. Verify outputs:
   ```bash
   az deployment sub show \
     --name "<deployment-name>" \
     --query properties.outputs
   ```

4. Populate integration secrets:
   ```powershell
   $kv = "kv-origin-prod-uaenorth"
   az keyvault secret set --vault-name $kv --name "TWILIO-ACCOUNT-SID"        --value "<value>"
   az keyvault secret set --vault-name $kv --name "TWILIO-AUTH-TOKEN"          --value "<value>"
   az keyvault secret set --vault-name $kv --name "TWILIO-VERIFY-SERVICE-SID"  --value "<value>"
   az keyvault secret set --vault-name $kv --name "SENDGRID-API-KEY"           --value "<value>"
   az keyvault secret set --vault-name $kv --name "STRIPE-SECRET-KEY"          --value "<value>"
   az keyvault secret set --vault-name $kv --name "STRIPE-WEBHOOK-SECRET"      --value "<value>"
   ```

5. Set DATABASE_URL to **Supabase** (for parallel-deploy phase):
   ```bash
   az containerapp secret set \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth \
     --secrets \
       database-url="<supabase-pooled-url>" \
       direct-url="<supabase-direct-url>"
   ```

6. Trigger the backend deploy workflow to push the real image:
   ```bash
   gh workflow run deploy-azure-backend.yml
   ```

7. Smoke test:
   ```bash
   FQDN=$(az containerapp show \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth \
     --query properties.configuration.ingress.fqdn -o tsv)
   curl -s "https://$FQDN/health/ready"
   # Should return {"status": "ok"} or similar
   ```

### Phase 1 exit criteria
- [ ] `/health/ready` returns 200
- [ ] `/health/live` returns 200
- [ ] Application Insights shows request telemetry
- [ ] No errors in `az containerapp logs show`

---

## Phase 2 — Parallel deploy (1 week)

**Goal:** Both Railway (legacy) and Azure deploy on every push to main. Vercel still points at Railway. Compare logs for divergence.

**Reversible:** Disable the Azure workflow.

### Steps

1. Both workflows are already active on `main` push to `apps/backend/**`.
2. Monitor for 1 week:
   - Azure: Application Insights > Failures, Performance
   - Railway: Railway dashboard logs
3. Compare response behavior on key endpoints if possible.

### Phase 2 exit criteria
- [ ] 1 week of parallel deploys with no Azure-side errors
- [ ] Response times comparable to Railway
- [ ] No divergence in error rates

---

## Phase 3 — Data migration

**Goal:** Customer data moves from Supabase to Azure PostgreSQL. Container App switches to Azure PG.

**Reversible:** Flip DATABASE_URL back to Supabase.

**Schedule:** Friday evening UAE time (lowest traffic). Coordinate with Bella.

### Steps

1. Run the migration script:
   ```bash
   export SUPABASE_URL='postgresql://...'  # From Supabase dashboard
   export AZURE_PG_URL='postgresql://origin_admin:<PG_ADMIN_PWD>@pg-origin-prod-uaenorth.postgres.database.azure.com:5432/origin?sslmode=require'
   bash infra/scripts/migrate-db.sh
   ```

2. Validate row counts match (script shows comparison).

3. Spot-check business records:
   ```bash
   psql "${AZURE_PG_URL}" -c 'SELECT id, email FROM "Customer" LIMIT 5;'
   psql "${AZURE_PG_URL}" -c 'SELECT id, "plateNumber" FROM "Vehicle" LIMIT 5;'
   ```

4. Check Prisma migration status:
   ```bash
   cd apps/backend
   DATABASE_URL="${AZURE_PG_URL}" uv run prisma migrate status
   ```

5. Switch Container App to Azure PG:
   ```bash
   az containerapp secret set \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth \
     --secrets \
       database-url="${AZURE_PG_URL}" \
       direct-url="${AZURE_PG_URL}"

   az containerapp revision restart \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth
   ```

6. Verify health after restart:
   ```bash
   curl -s "https://$FQDN/health/ready"
   ```

### Phase 3 rollback
```bash
az containerapp secret set \
  --name ca-origin-backend-prod \
  --resource-group rg-origin-prod-uaenorth \
  --secrets \
    database-url="<supabase-url>" \
    direct-url="<supabase-direct-url>"

az containerapp revision restart \
  --name ca-origin-backend-prod \
  --resource-group rg-origin-prod-uaenorth
```

### Phase 3 exit criteria
- [ ] Row counts match Supabase
- [ ] Prisma reports all migrations applied
- [ ] `/health/ready` returns 200 with Azure PG
- [ ] Spot-check queries return correct data

---

## Phase 4 — DNS cutover

**Goal:** `api.origin-auto.ae` points to Azure Container App. Real customer traffic hits Azure UAE North.

**Reversible:** Repoint DNS back to Railway URL (within TTL ~1h).

**Coordination required:** Bella needs Etisalat DNS dashboard access.

### Steps

1. Bind custom domain on Container App:
   ```bash
   az containerapp hostname add \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth \
     --hostname api.origin-auto.ae

   # Azure will provide a TXT record for domain verification.
   # Add it in Etisalat DNS before proceeding.

   az containerapp hostname bind \
     --name ca-origin-backend-prod \
     --resource-group rg-origin-prod-uaenorth \
     --hostname api.origin-auto.ae \
     --environment cae-origin-prod-uaenorth \
     --validation-method CNAME
   ```

2. In Etisalat DNS, create/update:
   - `api.origin-auto.ae` → CNAME → `ca-origin-backend-prod.<region>.azurecontainerapps.io`
   - TTL: 300 (5 min) initially, raise to 3600 after confirmed.

3. Update Vercel environment variables on **both** projects:
   - `NEXT_PUBLIC_API_URL` = `https://api.origin-auto.ae/v1`
   - Vercel auto-redeploys on env change.

4. Verify end-to-end:
   ```bash
   curl -s https://api.origin-auto.ae/health/ready
   # Test from customer site: browse https://origin-auto.ae, trigger an API call
   ```

### Phase 4 exit criteria
- [ ] `api.origin-auto.ae` resolves to Azure Container App
- [ ] TLS certificate is valid (Azure-managed)
- [ ] Customer site loads and API calls succeed
- [ ] Admin dashboard connects and functions

---

## Phase 5 — Decommission Railway (7 days post-cutover)

**Goal:** Remove Railway dependency entirely.

**Not reversible** once Railway state is deleted.

### Steps

1. Confirm zero traffic to Railway for 7 consecutive days.

2. Remove Supabase references:
   - No more DATABASE_URL pointing at Supabase anywhere.

3. Clean up GitHub:
   - Delete `.github/workflows/deploy-backend.yml` entirely (currently a stub).
   - Remove `RAILWAY_TOKEN` from GitHub repo secrets.
   - Remove `RAILWAY_SERVICE_NAME` from GitHub repo vars.
   - Delete `apps/backend/railway.toml`.

4. Delete Railway service via Railway dashboard.

5. Close related GitHub issues:
   - Close issue #21 (UAE migration) — cite this runbook + ADR-0001.
   - Close issue #50 (UAE provider eval) — cite ADR-0001.

6. Update `docs/STATUS.md` to reflect Azure as the production backend host.

### Phase 5 exit criteria
- [ ] Railway service deleted
- [ ] No Railway secrets/vars in GitHub
- [ ] All related issues closed
- [ ] STATUS.md updated

---

## Emergency rollback at any phase

If something goes wrong at any phase, the rollback is the reverse of the most recent phase:

| Phase | Rollback |
|-------|----------|
| 1 | `az group delete --name rg-origin-prod-uaenorth` |
| 2 | Disable Azure workflow, Railway continues as-is |
| 3 | Switch DATABASE_URL back to Supabase, restart revision |
| 4 | Repoint DNS back to Railway, revert Vercel env vars |
| 5 | Not reversible — Railway state is gone |

---

## Post-cutover monitoring (first 48 hours)

- Application Insights: request latency p50/p95, error rate, dependency failures
- Azure PostgreSQL: CPU %, connection count, storage used
- Container App: replica count, restart count, HTTP 5xx rate
- Customer-facing: test booking flow end-to-end, test admin login
