param([Parameter(Mandatory=$true)][string]$LockFile,[Parameter(Mandatory=$true)][string]$Record,[Parameter(Mandatory=$true)][string]$MutexName)
$ErrorActionPreference = 'Stop'
$mutex = [Threading.Mutex]::new($false, $MutexName)
$held = $false
try {
    try { $held = $mutex.WaitOne(10000) } catch [Threading.AbandonedMutexException] { $held = $true }
    if (!$held) { throw 'Supervisor claim timeout' }
    if (Test-Path -LiteralPath $LockFile) {
        $old = Get-Content -LiteralPath $LockFile -Raw | ConvertFrom-Json
        if ($old.kind -ne 'sense-staging-supervisor') { throw 'Unknown supervisor lock' }
        $owner = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $old.identity.ProcessId)
        if ($owner -and $owner.ExecutablePath -eq $old.identity.ExecutablePath -and $owner.CommandLine -eq $old.identity.CommandLine -and $owner.CreationDate.ToUniversalTime().ToString('o') -eq $old.identity.Created) {
            throw 'Another canonical supervisor is running'
        }
        [IO.File]::Move($LockFile, $LockFile + '.stale-' + [Guid]::NewGuid().ToString())
    }
    $stream = [IO.File]::Open($LockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $bytes = [Convert]::FromBase64String($Record); $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
} finally { if ($held) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
