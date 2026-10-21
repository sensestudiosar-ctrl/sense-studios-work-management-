# My Work card height and test-data diagnosis — 2026-10-12

MW-I02 remains IN PROGRESS. This was a frontend presentation correction and read-only inspection of the retained preview, not a fresh authenticated acceptance harness run.

## No-data diagnosis

The actual Owner Tasks page at http://localhost:59223/tasks?scope=all displays **Showing 1–50 of 50 filtered tasks**, and Create task is enabled. The original owner@local.test has no active employee identity. Its My Work personal queue correctly has zero tasks; the staff fixtures must not be relabeled as Owner personal work.

Each of the five retained synthetic staff accounts has ten total personal tasks; its Active filter excludes completed work. The existing test-only switcher opens staff in its separate authenticated Chromium window while Codex remains Owner. Its current UI lists two Leaders, two Designers and Site Staff. No account/task writes, reseeding or process lifecycle operations occurred here.

Entry points: [Owner Tasks](http://localhost:59223/tasks?scope=all), [Switch test users](http://127.0.0.1:64582/qwunAouoLqWpNf_GMuQ2ciq3CI6omes7).

## Root cause and correction

The Needs action card added a separate 44px Decisions row underneath its source button. The grid stretched the other three cards to that height. At the user's 719×884 viewport, ready cards measured149.5px each.

The card now has two nonoverlapping columns: its source-opening button with two independently labeled count rows, and its separate44×44px Decisions link. The redundant decorative source arrow was removed. The visible link text remains10px; mobile source padding and18px values prevent label wrapping from adding another row. Exceptional loading/denied/stale/unavailable messages remain visible and may naturally increase height. No fixed height clips them. No aggregate count was invented.

Changed frontend files:
- apps/web/src/my-work-metrics.tsx
- apps/web/src/my-work-metrics.test.tsx
- apps/web/src/my-work-visual.css

## Actual geometry

Measurements use the real, already authenticated Owner preview at scrollY0. Queue position here is its heading container, not a populated first-task position.

| CSS viewport | Card heights | Queue heading top | Control overlap | Document overflow |
| --- | --- | ---: | --- | --- |
| 719×884 before | 149.5px ×4 | 305.70px | None | None |
| 719×884 after | 93.5px ×4 | 249.70px | None | None |
| 1024×900 after | 93.5px ×4 | 261.70px | None | None |
| 1440×900 after | 93.5px ×4 | 261.70px | None | None |
| 390×844 after | 86.19px first row /77.09px second row | 312.94px | None | None |
| 320×740 after | 86.19px first row /77.09px second row | 312.94px | None | None |

The reported719px row is56px shorter, approaching the approved prototype's95px desktop minimum. Mobile retains the previously approved2×2 grid and has no horizontal card rail. Both mobile widths retain readable full source labels and separate44px Decisions targets. Actual keyboard Tab moves from source button to Decisions; Shift+Tab returns to the button. Visible link focus was observed. No link is nested in the button.

Reference source: D:/SCRAP/prototype (2).html, hashF8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8. Browser policy blocked file:// navigation, so this turn compares proportions against hash-verified CSS source; it does not claim a newly rendered prototype comparison. No alternate hosting or security workaround was used. In-app screenshot bitmaps can be cropped relative to configured CSS viewports; geometry.json is the exact DOM measurement evidence.

## Checks and classification

Pinned runtime path/established Windows host workflow:
- Final affected frontend set:130/130 tests in9 files PASS.
- Web TypeScript PASS; repository ESLint PASS; production web build PASS.
- Existing chunk-size and ineffective dynamic-import build warnings remain.
- First parallel check attempt:129pass/1 task-filter test timeout at5000ms. Retained unchanged in checks.json. The same set passed serially without changing code/assertions/timeouts. This is timing evidence, not a demonstrated functional regression.
- Full web suite was not rerun;20 previously recorded baseline failures are preserved as prior evidence, not asserted as a current full-suite result.
- Independent GPT-6.1 Sol source review found no material clipping, target, state or semantic issue. Reviewer did not run tests.

## Remaining acceptance boundary

Needs Your Attention and Reviews still await their exact backend predicates; this compaction does not implement that plan. Owner selected Target date for due-today/overdue task attention; that decision is recorded in CARD_INTERACTION_AND_ATTENTION_PLAN_2026-10-12.md. Reviewer-round deadlines remain their existing independent rule.

Shared-shell and future-slice differences are unchanged. No backend/schema/permission/workflow or production/test-record change occurred. Prior evidence is preserved. No MW-I03 or automatic MW-I02 completion.

Context/source/final review used GPT-6.1 Sol. The bounded component subagent was requested with gpt-6-luna but self-reported GPT-6.1 Sol; Luna execution is not claimed as independently verified.

