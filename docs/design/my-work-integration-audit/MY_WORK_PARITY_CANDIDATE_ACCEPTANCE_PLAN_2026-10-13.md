# My Work current candidate — bounded acceptance preparation

Status: source preparation only. **Not authorization to execute.** This supersedes the historical116-migration acceptance recipe for the new candidate only; historical manifests, captures and approvals stay unchanged. MW-I02 remains IN PROGRESS; MW-I03 is excluded.

Revised14 October2026 after completed source checks and800-check readiness; Owner selected preserving the preview and preparing separate API59542/web59543. See MW_I02_SEPARATE_PORT_ACCEPTANCE_PLAN_2026-10-14.md. See MY_WORK_PARITY_FINDINGS_RESOLUTION_2026-10-14.md. The current source fingerprint is recorded in candidate-source.json; only that exact candidate can be authorized.

## Exact scope

Use the existing Windows Medium context, existing user, Node24.19.0/pnpm11.19.0 and retained PostgreSQL18 cluster at D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9, system7693570241708228348,127.0.0.1:45434. API127.0.0.1:59542/web localhost:59543 must be free. Only create sense_mw_i02_validation_20261009_test, once, when absent. The retained preview database/OID32768, its50 tasks/five staff and Owner credentials are excluded.

The candidate has118 migration files: the existing116 plus the reviewed role-presentation117 and subtask118. Their exact names/checksums and the current compiled/source/harness fingerprint must be frozen in evidence/findings-resolution-20261013/candidate-source.json. Source/inert readiness must pass before live preflight. No production schema/configuration or permission change is performed by this procedure.

## One continuous session

1. Run readiness-parity-20261013.mjs and the inert/parser safety cases. Stop on any failure or source mismatch. These checks do not establish live safety.
2. Run existing preflight.ps1 -Live -AllowStartup **only after new explicit Owner approval**. Running cluster: verify process, service ancestry, data directory, disk/live identity, endpoint, owner and absence; do not start a second instance. Stopped cluster: verify stopped/stale-PID safety, no data-directory owner, expected disk identity, free/nonexcluded45434 and unchanged recovery-copy hash87d3ade8f6f9a6f73c5c85e1e37ea84f5cc4d661410283545f6eb615263e1007; one ordinary pg_ctl startup is proposed. Independently verify readiness and live identity afterward. No retry, repair, PID/WAL manipulation, fallback or unrelated service action.
3. After genuine fresh Owner approval, preserve its actual text/time/source fingerprint in one authorization JSON record (ownerApproved:true, scope:mw-i02-parity-persistence, sourceHash matching candidate, authorizationText and approvedAt). Run setup.mjs --authorization with that exact record once. It validates the receipt before importing pg, binds the generated runId, repeats absence/identity and exact migration fingerprint guards, records the unique run manifest before creation, creates only the named target, deploys118 existing reviewed migrations and starts only its owned API/web processes. Do not invent or prefill an approval receipt under this preparation.
4. Run run-task-integration.mjs with the exact manifest and --stage tasks. The existing rollback fixtures must preserve the pre-auth empty organization/account/session baseline. Do not start browser if task prerequisites fail.
5. Run run-tests.mjs once: existing monolithic authenticated journey, four roles, real five exit holds, all four views/commands, mixed attention source counts/order/destinations/D3, narrow Reviews, native Create, touch/filter/search. No retries, force visibility, replacement fake authorization or application changes.
6. Run independent --stage review when the environment remains safe even if browser assertions failed. Then run the new --stage parity committed-domain suite under the additional exact manifest/marker/source-hash guard. This is a separate result:15 prepared cases, up to15 isolated branches/teams/projects,60 staff accounts/employees,225 synthetic scoped permission overrides,200 task records,2 role-presentation job roles,1 Primary Client account/session/test credential, and1 synthetic PDF/folder/drawing/revision. These bounds are additional to the existing browser/rollback fixtures and only inside this run's disposable database/NAS directory. Use canonical domain workflows; negative SQL tests deliberately exercise the guards, without altering production rules. Snapshot/count/paging,160 eligible-row cost measurements, ordinary/internal/client completion, stopped children, child insert/reopen/dependency races and Owner profile configuration are covered. Committed records/audit/events remain until whole-target cleanup; no row reset or retained-preview writes. Client cryptographic transport is explicitly substituted at the existing test seam; real session/grant/binding/domain policies remain. This is not authenticated client/passkey evidence. If browser fails before the required Owner/organization fixtures exist, mark the parity stage BLOCKED rather than fabricate prerequisites or reset data.
7. Attempt cleanup.mjs with the exact printed manifest on every outcome when its safety guards pass: revoke only run sessions, stop only owned API/web, verify database/OID/marker/connection/catalog, drop only the run-created disposable database and verify all other catalog entries unchanged. On guard failure, stop without unsafe deletion.
8. If this run started PostgreSQL, restore its prior stopped state only with explicit approval, matching identity and no unowned connections; use the existing check-no-unowned-connections.mjs before one pg_ctl -m fast stop. If initially running, leave it running. Retain the recovery copy.

