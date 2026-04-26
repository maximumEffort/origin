// Production parameters for Origin Azure UAE North.
// Tier 1 sizing per ADR-0001. ~$36/mo, fully covered by Founders Hub credit.
//
// SECURE PARAMETERS (postgresAdminPassword, jwtSecret, jwtRefreshSecret) are
// NOT defined here — Bicep will prompt for them at deploy time. Never commit
// secret values to source.

using '../main.bicep'

param location = 'uaenorth'
param environment = 'prod'
param appName = 'origin'

// Postgres admin login. Password prompted at deploy time.
param postgresAdminLogin = 'origin_admin'

// CORS — covers the customer apex + www + admin subdomain + Vercel preview URLs
// (extend as needed). Explicitly mirrors the values in containerapp.bicep CORS
// policy because Container App CORS is a separate enforcement layer.
param corsAllowedOrigins = 'https://origin-auto.ae,https://www.origin-auto.ae,https://admin.origin-auto.ae,https://origin-customer.vercel.app,https://origin-admin.vercel.app'

param vatRate = '0.05'

param tags = {
  env: 'prod'
  app: 'origin'
  owner: 'amr.sarhan52@gmail.com'
  'cost-center': 'shanghai-car-rental-llc'
  'managed-by': 'bicep'
  'adr': '0001-azure-uae-north-architecture'
}
