# Agent 1 — concrete real application/browser acceptance target

16October2026. **OWNER APPROVED the exact isolated browser stack: “Approve isolated browser tests”.** Approval covers the bounded actions/target below, including real fixture/session/file writes and owned process/cluster shutdown with preserved data. Execution and actual results are recorded separately; approval itself is not a passed check.

The previous Owner approval covered only the59749 task/receipt database and9committed/26transactional tests. Those passed and that cluster is stopped with data preserved. This proposal is a different, fresh target for the remaining D/G/E/H real application/browser gate. `PLAN_V1_WORKING_VERSION.md` §3 boundary4 reserves database lifecycle operations; the earlier narrow approval does not authorize this new stack. The stopped MW-I02 boundary remains separate and unchanged.

## Exact target and actions requested

| Resource | Fixed value |
|---|---|
| New evidence/cluster root | `D:/app/sensestudios work management app/.artifacts/v1/20261016-agent1-browser` |
| PostgreSQL data | Root + `/postgres/data` |
| PostgreSQL version/address/port | Installed18.6; only127.0.0.1:59751 |
| Fresh database | `sense_v1_agent1_browser_20261016_test` |
| Cluster-local bootstrap role | `agent1_browser_20261016`; random generated test password |
| Application API | Only127.0.0.1:59752, real AppModule/controllers/services/guards in a Nest test application |
| Browser/frontend | Only127.0.0.1:59753, actual current Vite frontend, strict port, explicit own API proxy |
| File root | New root + `/files`, synthetic evidence only |
| Browser output | New root + `/browser`, screenshots and measured results |

Requested approval covers: create this one new cluster/database; apply the same reviewed source migrations1–119 there; seed only synthetic organization/people/grants/session fixtures; provision one small PNG through canonical DocumentService upload/chunk/finalize per viewport; start the two owned loopback application listeners and headless browser; run the prepared four-width workflows and bounded fixes/rechecks on this still-running exact target; close those owned processes and stop only this cluster, preserving its data/files/logs. No reset/drop/delete, retained/production application migration, credentials reuse, external message/provider call, deployment, old59749 restart or MW-I02 operation.

## Concrete source and safeguards

- `scripts/acceptance/v1-agent1-browser.mjs`: inspect / prepare / test / explicitly reviewed source-only repin / stop. Fresh prepare refuses an existing evidence root. Source pins ordered119migration names/checksums and all candidate inputs; fresh target identity records real directory, address/port, PostgreSQL major, cluster system ID, DB OID/owner and random comment marker. Private credentials remain ignored; operator logs redact database URLs/passwords. Source-only repin preserves prior source and the exact diff and cannot accept altered applied migrations. Stopped target has no implicit restart command.
- `apps/api/src/v1-agent1-browser-target.ts`: spec guard before connection/startup. Requires the exact manifest path/approval, source contents/hash, database URL, all three ports and storage root; rejects wrong target, duplicate/escaping source paths, storage/output symlink redirection and incomplete/stopped identity. It verifies the actual PostgreSQL identity and every applied migration checksum.
- `apps/api/src/v1-agent1-browser.acceptance.spec.ts`: operator-only filename excluded from ordinary unit/integration/Playwright discovery. Missing target/approval fails rather than skips. Uses real AppModule with an explicit test RuntimeConfig; no identity/authorization/task/project/document/review provider is mocked. API binds127.0.0.1 rather than the ordinary deployment bootstrap's all-interface listener. Vite refuses occupied ports; readiness waits for that exact spawned child to announce its own fixed URL, then checks HTTP. No existing server is reused or killed. Browser and app/Vite close in teardown; operator's identity-checked stop preserves the database.
- External delivery stays disabled: test RuntimeConfig has no Brevo/bootstrap/provider secrets; environment explicitly blanks provider/accounting values so local dotenv cannot fill them. NODE_ENV=test prevents the TimeWorker's automatic external accounting interval; NotificationWorker delivery loop is not started. Browser routes reject external origins. No fake CI/GITHUB_ACTIONS assertion or existing S27/MW-I02 guard change is used.
- The earlier task acceptance operator/guard/spec remains unchanged. A partially initialized new cluster can be stopped only after checking its own bootstrap connection's directory/address/port/owner and any recorded system ID; no cleanup or reinitialization fallback exists.

