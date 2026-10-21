# Local test users and tasks — verified

The Owner-approved single continuation succeeded. It reused the preserved preview database and encrypted archive/state. No PostgreSQL or application server was restarted, no database was created/dropped, and no migration or application source was changed. All synthetic records and encrypted STAFF passkeys are retained for testing.

## Use now

- [Switch test users](http://127.0.0.1:64582/qwunAouoLqWpNf_GMuQ2ciq3CI6omes7). Choose a staff account; its separate test Chromium context opens with a real authenticated session.
- [Owner Tasks](http://localhost:59223/tasks?scope=all). The existing Owner stays signed into Codex. Return to this tab to use Owner.
- The switcher is a separate local test helper, outside production application code. Keep its test Chromium window open. Closing it ends the helper; records and encrypted keys remain. A future launch needs the applicable host authorization and guarded `operator.mjs launch`; it never automatically seeds, resets or repairs data. Current launch verification expects the reviewed fixture baseline and stops if subsequent manual testing has changed it.

| Test user | Email | Personal tasks | Project |
| --- | --- | ---: | --- |
| Team Leader 1 | task-test-20261012@example.test | 10 | A |
| Team Leader 2 | task-test-02-20261012@example.test | 10 | B |
| Designer 1 | task-test-03-20261012@example.test | 10 | A |
| Designer 2 | task-test-04-20261012@example.test | 10 | B |
| Site Staff | task-test-05-20261012@example.test | 10 | A |

`owner@local.test` remains the original secured Owner with no employee identity and zero personal tasks. Owner Tasks displays all50 authorized organization tasks and an enabled Create task button.

## Genuine workflow fixtures

Each employee owns nine ordinary tasks and one linked correction generated through the existing review correction-assignment command. Categories cover Planning, Design, Drawings, Materials, Site coordination, Documentation, Quality review, Coordination review, Handover and Corrections. Required Target dates are retained. Each personal queue includes Not started, In progress, Waiting, Completed, Submitted internal review and Corrections required.

Local Test Project A is Turnkey, with Leader1/Designer1/Site Staff; Project B is Design, with Leader2/Designer2. Explicit project assignments, normal lead/state commands and independent eligible reviewers were used. One review correction category was created. No client/evidence/file/financial fixtures were introduced.

Three normal job roles have the reviewed seven BRANCH grants: Team Leader project.view/project.manage/task.assign/review.decide; Designer project.view/review.decide; Site Staff project.view. Five employee-role assignments and no permission overrides. Leader task assignment capability passed; Designers and Site Staff do not receive it. Designer access to the other Designer's personal task and Leader1 access to Project B work returned403. These are scoped checks, not exhaustive permission acceptance.

## Evidence

Exact retained PG18 system7693570241708228348, directory `D:/app/sensestudios work management app/.env.checkpoint-tools/pg-demo-20261006-a7c9`,127.0.0.1:45434; preview `sense_local_preview_20261008_1791474390772_test`/OID32768; API59224/web59223. PG26252/API16860/web3260 remained running. Pinned Node24.19.0/pnpm11.19.0, Windows Medium context. Existing115 migrations, latest20261007060000_s27_assistance, unchanged.

Retained run: `.env.checkpoint-tools/runs/test-personas-fef49557-71cd-41be-99f1-a5e4cda8a564`.

- Immediate read-only evidence: `read-only-handoff-1791822990080.json`.
- Guarded pre-write evidence: `pre-write-preflight.json`.
- Final verification: `verification.json`, PASS at2026-10-12T16:41:06.292Z. Six ACTIVE accounts including original Owner, five employees,50tasks, two projects, three roles, seven grants, five assignments, zero overrides and one review category.
- Operator PID35632, modeprepare-codex; `.env.checkpoint-tools/test-personas/operator-codex-1791823029334.out.log` records enrollment and ten genuine tasks per staff followed by READY; no error result. The old waiting helper was absent; none was terminated.
- All five controller buttons were exercised through Codex and reported successful activation. Each handler verifies the real session's ID/email/kind; no fake session or cookie import.
- Current Owner Tasks UI shows `Showing1–50of50filtered tasks` and Create task enabled. No51st task was submitted.
- `test-switcher-ready.jpg` is an actual Codex screenshot of the ready controller, not an application design fixture.
- Existing preservation archive SHA256 `e6bf3cf6d5134bf35f57a6f6e625bac9fcd764953b59b2716dd7c9de8623fdd2` was verified after DPAPI decryption; no second backup. New STAFF keys/state use DPAPI CurrentUser. Owner passkey identities/recovery configuration and all other database catalog entries passed preservation checks; ordinary login counters/audit/session events may append normally.

The normal Codex Owner session needed fresh human passkey login before connecting. No setup operation was issued before that handoff. Once verification finished, Owner relay mutation authority was revoked; STAFF switching remains available.

## Checks and limits

Offline35/35 ownership cases,20/20 helper/relay tests and17parser checks PASS. Independent GPT-6.1 Sol reviewed context/security and final saved evidence; GPT-6 Luna implemented bounded renderer/inert-test work; parent integrated and executed. Existing frontend100/100 and full-web285pass/20known failure evidence is preserved and was not rerun for this helper-only setup.

Test setup: **PASS**. This is not the full MW-I02 authenticated acceptance harness or final visual acceptance. No PostgreSQL cleanup/drop is appropriate: the Owner authorized retaining this preview data and existing cluster. No deletion or restoration was performed.

One separate visual observation remains: at the current874px Codex Owner Tasks viewport, the search SVG appears oversized and pushes content down. Create task is enabled and all50tasks are present, but this Tasks-route presentation needs a later scoped correction. No application fix was made during this setup; the observation alone does not establish a newly introduced regression. Needs action eligibility remains at design review. MW-I02 remains IN PROGRESS; MW-I03 excluded.
