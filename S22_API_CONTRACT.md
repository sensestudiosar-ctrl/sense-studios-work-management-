# S22 staff offline contract — 2026-10-04

Implemented endpoints remain internal staff-only, current session/Owner readiness, CSRF/origin checks and no-store. SITE enforces Active Turnkey/current assignment/cross-branch/action authority and repeats checks after locks. See S22_SPEC.md for requirement map and phased scope.

`POST /api/v1/site/projects/:id/offline-commands`:

```
{commandId:uuid,localId:uuid,baseRecordVersion:number|null,reason:string,
 action:"NOTE"|"MANPOWER"|"REPORT"|"SNAG"|"PACKAGE_PROGRESS",payload:object}
```

Reason 3–1000 characters. Creation actions require null base; PACKAGE_PROGRESS requires integer base >=1. Payloads are strict:

- NOTE `{note:string(1–4000),photoIds:uuid[]}`.
- MANPOWER `{date,trade,count,employeeAccountIds:uuid[],note}` following S20 constraints.
- REPORT `{date,workCompleted,manpower:[{trade,count}],materialsReceived,photoIds,issues,delayCauses,tomorrowPlan,supersedesReportId?:uuid}` following S20 constraints; creates DRAFT only.
- SNAG `{title,description,packageId?:uuid,photoIds}` following S20 constraints; creates OPEN only.
- PACKAGE_PROGRESS `{recordId:uuid,actualPercent,actualQuantity,qualityStatus,materialStatus,blockers,tomorrowPlan,photoIds}` following S20 constraints. Target must belong to the envelope project. Compares target record version, not aggregate version.

Success `{id,version,recordVersion,replayed:boolean}`. Identical replay returns original identifiers/versions after current authorization; no duplicate record/history/event. A key/local ID collision with different content is HTTP409. Same-record stale update HTTP409 body `{message:"Site record changed. Compare local and server values",code:"SITE_RECORD_CONFLICT",record:{id,version,state,data}}`; data is current authorized/redacted data. No receipt or partial business write is committed. User keeps server values/discards local command or submits an amended command with new commandId, current base version and reason. A second intervening edit conflicts again. No automatic rebase.

`POST /api/v1/site/projects/:id/offline-photos` body `{localId:uuid,folderId:uuid,fileName,mimeType,sizeBytes,reason}` returns `{uploadId,chunkSize}`. UUID localId is the exact stable DOC upload ID. Current site.work/document.upload and nonconfidential target/ancestors required. Supported image types: PNG/JPEG/GIF/WebP. Exact manifest replay returns same upload; different content/foreign actor/project rejects. Expired/aborted staging requires a new identifier. Upload chunks through existing DOC PUT `/api/v1/documents/uploads/:uploadId/chunks/:index` with checksum header; POST `/uploads/:uploadId/finalize` supplies exact immutable document ID used in command photoIds. Retry finalization before replaying chunk writes after possible lost finalize response.

Site detail adds `notes` array of immutable NOTE SiteRecord projections `{id,version,state:"RECORDED",data:{note,photoEvidence},...}`. Document folder list adds `offlineUploadAllowed:boolean`, true only for READY folders with no Confidential ancestor; docs upload capability is independently required. Preparation persists only minimal selected project/package input/folder context and user-captured image bytes. No financial/workforce/staff directories, downloaded evidence, secrets or auth tokens in IndexedDB. Online reauthorization remains authoritative.
