// Azure Container Registry, Basic SKU.
// Admin user is enabled at first deploy for convenience (Container App can pull
// without configuring managed identity on day 1). We disable admin and switch to
// managed-identity pull once the workflow is wired up.

param location string
param registryName string
param tags object

@description('SKU. Basic is sufficient for V1; bump to Standard for geo-replication.')
@allowed([ 'Basic', 'Standard', 'Premium' ])
param sku string = 'Basic'

@description('Enable admin user for first-deploy convenience. Disable once managed identity is wired up.')
param adminUserEnabled bool = true

resource acr 'Microsoft.ContainerRegistry/registries@2025-03-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: { name: sku }
  properties: {
    adminUserEnabled: adminUserEnabled
    publicNetworkAccess: 'Enabled'         // Tighten to private endpoint at Premium SKU.
    anonymousPullEnabled: false
  }
}

output id string = acr.id
output name string = acr.name
output loginServer string = acr.properties.loginServer
