// Production parameters for Origin Azure UAE North.
using '../main.bicep'

param location = 'uaenorth'
param environment = 'prod'
param appName = 'origin'
param postgresAdminLogin = 'origin_admin'
param postgresAdminPassword = readEnvironmentVariable('PG_ADMIN_PWD')
param jwtSecret = readEnvironmentVariable('JWT_SECRET')
param jwtRefreshSecret = readEnvironmentVariable('JWT_REFRESH_SECRET')
param corsAllowedOrigins = 'https://origin-auto.ae,https://www.origin-auto.ae,https://admin.origin-auto.ae,https://origin-customer.vercel.app,https://origin-admin.vercel.app'
param vatRate = '0.05'
param keyVaultSecretsUserRoleGuid = '4633458b-17de-408a-b874-0445c86b69e6'
param tags = {
  env: 'prod'
  app: 'origin'
  owner: 'amr.sarhan52@gmail.com'
  'cost-center': 'shanghai-car-rental-llc'
  'managed-by': 'bicep'
  adr: '0001-azure-uae-north-architecture'
}
