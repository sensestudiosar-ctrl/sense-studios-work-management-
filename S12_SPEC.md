# S12 Revisions and formal issue — scope and acceptance

Status: COMPLETE for Owner-authorized development/local staging on 2026-09-29. See S12_COMPLETION_REPORT.md for verification and limits. S13 and later remain unauthorized. Architecture checkpoint 2e46805 and requirements/APPROVED_REQUIREMENTS.md plus C-001–C-024 control this slice.

## Requirement sub-IDs

- R-030.a: internal-review R0, R1, R2 series; R0 identifies the initial revision.
- R-030.b: distinct client-review CR1, CR2 series under C-002 Q7; CR is not a generic correction-request label.
- R-030.c: mandatory reason, actor, time, immutable file/checksum and unique drawing/series/number.
- R-037.a: Working → Submitted → Reviewed → Approved → Issued → Superseded lifecycle; corrections create new revisions, never replace evidence.
- R-037.b: one current approved/issued revision per drawing; a newer approved current revision atomically supersedes the previous, visibly Superseded — Do Not Use; history remains retrievable.
- R-038.a: immutable transmittals retain sender, named recipient, document/revision, time, purpose and acknowledgement status.
- R-031/S12 boundary.a: management selects client-review-required drawings; actual sending and exact client approval remain S14.
- R-038.b: optional required acknowledgement is recorded by the named recipient with actor/time/evidence.
- C-003/C-009.a: issued blobs/transmittals retain ten years from the first effective Completed or Cancelled transition, as the Owner clarified on 2026-09-29; later archive and closeout do not reset the clock, with metadata for notice, holds, backup expiry and deletion proof. No purge.
- C-024.a: project lead-exit On Hold blocks new issue/delivery decisions while retaining authorized reads.

## Scope and dependency boundary

A logical drawing register links append-only revisions to exact S11 immutable uploaded files/blobs. R/CR numbers allocate automatically under drawing locking; a cross-series ordinal orders newer versions. New Working drafts do not become current. The Owner clarified: only drawings required for client review are sent by Team Leader or Owner. Creation has no staff policy toggle and starts unselected; Owner or assigned permission-defined Team Leader with document.client_review_select may select the drawing once, with reason/version/immutable history. Selection requires client approval for later issues of all its exact revisions; CR additionally always requires exact client approval. S12 provides no withdrawal/unselection, and does not settle later S14 withdrawal policy. Already issued transmittals preserve their original gate snapshot. Existing uploads are neither converted nor renamed automatically.

S12 implements approval binding, atomic current selection/supersession, exact issue/transmittal persistence and named internal acknowledgement. S13 owns submission/reviewer/correction and internal approval production; S14 owns client approval/classification and portal identities. No public approval/state/fact endpoint exists. An internal module port consumes canonical persisted exact-revision downstream audit evidence; S12 production HTTP issue is blocked until S13 supplies it, and client-required issues until S14 supplies exact client facts. Tests use clearly identified persisted downstream evidence fixtures to verify S12 domain machinery without claiming implemented S13/S14 workflows. Working CR drafts prepare the client series and do not represent classified client requests.

Public commands create drawing plus R0, append R/CR with expected drawing version, issue exact current approved revisions when prerequisites exist, and acknowledge an existing transmittal as its named internal recipient. External recipients/delivery/CAD links remain S14/S21. Recipient access is checked for each exact item at issue; reads and acknowledgements recheck current assignment/grants and Confidential ancestor/file grants.

## Permissions and invariants

Creation: active assignment plus project.view/document.upload, Owner implicit. Read: project.view/document.view and exact S11 Confidential grants. Issue: separate document.issue, Active project, current Approved/Issued exact revision and canonical approval facts. No issue from Draft/On Hold/Completed/Archived/Cancelled. Older cross-series ordinal cannot displace newer current approval. Repeat issue creates new transmittal retaining older evidence. No acknowledgement by another person. State transitions have immutable history; drawing identity, revision content/identity and transmittal contents cannot be rewritten/deleted. Lists hide the whole drawing/transmittal if any included exact file is inaccessible, preventing history metadata leakage. Revision streams recheck S11 access and carry current state and superseded warning.

## Out of scope

S13 review/correction/task workflows, S14 classification/portal/passkeys/signatures/client decisions, S15 publication, external CAD sharing, cloud replication, evidence purge and production NAS/backup/legal certification.

## Acceptance and test plan

1. Persist register, R0/R1/CR1 numbering, mandatory reasons, actors/times/checksums and immutable file identity; refresh restores history.
2. Deny unassigned/cross-project/foreign file ID/confidential/revoked access at all command/read/stream/issue/acknowledgement boundaries.
3. Real concurrent appends reject stale version with no duplicate numbers; concurrent current approvals leave one current and retain superseded evidence.
4. Missing internal/client exact approval blocks issue with no side effects; SQL fabricated state/current/facts/issues fail evidence guards.
5. Exact downstream fixture evidence exercises full dormant issue, exact transmittal, acknowledgement, repeated issue, rollback and historical retrieval; no public approval bypass.
6. Fresh/S11 upgrade migrations preserve prior rows and enforce scope, unique, state, immutability and canonical evidence under runtime privileges.
7. Canonical audit/domain/outbox records are atomic with material commands; injected failure leaves no partial records.
8. Desktop/mobile UI provides creation/append/history/issue-blocker, loading/empty/error/denial and refresh behavior.
9. Validate/generate Prisma, targeted unit/API/PostgreSQL/browser tests, typecheck/lint/build and full pnpm verify; report exact results before COMPLETE.

## Model routing

Owner requests roughly 70% Luna general work / 30% Sol important decisions and review. Sol owns requirements/schema/access/lifecycle/security/final acceptance; Luna bounded controller/UI/general tests. Report actual models and work, not invented token percentages.


Owner current-version clarification (2026-09-29): "After internal approval; wait for client approval only before formal issue". Therefore exact internal approval promotes a newer revision to current and supersedes the former current revision. Management-selected and CR revisions still require exact client approval before formal issue; client evidence consumption requires current exact internal approval and correct chronology.
