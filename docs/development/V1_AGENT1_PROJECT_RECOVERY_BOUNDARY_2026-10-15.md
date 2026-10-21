# Agent 1 — next Project recovery refinement

Date: 15 October 2026. **SOURCE IMPLEMENTED / ACCEPTANCE IN PROGRESS.** This boundary was recorded before code; current source/check evidence is in V1_AGENT1_PROJECT_RECOVERY_PROGRESS_2026-10-15.md. Continues V1-07/SliceG under R-011.a/R-012.a–b/R-013.a/R-014.a–b/R-015.a–b/R-016.a–c/R-017.a–e and C-010–C-016/C-024. Canonical Task/People embedding is already implemented. This bounded batch improves existing Project creation/recovery without changing domain rules, permissions or schema. Broad lifecycle/authenticated acceptance remains open.

## Findings from current source

- Project create awaits the command but ignores its canonical `{ project, wonLeadProvenance? }` result, clears its draft and refreshes the list. A filtered directory may not show the new project, leaving no confirmed destination.
- A React pending flag is asynchronous. A synchronous request guard should protect two same-frame submit events, as the Task composer now does. It is not durable idempotency.
- The owning Project service only accepts a retry key paired with a template version. Its existing receipt store belongs to PRJ. The task receipt approval expressly covers TSK and does not authorize changing this Project contract or storing Project receipts in TSK.
- Generic creation failures encourage retry even when a server/network result is uncertain. Losing a result on a non-template project cannot be proved safe by matching its title, even if a Won-lead uniqueness constraint may reject a later duplicate.
- Project state, assignment, lead, branch and scope actions retain their existing version/reason/approval contracts. Their current owning capabilities and restrictions must remain; the UI must not invent status transitions or make client review a Task filter.

## Bounded source work

Validate the create result's project ID before clearing the draft; open that returned ID through the ordinary detail read and preserve directory filters/page/Back context. Do not inject the returned project into a filtered list or fabricate totals. A detail-read denial/failure after a confirmed write is a separate recovery state with the known ID, not an unconfirmed creation or a reason to re-create.

Use a synchronous in-flight creation guard plus honest pending/success/error states. Preserve the draft on rejected/ambiguous results. For template creation, keep its unchanged command/key for explicit recovery using PRJ's existing contract. For non-template uncertainty, explain that the result is unknown, retain the submitted values and prevent an automatic/blind duplicate submission; offer directory checking and an explicit warning before discarding recovery context. Never call a title match proof of success. A durable non-template recovery extension needs a separate PRJ contract review; no such backend change is part of this source batch.

Make Draft setup/lead/contributor/plan and Active work destinations discoverable using existing permitted commands. Preserve On Hold/cancelled/archive restrictions, required completion gates, Owner cancellation/native-link/client-expiry prerequisites, human approval and immutable history. Distinguish command conflict/denial from a failed post-success refresh. No generic Save should stand in for these owning workflows.

## Acceptance and boundary

Regression cases: same-frame double create; confirmed result outside current list filter; canonical ID opening and Back; malformed/lost response; existing template same-key recovery; draft retention; post-success detail failure; stale version/forbidden lifecycle action and retry; no widened Staff controls; person/plan context preserved. Inspect current backend/controller tests and add only meaningful missing cases. Verify the existing commands and bounded UI at all four widths with keyboard/focus/long content. Real persistence, lifecycle gates, current-resource authorization and authenticated staff journey remain separately required.

Out of scope: Task receipt migration119, Project schema/new key contract, C/shared evaluator, organization People/Settings/notifications/navigation, new state/approval/client/site rules, actual databases/runtime/deployment and stopped MW-I02 acceptance. Record exact source/check evidence; no inherited test or source-only COMPLETE claim.
