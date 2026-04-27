// Azure Container Registry, Basic SKU.
param location string
param registryName string
param tags object

@allowed([ 'Basic', 'Standard', 'Premium' ])
param sku string = 'Basic'
param adminUserEnabled bool = true

resource acr 'Microsoft.ContainerRegistry/registries@2025-03-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: { name: sku }
  properties: {
    adminUserEnabled: adminUserEnabled
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
  }
}

output id string = acr.id
output name string = acr.name
output loginServer string = acr.properties.loginServer
