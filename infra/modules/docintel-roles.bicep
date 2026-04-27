// Role assignments for the Container App's system-assigned managed identity
// against the resources it needs to call for KYC OCR (ADR-0002).
//
// Why this is its own module:
//   The Container App is created in containerapp.bicep but the principalId
//   is only available *after* that module runs. Sibling resources
//   (Document Intelligence, Storage) live in their own modules. This third
//   module collects the cross-resource role assignments and runs after both
//   sides exist. Cleaner than threading principalId into each leaf module.

@description('Document Intelligence account name (in this resource group).')
param docIntelName string

@description('Storage account name (in this resource group).')
param storageAccountName string

@description('Object id of the principal that gets these roles. Comes from the Container App module output.')
param containerAppPrincipalId string

@description('Built-in role GUID for "Cognitive Services User". Override per tenant if needed.')
param cognitiveServicesUserRoleGuid string = 'a574d5d0-ad88-4d2b-ae57-bf67dc12c0a9'

@description('Built-in role GUID for "Storage Blob Data Contributor". Stable GUID, rarely needs override.')
param storageBlobDataContributorRoleGuid string = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource docIntel 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: docIntelName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2024-01-01' existing = {
  name: storageAccountName
}

// ── Cognitive Services User on Document Intelligence ──────────────────────
// Allows the backend to call DI's analyze APIs via managed identity.
resource roleDocIntel 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: docIntel
  name: guid(docIntel.id, containerAppPrincipalId, 'CognitiveServicesUser')
  properties: {
    principalId: containerAppPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/${cognitiveServicesUserRoleGuid}'
  }
}

// ── Storage Blob Data Contributor on the storage account ────────────────────
// Allows the backend to:
//   - read source documents from kyc-documents/ (when generating SAS URLs for DI)
//   - write raw DI responses to kyc-ocr-raw/
//   - read/write vehicle-imagery/ for admin uploads
// Scoped to the whole storage account; tighten to per-container if audit
// requires it later.
resource roleBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, containerAppPrincipalId, 'StorageBlobDataContributor')
  properties: {
    principalId: containerAppPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/${storageBlobDataContributorRoleGuid}'
  }
}