## Four-width cases to execute after approval

At1440×900,1024×900,390×844 and320×740, use distinct synthetic employee/session/branch fixtures and canonical owning services to create the project/lead/assignments/review/file baseline. Browser operations then exercise:

1. Staff My Work task creation, real persisted canonical ID and reload; description search with Critical priority/highest-first ordering; visible count versus actual authorized API result; collaborator filter; unrelated private Task ID denied.
2. Project Tasks composer keeps the selected project read-only. A route forwards the real POST, waits for its actual201 commit, then loses only its response. The locked draft and explicit keyboard recovery resend the identical body/key; SQL proves one task/receipt/history/event and the UI opens the canonical result. No success response is mocked.
3. Real child creation returns/opens the child ID, persists one link/receipt and increments its parent once; the ordinary authenticated API refuses completion while that child is unfinished.
4. Project People uses permitted current assignments and shows no Staff contributor editor. Documents reads the actual uploaded file. Reviews reads the actual submitted internal round and opens its canonical task/round destination. Formal review/client/document commands remain in their owning workflows.
5. Owner Project creation through the real form opens its confirmed ID outside the retained directory query; Back retains that query.
6. Another actor's forged Task ID, unauthorized owner assignment and invalid CSRF fail. Revoking the worker's project assignment through the canonical Owner command removes its task access; revoking its test session produces401 and the protected My Work sign-in state.
7. Screenshots/measurements check no horizontal document overflow, relevant owned action target sizes and keyboard recovery/canonical navigation. Inspect actual captures after execution; prepared assertions alone are not visual acceptance.

These are real server-validated **fixture sessions**, not passkey enrollment or ordinary People onboarding. Owner readiness records are synthetic test fixtures and their passkeys are never used as authentication proof. Staff pilot, R-104/R-105, full application/domain integration, hosted CI, deployment bootstrap/production build behavior, backup/restore and real staff approval remain separate gates. Current shared-shell/frontend unit failures are not waived by this harness.

## Checks completed before requesting approval

Read-only inspect confirmed installedPostgreSQL18.6, absent target root and free ports59751/59752/59753. A negative unapproved prepare exited1 and left the target root absent. New and prior target-guard units **34/34passed**, no pending/skipped; this includes rejecting the old59749/retained targets, wrong approval/phase/source/directory/system ID/marker/storage/API/web ports. Syntax check, scoped lint and strict TypeScript checking of the whole operator-only spec/import graph exited0. The first temporary typecheck configuration omitted API-local Jest type roots; its corrected configuration uses the installed definitions and passes, without changing production tsconfig or test assertions.

Prepared source receipt: **609files/119migrations**, hash`d05925652b2935486387d3311157bf27554a5e612ceb6cbf771bdd55ba3988cb`. Compared with the last605-file UI candidate, only the four new harness/guard files and a concurrent other-agent navigation-test edit differ. No production task/Project/My Work/auth implementation was changed in this preparation. Artifacts are under `.artifacts/v1/20261016-agent1-preparation/browser-*`; no new target was created. A final source drift check precedes lifecycle execution.

Approval execution switch, only after a direct human approval of this packet: `V1_AGENT1_BROWSER_ACCEPTANCE_APPROVED=2026-10-16:agent1-fresh-browser-119`. This switch is a guard, not permission by itself. Run operator inspect, prepare, test, then identity-checked stop with that same bounded scope. Failure preserves evidence; investigate instead of recreating or resetting the target. Any changed business rule, migration, target or external behavior needs its own decision.
