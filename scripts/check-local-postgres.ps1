# Read-only preflight for the existing accepted S27 local PostgreSQL targets.
# Run on the host: sandbox socket error 10013 is not evidence of server downtime.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$EnvironmentFile,
    [Parameter(Mandatory = $true)][string]$PreservationSnapshot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $workspaceRoot '.env.s27-tools'
$envFile = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$snapshotFile = (Resolve-Path -LiteralPath $PreservationSnapshot).Path
$toolsPrefix = $toolsRoot + [IO.Path]::DirectorySeparatorChar
foreach ($file in @($envFile, $snapshotFile)) {
    if (-not $file.StartsWith($toolsPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The accepted environment and snapshot must be inside .env.s27-tools.'
    }
}
if ([IO.Path]::GetExtension($envFile) -ne '.test' -or [IO.Path]::GetExtension($snapshotFile) -ne '.json') {
    throw 'Pass the accepted .test environment and its .json preservation snapshot.'
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
if ((& $nodePath --version) -ne 'v24.19.0') {
    throw 'This preflight requires the pinned Node 24.19.0 runtime.'
}

Push-Location $workspaceRoot
try {
    & $nodePath (Join-Path $toolsRoot 'migration-status-s27.mjs') $envFile
    if ($LASTEXITCODE -ne 0) {
        throw 'SQL/migration preflight failed. Check host execution permission and the exact accepted environment; socket permission denial must not trigger a database restart.'
    }
    & $nodePath (Join-Path $toolsRoot 'check-s27-preservation.mjs') after $envFile $snapshotFile
    if ($LASTEXITCODE -ne 0) {
        throw 'Preservation comparison failed. Keep the data intact and investigate the reported mismatch.'
    }
    Write-Output 'Local PostgreSQL preflight passed: SQL/migration readiness and retained-data preservation. Full application gates remain separate.'
}
finally {
    Pop-Location
}
