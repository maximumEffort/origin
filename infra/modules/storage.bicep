// Storage account with two blob containers.
param location string
param storageAccountName string
param tags object

@allowed([ 'Standard_LRS', 'Standard_ZRS', 'Standard_GRS' ])
param sku string = 'Standard_LRS'

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: { name: sku }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
    networkAcls: { bypass: 'AzureServices', defaultAction: 'Allow' }
    encryption: {
      services: {
        blob: { enabled: true, keyType: 'Account' }
        file: { enabled: true, keyType: 'Account' }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2024-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 7 }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
    cors: {
      corsRules: [{
        allowedOrigins: ['https://origin-auto.ae','https://www.origin-auto.ae','https://admin.origin-auto.ae']
        allowedMethods: [ 'GET', 'PUT', 'POST', 'OPTIONS', 'HEAD' ]
        allowedHeaders: [ '*' ]
        exposedHeaders: [ '*' ]
        maxAgeInSeconds: 3600
      }]
    }
  }
}

resource kycContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: blobService
  name: 'kyc-documents'
  properties: { publicAccess: 'None', metadata: { purpose: 'customer-kyc', pii: 'true', retention: 'see-pdpl-policy' } }
}

resource vehicleImageryContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: blobService
  name: 'vehicle-imagery'
  properties: { publicAccess: 'Blob', metadata: { purpose: 'product-imagery', pii: 'false' } }
}

output id string = storage.id
output name string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
