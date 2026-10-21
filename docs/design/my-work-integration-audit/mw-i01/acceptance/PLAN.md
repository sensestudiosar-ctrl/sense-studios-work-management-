# MW-I01 authenticated acceptance

Owner authorization: 9 October 2026. MW-I01 remains IN PROGRESS; MW-I02 is excluded.

## Environment decision

Existing Task PostgreSQL integration tests use rollback fixtures, but still require a PostgreSQL target. Existing task browser tests insert synthetic sessions and persistent fixtures. The existing identity browser test supplies virtual WebAuthn support, but its complete journey includes outdated navigation assertions and Owner deletion. No existing infrastructure supplies populated, standard-authentication application testing without a database.

Use only the expressly approved new database `sense_mw_i01_validation_20261009_test` on the existing dedicated loopback PostgreSQL cluster at 127.0.0.1:57434. Abort if the name already exists, target identity differs, or an environment approval rejects the operation. Never retry against another target. No existing development, preview, accepted, staging or production database may be migrated, reset, written or deleted.

Apply the current existing migrations only to the new database; intake found116 migration directories, including the subsequent S27 privilege repair. Record actual readiness. Use pinned Node24.19.0/pnpm11.19.0, unique local NAS storage, exact environment URLs and separate API/web ports. Clear inherited slice-specific database URLs and outbound provider credentials. Do not change tracked backend, schema, contracts, permissions or business rules.

## Authentication and validation

Reuse the existing virtual WebAuthn helper with actual bootstrap, staff invitation/enrollment, logout and passkey login. Four separate synthetic contexts: Owner, Team Leader, Designer and Site Employee. No inserted sessions, cookie injection or authentication bridge. Establish existing home-team/reporting relationships and explicit scoped Team Leader grants through ordinary authorized organization APIs; role labels alone confer no permission. Keep recovery/enrollment credentials out of logs and screenshots.

Validate S09 R-018–R-024 and preserved S10/S13/S14 behavior: desktop/list/cards/board/timeline; mobile320/390; explicit primary owner/canonical priorities/full statuses/Target and Committed; search/filter/pagination/selection/Back; mandatory create fields and validation; authorized edit/progress/wait/resume/complete; exact review/correction presentation through owning workflows where supported; unauthorized reads/writes, invalid access and stale versions; focus/keyboard/touch/overflow. Retain all existing task APIs and command permissions. Unsupported dependencies must be reported rather than fabricated.

Run focused frontend regression plus existing Task and recurrence rollback integration on the exact disposable target before persistent browser setup. Verify accounts/organizations remain empty before normal Owner bootstrap. Run requested automated authenticated journeys against the actual frontend/API; retain screenshots and scenario results separately from earlier mocked component captures. Run existing Review PostgreSQL integration afterwards on the same disposable target: that fixture persists an Active Owner and cannot precede bootstrap. Do not delete an Owner or reset/recreate the target between stages. Classify pre-existing failures separately; no unrelated fixes.

## Cleanup and acceptance

Log out synthetic accounts, revoke or expire remaining sessions in the disposable database, close browser/database connections, and stop only recorded owned API/web processes. Verify exact database name, loopback port and server identity against the creation manifest before deletion. Drop only the newly created named database; verify absence and preservation of the other database catalog. If cleanup cannot be safely established, stop and report remaining resources.

Sol owns context, safety and final acceptance review; Luna handles bounded verification tooling and tests. COMPLETE requires actual authenticated evidence and verified cleanup. Otherwise recommend BLOCKED with explicit gaps. Do not start MW-I02.

Execution status: blocked by requested-model usage limits before provisioning. Tool drafts are incomplete/unreviewed; do not execute them until cleanup and interface corrections pass Sol review. See REPORT.md. A read-only exact-target check confirmed the approved database is absent.
