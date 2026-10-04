# S21 external portal implementation contract

Status: implemented and accepted for development/local staging under S21_SPEC.md and Owner decisions 2026-10-04; see S21_COMPLETION_REPORT.md. Names below are the shared API; any coordinated implementation adjustment must update this document and callers. IDs are UUIDs; dates serialize as ISO strings. Strict request schemas reject unknown fields. Reasons and native cancellation confirmations have 3–1000 characters; titles have 1–160 and bodies 1–2000 characters. User text is rendered as text.

## Identity

EXTERNAL accounts are distinct from OWNER/STAFF/CLIENT. Grants classify external participation as `CONSULTANT` or `VENDOR_FACTORY`; a factory participant uses the vendor/factory portal. Account email uniqueness must not convert an existing internal/client account. No self-sign-up or portal invitations by an external user.

Routes `/api/v1/external-portal/auth` are PublicRoute only at the staff AuthGuard layer; each protected endpoint explicitly checks the external cookie. Cookie is `__Host-sense_external_sid` for HTTPS, `sense_external_sid` for HTTP, HttpOnly/SameSite=Lax/path=/ with existing session lifetime conventions. Never accept staff/client cookies as external identity. JSON and secrets are `Cache-Control: no-store`. Writes require the configured Origin and `x-csrf-token` returned by the current external session. OTP request/verify require same origin and IP/address throttles. Reuse S14's 10-minute, one-use code, 5 attempts, 60-second resend interval, 5/hour sends and 12-hour/30-minute idle session bounds.

| Method/path suffix | Request | Response |
| --- | --- | --- |
| POST `/code` | `{email}` | always `{accepted:true}`; unknown/inactive/ungranted accounts receive no email |
| POST `/verify` | `{email,code}` | sets external cookie; `{authenticated:true}` |
| GET `/session` | — | `{account:{id,email,kind:"EXTERNAL"},csrfToken}` |
| POST `/logout` | — | clears cookie and revokes session |
| GET `/sessions` | — | own device/session array `{id,createdAt,lastUsedAt,expiresAt,revokedAt,userAgent,current}`; no token/IP secret |
| DELETE `/sessions/:sessionId` | — | own session revoked; cannot target another account |

Identity files can follow ClientPortalIdentityService/controller patterns without client passkeys/approval methods. Internal IdentityService passkey/auth/session entry points and SQL session guards must allow only OWNER/STAFF; client code/session SQL remains CLIENT-only.

## Staff management

Base `/api/v1/external-access`; protected by staff auth, ordinary internal CSRF/origin. Service checks current internal session/account/employee, project assignment/branch grants and action authority inside its transaction. Owner/current Project Lead or staff with explicit scoped `external.manage` plus current project authority may manage ordinary access. Closeout uses existing `project.closeout_approve` authority and approved task. Native CAD methods are Owner-only.

| Method/path | Request | Response |
| --- | --- | --- |
| GET `/projects/:projectId` | — | management workspace below |
| POST `/projects/:projectId/grants` | grant input | created grant |
| POST `/grants/:grantId/change` | expectedVersion/reason plus new scope/expiry or `revoke:true` | updated grant; native revocation blockers remain visible |
| POST `/projects/:projectId/requests` | `{grantId,title,body,dueDate?,expectedGrantVersion,reason}` | retained staff request to named recipient |
| POST `/projects/:projectId/cad-shares` | `{grantId,revisionId,nativeLinkId,url,extractionCode,expectedGrantVersion,reason}` | safe share metadata; issue time now, expiry exactly seven days |
| POST `/cad-shares/:shareId/revoke` | `{expectedVersion,confirmation,reason}` | confirmed Owner native cancellation with actor/time/proof; never call MinisCloud automatically |
| GET `/cad-shares/:shareId` | — | Owner-only decrypted native details for manual administration, including after recipient access loss; no-store |
| GET `/uploads/:uploadId/file` | — | current authorized staff stream of retained advisory upload for validation; no NAS path |

