// Production parameters for Origin Azure UAE North.
// Tier 1 sizing per ADR-0001. ~$36/mo, fully covered by Founders Hub credit.
//
// SECRETS are read from environment variables at deploy time:
//   PG_ADMIN_PWD       — Postgres admin password
//   JWT_SECRET         — FastAPI access-token signing secret
//   JWT_REFRESH_SECRET — FastAPI refresh-token signing secret
//
// Operator sets these in their shell before invoking `az deployment`. They
// never touch source. See infra/README.md for the deploy walkthrough.

using '../main.bicep'

param location = 'uaenorth'
param environment = 'prod'
param appName = 'origin'

// Postgres admin login + password. Password from env.
param postgresAdminLogin = 'origin_admin'
param postgresAdminPassword = readEnvironmentVariable('PG_ADMIN_PWD')

// JWT signing secrets from env.
param jwtSecret = readEnvironmentVariable('JWT_SECRET')
param jwtRefreshSecret = readEnvironmentVariable('JWT_REFRESH_SECRET')

// CORS — covers the customer apex + www + admin subdomain + Vercel preview URLs
// (extend as needed). Explicitly mirrors the values in containerapp.bicep CORS
// policy because Container App CORS is a separate enforcement layer.
param corsAllowedOrigins = 'https://origin-auto.ae,https://www.origin-auto.ae,https://admin.origin-auto.ae,https://origin-customer.vercel.app,https://origin-admin.vercel.app'

param vatRate = '0.05'

// "Key Vault Secrets User" built-in role GUID — pinned to this subscription's
// catalog value. Microsoft documents 4633458b-17de-4322-8e57-46e3aa55c8e0 but
// `az role definition list --name "Key Vault Secrets User"` returns a different
// GUID for this tenant, and ARM rejects the documented one with
// RoleDefinitionDoesNotExist. Re-verify if this is ever copied to a new
// subscription.
param keyVaultSecretsUserRoleGuid = '4633458b-17de-408a-b874-0445c86b69e6'

param tags = {
  env: 'prod'
  app: 'origin'
  owner: 'amr.sarhan52@gmail.com'
  'cost-center': 'shanghai-car-rental-llc'
  'managed-by': 'bicep'
  adr: '0001-azure-uae-north-architecture'
}