## Proposed commands (not executed)

From the repository root, use the fully qualified pinned Node executable. Obtain $mwManifest from setup's actual output, never guess or reuse a historical manifest.

```powershell
$mwNode = 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/readiness-parity-20261013.mjs'
$mwAttemptId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString() + '-' + [Guid]::NewGuid().ToString('N').Substring(0,12)
& 'C:\Users\HI\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File '.env.checkpoint-tools/mw-i02-acceptance/preflight.ps1' -Live -AllowStartup -AttemptId $mwAttemptId
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/setup.mjs' --authorization $mwApprovalPath
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs' $mwManifest --stage tasks
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-tests.mjs' $mwManifest
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs' $mwManifest --stage review
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/run-task-integration.mjs' $mwManifest --stage parity
& $mwNode '.env.checkpoint-tools/mw-i02-acceptance/cleanup.mjs' $mwManifest
```

The conditional startup inside the reviewed reusable preflight directly invokes C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe with the exact retained directory, unique log, -o '-h 127.0.0.1 -p 45434' and -w start. The command list above is a sequence with checked exit/status guards and finally cleanup, not an unconditional batch. The existing script is authoritative for argument quoting and prior-state records.

$mwApprovalPath must name the newly preserved genuine approval record. Each runner validates exact runDir/marker/OID/system/data-directory/startup identity before connection, records one bound attempt/result, and refuses retries. Passing pre-auth task receipt is required for browser; independent Review may run after browser failure; parity follows completed browser/Review attempts. Cleanup supports exact new UTC microsecond identity and preserves historical text identity checks.

## Evidence and acceptance

Capture real Owner, Team Leader, Designer initial/Waiting/attention and Site Employee at1440×900,1024×900,390×844,320×740. Keep queue-container and first-task geometry separate; measure main/section tops/heights, task top/bottom, fixed nav top, visible task pixels, initial scroll needed and actual post-scroll action clearance. Verify expanded/focused controls independently from neutral initial captures. Simulations are explicitly labeled.

Compare to exact demo SHA256F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8 at equivalent states. D4 exact-fill/dark-label exception and necessary canonical/backend differences remain explicit. Classify remaining MW-I02, shared-shell, future-slice and backend differences. Source fixture captures are not authenticated evidence.

Report functional and visual results separately; distinguish test/harness failures, known baseline debt and genuine new application regressions. A passing local run is not production readiness or automatic MW-I02 completion.

## Approval needed

One combined approval must cover conditional one-time startup if safely stopped, one fresh named disposable database with118 migrations/reviewed synthetic browser and committed-domain fixtures, one browser attempt, independent integration stages, manifest-bound cleanup and guarded restoration only if this run started the cluster. No additional operation is implicitly approved. Risk is limited to ordinary dedicated-cluster recovery and disposable synthetic writes/run-owned processes. Stop on any ambiguous/contradictory guard or failure; no automatic retry.

Request this approval only after current source checks, responsive fixtures, semantic harness checks and inert ownership tests pass. This preparation document itself grants no execution permission.
