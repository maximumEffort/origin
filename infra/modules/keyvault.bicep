// Key Vault in RBAC mode (modern Azure auth pattern, no access policies).
param location string
param keyVaultName string
param tags object

@secure()
param jwtSecret string
@secure()
param jwtRefreshSecret string
param corsAllowedOrigins string

@allowed([ 'standard', 'premium' ])
param skuName string = 'standard'
@minValue(7)
@maxValue(90)
param softDeleteRetentionDays int = 7
param enablePurgeProtection bool = false

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: union({
    sku: { family: 'A', name: skuName }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: softDeleteRetentionDays
    publicNetworkAccess: 'Enabled'
    networkAcls: { bypass: 'AzureServices', defaultAction: 'Allow' }
  }, enablePurgeProtection ? { enablePurgeProtection: true } : {})
}

resource secretJwt 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'JWT-SECRET'
  properties: { value: jwtSecret, contentType: 'text/plain' }
}

resource secretJwtRefresh 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'JWT-REFRESH-SECRET'
  properties: { value: jwtRefreshSecret, contentType: 'text/plain' }
}

resource secretCorsOrigins 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'CORS-ALLOWED-ORIGINS'
  properties: { value: corsAllowedOrigins, contentType: 'text/plain' }
}

output id string = keyVault.id
output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
