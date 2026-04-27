// Container App Environment + Container App.
//
// V1 strategy:
//   - System-assigned managed identity on the Container App.
//   - Identity gets Key Vault Secrets User role at the KV scope, so the
//     three foundational secrets (JWT_SECRET, JWT_REFRESH_SECRET,
//     CORS_ALLOWED_ORIGINS) flow in via keyVaultUrl references.
//   - Identity gets AcrPull role at the ACR scope (via acr-roles.bicep).
//   - Registry auth uses the managed identity — no admin credentials.
//   - All OTHER secrets (DATABASE_URL, Twilio, SendGrid, Stripe...) start as
//     plain Container App secrets seeded with placeholder values. Operator
//     populates them post-deploy via `az containerapp secret set`. Documented
//     in infra/README.md.
//   - Container App starts with the public hello-world image until CI pushes
//     the real FastAPI image to ACR.
//
// Trade-off: mixing KV-referenced secrets (the seeded three) with plain
// Container-App-managed secrets (everything else) is uglier than 100% KV
// references, but it lets the first deploy succeed with no manual prep.
// We migrate the rest to KV in a follow-up PR once the operator has set
// the secret values once.

param location string
param environmentName string
param appName string
param keyVaultName string
param logAnalyticsName string
param appInsightsConnectionString string
param vatRate string
param tags object

// ── ACR ─────────────────────────────────────────────────────────────

@description('ACR login server, e.g. acroriginprod.azurecr.io. Used to configure managed-identity-based registry auth.')
param acrLoginServer string

// ── KYC OCR (ADR-0002) ──────────────────────────────────────────────
// kycOcrEnabled is a non-secret feature flag. The endpoints are also
// non-secret (they identify resources, not credentials). Auth to both DI and
// Storage uses the Container App's system-assigned managed identity, granted
// via role assignments emitted from main.bicep -> docintel-roles.bicep.

@description('KYC OCR feature flag (ADR-0002). False until staged rollout completes.')
param kycOcrEnabled bool = false

@description('Document Intelligence endpoint URL. Comes from the docintel module output.')
param azureDocIntelEndpoint string = ''

@description('Storage account blob endpoint, e.g. https://stororiginproduaenorth.blob.core.windows.net/.')
param azureStorageBlobEndpoint string = ''

@description('Initial container image. Replaced by CI on first push to ACR.')
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('TCP port the FastAPI app listens on inside the container.')
param targetPort int = 3001

@description('Min replica count. 1 means always-on (no cold starts).')
@minValue(0)
@maxValue(25)
param minReplicas int = 1

@description('Max replica count. 3 covers V1 traffic comfortably.')
@minValue(1)
@maxValue(25)
param maxReplicas int = 3

@description('CPU cores per replica. 0.5 = half a vCPU.')
param cpuCores string = '0.5'

@description('Memory per replica.')
param memorySize string = '1Gi'

@description('Built-in role definition GUID for "Key Vault Secrets User". Microsoft documents this as 4633458b-17de-4322-8e57-46e3aa55c8e0, but some subscriptions return a different GUID. Verify in your tenant with: az role definition list --name "Key Vault Secrets User"')
param keyVaultSecretsUserRoleGuid string = '4633458b-17de-4322-8e57-46e3aa55c8e0'

// ── Lookups ────────────────────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsName
}

// ── Container App Environment ────────────────────────────────────────────

resource environment 'Microsoft.App/managedEnvironments@2024-10-02-preview' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: false                   // Single-zone in V1, ZRS post-launch.
  }
}

// ── Container App (initial deploy) ──────────────────────────────────────────
// Note: KV-referenced secrets require the managed identity's role assignment
// to propagate before the Container App tries to read them. We emit the role
// assignments below; if the *first* revision fails to start, restart the
// revision once role propagation completes (~30s). Subsequent revisions are
// fine. README documents this.

