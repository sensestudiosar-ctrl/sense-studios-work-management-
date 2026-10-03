# Concrete design review worksheet

Status: prepared, not a completed usability study. Review main mockups at http://127.0.0.1:4178/ and the fictional workflow board at http://127.0.0.1:4179/workflow-fixtures.html. The board illustrates state/context; scene summaries are not new persisted status enums. No domain command executes there.

## Owner choices against actual screens

| Choice | Review location | Recommended baseline / status |
| --- | --- | --- |
| Density | My Work → Display options; compare desktop and mobile | Comfortable default; compact optional on desktop. Pending Owner response. |
| List/board | Project Tasks → view comparison | List first. Informational board only if selected; no drag mutations. Pending. |
| Document entry | Sidebar Documents versus Project Documents | Sidebar project picker → Project Documents using scoped source. Cross-project register conditional. Pending. |
| Palette/typeface | Main desktop/mobile screens and workflow board | Displayed warm cream/forest/system sans. Five selected text pairs checked, not full conformance. Pending. |

## Comprehension review

Use employee, named reviewer, authorized manager and employee-less Owner contexts where applicable. At each scene ask the reviewer to identify state, responsibility, next permitted action/actor, committed date, usable revision and exact decision target before revealing expected guard. Note the actual answer, not a guessed score. Compare the graphic with its labelled list/text equivalent. Record navigation friction rather than claiming faster completion without observations.

| Fixture | Critical correct interpretation | Human result / issue |
| --- | --- | --- |
| Attention/My Work | Named actionable source; own tasks distinct from management actions; read notification does not resolve decision | Not reviewed |
| Review/correction/resubmit | Independent reviewer; exact retained R1/R2; correction completion does not approve parent | Not reviewed |
| Non-review-required task | Existing task completion guard; no unnecessary review invented | Not reviewed |
| Lead-exit hold | Former lead retained as history; current lead vacant; Owner replacement before guarded resume; unmet gates remain | Not reviewed |
| Pending/rejected extension | Committed 1 Oct remains unchanged; requested 5 Oct is proposal, not commitment | Not reviewed |
| Dependency warning | Restricted identity concealed; early-start warning/acknowledgement is not a new hard block | Not reviewed |
| Failed evidence | Retry exact Round 1/R1; cannot decide on substituted R2 or uninspected evidence | Not reviewed |
| Upload finalization | Transferred bytes are not a registered file; failure is not success | Not reviewed |
| Drawing choice/issue/access loss | R0 Do Not Use, R1 approved, R2 working; issue requires own record; protected labels clear on access loss | Not reviewed |

Observation entry: reviewer/context; fixture/scene/width; question; actual answer; wrong interpretation; extra navigation; correction; retest result. Any mistaken ownership/date/revision/decision-target interpretation blocks acceptance of that visual until corrected and re-reviewed. No invented pass percentage or time-saving target.

## Remaining acceptance

- Manual main-screen keyboard order/trap/return and screen-reader semantics/announcements; mobile touch and zoom; chosen semantic colours, focus indicators and graphic equivalents. Board keyboard disclosure, selected 44px control heights, 200% text reflow and reduced-motion preference have automated evidence only.
- Submission, decision, correction assignment, upload and state-change forms still need full connected field-validation/pending/failure/conflict/draft-preservation behavior in authorized implementation. Storyboard labels do not verify forms or commands.
- Exact file viewer, confidential streams/cache revocation, complete scoped lists/counts and all real capability/concurrency/evidence/persistence/audit gates remain implementation acceptance.
- Record four Owner choices, apply them to main mockups/contracts, then obtain explicit final package acceptance before freeze. Continued planning is not approval.
