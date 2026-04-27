// Storage account with two blob containers:
//   - kyc-documents:    private, SAS-only access. Customer Emirates IDs / driving licences / passports.
//   - vehicle-imagery:  public read (anonymous), used by the customer site product cards.
//
// We pick StorageV2 + Hot tier + LRS for V1. ZRS / GRS can come later when uptime SLAs matter more.

param location string
param storageAccountName string
param tags object

@description('Replication strategy. LRS = single-AZ, cheapest. Bump to ZRS for cross-AZ, GRS for cross-region.')
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
    allowBlobPublicAccess: true              // Required so vehicle-imagery can be public-read.
    allowSharedKeyAccess: true               // SAS URL generation for KYC. Tighten to Entra-only later.
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
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
      // Origin's frontends need to be able to upload directly via SAS URL.
      corsRules: [
        {
          allowedOrigins: [
            'https://origin-auto.ae'
            'https://www.origin-auto.ae'
            'https://admin.origin-auto.ae'
          ]
          allowedMethods: [ 'GET', 'PUT', 'POST', 'OPTIONS', 'HEAD' ]
          allowedHeaders: [ '*' ]
          exposedHeaders: [ '*' ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource kycContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: blobService
  name: 'kyc-documents'
  properties: {
    publicAccess: 'None'                     // Private. SAS URLs only.
    metadata: {
      purpose: 'customer-kyc'
      pii: 'true'
      retention: 'see-pdpl-policy'
    }
  }
}

resource vehicleImageryContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: blobService
  name: 'vehicle-imagery'
  properties: {
    publicAccess: 'Blob'                     // Anonymous read on individual blobs (not the listing).
    metadata: {
      purpose: 'product-imagery'
      pii: 'false'
    }
  }
}

// Raw Azure Document Intelligence response payloads (ADR-0002).
// Holds the full `analyzeResult` JSON per processed document so the curated
// `Document.ocrFields` JSONB column can be regenerated from a different
// extraction rules without re-paying for OCR. Strictly private — short-lived
// SAS for admin preview only.
resource kycOcrRawContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: blobService
  name: 'kyc-ocr-raw'
  properties: {
    publicAccess: 'None'
    metadata: {
      purpose: 'kyc-ocr-raw-results'
      pii: 'true'
      retention: 'see-pdpl-policy'
    }
  }
}

output id string = storage.id
output name string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
