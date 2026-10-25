# Existing page inventory and navigation mapping

25 October 2026 · Extracted from the current checkout. Deployed release identity is separately recorded.

Found 44 Route declarations (including both catch-all declarations); nested portal screens are stateful views, not separately enumerated route declarations.

Every 28-module internal entry was visited as Owner at 1440/390. Other routes use the anonymous/static inventory; see browser-evidence.json for actual navigation outcomes. `/v15-preview` is not treated as a supported deployed module.

| Existing path | Current purpose/capabilities | Proposed home | Source |
|---|---|---|---|
| `/install` | PWA installation/help | Identity / public / portal / experimental | [main.tsx:28](../../../apps/web/src/main.tsx#L28) |
| `/client-portal/*` | Separate CLIENT authentication, dashboard/review, costs/gallery and devices | Identity / public / portal / experimental | [main.tsx:29](../../../apps/web/src/main.tsx#L29) |
| `/external-portal/*` | Separate EXTERNAL authentication and granted project collaboration | Identity / public / portal / experimental | [main.tsx:30](../../../apps/web/src/main.tsx#L30) |
| `/portfolio` | Published derivatives only | Identity / public / portal / experimental | [main.tsx:31](../../../apps/web/src/main.tsx#L31) |
| `/v15-preview` | Experimental checkout-only composer preview; not presumed deployed | Identity / public / portal / experimental | [main.tsx:32](../../../apps/web/src/main.tsx#L32) |
| `*` | Fallback/not found; main.tsx also forwards internal routes to App | Identity / public / portal / experimental | [main.tsx:33](../../../apps/web/src/main.tsx#L33) |
| `/sign-in` | Role entry hub | Identity / public / portal / experimental | [app.tsx:1031](../../../apps/web/src/app.tsx#L1031) |
| `/staff/sign-in` | Staff passkey sign-in | Identity / public / portal / experimental | [app.tsx:1032](../../../apps/web/src/app.tsx#L1032) |
| `/owner/sign-in` | Owner passkey sign-in | Identity / public / portal / experimental | [app.tsx:1033](../../../apps/web/src/app.tsx#L1033) |
| `/staff/recovery` | Staff recovery | Identity / public / portal / experimental | [app.tsx:1034](../../../apps/web/src/app.tsx#L1034) |
| `/` | Internal entry; signed-in landing redirect; signed-out entry | Identity / public / portal / experimental | [app.tsx:1035](../../../apps/web/src/app.tsx#L1035) |
| `/workspace` | Legacy aggregate; organization/identity, CRM and operational entry | Manage / legacy retained | [app.tsx:1036](../../../apps/web/src/app.tsx#L1036) |
| `/my-work` | Personal queue and existing management drill-down | Daily | [app.tsx:1037](../../../apps/web/src/app.tsx#L1037) |
| `/settings` | Account/devices and authorized organization/team settings | Manage / legacy retained | [app.tsx:1038](../../../apps/web/src/app.tsx#L1038) |
| `/decisions` | Pending approval obligations; owning-workflow links | Daily | [app.tsx:1039](../../../apps/web/src/app.tsx#L1039) |
| `/notifications` | Inbox, delivery and preferences | Identity / public / portal / experimental | [app.tsx:1040](../../../apps/web/src/app.tsx#L1040) |
| `/tasks` | Cross-project task register and canonical create/detail | Daily | [app.tsx:1041](../../../apps/web/src/app.tsx#L1041) |
| `/projects` | Directory/create and eight selected-project sections | Daily | [app.tsx:1042](../../../apps/web/src/app.tsx#L1042) |
| `/people` | Directory/profile, onboarding and identity access | People | [app.tsx:1043](../../../apps/web/src/app.tsx#L1043) |
| `/bootstrap` | First Owner setup | Identity / public / portal / experimental | [app.tsx:1044](../../../apps/web/src/app.tsx#L1044) |
| `/enroll` | Invitation/recovery enrollment | Identity / public / portal / experimental | [app.tsx:1045](../../../apps/web/src/app.tsx#L1045) |
| `/owner-recovery` | Owner recovery | Identity / public / portal / experimental | [app.tsx:1046](../../../apps/web/src/app.tsx#L1046) |
| `/documents` | Project folders/files, upload, Confidential access | Project work | [app.tsx:1047](../../../apps/web/src/app.tsx#L1047) |
| `/revisions` | Drawing/revision register, formal issue/transmittals | Project work | [app.tsx:1048](../../../apps/web/src/app.tsx#L1048) |
| `/reviews` | Independent internal review inbox and exact rounds | Project work | [app.tsx:1049](../../../apps/web/src/app.tsx#L1049) |
| `/client-reviews` | Staff client-access/package/outcome and gallery/portfolio management | Project work | [app.tsx:1050](../../../apps/web/src/app.tsx#L1050) |
| `/external-access` | Exact consultant/vendor/factory grants and requests | Manage / legacy retained | [app.tsx:1051](../../../apps/web/src/app.tsx#L1051) |
| `/turnkey` | Approved inputs, BOQ, materials, procurement and factory | Project work | [app.tsx:1052](../../../apps/web/src/app.tsx#L1052) |
| `/time` | Timer/manual time, corrections, entries and export | People | [app.tsx:1053](../../../apps/web/src/app.tsx#L1053) |
| `/workforce` | Leave/WFH, attendance, allocation, schedule/capacity | People | [app.tsx:1054](../../../apps/web/src/app.tsx#L1054) |
| `/learning` | Legacy combined Skills/Training presentation | People | [app.tsx:1055](../../../apps/web/src/app.tsx#L1055) |
| `/learning/skills` | Official skills, requests, ratings/history | People | [app.tsx:1056](../../../apps/web/src/app.tsx#L1056) |
| `/learning/training` | Exact-version assignments/review/effectiveness | People | [app.tsx:1057](../../../apps/web/src/app.tsx#L1057) |
| `/learning/library` | Versioned SOP, knowledge and training-module records | People | [app.tsx:1058](../../../apps/web/src/app.tsx#L1058) |
| `/performance` | Employee/leader evidence, cycles and policy setup | Insights | [app.tsx:1059](../../../apps/web/src/app.tsx#L1059) |
| `/project-health` | Focused project health/delay evidence and policies | Insights | [app.tsx:1060](../../../apps/web/src/app.tsx#L1060) |
| `/dashboard` | Daily evidence, widgets, summaries, reports, reminders/schedules | Daily | [app.tsx:1061](../../../apps/web/src/app.tsx#L1061) |
| `/reports` | Standard report preview, frozen history/export workflows | Insights | [app.tsx:1062](../../../apps/web/src/app.tsx#L1062) |
| `/integrations` | Calendar/events and website-enquiry integration setup/status | Manage / legacy retained | [app.tsx:1063](../../../apps/web/src/app.tsx#L1063) |
| `/automation` | Saved reports plus event rules and runs | Manage / legacy retained | [app.tsx:1064](../../../apps/web/src/app.tsx#L1064) |
| `/saved-reports` | Focused versioned report definitions/builder | Insights | [app.tsx:1065](../../../apps/web/src/app.tsx#L1065) |
| `/assistance` | Deterministic nonbinding authorized evidence | Insights | [app.tsx:1066](../../../apps/web/src/app.tsx#L1066) |
| `/site` | Site packages, notes, offline capture, manpower, daily reports, snags and handover | Project work | [app.tsx:1067](../../../apps/web/src/app.tsx#L1067) |
| `*` | Fallback/not found; main.tsx also forwards internal routes to App | Identity / public / portal / experimental | [app.tsx:1068](../../../apps/web/src/app.tsx#L1068) |

## Stateful views and query-dependent surfaces

| Family | Existing views / retained behavior |
|---|---|
| Projects | Overview, Plan, Tasks, People, Documents, Reviews, Delivery, Activity; directory query/offset and projectTask keys |
| Tasks | Personal/global/project/subtask contexts; List, Cards, Kanban, Timeline; phase/status/date/owner/collaborator filters; detail/edit/dependencies/reassignment/blocker/committed date/history |
| My Work | Personal attention; source-separated reviews/decisions; management team/employee/phase drill-down; saved views and display preferences |
| Dashboard | Overview, configurable essentials, attention queue, Scheduled summaries, Reports, Reminders & schedules |
| Settings | Account & devices, Notifications, Organization administration, Team workspace, organization/branches/teams, roles/access, task presentation, audit/retention |
| Documents/revisions | Project/folder/file selection; Confidential grants; drawing/revision/version; approved issue/transmittal/acknowledgement and retained superseded evidence |
| Internal review | Accessible vs assigned scope; Waiting/Corrections/Resubmitted/History; selected task/round; reviewer assignment; correction categories and owning actions |
| Client review staff | Project/client access, approved work/evidence, packages/outcomes; private gallery and separate public derivative preparation/publication |
| Client portal | Email-code/passkey entry and recovery states; client dashboard/project/review item/final approval, costs, private gallery, own sessions |
| External portal | Email-code authentication, granted project evidence, requests/submissions and permitted uploads/shares/transmittals; own sessions |
| Workforce | My vs Managed records; Leave & WFH, Attendance, Allocation, Schedule & capacity; policy/holiday/site setup and records |
| Time | Existing task/project/stage context; timer/manual entry, records/corrections/locks and authorized export |
| Learning | Skills profiles/catalogue/requests/history; module assignments/submissions/reviewer/effectiveness; SOP/knowledge/module records/versions/publication/acknowledgement |
| Insights | Employee/leader performance, project health, explicit policies/groups/cycles, delay evidence, report preview/freeze/export/corrections; saved definition/run/chart/history |
| Automation | Report builder/definitions, event-rule configuration, runs, internal notices/report generation, nonbinding recommendations |
| Integrations | Minimal-label calendar subscription and entered events, signed website enquiry configuration/delivery, authorized map links |
| Site | Today/Tomorrow/Workers/Progress/Photos/Snags/Approvals/Decisions/Materials/Blockers/Critical activities; offline queue, notes, packages, manpower, daily reports, independent checks and handover |
| Turnkey | Released exact designs/BOQ, materials, procurement, factory progress, cost/procurement approvals and explicitly shared approved cost snapshots |
| CRM/legacy | Leads/clients/sources, lead lifecycle and project linkage; preserved behind legacy workspace until its new navigation entry is reviewed |

## Current shared components

See MASTER_UX_PLAN section 7 and source-inventory.json for source file hashes, static heading/form/input signals and literal endpoint signals. Dynamic endpoints, conditional forms, state-machine actions and permissions require source/caller inspection; static counts are not a capability acceptance test.
