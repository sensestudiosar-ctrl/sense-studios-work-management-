param([ValidateSet('Prepare','Stop')][string]$Mode = 'Prepare')
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$target = [IO.Path]::GetFullPath((Join-Path $workspace '.env.login-tools\acceptance-20261017'))
if (-not $target.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Target is outside the workspace' }
$bin = 'C:\Program Files\PostgreSQL\18\bin'
$dataPath = Join-Path $target 'data'
$manifestPath = Join-Path $target 'manifest.json'
$port = 59761
$dbName = 'sense_login_flow_20261017_test'
if ($Mode -eq 'Stop') {
  if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'No owned acceptance manifest' }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.dataPath -ne $dataPath -or $manifest.port -ne $port -or $manifest.database -ne $dbName) { throw 'Acceptance identity mismatch' }
  $control = & (Join-Path $bin 'pg_controldata.exe') $dataPath
  if (($control -join "\n") -notmatch [regex]::Escape($manifest.systemId)) { throw 'Cluster system identity changed' }
  & (Join-Path $bin 'pg_ctl.exe') -D $dataPath -m fast -w stop
  if ($LASTEXITCODE -ne 0) { throw 'Owned acceptance shutdown failed' }
  Write-Output 'LOGIN acceptance cluster stopped; data and evidence retained.'
  exit
}
if (Test-Path -LiteralPath $target) { throw 'Acceptance target already exists; no automatic reuse, reset or removal' }
if (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) { throw 'Acceptance port is occupied' }
if ((& (Join-Path $bin 'postgres.exe') --version) -notmatch '18\.6') { throw 'Expected PostgreSQL18.6' }
New-Item -ItemType Directory -Path $target | Out-Null
$passwordBytes = [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
$password = [Convert]::ToHexString($passwordBytes).ToLowerInvariant()
$pwPath = Join-Path $target 'pg-password.private'
[IO.File]::WriteAllText($pwPath, $password, [Text.UTF8Encoding]::new($false))
& (Join-Path $bin 'initdb.exe') -D $dataPath -U login_test --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile=$pwPath --encoding=UTF8 --locale=C *> (Join-Path $target 'initdb.log')
if ($LASTEXITCODE -ne 0) { throw 'Acceptance cluster initialization failed; inspect retained log' }
& (Join-Path $bin 'pg_ctl.exe') -D $dataPath -l (Join-Path $target 'postgres.log') -o "-h 127.0.0.1 -p $port" -w start
if ($LASTEXITCODE -ne 0) { throw 'Acceptance startup failed' }
$env:PGPASSWORD = $password
& (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p $port -U login_test $dbName
if ($LASTEXITCODE -ne 0) { throw 'Acceptance database creation failed' }
$system = & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p $port -U login_test -d $dbName -At -c 'SELECT system_identifier FROM pg_control_system()'
if ($LASTEXITCODE -ne 0) { throw 'Acceptance system identity read failed' }
$env:DATABASE_URL = "postgresql://login_test:$password@127.0.0.1:$port/$dbName"
$env:MIGRATION_DATABASE_URL = $env:DATABASE_URL
$manifest = @{ version=1; database=$dbName; port=$port; dataPath=$dataPath; systemId=($system -join '').Trim(); databaseUrl=$env:DATABASE_URL }
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
Push-Location $workspace
try {
  pnpm db:migrate:deploy *> (Join-Path $target 'migrate.log')
  if ($LASTEXITCODE -ne 0) { throw 'Acceptance migration failed; inspect private migrate.log' }
} finally { Pop-Location }
Write-Output 'LOGIN dedicated PostgreSQL18.6 acceptance database prepared at59761; migrations deployed. Retained runtimes were not touched.'

