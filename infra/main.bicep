// Subscription-scope deployment for Origin production in Azure UAE North.
//
// Creates the resource group and invokes all child modules in dependency order:
//   1. observability (Log Analytics + App Insights)  — needed by Container App env
//   2. keyvault                                       — needed by Container App for secrets
//   3. storage                                        — KYC docs + vehicle imagery
//   4. postgres                                       — slowest, kicked off in parallel
//   5. acr (container registry)                       — Container App pulls images from here
//   6. docintel                                       — Document Intelligence (ADR-0002)
//   7. containerapp (env + app)                       — depends on observability, kv, acr
//   8. acr-roles                                      — grants Container App MI AcrPull on ACR
//   9. docintel-roles                                 — grants Container App MI access to DI + Storage
//
// See docs/adr/0001-azure-uae-north-architecture.md for the why behind every choice,
// and docs/adr/0002-kyc-ocr-data-flow.md for the KYC OCR additions.

targetScope = 'subscription'

// ── Parameters ────────────────────────────────────────────────────────────

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

@description('KYC OCR feature flag (ADR-0002). False until staged rollout completes.')
param kycOcrEnabled bool = false

@description('Built-in role GUID for "Cognitive Services User". Microsoft documents this as a574d5d0-ad88-4d2b-ae57-bf67dc12c0a9 — verify in your tenant if main deployment errors with RoleDefinitionDoesNotExist.')
param cognitiveServicesUserRoleGuid string = 'a574d5d0-ad88-4d2b-ae57-bf67dc12c0a9'

@description('Built-in role GUID for "Key Vault Secrets User". Microsoft documents this as 4633458b-17de-4322-8e57-46e3aa55c8e0, but some subscriptions return a different GUID. Verify in your tenant with: az role definition list --name "Key Vault Secrets User"')
param keyVaultSecretsUserRoleGuid string = '4633458b-17de-4322-8e57-46e3aa55c8e0'

@description('Tags applied to all resources. Override only if you know what you are doing.')
param tags object = {
  env: environment
  app: appName
  owner: 'amr.sarhan52@gmail.com'
  'cost-center': 'shanghai-car-rental-llc'
  'managed-by': 'bicep'
}

// ── Naming ────────────────────────────────────────────────────────────────
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
var docIntelName          = 'di-${appName}-${environment}-${location}'

// ── Resource group ───────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// ── Modules ───────────────────────────────────────────────────────────────────

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

module docIntel 'modules/docintel.bicep' = {
  name: 'docintel'
  scope: rg
  params: {
    location: location
    accountName: docIntelName
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
    acrLoginServer: acr.outputs.loginServer
    appInsightsConnectionString: observability.outputs.appInsightsConnectionString
    vatRate: vatRate
    keyVaultSecretsUserRoleGuid: keyVaultSecretsUserRoleGuid
    // ── KYC OCR (ADR-0002) ──
    kycOcrEnabled: kycOcrEnabled
    azureDocIntelEndpoint: docIntel.outputs.endpoint
    azureStorageBlobEndpoint: storage.outputs.blobEndpoint
    tags: tags
  }
  dependsOn: [
    keyVault                       // KV must exist + secrets seeded before app references them
  ]
}

// ── Role assignments for the Container App's managed identity ───────────────────────

// AcrPull — allows the Container App to pull images from the private ACR
// using its system-assigned managed identity (no admin credentials needed).
module acrRoleAssignments 'modules/acr-roles.bicep' = {
  name: 'acr-roles'
  scope: rg
  params: {
    containerRegistryName: containerRegistryName
    containerAppPrincipalId: containerApp.outputs.principalId
  }
  dependsOn: [
    acr
    containerApp
  ]
}

// Cognitive Services User + Storage Blob Data Contributor — scoped to the
// docintel + storage resources so the backend can call DI and read/write
// blob containers without needing API keys.
module diRoleAssignments 'modules/docintel-roles.bicep' = {
  name: 'docintel-roles'
  scope: rg
  params: {
    docIntelName: docIntelName
    storageAccountName: storageAccountName
    containerAppPrincipalId: containerApp.outputs.principalId
    cognitiveServicesUserRoleGuid: cognitiveServicesUserRoleGuid
  }
  dependsOn: [
    docIntel
    storage
    containerApp
  ]
}

// ── Outputs ──────────────────────────────────────────────────────────────────

output resourceGroupName string  = rg.name
output containerAppFqdn string   = containerApp.outputs.fqdn
output keyVaultName string       = keyVault.outputs.name
output postgresHost string       = postgres.outputs.fqdn
output postgresDatabaseName string = postgres.outputs.databaseName
output containerRegistryServer string = acr.outputs.loginServer
