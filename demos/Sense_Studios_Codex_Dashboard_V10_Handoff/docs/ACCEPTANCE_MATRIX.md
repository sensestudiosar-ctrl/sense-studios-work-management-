# V10 acceptance matrix for Codex

Test the actual integrated application using the repository's supported test tools and authenticated seeded accounts. The original demo's browser screenshots and earlier passing assertions are useful references, **not** proof the integration works.

| Area | Evidence required | Pass rule |
|---|---|---|
| Baseline | Record current verify/lint/typecheck/test/build before edits | No unexplained newly introduced regression; historical failures clearly separated |
| Visual desktop | 1440px and 1024px screenshots of Owner | V10 shell/sidebar/tokens/cards/spacing matched; no empty stretched grid areas |
| Visual mobile | 390px and 320x740 screenshots of Employee and Site | Fixed bottom five destinations, accessible search, no overflow/obscured CTA, first important work accessible |
| Collapsed rail | 1440px Owner collapsed screenshot | Icons and tooltips, active state, Expand, proper content width |
| Desktop page finder | Ctrl/Cmd+K -> type Projects -> Arrow/Enter -> navigate -> Back | Uses permitted route registry, keyboard focus and history correct |
| Mobile More sheet | Open sheet, navigate, Esc/Back, close and focus return | Only authorized links, no offscreen content or trapped scroll |
| Auth contexts | Owner/no Employee, scoped Team Leader, Employee, Site, Reviewer, Cross-branch | No protected data leakage, accurate scope/authority, separate client/external portal |
| Fixed top strip | Verify five demo-style task summaries | Real authorized counts, overlaps acknowledged, Committed-over-Target basis, no invented values; cards non-draggable |
| Action priority | 320x740 view + action tap | First useful action reachable, route to canonical details, no duplicate attention list at top |
| Timer | Start, pause, resume, switch task with confirmation, save, manual entry, leave and return | Single active timer, real allowed API, no silent losses or false save; unsupported state clearly labeled |
| Projects | Select project, open detail, return | Only authorized records, current milestone/status, no fabricated completion percent |
| Owner performance | Open Teams view; change team/metric; switch Employees; choose employee | ONE combined panel; real authorized score, period, team lead, policy/breakdown or truthful unavailable |
| Team Leader performance | Authorized manager login | Employee-only view, no Owner team comparison or unauthorized person names |
| Employee performance | Standard employee login | Management widget absent unless actual explicit permission, no hidden network fetch |
| Review vs approval | Review and decision previews | Different owning source IDs; no generic approve action; valid next actor/action only |
| Dashboard customization | Owner Customize -> hide `projects` -> Add -> drag across columns -> Done -> refresh | Stable ID registry, order persists, optional only, no time/work data persisted to prefs |
| Keyboard customization | Navigate to grips, arrow/move controls, Done | Equivalent reorder without drag; logical focus/announcements |
| Mobile customization | Long-press, reorder touch, mobile up/down, reset | No accidental navigation; no overflow; correct mobile ordering |
| Fixed widgets | Attempt edit summary strip and Attention Queue | Neither can be moved/hidden; Attention Queue remains last, max 2 initial rows |
| Role preference isolation | Save Owner layout, switch authorized test accounts | Different scoped settings, no cross-account data or layout contamination |
| Permission revoked | Revoke permission with drawer/widget open; reload source | Clear current protected content immediately, remove widget/gallery option, ignore late request |
| Error/recovery | Tasks failed; one source unavailable; stale data; 401/403/409/503 | Independent source fallback/retry; unavailable != zero; cached/private data cleared as appropriate |
| Notifications | Read count, mark read, open permitted destination | Same inbox underlying backend, acknowledged write, no path grants |
| Accessibility | Keyboard Tab/Shift-Tab/Esc; screen-reader labels; motion setting | Focus visible, sensible focus trap/return, reduced motion honored, controls readable |
| Mobile scroll | 320x740 with More/Drawer and New Task | Usable under short viewport; safe-area insets; no fixed element overlaying action |
| Source evidence | Code review, security tests and authenticated E2E | Server-authorized scope; no global frontend pull to locally filter; no fabricated APIs |
| Artifact handoff | Before/after captures, tests, audit, gap register | Exact commands/results, admitted unverified parts; no premature “production-ready” declaration |

## Screenshot naming

```
qa/screenshots/v10-owner-1440.png
qa/screenshots/v10-owner-1024.png
qa/screenshots/v10-employee-390.png
qa/screenshots/v10-site-320x740.png
qa/screenshots/v10-owner-collapsed-1440.png
qa/screenshots/v10-owner-widget-edit-1440.png
qa/screenshots/v10-owner-performance-teams.png
qa/screenshots/v10-owner-performance-employees.png
qa/screenshots/v10-manager-performance.png
qa/screenshots/v10-source-error.png
```

## Final status table

In the agent response, enumerate **PASS / FAIL / NOT TESTED / BLOCKED** for each bounded acceptance area. Do not treat mock demo 16/16 tests as app acceptance. Make current source/historical evidence dates explicit.
