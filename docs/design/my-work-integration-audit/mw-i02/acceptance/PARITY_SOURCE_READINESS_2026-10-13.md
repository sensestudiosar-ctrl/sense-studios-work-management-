## Current candidate readiness —14 October2026

The historical blocker audit below is preserved. Its118 pins/selectors/mount issues are now corrected. Final candidate source readiness passes792 checks,78 inert safety cases (71 retained plus seven native wiring cases) and53 additional runner/cleanup cases. Current API target guard cases26 pass within355 API units;428 frontend tests and all8 static/build steps pass. This is source readiness only, not live environment safety or stateful authorization. See docs/design/my-work-integration-audit/MY_WORK_PARITY_FINDINGS_RESOLUTION_2026-10-14.md.

# MW-I02 parity source readiness — 2026-10-13

This audit separates current source facts from the historical MW-I02 readiness and authenticated run evidence. It reads source files and migration directory names only. It does not run setup, connect to PostgreSQL, launch services, or perform authenticated browser work. Run with pinned Node 24.19.0:

```powershell
node .env.checkpoint-tools/mw-i02-acceptance/parity-source-readiness.mjs
```

## Current source facts

- The source has 118 migration directories. Migrations 117 and 118 are `20261008010000_role_creation_presentation` and `20261008020000_task_subtasks`.
- Task list accepts `metric=reviews` and applies the review predicate. My Work maps its Reviews card to this query.
- The current actionable-work composer has task, review, and approval sources with source counts. The older review/correction/management disclosure component also remains in the tree.
- Task creation renders a native `<dialog>` through a portal mounted at `document.body`.
- Task subtask list/create routes and the subtask table guards exist in source.

## Stateful readiness blockers

The existing setup and runner still pin migration expectations to 116. The monolithic journey retains fixed disclosure counts/order and its metric discovery only matches old task-card labels. Its Create form locator searches below `.task-workspace`, while the current dialog is portaled to `document.body`. These are harness compatibility blockers; static inspection does not establish whether each assertion fails in an authenticated run.

The separate audit exits with code 2 and reports `BLOCKED_STATEFUL_READINESS` while those legacy assumptions remain. It does not change the setup pin or rewrite existing journey assertions. Historical manifests and run records remain authoritative only for their recorded source fingerprint.

## Next acceptance scope

After the harness and migration inventory receive review, use one guarded disposable-database run against the current 118-migration source. Preserve and compare the pre-run database catalog/snapshot. Exercise current My Work source counts, mixed attention, role access, Reviews metric filtering/clear behavior, and the portal-based Create dialog. Add subtask acceptance for read/create authority, same-project and organization boundaries, parent-version conflicts, parent/child completion behavior, cycle/link invariants, and concurrent attempts. Retain task26/review3 journeys and exact cleanup/preservation checks. No current-source authenticated or migration application claim is made by this source audit.
