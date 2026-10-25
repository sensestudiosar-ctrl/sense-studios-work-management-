# Endpoint-level capability preservation register

Source: deployed commit `70b047cd57af5d4a755e45c5c99b06e4039a46c8`. This is a design coverage register, **not runtime proof of redesigned behavior**. Every existing route and API remains retained until replacement has passed its individual parity case. Administrative/service-only endpoints are not promised new user controls.

| ID | Existing operation / handler | Owning route or API boundary | Proposed home | Deployed source |
|---|---|---|---|---|
| API-001 | `GET ai/context` · context | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:35 |
| API-002 | `GET ai/runs` · list | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:36 |
| API-003 | `POST ai/runs` · create | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:37 |
| API-004 | `GET ai/runs/:id` · get | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:38 |
| API-005 | `POST ai/runs/:id/decisions` · decide | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:39 |
| API-006 | `POST ai/runs/:id/outcomes` · outcome | /assistance | Management → Evidence assistance | apps/api/src/ai-assistance.controller.ts:40 |
| API-007 | `GET approvals/actionable` · actionable | /decisions | Daily → Decisions → owning workflow | apps/api/src/approvals.controller.ts:18 |
| API-008 | `GET approvals/attention` · attention | /decisions | Daily → Decisions → owning workflow | apps/api/src/approvals.controller.ts:28 |
| API-009 | `GET approvals/attention/:requestId` · attentionItem | /decisions | Daily → Decisions → owning workflow | apps/api/src/approvals.controller.ts:40 |
| API-010 | `GET audit/events` · searchEvents | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:72 |
| API-011 | `POST audit/events/:eventId/corrections` · correctEvent | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:84 |
| API-012 | `GET audit/retention` · overview | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:92 |
| API-013 | `PUT audit/retention/config` · configure | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:98 |
| API-014 | `POST audit/events/:eventId/holds` · placeHold | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:105 |
| API-015 | `POST audit/retention/holds/:holdId/release` · releaseHold | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:113 |
| API-016 | `POST audit/retention/notices/:noticeId/acknowledge` · acknowledgeNotice | /settings | Configuration → Audit & retention | apps/api/src/audit-retention.controller.ts:121 |
| API-017 | `GET automation/context` · context | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:59 |
| API-018 | `POST automation/reports/preview` · preview | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:64 |
| API-019 | `POST automation/reports` · saveReport | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:69 |
| API-020 | `PUT automation/reports/:id` · updateReport | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:74 |
| API-021 | `GET automation/reports/:id/preview` · savedPreview | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:79 |
| API-022 | `GET automation/reports/:id/export` · exportSaved | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:84 |
| API-023 | `GET automation/runs/:id/report` · runReport | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:92 |
| API-024 | `GET automation/runs/:id/report/export` · exportRunReport | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:97 |
| API-025 | `POST automation/rules` · saveRule | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:105 |
| API-026 | `PUT automation/rules/:id` · updateRule | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:110 |
| API-027 | `POST automation/runs/:id/decision` · decide | /automation | Configuration → Automation / Management → Reports | apps/api/src/automation.controller.ts:115 |
| API-028 | `GET client-access/projects/:projectId` · list | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-access.controller.ts:38 |
| API-029 | `POST client-access/projects/:projectId/primary` · appoint | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-access.controller.ts:44 |
| API-030 | `POST client-access/grants/:grantId` · change | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-access.controller.ts:50 |
| API-031 | `POST client-portal/auth/code/request` · requestCode | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:110 |
| API-032 | `POST client-portal/auth/code/verify` · verifyCode | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:121 |
| API-033 | `GET client-portal/auth/session` · session | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:133 |
| API-034 | `POST client-portal/auth/logout` · logout | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:153 |
| API-035 | `GET client-portal/auth/sessions` · sessions | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:166 |
| API-036 | `DELETE client-portal/auth/sessions/:id` · revoke | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:175 |
| API-037 | `POST client-portal/auth/passkeys/options` · registerOptions | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:187 |
| API-038 | `POST client-portal/auth/passkeys/verify` · registerVerify | /client-portal | CLIENT portal (separate session) | apps/api/src/client-portal-identity.controller.ts:197 |
| API-039 | `GET client-portal/reviews/projects/:projectId` · project | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:55 |
| API-040 | `GET client-portal/reviews/items/:itemId` · item | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:61 |
| API-041 | `POST client-portal/reviews/items/:itemId/comments` · comment | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:67 |
| API-042 | `POST client-portal/reviews/items/:itemId/start` · start | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:73 |
| API-043 | `POST client-portal/reviews/items/:itemId/approval-options` · approvalOptions | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:79 |
| API-044 | `POST client-portal/reviews/items/:itemId/decision` · decide | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:85 |
| API-045 | `POST client-portal/reviews/packages/:packageId/approval-options` · finalOptions | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:92 |
| API-046 | `POST client-portal/reviews/packages/:packageId/final-approval` · finalApprove | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-review.controller.ts:98 |
| API-047 | `GET client-portal/projects` · projects | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:34 |
| API-048 | `GET client-portal/projects/:id/handover` · handover | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:36 |
| API-049 | `POST client-portal/handover/:id/acknowledge` · acknowledge | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:38 |
| API-050 | `GET client-portal/projects/:id/access` · access | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:40 |
| API-051 | `POST client-portal/projects/:id/invitations` · invite | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:42 |
| API-052 | `POST client-portal/item-grants` · grant | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:44 |
| API-053 | `GET client-portal/items/:id/stream` · stream | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:59 |
| API-054 | `POST client-portal/items/:id/references` · reference | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:65 |
| API-055 | `GET client-portal/references/:id/stream` · referenceStream | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-portal-scope.controller.ts:83 |
| API-056 | `GET client-reviews/projects/:projectId` · project | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:50 |
| API-057 | `POST client-reviews/projects/:projectId/packages` · createPackage | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:56 |
| API-058 | `POST client-reviews/items/:itemId/classification` · classify | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:61 |
| API-059 | `POST client-reviews/items/:itemId/correction` · assignCorrection | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:66 |
| API-060 | `POST client-reviews/items/:itemId/resume` · resumeCorrection | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:71 |
| API-061 | `POST client-reviews/tasks/:taskId/complete` · completeTask | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/client-review.controller.ts:76 |
| API-062 | `GET crm/setup` · setup | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:35 |
| API-063 | `GET crm/leads` · leads | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:36 |
| API-064 | `GET crm/leads/:id` · detail | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:43 |
| API-065 | `POST crm/leads` · create | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:44 |
| API-066 | `PUT crm/leads/:id` · update | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:45 |
| API-067 | `POST crm/leads/:id/stage` · stage | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:46 |
| API-068 | `POST crm/leads/:id/activities` · addActivity | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:47 |
| API-069 | `GET crm/clients` · clients | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:48 |
| API-070 | `POST crm/sources` · createSource | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:49 |
| API-071 | `PUT crm/sources/:id` · updateSource | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:50 |
| API-072 | `POST crm/clients` · createClient | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:51 |
| API-073 | `PUT crm/clients/:id` · updateClient | /workspace | Management → Sales & clients (existing CRM) | apps/api/src/crm.controller.ts:52 |
| API-074 | `GET /dashboard` · dashboard | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:61 |
| API-075 | `GET /dashboard/sources/:source` · source | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:67 |
| API-076 | `GET /reports/context` · context | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:74 |
| API-077 | `POST /reports/preview` · preview | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:80 |
| API-078 | `POST /reports/snapshots` · freeze | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:88 |
| API-079 | `GET /reports/snapshots` · snapshots | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:96 |
| API-080 | `GET /reports/snapshots/:id/export` · snapshotExport | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:102 |
| API-081 | `GET /reports/snapshots/:id` · snapshot | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:111 |
| API-082 | `GET /reports/export` · export | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:117 |
| API-083 | `GET /dashboard/schedules` · schedules | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:126 |
| API-084 | `POST /dashboard/schedules` · addSchedule | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:132 |
| API-085 | `POST /dashboard/schedules/:id` · updateSchedule | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:139 |
| API-086 | `GET /dashboard/reminders` · reminders | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:146 |
| API-087 | `GET /dashboard/summaries` · summaries | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:152 |
| API-088 | `POST /dashboard/reminders` · addReminder | /dashboard | Daily → Dashboard / Management → scheduled summaries | apps/api/src/dashboard.controller.ts:158 |
| API-089 | `GET documents/project-picker` · projectPicker | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:30 |
| API-090 | `GET documents/projects/:projectId` · list | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:35 |
| API-091 | `POST documents/projects/:projectId/folders` · createFolder | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:36 |
| API-092 | `POST documents/projects/:projectId/provision-template` · provisionTemplate | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:37 |
| API-093 | `POST documents/folders/:folderId/retry` · retryFolder | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:38 |
| API-094 | `POST documents/projects/:projectId/uploads` · startUpload | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:39 |
| API-095 | `PUT documents/uploads/:uploadId/chunks/:index` · chunk | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:40 |
| API-096 | `POST documents/uploads/:uploadId/finalize` · finalize | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:47 |
| API-097 | `GET documents/files/:fileId/stream` · stream | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:48 |
| API-098 | `GET documents/projects/:projectId/grants` · grants | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:56 |
| API-099 | `POST documents/projects/:projectId/grants` · grant | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:57 |
| API-100 | `POST documents/grants/:grantId/revoke` · revoke | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:58 |
| API-101 | `GET documents/reconciliation` · reconciliation | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:59 |
| API-102 | `POST documents/reconciliation` · reconcile | /documents | Project → Documents / Files | apps/api/src/document.controller.ts:60 |
| API-103 | `GET external-access/projects/:projectId` · workspace | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:73 |
| API-104 | `POST external-access/projects/:projectId/grants` · createGrant | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:79 |
| API-105 | `POST external-access/grants/:grantId/change` · changeGrant | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:85 |
| API-106 | `POST external-access/projects/:projectId/requests` · createRequest | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:91 |
| API-107 | `POST external-access/projects/:projectId/cad-shares` · issueCad | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:97 |
| API-108 | `POST external-access/cad-shares/:shareId/revoke` · revokeCad | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:103 |
| API-109 | `GET external-access/uploads/:uploadId/file` · uploadFile | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:109 |
| API-110 | `GET external-access/cad-shares/:shareId` · ownerCadShare | /external-access | Project → Access / Configuration → External access | apps/api/src/external-access.controller.ts:116 |
| API-111 | `POST external-portal/auth/code` · requestCode | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:80 |
| API-112 | `POST external-portal/auth/verify` · verify | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:91 |
| API-113 | `GET external-portal/auth/session` · session | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:103 |
| API-114 | `POST external-portal/auth/logout` · logout | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:116 |
| API-115 | `GET external-portal/auth/sessions` · sessions | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:129 |
| API-116 | `DELETE external-portal/auth/sessions/:sessionId` · revoke | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal-identity.controller.ts:138 |
| API-117 | `GET external-portal/projects` · projects | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:79 |
| API-118 | `GET external-portal/projects/:projectId` · workspace | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:85 |
| API-119 | `GET external-portal/revisions/:revisionId/file` · revisionFile | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:91 |
| API-120 | `POST external-portal/projects/:projectId/submissions` · submit | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:99 |
| API-121 | `POST external-portal/transmittals/:transmittalId/acknowledge` · acknowledge | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:107 |
| API-122 | `GET external-portal/cad-shares/:shareId` · cadShare | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:114 |
| API-123 | `POST external-portal/projects/:projectId/uploads` · uploadStart | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:120 |
| API-124 | `PUT external-portal/uploads/:uploadId/chunks/:index` · uploadChunk | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:127 |
| API-125 | `POST external-portal/uploads/:uploadId/finalize` · uploadFinalize | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:138 |
| API-126 | `GET external-portal/uploads/:uploadId/file` · uploadFile | /external-access | Project → Access / EXTERNAL portal | apps/api/src/external-portal.controller.ts:145 |
| API-127 | `GET galleries/projects/:projectId` · workspace | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:32 |
| API-128 | `POST galleries/projects/:projectId` · add | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:33 |
| API-129 | `GET portfolio/projects/:projectId` · workspace | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:49 |
| API-130 | `POST portfolio/projects/:projectId` · prepareDerivative | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:50 |
| API-131 | `POST portfolio/:id/publish` · publish | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:51 |
| API-132 | `POST portfolio/:id/withdraw` · withdraw | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:52 |
| API-133 | `GET client-portal/projects/:projectId/gallery` · list | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:65 |
| API-134 | `GET client-portal/projects/:projectId/gallery/items/:itemId/stream` · stream | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:66 |
| API-135 | `GET public/portfolio/` · list | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:79 |
| API-136 | `GET public/portfolio/:id/stream` · stream | /client-reviews | Project → Reviews / Client or Presentation | apps/api/src/gallery.controller.ts:80 |
| API-137 | `GET health/live` · live | API only | System diagnostics (existing API) | apps/api/src/health.controller.ts:15 |
| API-138 | `GET health/release` · release | API only | System diagnostics (existing API) | apps/api/src/health.controller.ts:21 |
| API-139 | `GET health/ready` · ready | API only | System diagnostics (existing API) | apps/api/src/health.controller.ts:27 |
| API-140 | `POST auth/bootstrap/options` · bootstrapOptions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:82 |
| API-141 | `POST auth/bootstrap/verify` · bootstrapVerify | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:91 |
| API-142 | `POST auth/passkey/login/options` · loginOptions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:103 |
| API-143 | `POST auth/passkey/login/verify` · loginVerify | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:112 |
| API-144 | `GET auth/session` · session | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:123 |
| API-145 | `POST auth/logout` · logout | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:141 |
| API-146 | `GET auth/sessions` · sessions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:151 |
| API-147 | `DELETE auth/sessions/:id` · revoke | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:158 |
| API-148 | `POST auth/passkey/register/options` · registerOptions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:168 |
| API-149 | `POST auth/passkey/register/verify` · registerVerify | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:177 |
| API-150 | `POST auth/staff/invitations` · inviteStaff | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:188 |
| API-151 | `POST auth/staff/invitations/options` · invitationOptions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:198 |
| API-152 | `POST auth/staff/invitations/verify` · invitationVerify | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:206 |
| API-153 | `POST auth/staff/:id/recovery` · staffRecovery | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:218 |
| API-154 | `GET auth/staff` · lookupStaff | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:229 |
| API-155 | `POST auth/staff/:id/revoke-sessions` · forceLogoutStaff | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:237 |
| API-156 | `POST auth/owner/recovery-code` · issueOwnerRecoveryCode | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:248 |
| API-157 | `POST auth/owner/recovery-code/ack` · acknowledgeOwnerRecoveryCode | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:257 |
| API-158 | `POST auth/owner/recovery/options` · ownerRecoveryOptions | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:267 |
| API-159 | `POST auth/owner/recovery/verify` · ownerRecoveryVerify | /settings | Identity / Account & devices | apps/api/src/identity.controller.ts:276 |
| API-160 | `GET integrations/setup` · setup | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:63 |
| API-161 | `GET integrations/calendar` · calendar | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:70 |
| API-162 | `GET integrations/calendar.ics` · calendarFile | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:77 |
| API-163 | `POST integrations/calendar/subscription` · createSubscription | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:84 |
| API-164 | `DELETE integrations/calendar/subscription` · revokeSubscription | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:91 |
| API-165 | `GET integrations/calendar/subscriptions/:token.ics` · publicCalendar | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:98 |
| API-166 | `POST integrations/calendar/events` · createEvent | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:113 |
| API-167 | `PUT integrations/calendar/events/:id` · updateEvent | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:123 |
| API-168 | `POST integrations/calendar/events/:id/cancel` · cancelEvent | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:133 |
| API-169 | `POST integrations/website-connectors` · createWebsiteConnector | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:140 |
| API-170 | `POST integrations/website-connectors/:id/rotate` · rotateWebsiteConnector | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:147 |
| API-171 | `POST integrations/website-connectors/:id/disable` · disableWebsiteConnector | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:154 |
| API-172 | `POST integrations/website-enquiries/:id` · websiteEnquiry | /integrations | Daily → Calendar / Configuration → Integrations | apps/api/src/integration.controller.ts:161 |
| API-173 | `GET library/setup` · setup | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:33 |
| API-174 | `GET library/` · list | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:34 |
| API-175 | `GET library/:recordId` · detail | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:41 |
| API-176 | `POST library/` · create | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:42 |
| API-177 | `POST library/:recordId/versions` · appendVersion | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:47 |
| API-178 | `POST library/:recordId/activate` · activateModule | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:51 |
| API-179 | `POST library/:recordId/publication-requests` · requestPublication | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:55 |
| API-180 | `POST library/publication-requests/:requestId/decision` · decidePublication | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:59 |
| API-181 | `POST library/:recordId/publish` · publishDirect | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:63 |
| API-182 | `POST library/:recordId/uploads` · startUpload | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:67 |
| API-183 | `PUT library/uploads/:uploadId/chunks/:index` · chunk | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:71 |
| API-184 | `POST library/uploads/:uploadId/finalize` · finalizeUpload | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:78 |
| API-185 | `GET library/files/:fileId/stream` · streamFile | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:82 |
| API-186 | `POST library/versions/:versionId/acknowledgements` · acknowledge | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:88 |
| API-187 | `POST library/references` · reference | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/library.controller.ts:91 |
| API-188 | `GET my-work/attention` · attention | /my-work | Daily → My Work | apps/api/src/my-work.controller.ts:15 |
| API-189 | `GET notifications/` · inbox | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:44 |
| API-190 | `GET notifications/unread` · unread | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:57 |
| API-191 | `PATCH notifications/:id/read` · markRead | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:64 |
| API-192 | `GET notifications/preferences` · preferences | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:71 |
| API-193 | `GET notifications/email-status` · emailStatus | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:78 |
| API-194 | `POST notifications/email-verification` · requestEmailVerification | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:89 |
| API-195 | `POST notifications/email-verification/verify` · verifyEmail | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:95 |
| API-196 | `PUT notifications/preferences` · setPreference | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:101 |
| API-197 | `PUT notifications/quiet-hours` · setQuietHours | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:108 |
| API-198 | `DELETE notifications/quiet-hours` · clearQuietHours | /notifications | Daily → Notifications / Configuration → notification preferences | apps/api/src/notifications.controller.ts:114 |
| API-199 | `GET org/` · getOrganization | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:103 |
| API-200 | `POST org/` · createOrganization | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:110 |
| API-201 | `GET org/branches` · listBranches | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:117 |
| API-202 | `POST org/branches` · createBranch | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:125 |
| API-203 | `GET org/teams` · listTeams | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:132 |
| API-204 | `PUT org/:id/timezone` · changeTimezone | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:140 |
| API-205 | `PUT org/teams/:id/waiting-alerts` · changeWaitingAlerts | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:146 |
| API-206 | `POST org/teams` · createTeam | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:152 |
| API-207 | `GET org/roles` · listJobRoles | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:159 |
| API-208 | `GET org/permission-catalogue` · permissionCatalogue | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:167 |
| API-209 | `POST org/roles` · createJobRole | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:175 |
| API-210 | `PUT org/roles/:roleId/creation-presentation` · setJobRoleCreationPresentation | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:182 |
| API-211 | `GET org/employees` · listEmployees | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:190 |
| API-212 | `POST org/employees` · createEmployee | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:198 |
| API-213 | `PUT org/employees/:id/membership` · changeMembership | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:211 |
| API-214 | `PUT org/employees/:id/job-roles` · setEmployeeJobRoles | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:222 |
| API-215 | `POST org/roles/:roleId/permissions` · grantRolePermission | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:230 |
| API-216 | `PUT org/roles/:roleId/permissions/:permissionId/revoke` · revokeRolePermission | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:242 |
| API-217 | `POST org/employees/:id/permissions` · grantEmployeeOverride | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:251 |
| API-218 | `PUT org/employees/:id/permissions/:overrideId/revoke` · revokeEmployeeOverride | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:263 |
| API-219 | `PUT org/employees/:id/suspend` · suspendEmployee | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:272 |
| API-220 | `POST org/employees/:id/exit` · finalizeEmployeeExit | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:280 |
| API-221 | `GET org/team/employees` · listManagedEmployees | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:288 |
| API-222 | `GET org/self` · myEmployeeProfile | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:296 |
| API-223 | `PUT org/team/employees/:id/reporting` · changeManagedEmployeeReporting | /people | Management → People / Configuration → Organization | apps/api/src/organization.controller.ts:307 |
| API-224 | `GET performance/context` · context | /performance | Management → Insights / Configuration → Scoring policies | apps/api/src/performance.controller.ts:36 |
| API-225 | `GET performance/employees/:id` · employee | /performance | Management → Insights / Configuration → Scoring policies | apps/api/src/performance.controller.ts:42 |
| API-226 | `GET performance/projects/:id` · project | /performance | Management → Insights / Configuration → Scoring policies | apps/api/src/performance.controller.ts:48 |
| API-227 | `POST performance/commands` · command | /performance | Management → Insights / Configuration → Scoring policies | apps/api/src/performance.controller.ts:54 |
| API-228 | `GET project-templates/` · list | /projects | Project → Plan / Configuration → Templates | apps/api/src/project-template.controller.ts:50 |
| API-229 | `POST project-templates/` · create | /projects | Project → Plan / Configuration → Templates | apps/api/src/project-template.controller.ts:57 |
| API-230 | `POST project-templates/:id/versions` · version | /projects | Project → Plan / Configuration → Templates | apps/api/src/project-template.controller.ts:63 |
| API-231 | `GET projects/setup` · setup | /projects | Project work → Projects | apps/api/src/project.controller.ts:38 |
| API-232 | `GET projects/` · list | /projects | Project work → Projects | apps/api/src/project.controller.ts:39 |
| API-233 | `GET projects/:id` · detail | /projects | Project work → Projects | apps/api/src/project.controller.ts:50 |
| API-234 | `GET projects/:id/plan` · plan | /projects | Project work → Projects | apps/api/src/project.controller.ts:51 |
| API-235 | `POST projects/:id/plan-items/:itemId/complete` · completePlanItem | /projects | Project work → Projects | apps/api/src/project.controller.ts:52 |
| API-236 | `POST projects/` · create | /projects | Project work → Projects | apps/api/src/project.controller.ts:53 |
| API-237 | `POST projects/:id/assignments` · assign | /projects | Project work → Projects | apps/api/src/project.controller.ts:54 |
| API-238 | `DELETE projects/:id/assignments/:employeeId` · revoke | /projects | Project work → Projects | apps/api/src/project.controller.ts:55 |
| API-239 | `POST projects/:id/lead` · lead | /projects | Project work → Projects | apps/api/src/project.controller.ts:56 |
| API-240 | `POST projects/:id/status` · status | /projects | Project work → Projects | apps/api/src/project.controller.ts:57 |
| API-241 | `POST projects/:id/transfer` · transfer | /projects | Project work → Projects | apps/api/src/project.controller.ts:58 |
| API-242 | `POST projects/:id/scope-approver` · scopeApprover | /projects | Project work → Projects | apps/api/src/project.controller.ts:59 |
| API-243 | `POST projects/:id/scope-requests` · scopeRequest | /projects | Project work → Projects | apps/api/src/project.controller.ts:60 |
| API-244 | `POST projects/:id/scope-requests/:approvalId/decision` · scopeDecision | /projects | Project work → Projects | apps/api/src/project.controller.ts:61 |
| API-245 | `POST projects/:id/scope-requests/:approvalId/withdraw` · scopeWithdraw | /projects | Project work → Projects | apps/api/src/project.controller.ts:62 |
| API-246 | `POST projects/:id/cancellation-requests` · cancellationRequest | /projects | Project work → Projects | apps/api/src/project.controller.ts:63 |
| API-247 | `POST projects/:id/cancel` · cancel | /projects | Project work → Projects | apps/api/src/project.controller.ts:64 |
| API-248 | `POST reviews/tasks/:taskId/routing` · configureRouting | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:91 |
| API-249 | `POST reviews/tasks/:taskId/routing/retry` · retryRouting | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:95 |
| API-250 | `POST reviews/tasks/:taskId/routing/revoke` · revokeRouting | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:99 |
| API-251 | `GET reviews/projects/:projectId/confirmed-drawings` · confirmedDrawings | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:103 |
| API-252 | `GET reviews/actionable` · actionable | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:109 |
| API-253 | `GET reviews/inbox` · inbox | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:115 |
| API-254 | `GET reviews/tasks/:taskId` · detail | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:131 |
| API-255 | `POST reviews/tasks/:taskId/reviewer` · assignReviewer | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:137 |
| API-256 | `POST reviews/tasks/:taskId/submit` · submit | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:142 |
| API-257 | `POST reviews/rounds/:roundId/start` · start | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:147 |
| API-258 | `POST reviews/rounds/:roundId/comment` · comment | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:152 |
| API-259 | `POST reviews/rounds/:roundId/decision` · decision | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:157 |
| API-260 | `POST reviews/rounds/:roundId/correction` · assignCorrection | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:162 |
| API-261 | `POST reviews/tasks/:taskId/complete` · complete | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:167 |
| API-262 | `GET reviews/categories` · categories | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:172 |
| API-263 | `POST reviews/categories` · createCategory | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:178 |
| API-264 | `POST reviews/categories/:categoryId/active` · setCategoryActive | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:183 |
| API-265 | `POST reviews/rounds/:roundId/escalate` · escalate | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:188 |
| API-266 | `POST reviews/rounds/:roundId/withdraw` · withdraw | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:193 |
| API-267 | `POST reviews/rounds/:roundId/priority` · changePriority | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:198 |
| API-268 | `POST reviews/rounds/:roundId/deadline` · changeDeadline | /reviews | Daily → Reviews / Project → Internal review | apps/api/src/review.controller.ts:203 |
| API-269 | `GET revisions/projects/:projectId` · list | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:70 |
| API-270 | `POST revisions/projects/:projectId/drawings` · createDrawing | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:76 |
| API-271 | `POST revisions/drawings/:drawingId` · appendRevision | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:81 |
| API-272 | `POST revisions/drawings/:drawingId/client-review` · selectClientReview | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:86 |
| API-273 | `POST revisions/projects/:projectId/issues` · issue | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:91 |
| API-274 | `POST revisions/transmittals/:transmittalId/acknowledge` · acknowledge | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:96 |
| API-275 | `GET revisions/:revisionId/stream` · stream | /revisions | Project → Documents / Drawing register | apps/api/src/revision.controller.ts:102 |
| API-276 | `POST site/projects/:id/offline-commands` · offlineCommand | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:65 |
| API-277 | `POST site/projects/:id/offline-photos` · offlinePhoto | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:66 |
| API-278 | `GET site/projects` · list | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:67 |
| API-279 | `GET site/projects/:id` · detail | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:68 |
| API-280 | `POST site/projects/:id/responsible` · responsible | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:69 |
| API-281 | `POST site/projects/:id/packages` · createPackage | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:70 |
| API-282 | `POST site/packages/:id/progress` · progress | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:71 |
| API-283 | `POST site/packages/:id/complete` · completePackage | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:72 |
| API-284 | `POST site/projects/:id/manpower` · manpower | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:73 |
| API-285 | `POST site/projects/:id/reports` · report | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:74 |
| API-286 | `POST site/reports/:id/confirm` · confirmReport | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:75 |
| API-287 | `POST site/projects/:id/snags` · snag | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:76 |
| API-288 | `POST site/snags/:id/assign` · assignFixer | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:77 |
| API-289 | `POST site/snags/:id/start` · startRepair | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:78 |
| API-290 | `POST site/snags/:id/ready` · readyRepair | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:79 |
| API-291 | `POST site/snags/:id/verifier` · appointVerifier | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:80 |
| API-292 | `POST site/snags/:id/verify` · verify | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:81 |
| API-293 | `POST site/snags/:id/close` · closeSnag | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:82 |
| API-294 | `POST site/projects/:id/handover` · handover | /site | Project → Delivery → Site | apps/api/src/site.controller.ts:83 |
| API-295 | `GET skills/setup` · setup | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:27 |
| API-296 | `GET skills/employees/:employeeId` · profile | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:28 |
| API-297 | `POST skills/catalogue` · catalogue | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:29 |
| API-298 | `POST skills/requests` · createRequest | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:30 |
| API-299 | `POST skills/requests/:requestId/decision` · decide | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:33 |
| API-300 | `POST skills/ratings` · rating | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/skills.controller.ts:34 |
| API-301 | `GET tasks/:id/recurrence/` · detail | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task-recurrence.controller.ts:20 |
| API-302 | `PUT tasks/:id/recurrence/` · configure | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task-recurrence.controller.ts:21 |
| API-303 | `POST tasks/:id/recurrence/pause` · pause | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task-recurrence.controller.ts:22 |
| API-304 | `POST tasks/:id/recurrence/resume` · resume | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task-recurrence.controller.ts:23 |
| API-305 | `GET tasks/setup` · setup | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:55 |
| API-306 | `GET tasks/creation-options` · creationOptions | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:56 |
| API-307 | `GET tasks/` · list | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:62 |
| API-308 | `GET tasks/actionable` · actionable | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:75 |
| API-309 | `GET tasks/attention` · attention | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:81 |
| API-310 | `GET tasks/:id` · detail | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:86 |
| API-311 | `GET tasks/:id/subtasks` · subtasks | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:87 |
| API-312 | `GET tasks/:id/dependency-candidates` · dependencyCandidates | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:88 |
| API-313 | `GET tasks/:id/extension-approvers` · extensionApprovers | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:89 |
| API-314 | `POST tasks/` · create | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:90 |
| API-315 | `POST tasks/:id/subtasks` · createSubtask | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:91 |
| API-316 | `POST tasks/closeout` · closeout | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:92 |
| API-317 | `PUT tasks/:id` · edit | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:93 |
| API-318 | `POST tasks/:id/state` · state | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:94 |
| API-319 | `POST tasks/:id/wait` · wait | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:95 |
| API-320 | `POST tasks/:id/resume` · resume | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:96 |
| API-321 | `POST tasks/:id/committed-date` · committedDate | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:97 |
| API-322 | `POST tasks/:id/extension-requests` · requestExtension | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:98 |
| API-323 | `POST tasks/:id/extension-requests/:approvalId/decision` · decideExtension | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:99 |
| API-324 | `POST tasks/:id/extension-requests/:approvalId/withdraw` · withdrawExtension | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:100 |
| API-325 | `POST tasks/:id/dependencies` · addDependency | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:101 |
| API-326 | `POST tasks/:id/dependencies/:predecessorId/remove` · removeDependency | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:102 |
| API-327 | `POST tasks/:id/reassign` · reassign | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:103 |
| API-328 | `POST tasks/:id/closeout/revoke` · revokeCloseout | /tasks | Daily → Tasks / Project → Tasks | apps/api/src/task.controller.ts:104 |
| API-329 | `GET time/setup` · setup | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:18 |
| API-330 | `GET time/` · list | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:19 |
| API-331 | `POST time/timers` · start | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:20 |
| API-332 | `POST time/timers/:id/:action` · timer | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:21 |
| API-333 | `POST time/entries` · manual | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:22 |
| API-334 | `POST time/entries/:id/corrections` · correct | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:23 |
| API-335 | `POST time/entries/:id/approve` · approve | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:24 |
| API-336 | `POST time/entries/:id/export` · export | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:25 |
| API-337 | `POST time/deliveries/:id/retry` · retry | /time | Daily → Time / Management → time records | apps/api/src/time.controller.ts:26 |
| API-338 | `GET training/setup` · setup | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:26 |
| API-339 | `GET training/assignments` · list | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:27 |
| API-340 | `GET training/assignments/:id` · detail | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:28 |
| API-341 | `POST training/assignments` · assign | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:29 |
| API-342 | `POST training/assignments/:id/submissions` · submit | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:34 |
| API-343 | `POST training/assignments/:id/assessments` · assess | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:39 |
| API-344 | `POST training/assignments/:id/effectiveness` · effectiveness | /learning | Daily → Learning / Management → Learning / Configuration → Catalogue | apps/api/src/training.controller.ts:43 |
| API-345 | `GET turnkey/projects` · list | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:36 |
| API-346 | `GET turnkey/projects/:id` · detail | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:37 |
| API-347 | `POST turnkey/projects/:id/releases` · create | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:38 |
| API-348 | `POST turnkey/releases/:id/cost-request` · costRequest | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:39 |
| API-349 | `POST turnkey/releases/:id/cost-decision` · costDecision | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:40 |
| API-350 | `POST turnkey/releases/:id/materials` · materials | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:41 |
| API-351 | `POST turnkey/releases/:id/procurement-request` · procurementRequest | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:42 |
| API-352 | `POST turnkey/releases/:id/procurement-decision` · procurementDecision | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:43 |
| API-353 | `POST turnkey/releases/:id/progress` · progress | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:44 |
| API-354 | `POST turnkey/releases/:id/cost-share` · share | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:45 |
| API-355 | `GET client-portal/projects/:id/costs` · costs | /turnkey | Project → Delivery → Turnkey | apps/api/src/turnkey.controller.ts:52 |
| API-356 | `GET workforce/setup` · setup | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:16 |
| API-357 | `GET workforce/` · list | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:17 |
| API-358 | `POST workforce/policies` · policy | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:18 |
| API-359 | `POST workforce/schedules` · schedules | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:19 |
| API-360 | `POST workforce/overrides` · overrides | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:20 |
| API-361 | `POST workforce/holidays` · holidays | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:21 |
| API-362 | `POST workforce/sites` · sites | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:22 |
| API-363 | `POST workforce/allocations` · allocations | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:23 |
| API-364 | `POST workforce/leave` · leave | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:24 |
| API-365 | `POST workforce/leave/:id/decide` · decide | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:25 |
| API-366 | `POST workforce/leave/:id/cancel` · cancel | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:26 |
| API-367 | `POST workforce/leave/:id/cancel-decide` · cancelDecide | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:27 |
| API-368 | `POST workforce/attendance/check-in` · checkIn | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:28 |
| API-369 | `POST workforce/attendance/:id/check-out` · checkOut | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:29 |
| API-370 | `POST workforce/attendance/:id/review` · review | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:30 |
| API-371 | `GET workforce/attendance/:id/selfie` · selfie | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:31 |
| API-372 | `POST workforce/attendance/:id/selfie-retention` · retention | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:32 |
| API-373 | `POST workforce/attendance/selfie-purges/reconcile` · reconcile | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:33 |
| API-374 | `POST workforce/entitlements/sync` · entitlements | /workforce | Daily → Workforce / Management → Workforce / Configuration → Policies | apps/api/src/workforce.controller.ts:34 |
