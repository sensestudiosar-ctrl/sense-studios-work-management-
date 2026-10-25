# Standalone, fixture-only preview. No API proxy, PWA or production route wiring.
$p0PrototypeRoot = $PSScriptRoot
$p0RepositoryRoot = (Resolve-Path (Join-Path $p0PrototypeRoot '../../..')).Path
$p0Node = 'C:\Program Files\nodejs\node.exe'
$p0Vite = Join-Path $p0RepositoryRoot 'apps/web/node_modules/vite/bin/vite.js'
$p0Config = Join-Path $p0PrototypeRoot 'vite.config.ts'
& $p0Node $p0Vite --config $p0Config --configLoader runner --host 127.0.0.1 --port 59420 --strictPort
exit $LASTEXITCODE
