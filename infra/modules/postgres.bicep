// Postgres Flexible Server, Burstable B1ms, 32 GB SSD, no HA in V1.
param location string
param serverName string
param administratorLogin string
@secure()
param administratorPassword string
param tags object

@allowed([ '14', '15', '16' ])
param postgresVersion string = '16'
@allowed([ 'Burstable', 'GeneralPurpose', 'MemoryOptimized' ])
param skuTier string = 'Burstable'
param skuName string = 'Standard_B1ms'
@minValue(32)
@maxValue(16384)
param storageSizeGB int = 32
@minValue(7)
@maxValue(35)
param backupRetentionDays int = 7

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: { name: skuName, tier: skuTier }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: { storageSizeGB: storageSizeGB, autoGrow: 'Enabled', tier: 'P10' }
    backup: { backupRetentionDays: backupRetentionDays, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
    authConfig: { activeDirectoryAuth: 'Disabled', passwordAuth: 'Enabled' }
  }
}

resource fwAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'origin'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

output id string = postgres.id
output name string = postgres.name
output fqdn string = postgres.properties.fullyQualifiedDomainName
output databaseName string = db.name
