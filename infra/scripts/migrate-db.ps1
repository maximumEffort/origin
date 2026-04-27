# Migrate Postgres data from Supabase (Frankfurt) to Azure PostgreSQL Flex Server (UAE North).
$ErrorActionPreference = 'Stop'
if (-not $env:SOURCE_URL) { throw 'Set $env:SOURCE_URL to the Supabase connection string' }
if (-not $env:TARGET_URL) { throw 'Set $env:TARGET_URL to the Azure PG connection string' }
$dumpFile = if ($env:DUMP_FILE) { $env:DUMP_FILE } else { ".\origin-supabase-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql" }
$dryRun = ($env:DRY_RUN -eq '1')
function Invoke-Step { param([string]$Label, [scriptblock]$Body); Write-Host "==> $Label"; if ($dryRun) { Write-Host "[dry-run] would run: $Body" } else { & $Body; if ($LASTEXITCODE -ne 0) { throw "Step failed (exit $LASTEXITCODE): $Label" } } }
Invoke-Step "1/4  pg_dump -> $dumpFile" { pg_dump $env:SOURCE_URL --no-owner --no-acl --clean --if-exists --schema=public --format=plain --file=$dumpFile }
$resetSql = @'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
'@
Invoke-Step "2/4  Reset target public schema" { $resetSql | psql $env:TARGET_URL -v ON_ERROR_STOP=1 }
Invoke-Step "3/4  Restore dump into target" { psql $env:TARGET_URL -v ON_ERROR_STOP=1 -f $dumpFile }
$countSql = @"
SELECT schemaname, relname AS table_name, n_live_tup AS rows FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_live_tup DESC, relname;
"@
Write-Host ""; Write-Host "--- SOURCE (Supabase) ---"; if (-not $dryRun) { psql $env:SOURCE_URL -c $countSql }
Write-Host ""; Write-Host "--- TARGET (Azure UAE) ---"; if (-not $dryRun) { psql $env:TARGET_URL -c $countSql }
Write-Host ""; Write-Host "Dump retained at: $dumpFile"; Write-Host "Done."