Grant input: `{email,portalType:"CONSULTANT"|"VENDOR_FACTORY",revisionIds:string[],releaseIds:string[],packageIds:string[],expiresAt?:string,closeoutTaskId?:string,reason}`. Arrays are explicit allowlists, bounded/deduplicated to 150 total items, and every target belongs to this project/organization. No wildcard folder/project grants. At least one exact file, release or work package is required. A revision scope does not confer production scope and vice versa. Normal grant can have no expiry at creation; change accepts an omitted expiry to retain it or a future ISO expiry, without an expiry-clearing command. Closeout grant requires finite expiry, existing approved active CLOSEOUT task on this Cancelled project and narrow named permitted files/package; delivery release scopes are rejected. It does not revive an earlier grant. Drawing options and drawing grant creation preserve existing `document.view` permission; release/package options preserve TURNKEY/SITE permission checks in addition to PORT management authority.

Workspace response:

```
{
 project:{id,title,status,version},
 grants:[{id,accountId,email,portalType,version,revisionIds,releaseIds,packageIds,expiresAt,revokedAt,closeoutTaskId}],
 revisionOptions:[{id,title,documentNumber,series,number,fileName}],
 releaseOptions:[{id,label}], packageOptions:[{id,title}],
 closeoutTaskOptions:[{id,title,status}],
 requests:[{id,grantId,title,body,dueDate,createdAt}],
 submissions:[{id,grantId,kind,title,body,revisionId?,releaseId?,packageId?,createdAt}],
 uploads:[{id,grantId,fileName,mimeType,sizeBytes,sha256,createdAt}],
 cadShares:[{id,grantId,revisionId,nativeLinkId,issuedAt,expiresAt,version,revokedAt,revocationRequired}],
 capabilities:{manage:boolean,issueCad:boolean}
}
```

Costs, staff performance, NAS keys/paths, extraction codes, URLs and unrelated account lists are absent. Staff options use DOC/TURNKEY/SITE public scoped ports. Portal-facing production requirements include only permitted exact release quantities/materials/design references/status/deadline; no raw release JSON or financial fields. New or superseded context cannot silently update an existing grant.

## External workspace and submissions

Base `/api/v1/external-portal`; current external cookie/session plus exact grants required. Actor passed to service is `{accountId,sessionId}` (never an internal ProjectActor). Consumer uses transaction locks and current-clock checks after waits. Read requires current grant and permitted resource; delivery writes require Active project. Cancelled-project access exists solely through a valid separate closeout grant; task completion/approval revocation/expiry ends it. On Hold/Completed permit currently authorized read history but no delivery writes.

| Method/path | Request | Response |
| --- | --- | --- |
| GET `/projects` | — | `{projects:[{id,title,status,portalType}]}` from current usable grants |
| GET `/projects/:projectId` | — | scoped external workspace below |
| GET `/revisions/:revisionId/file` | — | current exact permitted PDF/image/non-CAD bytes with fresh confidentiality/grant/session check; CAD uses native share only |
| POST `/projects/:projectId/submissions` | submission input | retained advisory submission |
| POST `/transmittals/:transmittalId/acknowledge` | `{note,reason}` | own-recipient acknowledgement; no other recipient alteration |
| GET `/cad-shares/:shareId` | — | `{id,url,extractionCode,expiresAt,warning}` only to currently permitted recipient or Owner; no-store; fresh native/app validity |
| POST `/projects/:projectId/uploads` | `{grantId,fileName,mimeType,sizeBytes,reason}` | `{uploadId,chunkSize}` |
| PUT `/uploads/:uploadId/chunks/:index` | raw bytes; `x-chunk-sha256` | `{index,received:true}`; idempotent same-byte retry |
| POST `/uploads/:uploadId/finalize` | — | retained advisory upload metadata; no approved revision creation |
| GET `/uploads/:uploadId/file` | — | uploader/current scoped staff advisory upload stream; cannot view another recipient's upload merely sharing a project |

Submission input: `{grantId,kind:"REQUEST"|"REVIEW"|"COMMENT"|"PRODUCTION_STATUS",title,body,revisionId?,releaseId?,packageId?,reason}`. REVIEW requires CONSULTANT and one granted exact revision. COMMENT requires a granted exact revision. REQUEST permits either portal type to request or reply under the named current grant; it does not add a request-ID binding. PRODUCTION_STATUS requires VENDOR_FACTORY and granted release/package. Submission is append-only; correction creates another entry. Server validates persona/scope and relevant current production context; never calls formal approval/progress commands. Repeated network submissions require the stable UUID header `x-idempotency-key`; JSON contains no idempotency field. Retained entries naming a resource are externally hidden when their original grant no longer covers it or its current projection is unavailable; retained staff/database evidence remains intact.

