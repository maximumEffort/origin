// AcrPull role assignment for the Container App's system-assigned managed identity.
// Without this, the Container App cannot pull images from the private ACR.
//
// Separated into its own module because the ACR resource and the Container App
// resource live in sibling modules — main.bicep orchestrates by passing the
// principal ID from containerapp.outputs.principalId to this module.

param containerRegistryName string
param containerAppPrincipalId string

@description('Built-in role GUID for "AcrPull". Microsoft-documented: 7f951dda-4ed3-4680-a7ca-43fe172d538d.')
param acrPullRoleGuid string = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

resource roleAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, containerAppPrincipalId, 'AcrPull')
  properties: {
    principalId: containerAppPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/${acrPullRoleGuid}'
  }
}
