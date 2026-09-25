# Proposed NAS and file-control architecture

Approved source: R-030, R-034–R-040, R-075, R-079–R-080, R-091–R-092. Primary physical file storage is the existing NAS; PostgreSQL stores metadata and approval/revision relationships. No integration has been implemented.

## Storage and identity

- Each file has an opaque application ID and immutable storage key. Metadata records organization, one project/branch, folder, document number, revision series/number, checksum, MIME/size, current/approval/issue state, classification and access rules. Do not derive authorization from a URL or physical path.
- The NAS adapter uses a restricted service account and a configured root. It canonicalizes paths and rejects traversal/symlink escape; users never receive NAS credentials or unrestricted network shares. Internal workstations may still use NAS separately under firm policy, but app-controlled issues and approvals require registered files.
- Large PDF/image/DWG/SKP/RVT/Office/D5/Lumion/ZIP/video/audio files remain on NAS. Preview generation is optional and permission-bound; source files are not copied to cloud merely for convenience.
- Project creation can create versioned template folders through a retryable job. Folder creation failure is visible and recoverable rather than pretending success.

## Upload, revision and issue

1. Authenticate/authorize uploader and target project/folder. Validate name, declared/actual type, size policy and quota; stage streamed or chunked upload to a private temporary location.
2. Reassemble/resume chunks by upload ID, validate checksum and inspect dangerous content where practical. Finalize by atomic NAS rename or equivalent, then commit metadata/revision/audit/outbox. Reconcile orphaned staged/final files after failures; never overwrite an approved blob.
3. Revision reason is mandatory. R0/R1/... identify internal-review revisions; CR1/CR2/... identify client-review revisions under C-002 Q7. Current approved revision changes atomically in DB; previous is marked Superseded—Do Not Use, with historical storage intact during the approved retention period.
4. Client approval records exact item/revision and signature evidence. Formal issue creates immutable transmittal with recipients, time, purpose and acknowledgement status. Any correction is a new entry/version.
5. Download/view streams through the backend after a fresh permission check, except a separately approved native NAS vendor share under C-002 Q13; use short-lived app-issued access only if it can be revoked effectively. Watermark protected previews and log access where needed. View-only controls can discourage copying, not guarantee screenshot prevention.
6. Public portfolio uses an explicit publication grant and separate public derivative. Private client gallery remains project scoped. No internal file becomes public automatically.

## External access and large files

The owner selected Cloudflare Tunnel for public app ingress (C-002 Q3); this does not finalize the deployment design or authorize direct NAS service exposure. Official documentation currently says publishing via Tunnel does not require a paid Access plan, but the Free proxied upload limit is 100 MB per request. Therefore app uploads must support resumable chunks below that limit. Cloudflare documents separate conditions for serving video and other large files through public Tunnel routes; large vendor CAD delivery must be tested on a separate controlled path. Clients receive PDF/image files only. MinisCloud documentation supports external share links with expiry, optional extraction code and cancellation; vendor CAD delivery may use that capability after a file/item grant, link expiry/revocation, recipient and audit workflow is approved. Do not expose SMB, database, NAS administration or unrestricted folders. Do not assume the app can create or revoke MinisCloud links programmatically.

## Backup and reconciliation

Back up DB metadata, NAS files and revision evidence together by consistent scheduled process; C-003 retains client approvals, issued drawings and audit for 10 years, exited-employee records for 7 years after exit, and site selfies for 90 days. Planned expiry must include backup lifecycle and legal/contract holds; record backup point and test restoring an approved revision and its metadata. Use NAS snapshots/versioning and a separate NAS location/volume where possible. Same-device backups remain a physical single point of failure; off-site copy is a later addition. Alert on checksum mismatch, missing file, orphaned blob, failed transmittal, or backup/restore failure.

References: MINISFORUM N5 Air Docker capability (https://store.minisforum.com/products/minisforum-n5-air-ai-nas) and MinisCloud sharing guide (https://www.minisforum.com/pages/educ_content); Cloudflare Tunnel routing and large-file guidance (https://developers.cloudflare.com/tunnel/concepts/routing/); Free upload limits (https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/).