External workspace:

```
{
 project:{id,title,status},
 grants:[{id,portalType,version,revisionIds,releaseIds,packageIds,expiresAt,closeoutTaskId}],
 revisions:[{id,title,documentNumber,series,number,fileName,state,isCurrent,cad:boolean}],
 production:[{id,label,requirements,deadline,status}],
 packages:[{id,title,date,state}],
 requests:[{id,title,body,dueDate,createdAt}],
 submissions:[{id,kind,title,body,revisionId?,releaseId?,packageId?,createdAt}],
 uploads:[{id,fileName,mimeType,sizeBytes,sha256,createdAt}],
 transmittals:[{id,purpose,issuedAt,revisionIds,acknowledgementRequired,acknowledgedAt}],
 cadShares:[{id,revisionId,expiresAt}],
 capabilities:{submit:boolean,upload:boolean,acknowledge:boolean}
}
```

All arrays are filtered by the caller's current exact resource grants and recipient identity. After blocking projections, the response is filtered again using the final usable grant set; another valid grant never preserves items whose grant expired during a wait. File streams and acknowledgements recheck every requested exact revision after waits, including already-recorded acknowledgement retries. Submission retries reauthorize their named grant before returning retained evidence. External clients never call staff DOC/SITE/TURNKEY endpoints. Field structures for `production.requirements` are selected operational quantities/materials, with no prices or cost totals. Consultant working-review revisions can be explicitly scoped; formal transmittals still require existing exact current approvals. Confidential files/ancestors are denied; external grants never override Confidential policy.

## Persistence and critical integration

Add separate external OTP/session/grant data, retained generic PORT submissions/upload metadata and native CAD shares. Grant scope may be bounded JSON/UUID arrays with reviewed SQL validation of target ownership; history is append-only and binds canonical evidence digest/event. Native secrets are authenticated ciphertext under explicit optional configuration `EXTERNAL_SHARE_SECRET`; issuance requires configured key, never reuse OTP hashes as reversible storage. Retain safe native identity and confirmation proof separately from encrypted URL/code. Source timestamp/code rules and safe no-secret audit apply.

TaskService.cancelProject must call an external-port cancellation guard under its existing project row lock before any cancellation side effects, then atomically revoke ordinary external grants with existing task/client transitions. Active/unconfirmed native shares return a safe blocker inventory; leave/create a pending cancellation request rather than claim success. Issuance/grant changes/final cancellation lock the same project before grant/share locks. Native confirmation is a one-way retained evidence operation. Task completion and closeout-approval revocation require request-time external denial and Owner blocker inventory; background notification cannot be the authority.

Grant changes and closeout completion/revocation enqueue a deduplicated mandatory Owner in-app native-cancellation notice when a still-active share loses authority. A worker checks every 60 seconds for expiry and account loss. Each loss notice has a fresh canonical `external.changed` / `external_native_revocation` event and NTF outbox, linked to the retained issuance event. Its audit marks automatic access-loss observation under the original issuance provenance, without claiming manual native cancellation. Pending/delivered notices deduplicate repeated scans; dead notices may be replaced if current loss returns. Delivery locks and revalidates current Owner, project, share, grant and closeout state before marking the notice visible in the inbox. Notices contain no link/code secrets. DOC currently makes confidentiality policy immutable; initially Confidential files/ancestors fail closed. This is the C-006 access-loss safety notice; it does not implement later configurable reminders.

RevisionService's recipient eligibility, exact issue and acknowledgement must extend through an external authority port and matching additive SQL guards. DOC public external-file/upload boundary performs storage/content operations only after PORT exact authority, without mutating CLIENT behavior. TURNKEY/SITE ports return explicitly selected operational projections; no unrestricted table access from PORT. Canonical external events and SQL catalogue constraints must be added together with owned evidence guards.

## Luna file allocation

UI: `apps/web/src/external-portal.tsx`, `.css`, `.test.tsx`; route wiring in App.tsx coordinated with root. Staff route `/external-access`, external route `/external-portal`. Thin controllers/DTO tests and isolated OTP identity can be a separate Luna task once schema/service method contracts exist. Sol owns schema/migrations, authorization core, protected CAD secrets, cancellation/closeout integration, service ports and final source/security acceptance. Do not invent product rules; escalate material ambiguity to Sol.
