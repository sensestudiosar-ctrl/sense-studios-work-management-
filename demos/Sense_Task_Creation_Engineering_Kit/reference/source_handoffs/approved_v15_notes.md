# Sense Studios — Task Creation V15

## Design direction
Programa-inspired task creation with direct text editing, a white task canvas, compact properties inspector, muted pine identity, and visible create action. V15 builds on V14, preserving the existing working create flow and role-context restrictions.

## Implemented refinements

1. **Mobile rhythm:** Reduced vertical space around title, description, assignment, dates, reason, and collapsed settings. Description stays immediately beneath the title.
2. **People:** Inline, searchable picker appears below the circular avatar strip; each eligible person appears with initials and an add/selected indicator. Tap to add or remove, with the main assignee first. Drag-to-promote and avatar management from V14 remain available.
3. **Review sequence:** For Internal + Client, the inline review section now shows two circular stages linked by an arrow. Internal approval precedes Client approval.
4. **Dates:** Custom in-panel calendar with month navigation, date selection, Today/Tomorrow shortcuts, readable `DD Mon YYYY` labels, and click-outside/Escape dismissal. Start and Target remain on the same desktop row. Date values still use the same YYYY-MM-DD contract.
5. **Properties:** Aligned icon/label treatment, a compact hours control showing `h`, and standardized vertical rhythm.
6. **Project context:** Fixed-context projects are represented by one locked chip by the task title; freely selected projects remain editable within properties rather than duplicated as another chip.
7. **Selection treatment:** The No Review selected state is neutral; Internal and Internal + Client show a restrained activated state, not a success badge.
8. **Subtasks:** Enter adds another draft subtask. Reorder with drag-and-drop or accessible up/down controls; counts appear when subtasks are present. Checklist remains distinct data but uses similarly light inline rows.
9. **Effort:** Estimated effort is visually distinguished from logged time and formatted with `h`.
10. **Post-creation:** Existing success → Open task → Files/Discussion flow remains, with a modest transition respecting reduced-motion settings.

## Backend compatibility (unchanged)

- First selected person maps to `ownerEmployeeId`, remaining selected people map to `collaborators` with optional estimated hours. Eligibility is checked against authorized project-specific options. Never infer backend permissions from front-end role labels.
- Parent tasks are created via their own strict request. Draft subtasks require separate create requests and verified parent versions. Checklist is part of the parent task, not separate subtask records.
- The creation request never includes files or discussion messages. These are independent post-create actions.
- Existing review routing (`reviewRequirement`) is supported for authorized project tasks. **Choosing named internal/client reviewers remains a proposed backend extension**; selections are not silently injected into `POST /tasks`.
- Choosing a recurring task type uses the existing task type. **Recurrence frequency, interval, and weekday are not part of the current strict create API**; UI controls are illustrative pending explicit backend support.
- Idempotency, capacity acknowledgement, permission errors, uncertain-response result checking, unsaved draft confirmation, and simulated success states remain unchanged.

## Quality assurance

- Tested a standalone HTML copy with Chromium/Playwright at 1440x900, 1440x768, 1024x768, 783x768, 390x844, 320x700 and 320x650.
- **89/89 primary checks** passed, including creation payload, date calendar, people selection, staged child reorder, reviews, success and post-create discussion.
- **45/45 regression checks** passed, including click-outside calendar, modal boundaries, recurring settings, proposed-field exclusion, validation focus, personal task permissions, and uncertain-result recovery.
- Tests use synthetic data and mock transitions. They are **not** tests against the live backend or real employee usability studies.

## Files

- `sense_task_creation_programa_v15.html` — self-contained interactive prototype.
- `sense_v15_desktop.png`, `sense_v15_mobile.png`, `sense_v15_inline_people.png`, `sense_v15_mobile_review.png` — representative review snapshots.
