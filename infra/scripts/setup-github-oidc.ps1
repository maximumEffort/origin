#requires -Version 5.1
<#
.SYNOPSIS
  One-time setup for GitHub Actions → Azure OIDC federated credentials.

.DESCRIPTION
  Creates an Azure AD app registration, service principal, and federated
  credential trust between this GitHub repo and Azure. Grants the SP
  Contributor at the resource group scope.

  After running, copy the printed three values into:
  - GitHub repo → Settings → Secrets and variables → Actions → Variables tab
    - AZURE_CLIENT_ID
    - AZURE_TENANT_ID
    - AZURE_SUBSCRIPTION_ID

  Then add three GitHub repo SECRETS (Secrets tab, not Variables):
    - PG_ADMIN_PWD       (the Postgres admin password)
    - JWT_SECRET         (the JWT access-token signing secret)
    - JWT_REFRESH_SECRET (the JWT refresh-token signing secret)

  These mirror the env vars the Bicep param file reads via
  readEnvironmentVariable(), so the infra workflow can apply Bicep in CI.

.NOTES
  Run once. If you re-run, az ad app create will fail on the duplicate
  display name — that's fine, it means it's already set up. To rotate
  the SP, delete the old app first via:
    az ad app delete --id <appId>

  Requires az CLI logged in as a tenant admin (you).
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string] $ResourceGroupName = 'rg-origin-prod-uaenorth',

    [Parameter(Mandatory=$false)]
    [string] $ServicePrincipalName = 'sp-github-origin-azure-deploy',

    [Parameter(Mandatory=$false)]
    [string] $GitHubRepo = 'maximumEffort/origin'
)

$ErrorActionPreference = 'Stop'

# ── Sanity checks ────────────────────────────────────────────────────────────

Write-Host "→ Verifying az CLI is logged in..." -ForegroundColor Cyan
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "Not logged into Azure. Run 'az login' first."
    exit 1
}
$subscriptionId = $account.id
$tenantId = $account.tenantId
Write-Host "  Subscription: $($account.name) ($subscriptionId)"
Write-Host "  Tenant:       $tenantId"

Write-Host "→ Verifying resource group exists..." -ForegroundColor Cyan
$rg = az group show --name $ResourceGroupName --output json 2>$null | ConvertFrom-Json
if (-not $rg) {
    Write-Error "Resource group '$ResourceGroupName' not found. Run the Bicep deployment first."
    exit 1
}
$rgId = $rg.id

# ── Create the AD app + SP ───────────────────────────────────────────────────

Write-Host "→ Creating Azure AD app '$ServicePrincipalName'..." -ForegroundColor Cyan
$appId = az ad app create --display-name $ServicePrincipalName --query appId -o tsv
if (-not $appId) {
    Write-Error "Failed to create AD app."
    exit 1
}
Write-Host "  App ID (client ID): $appId"

Write-Host "→ Creating service principal..." -ForegroundColor Cyan
az ad sp create --id $appId --output none 2>$null

# ── Grant Contributor on the resource group ──────────────────────────────────

Write-Host "→ Granting Contributor on $ResourceGroupName..." -ForegroundColor Cyan
az role assignment create `
    --assignee $appId `
    --role Contributor `
    --scope $rgId `
    --output none

# Also grant User Access Administrator at RG scope so the SP can create
# role assignments inside Bicep (e.g., Container App's Key Vault Secrets User).
Write-Host "→ Granting User Access Administrator on $ResourceGroupName (needed for Bicep role assignments)..." -ForegroundColor Cyan
az role assignment create `
    --assignee $appId `
    --role "User Access Administrator" `
    --scope $rgId `
    --output none

# ── Federated credential for pushes to main ──────────────────────────────────

Write-Host "→ Adding federated credential: github-main..." -ForegroundColor Cyan
$mainCred = @{
    name = 'github-main'
    issuer = 'https://token.actions.githubusercontent.com'
    subject = "repo:${GitHubRepo}:ref:refs/heads/main"
    audiences = @('api://AzureADTokenExchange')
    description = 'GitHub Actions push to main'
} | ConvertTo-Json -Compress

# az ad app federated-credential create takes JSON via stdin or file
$tempFile = [System.IO.Path]::GetTempFileName()
$mainCred | Set-Content -Path $tempFile -Encoding UTF8
try {
    az ad app federated-credential create --id $appId --parameters "@$tempFile" --output none
} finally {
    Remove-Item -Path $tempFile -Force
}

# ── Federated credential for workflow_dispatch (manual runs from any branch) ─

Write-Host "→ Adding federated credential: github-dispatch..." -ForegroundColor Cyan
$dispatchCred = @{
    name = 'github-workflow-dispatch'
    issuer = 'https://token.actions.githubusercontent.com'
    subject = "repo:${GitHubRepo}:environment:production"
    audiences = @('api://AzureADTokenExchange')
    description = 'GitHub Actions workflow_dispatch on production environment'
} | ConvertTo-Json -Compress

$tempFile = [System.IO.Path]::GetTempFileName()
$dispatchCred | Set-Content -Path $tempFile -Encoding UTF8
try {
    az ad app federated-credential create --id $appId --parameters "@$tempFile" --output none
} finally {
    Remove-Item -Path $tempFile -Force
}

# ── Print the three values for GitHub ────────────────────────────────────────

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete." -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Add these as GitHub repo VARIABLES (Settings → Secrets and variables" -ForegroundColor Yellow
Write-Host "→ Actions → Variables tab):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  AZURE_CLIENT_ID       = $appId"
Write-Host "  AZURE_TENANT_ID       = $tenantId"
Write-Host "  AZURE_SUBSCRIPTION_ID = $subscriptionId"
Write-Host ""
Write-Host "And add these as GitHub repo SECRETS (Secrets tab, not Variables):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  PG_ADMIN_PWD       = <your Postgres admin password>"
Write-Host "  JWT_SECRET         = <your JWT signing secret>"
Write-Host "  JWT_REFRESH_SECRET = <your JWT refresh secret>"
Write-Host ""
Write-Host "Once added, push a change under apps/backend/** or infra/** and watch" -ForegroundColor Yellow
Write-Host "the Azure workflows run in the Actions tab." -ForegroundColor Yellow
Write-Host ""
