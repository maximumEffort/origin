// Postgres Flexible Server, Burstable B1ms, 32 GB SSD, no HA in V1.
//
// Reasoning per ADR-0001 §"Cost summary": B1ms is the cheapest tier that supports
// pgvector and the extensions Prisma needs. We start without HA (cheaper, single AZ)
// and bump to zone-redundant once we have customer load that justifies the doubled cost.

param location string
param serverName string
param administratorLogin string

@secure()
param administratorPassword string

param tags object

@description('Postgres major version. 16 is the latest GA for Flex Server in UAE North.')
@allowed([ '14', '15', '16' ])
param postgresVersion string = '16'

@description('Compute SKU tier. Burstable B1ms is V1; bump to GeneralPurpose when sustained CPU justifies it.')
@allowed([ 'Burstable', 'GeneralPurpose', 'MemoryOptimized' ])
param skuTier string = 'Burstable'

@description('Compute size. Standard_B1ms = 1 vCPU, 2 GB RAM.')
param skuName string = 'Standard_B1ms'

@description('Storage in GB. 32 is V1 minimum-sensible.')
@minValue(32)
@maxValue(16384)
param storageSizeGB int = 32

@description('Backup retention in days. 7 = lowest, 35 = max.')
@minValue(7)
@maxValue(35)
param backupRetentionDays int = 7

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
      tier: 'P10'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'        // Enable when launch traffic justifies cross-region recovery.
    }
    highAvailability: {
      mode: 'Disabled'                      // Single-AZ in V1. Bump to ZoneRedundant post-launch.
    }
    network: {
      publicNetworkAccess: 'Enabled'        // Tighten with private endpoints post-V1.
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'       // Pure password auth in V1; can layer Entra later.
      passwordAuth: 'Enabled'
    }
  }
}

// Allow Container App's outbound traffic + manual admin from anywhere.
// Tighten once we measure Container App's egress IPs in production.
resource fwAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'                 // 0.0.0.0–0.0.0.0 is Azure's special "allow Azure-internal" rule.
  }
}

// The 'origin' database. Prisma migrations create their own tables inside it.
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'origin'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

output id string = postgres.id
output name string = postgres.name
output fqdn string = postgres.properties.fullyQualifiedDomainName
output databaseName string = db.name
