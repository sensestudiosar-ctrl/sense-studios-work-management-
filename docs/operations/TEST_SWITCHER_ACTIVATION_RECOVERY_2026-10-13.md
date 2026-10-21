# Test switcher activation recovery — 13 October 2026

## Subsequent approved attempt — stopped before mutation

The helper-only authorization stopped at its first read-only preflight because PostgreSQL was offline. Further read-only evidence established that the API/web/helper were also absent. No process replacement, startup, login or data operation occurred. This historical plan is not authority to start those services. The consolidated recovery preparation is in [TEST_SERVER_CONSOLIDATED_RECOVERY_2026-10-13.md](TEST_SERVER_CONSOLIDATED_RECOVERY_2026-10-13.md); fresh combined Owner approval is pending.

## Established evidence

The user-facing controller reported Activation failed (409). The old helper maps several independent failures to409, discards the response reason in its UI and logs nothing from activation failures. The original activation cause is therefore **unconfirmed**. A closed staff page, failed session/identity check, failed normal staff sign-in, focus failure or concurrent activation can all produce that result; none is assumed to be the cause.

Read-only Windows inspection established helper PID35632, pinned Node executable, command line ending in operator.mjs prepare-codex, Windows userHI and its127.0.0.1:64582 listener. That evidence must be repeated immediately before any replacement; it does not establish future live safety. The same application recently refreshed and displayed all50 retained tasks as Owner. No missing-data application defect was demonstrated.

## Prepared correction

Files:
- .env.checkpoint-tools/test-personas/activation-result.mjs (new)
- .env.checkpoint-tools/test-personas/activation-result.test.mjs (new)
- .env.checkpoint-tools/test-personas/controller-page.mjs
- .env.checkpoint-tools/test-personas/operator.mjs
- .env.checkpoint-tools/test-personas/verify-offline.ps1

The activation module preserves serialized ceremonies, persona allowlisting, real ID/email/kind/CSRF identity checks, normal staff passkey sign-in and human-only Owner reauthentication. It stops on missing/closed contexts or uncertain identity. It adds no repair, impersonation or automatic retry. Fixed codes/messages/stages replace discarded exceptions; the operator logs only code/stage. UI success requires HTTP200, PASS and the exact allowed requested persona. Raw exception text, session data and keys are not displayed or logged.

Offline verification: **28/28 helper tests,35/35 inert process cases and19 parser checks PASS**. The generated controller script was parsed without executing browser/network code. Existing session/Owner relay/host safety cases remain included. Independent GPT-6.1 Sol source review found no material guard weakening or sensitive-output leak. None of this proves live activation works.

Verification command already executed:
```powershell
& 'C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoLogo -NoProfile -File '.env.checkpoint-tools/test-personas/verify-offline.ps1'
```

## One combined authorization required

The retained TEST_PERSONAS_SWITCHER_PLAN_2026-10-12.md requires applicable approval for future helper launches. Approval covers only one guarded replacement/launch of this test helper, not PostgreSQL or application lifecycle operations.

1. In Windows Medium context with pinned Node24.19.0/pnpm11.19.0, repeat the existing read-only host/runtime/live database/credential/recovery/archive/catalog guards. Bind only PG18 system7693570241708228348, retained pg-demo-20261006-a7c9,127.0.0.1:45434; existing preview sense_local_preview_20261008_1791474390772_test/OID32768 at115 migrations; web localhost:59223/API127.0.0.1:59224. Verify completed encrypted staff state and the expected six accounts/five staff/fifty tasks. The reviewed launch verification checks exact stored task IDs before activation. A preflight guard failure stops before replacement. Do not start any stopped server or select a fallback target.
2. Independently reverify PID35632's owner, pinned executable, exact helper command, creation identity and listener immediately before stopping it. If absent, reused, contradictory or unavailable, stop for a new decision. Stop only this verified helper once; preserve unrelated services and the Owner Codex session. This may close its owned test-browser windows.
3. Launch existing operator.mjs **launch** once, reusing the completed DPAPI state and existing managed sandboxed Chromium. Mode launch already repeats environment guards, asserts completion/binding, normally signs into the five existing STAFF accounts, and verifies their ten personal tasks, exact IDs, authorization denials, Owner credential/recovery preservation, migrations and catalog. It does not call setup. A failure stops without automatic retry, reseeding or deletion.
4. Open the newly generated loopback controller URL. Exercise Designer1 activation once and verify its actual populated My Work queue. If blocked, retain the fixed diagnostic code/stage and stop. No further automatic attempts.
5. Retain the new test helper and fixtures for the Owner to use. Do not drop data or stop PostgreSQL/API/web.

Exact process mutation commands, only after the above guards:
```powershell
Stop-Process -Id 35632 -ErrorAction Stop

$helperRoot = 'D:/app/sensestudios work management app'
$helperStamp = [guid]::NewGuid().ToString('N')
$helperLogRoot = Join-Path $helperRoot '.env.checkpoint-tools/test-personas'
$helperOut = Join-Path $helperLogRoot "operator-launch-$helperStamp.out.log"
$helperErr = Join-Path $helperLogRoot "operator-launch-$helperStamp.err.log"
$helperProcess = Start-Process -FilePath 'C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' -ArgumentList @('.env.checkpoint-tools/test-personas/operator.mjs','launch') -WorkingDirectory $helperRoot -WindowStyle Hidden -RedirectStandardOutput $helperOut -RedirectStandardError $helperErr -PassThru
$helperProcess.Id
```

The controller uses its existing random loopback port/private route design and will return a new URL. PostgreSQL, API and web endpoints remain fixed.

## Effects and restrictions

Normal STAFF authentication can append sessions/security audit records and update authenticator counters; refreshed STAFF credential counters remain privately DPAPI encrypted. No accounts/tasks/projects/grants/schema/application functionality are changed. No Owner credential is automated/exported. Existing business records, preservation archives and historical manifests remain intact. No new backup, production-data access, direct SQL writes, startup/restart/repair, new database, migration, firewall/permission change, full MW-I02 acceptance or MW-I03 is authorized.

Preparation is complete; live recovery is pending this one combined Owner authorization. Source preparation alone does not make the old controller functional. Original failure screenshot and offline evidence are in docs/operations/evidence/test-switcher-activation-20261012.

