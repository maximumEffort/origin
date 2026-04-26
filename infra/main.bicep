// Subscription-scope deployment for Origin production in Azure UAE North.
//
// Creates the resource group and invokes all child modules in dependency order:
//   1. observability (Log Analytics + App Insights)  — needed by Container App env
//   2. keyvault                                       — needed by Container App for secrets
//   3. storage                                        — KYC docs + vehicle imagery
//   4. postgres                                       — slowest, kicked off in parallel
//   5. acr (container registry)                       — Container App pulls images from here
//   6. containerapp (env + app)                       — depends on observability, kv, acr
//
// See docs/adr/0001-azure-uae-north-architecture.md for the why behind every choice.

targetScope = 'subscription'

// ── Parameters ──────────────────────────────────────────────────────────────

@description('Azure region. UAE North = Dubai. Origin is PDPL-bound to UAE.')
param location string = 'uaenorth'

@description('Environment short name. Used in resource naming.')
@allowed([ 'prod', 'staging', 'dev' ])
param environment string = 'prod'

@description('Application short name. Used in resource naming.')
param appName string = 'origin'

@description('Postgres admin username.')
param postgresAdminLogin string = 'origin_admin'

@secure()
@description('Postgres admin password. Min 16 chars, mix of letters/digits/symbols. Stored in Key Vault as DATABASE-ADMIN-PASSWORD.')
param postgresAdminPassword string

@secure()
@description('JWT signing secret for FastAPI auth. Generate fresh; do not reuse the Railway-era value. Min 32 chars.')
param jwtSecret string

@secure()
@description('JWT refresh signing secret. Different from jwtSecret. Min 32 chars.')
param jwtRefreshSecret string

@description('CORS origins for the FastAPI app. Comma-separated.')
param corsAllowedOrigins string = 'https://origin-auto.ae,https://www.origin-auto.ae,https://admin.origin-auto.ae'

@description('VAT rate (UAE = 0.05).')
param vatRate string = '0.05'

@description('Tags applied to all resources. Override only if you know what you are doing.')
param tags object = {
  env: environment
  app: appName
  owner: 'amr.sarhan52@gmail.com'
  'cost-center': 'shanghai-car-rental-llc'
  'managed-by': 'bicep'
}

// ── Naming ──────────────────────────────────────────────────────────────────
// Pulled from ADR-0001 §"Naming convention".

var resourceGroupName     = 'rg-${appName}-${environment}-${location}'
var logAnalyticsName      = 'log-${appName}-${environment}-${location}'
var appInsightsName       = 'ai-${appName}-${environment}-${location}'
var keyVaultName          = 'kv-${appName}-${environment}-${location}'
var postgresServerName    = 'pg-${appName}-${environment}-${location}'
var containerRegistryName = 'acr${appName}${environment}'                 // no dashes, lowercase
var storageAccountName    = 'stor${appName}${environment}${location}'      // no dashes, lowercase, ≤24
var containerAppEnvName   = 'cae-${appName}-${environment}-${location}'
var containerAppName      = 'ca-${appName}-backend-${environment}'

// ── Resource group ──────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// ── Modules ─────────────────────────────────────────────────────────────────

module observability 'modules/observability.bicep' = {
  name: 'observability'
  scope: rg
  params: {
    location: location
    logAnalyticsName: logAnalyticsName
    appInsightsName: appInsightsName
    tags: tags
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  scope: rg
  params: {
    location: location
    keyVaultName: keyVaultName
    jwtSecret: jwtSecret
    jwtRefreshSecret: jwtRefreshSecret
    corsAllowedOrigins: corsAllowedOrigins
    tags: tags
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    location: location
    storageAccountName: storageAccountName
    tags: tags
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  scope: rg
  params: {
    location: location
    serverName: postgresServerName
    administratorLogin: postgresAdminLogin
    administratorPassword: postgresAdminPassword
    tags: tags
  }
}

module acr 'modules/containerregistry.bicep' = {
  name: 'acr'
  scope: rg
  params: {
    location: location
    registryName: containerRegistryName
    tags: tags
  }
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerapp'
  scope: rg
  params: {
    location: location
    environmentName: containerAppEnvName
    appName: containerAppName
    keyVaultName: keyVaultName
    logAnalyticsName: logAnalyticsName
    appInsightsConnectionString: observability.outputs.appInsightsConnectionString
    vatRate: vatRate
    tags: tags
  }
  dependsOn: [
    keyVault                       // KV must exist + secrets seeded before app references them
    observability                  // diagnostic settings need the workspace
  ]
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output resourceGroupName string  = rg.name
output containerAppFqdn string   = containerApp.outputs.fqdn
output keyVaultName string       = keyVault.outputs.name
output postgresHost string       = postgres.outputs.fqdn
output containerRegistryServer string = acr.outputs.loginServer
