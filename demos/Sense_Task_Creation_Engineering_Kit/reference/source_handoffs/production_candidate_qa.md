# Sense Studios V15-RC1 — Quality Report

**Test date:** 24 October 2026  
**Environment:** Chromium headless, standalone HTML in a contained browser; synthetic participant data and simulated API responses.  
**Result:** Browser regression and candidate-level test assertions pass.

## Verified automated checks

| Suite | Assertions | Result |
|---|---:|---|
| V15 primary workflow tests | 89 | PASS |
| V15 regression tests | 45 | PASS |
| RC-level checks (at 1440, 1024, 783, 390, 320 widths and extra focus/recovery cases) | 63 | PASS |
| **Total** | **197** | **PASS** |

Checks covered: title/description/assignment/date creation; avatar picker; two assignees and strict owner/collaborator payload; subtask draft keyboard/reorder; review routing; recurrence UI exclusion from payload; first error focus; personal-task review context; client-review sequencing; simulated created-task detail; horizontal overflow; sticky create button; valid ARIA dialog; editable draft saved; in-page session recovery simulation; recovery banner dismissal; reset clears saved draft; stale/uncertain result check; unsaved close confirmation; trigger focus restoration; Escape from the calendar before dismissing dialog.

**Limitation:** The RC draft tests mocked `sessionStorage` and invoked the restore lifecycle in the same document. A full real navigation/reload with browser storage was **not** verified because navigation to local file/loopback URLs was blocked by this browser environment. Do not describe it as a passed physical browser reload test.

## Intentional gates and restrictions

- The candidate is **not connected** to real `GET /tasks/setup`, `GET /tasks/creation-options`, `POST /tasks` or `POST /tasks/:id/subtasks` endpoints.
- No backend writes, database migrations, client review deliveries or real file uploads were performed.
- Production named reviewer assignment and recurrence frequencies are **not supported** by the strict create API. Visual selectors must be behind feature flags until approved backend extensions are implemented.
- Draft recovery is a **demo-only sessionStorage pattern** pending product/security validation.
- Real server idempotency, overload warnings and uncertain outcomes are simulated, not integration-tested.
- Physical iOS/Android safe-area, browser virtual keyboard, 200% zoom, screen-reader audit, colour-contrast audit and employee usability testing remain open.

## Required pre-release validation

**P0** — same-org/branch eligible assignments; unauthorized options ignored; project changes clear stale permissions; confirmed create payload strict; positive version for subtask; CSRF/credentials; idempotency key replay; capacity opt-in; unknown outcome result check; correct review immutability and authorized client route.  
**P1** — manual assistive technology and touch testing, project names and assignee lists with long strings, draft recovery storage policy, uploads and comments as separate post-create flows.  
**P2** — reduced motion, help text polish and localized date formatting confirmation.

**Decision:** Ready for engineering implementation as the V15 visual reference. **Not live-release approved.**
