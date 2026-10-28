# Left navigation panel consolidation — 28 October 2026

Status: proposal report. Scope: the desktop left sidebar (apps/web/src/workspace-navigation.tsx) and the
project section bar (apps/web/src/project.tsx). No backend, schema, or migration changes. The intent
is to cut the number of top-level panels by folding project-scoped panels into a project, so the
left rail stays short while the full detail lives inside the selected project.

## 1. What the left rail shows today

The rail lists 22 destinations grouped into four sections, plus a standalone Dashboard link and a
Settings footer link.

| Group | Panels |
|---|---|
| Work | My Work · Decisions · Notifications · Tasks · Projects · Project documents · Drawing register · Internal reviews · Client reviews · Evidence assistance · Turnkey operations · Site delivery |
| People | People · Time · Workforce · Learning |
| Insights | Performance |
| Manage | Account & settings · Integrations · Automation & reports · External access |
| (top) | Dashboard |

Counting Dashboard and Settings, a user scans 24 top-level items in four collapsible groups.

## 2. What a project already contains

A project (`project.tsx`) already owns eight sections:

    Overview · Plan · Tasks · People · Documents · Reviews · Delivery · Activity

Those sections are where the per-project work happens. The rail panels named in Section 1 mostly
duplicate data that is already reachable inside the selected project.

## 3. Which panels are project-scoped and foldable

These rail panels are scoped to a single project and have a home inside the project section bar.
They are the strong candidates to remove from the top-level rail.

| Rail panel today | Route | Home inside a project | Current role |
|---|---|---|---|
| Project documents | /documents | Documents section (Files) | Cross-project file queue |
| Drawing register | /revisions | Documents section (Drawing register) | Cross-project drawing queue |
| Internal reviews | /reviews | Reviews section (Internal) | Cross-project + assigned-reviewer queue |
| Client reviews | /client-reviews | Reviews section (Client packages) | Cross-project client queue |
| Turnkey operations | /turnkey | Delivery section (Turnkey) | Cross-project turnkey queue |
| Site delivery | /site | Delivery section (Site) | Cross-project site-crew queue |
| External access | /external-access | Project access context | Standalone route; can take a project selector |
| Evidence assistance | /assistance | Project evidence/requests | Cross-project assistance queue |

Folding these out of the rail removes up to eight of the 24 items in one move. The data and routes
are unchanged; the rail stops advertising a queue for every one of them.

## 4. The important nuance — these are cross-project queues, not project-only views

The existing IA decision (docs/design/application-ux-audit-2026-10-25/revision-2/INFORMATION_ARCHITECTURE.md,
§3) deliberately **retained** /documents, /revisions, /reviews, /client-reviews, /turnkey, /site, and
/external-access as *cross-project queues*: a drawing specialist, a turnkey coordinator, or a site
worker can work across many projects without re-selecting one each time. That is the reason they
still sit in the rail.

So the recommendation is not "delete the routes." It is to demote the eight panels from the rail
into a single collapsible disclosure, and keep the routes working. Two ways to do this:

1. **Fold into the project (recommended).** Inside a project, the section bar already exposes
   Documents, Reviews, Delivery. When a user opens a panel from inside a project, land on the
   project section, not the global queue. Remove the eight panels from the top-level Work group and
   keep them reachable three ways: the project section bar, the page finder (Ctrl/Cmd+K), and the
   "More" mobile sheet. Global cross-project queues remain as exact deep links for specialists.

2. **Keep but hide.** If the team wants the global queues visible for specialists, collapse them
   under one disclosure (e.g. a "Project queues" expander) instead of eight separate headings.
   The rail reads shorter; the queues stay one tap away.

Either option keeps 24 destinations reachable; the difference is how many are *always* visible.

## 5. What the rail should look like after consolidation

Collapse the rail to the four homes from the IA spec. The daily home stays visible; the rest are
disclosed.

    Work (visible)
      Dashboard
      My Work
      Decisions
      Tasks
      Projects          ← opening a project exposes its eight sections
      Notifications

    Disclosed
      Project queues     → Documents · Drawing register · Internal reviews · Client reviews ·
                          Turnkey · Site · External access · Evidence assistance
      People             → People · Time · Workforce · Learning
      Insights           → Performance
      Manage             → Settings · Integrations · Automation & reports

Always-visible count drops from ~24 to 8, with everything else one disclosure away. The mobile
bottom bar already does this correctly (Home · My Work · Projects · Decisions · More), so this
aligns desktop with the mobile pattern that shipped in V10.

## 6. Do NOT fold

These are not project-scoped and must stay top-level:

- **My Work, Decisions, Notifications, Tasks, Projects, Dashboard** — cross-project daily surfaces.
- **People, Time, Workforce, Learning** — organizational/employee scope, not a single project.
- **Performance / Project Health** — management oversight.
- **Settings, Integrations, Automation & reports** — configuration, never project-scoped.

## 7. Risk and guardrails

- No route is deleted; only disclosure changes. Specialists keep every deep link and page-finder
  entry. The page finder (Ctrl/Cmd+K) and the desktop filter box are the safety net for any panel
  that gets hidden.
- Permissions are unchanged: a panel is hidden behind a disclosure, not gated off.
- Verify on desktop and mobile (767/768/783px shell switch), long labels, keyboard focus, and the
  "Current" group marker, which auto-expands the group containing the active route.
- Run the scoped web tests, typecheck, lint, and the committed .js twins after the change.

## 8. Recommended next step

Pick Option 1 (fold into the project section bar, keep the eight panels as a single "Project
queues" disclosure) and confirm the exact disclosure label with the Owner. Then update
workspace-navigation.tsx destinationGroups, the mobile More sheet, and the page-finder lists to
match. The eight project routes and their tests stay put.
