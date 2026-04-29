// Azure AI Document Intelligence (ADR-0002).
//
// Provisions a single Cognitive Services account of kind "FormRecognizer"
// (the underlying resource type for Document Intelligence). S0 is the
// pay-per-page tier; F0 (free) is too restrictive for prod KYC flows.
//
// Auth:
//   - Public network access enabled (no private endpoint in V1).
//   - Local auth (key-based) is enabled so we have a fallback during dev,
//     but the Container App authenticates to this resource via its system-
//     assigned managed identity in production. The managed identity needs
//     "Cognitive Services User" at this resource's scope; the role
//     assignment is emitted from main.bicep where both resources are
//     in scope.
//
// PDPL:
//   - uaenorth keeps document bytes in-region throughout OCR processing.
//   - Microsoft documents this resource as not retaining customer data
//     beyond the API call duration.

@description('Azure region. Document Intelligence is available in uaenorth.')
param location string

@description('Resource name. Convention: di-{app}-{env}-{region}.')
param accountName string

@description('Tags applied to the resource.')
param tags object

@allowed([ 'F0', 'S0' ])
@description('Pricing tier. F0 = free (severely rate-limited); S0 = pay-per-page.')
param sku string = 'S0'

resource docIntel 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'FormRecognizer'                    // Document Intelligence's underlying kind
  identity: {
    type: 'SystemAssigned'                  // Future-proofing — DI itself can sign requests via MI
  }
  sku: {
    name: sku
  }
  properties: {
    customSubDomainName: accountName        // Required for managed-identity auth
    publicNetworkAccess: 'Enabled'
    // The 'FormRecognizer' Kind doesn't support Trusted Services bypass —
    // Azure rejects the deployment with `NetworkAclsBypassNotSupported` if
    // we set bypass='AzureServices' here. Since defaultAction is 'Allow'
    // anyway (no IP allow-list), the bypass key is effectively a no-op,
    // so we omit the networkAcls block entirely.
    // disableLocalAuth=false keeps key-based auth available as a dev fallback;
    // production code path uses managed identity by default.
    disableLocalAuth: false
  }
}

output id string = docIntel.id
output name string = docIntel.name
output endpoint string = docIntel.properties.endpoint
output principalId string = docIntel.identity.principalId
