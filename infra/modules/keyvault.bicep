// Key Vault in RBAC mode (modern Azure auth pattern, no access policies).
// Seeds the foundational secrets that we already have at deploy time.
// Integration secrets (Twilio, SendGrid, Stripe) are added manually post-deploy
// via `az keyvault secret set` — we don't bake third-party credentials into Bicep.

param location string
param keyVaultName string
param tags object

@secure()
param jwtSecret string

@secure()
param jwtRefreshSecret string

param corsAllowedOrigins string

@description('SKU. Standard is fine for V1; bump to Premium if HSM-backed keys become a requirement.')
@allowed([ 'standard', 'premium' ])
param skuName string = 'standard'

@description('Soft-delete retention in days. 7 = minimum, 90 = max. Lower = lower lock-in if we need to rebuild.')
@minValue(7)
@maxValue(90)
param softDeleteRetentionDays int = 7

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: skuName
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true        // Use Azure RBAC, not legacy access policies.
    enableSoftDelete: true
    softDeleteRetentionInDays: softDeleteRetentionDays
    enablePurgeProtection: false         // Keep false in V1 so we can clean up if we abandon. Flip to true at GA.
    publicNetworkAccess: 'Enabled'       // Tighten with private endpoints post-V1.
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// ── Foundational secrets seeded at deploy time ──────────────────────────────
// These are values we control end-to-end — fine to flow through Bicep.
// Third-party integration creds (Twilio, SendGrid, Stripe) MUST be added via
// `az keyvault secret set` after deploy; never put them in source.

resource secretJwt 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'JWT-SECRET'
  properties: {
    value: jwtSecret
    contentType: 'text/plain'
  }
}

resource secretJwtRefresh 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'JWT-REFRESH-SECRET'
  properties: {
    value: jwtRefreshSecret
    contentType: 'text/plain'
  }
}

resource secretCorsOrigins 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'CORS-ALLOWED-ORIGINS'
  properties: {
    value: corsAllowedOrigins
    contentType: 'text/plain'
  }
}

output id string = keyVault.id
output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