resource containerApp 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      // ── Registry auth via managed identity ─────────────────────────
      // The system-assigned identity is granted AcrPull via acr-roles.bicep.
      // No admin credentials or image pull secrets needed.
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: {
          allowedOrigins: [
            'https://origin-auto.ae'
            'https://www.origin-auto.ae'
            'https://admin.origin-auto.ae'
          ]
          allowedMethods: [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS' ]
          allowedHeaders: [ '*' ]
          allowCredentials: true
          maxAge: 3600
        }
      }
      secrets: [
        // KV-referenced — values come from Key Vault via the managed identity.
        // Names use lowercase-with-dashes per Container App secret naming rules.
        {
          name: 'jwt-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/JWT-SECRET'
          identity: 'system'
        }
        {
          name: 'jwt-refresh-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/JWT-REFRESH-SECRET'
          identity: 'system'
        }
        {
          name: 'cors-allowed-origins'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/CORS-ALLOWED-ORIGINS'
          identity: 'system'
        }
        // Plain Container-App-managed secrets — operator populates these
        // post-deploy via `az containerapp secret set`. Placeholder values
        // here so the Container App can start (Pydantic settings expects
        // them to be defined).
        { name: 'database-url',           value: 'placeholder-set-via-cli' }
        { name: 'direct-url',             value: 'placeholder-set-via-cli' }
        { name: 'twilio-account-sid',     value: 'placeholder' }
        { name: 'twilio-auth-token',      value: 'placeholder' }
        { name: 'twilio-verify-service-sid', value: 'placeholder' }
        { name: 'sendgrid-api-key',       value: 'placeholder' }
        { name: 'sendgrid-from-email',    value: 'noreply@origin-auto.ae' }
        { name: 'sendgrid-from-name',     value: 'Origin' }
        { name: 'stripe-secret-key',      value: 'placeholder' }
        { name: 'stripe-webhook-secret',  value: 'placeholder' }
      ]
    }
    template: {
      revisionSuffix: 'init'
      containers: [
        {
          name: 'backend'
          image: image
          resources: {
            cpu: json(cpuCores)
            memory: memorySize
          }
          env: [
            { name: 'APP_ENV',     value: 'production' }
            { name: 'PORT',        value: string(targetPort) }
            { name: 'VAT_RATE',    value: vatRate }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
            // ── KYC OCR (ADR-0002) ──
            { name: 'KYC_OCR_ENABLED',           value: kycOcrEnabled ? 'true' : 'false' }
            { name: 'AZURE_DOC_INTEL_ENDPOINT',  value: azureDocIntelEndpoint }
            { name: 'AZURE_STORAGE_BLOB_ENDPOINT', value: azureStorageBlobEndpoint }
            { name: 'KYC_OCR_BLOB_CONTAINER',    value: 'kyc-ocr-raw' }
            // Secrets — referenced by name from the configuration.secrets block.
            { name: 'JWT_SECRET',                  secretRef: 'jwt-secret' }
            { name: 'JWT_REFRESH_SECRET',          secretRef: 'jwt-refresh-secret' }
            { name: 'CORS_ALLOWED_ORIGINS',        secretRef: 'cors-allowed-origins' }
            { name: 'DATABASE_URL',                secretRef: 'database-url' }
            { name: 'DIRECT_URL',                  secretRef: 'direct-url' }
            { name: 'TWILIO_ACCOUNT_SID',          secretRef: 'twilio-account-sid' }
            { name: 'TWILIO_AUTH_TOKEN',           secretRef: 'twilio-auth-token' }
            { name: 'TWILIO_VERIFY_SERVICE_SID',   secretRef: 'twilio-verify-service-sid' }
            { name: 'SENDGRID_API_KEY',            secretRef: 'sendgrid-api-key' }
            { name: 'SENDGRID_FROM_EMAIL',         secretRef: 'sendgrid-from-email' }
            { name: 'SENDGRID_FROM_NAME',          secretRef: 'sendgrid-from-name' }
            { name: 'STRIPE_SECRET_KEY',           secretRef: 'stripe-secret-key' }
            { name: 'STRIPE_WEBHOOK_SECRET',       secretRef: 'stripe-webhook-secret' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health/live', port: targetPort }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: '/health/ready', port: targetPort }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// ── Role assignments for the system-assigned identity ─────────────────────────

// Key Vault Secrets User — read secrets from KV.
// Role definition ID is a tenant-scoped path; the GUID comes from the parameter
// so subscriptions with non-standard catalogs can override it.
resource roleKvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, containerApp.id, 'KeyVaultSecretsUser')
  properties: {
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/${keyVaultSecretsUserRoleGuid}'
  }
}

// AcrPull is granted in main.bicep via the acr-roles module, because the ACR
// resource lives in a sibling module and main.bicep can pass both the ACR name
// and the Container App's principal ID.

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
output principalId string = containerApp.identity.principalId
