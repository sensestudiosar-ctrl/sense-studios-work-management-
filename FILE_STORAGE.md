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
3. Revision reason is mandatory. R0/R1/... and CR1/... are distinct series pending precise numbering policy. Current approved revision changes atomically in DB; previous is marked Superseded—Do Not Use, with historical storage intact.
4. Client approval records exact item/revision and signature evidence. Formal issue creates immutable transmittal with recipients, time, purpose and acknowledgement status. Any correction is a new entry/version.
5. Download/view streams through the backend after a fresh permission check; use short-lived app-issued access only if it can be revoked effectively. Watermark protected previews and log access where needed. View-only controls can discourage copying, not guarantee screenshot prevention.
6. Public portfolio uses an explicit publication grant and separate public derivative. Private client gallery remains project scoped. No internal file becomes public automatically.

## External access and large files

The cost-aware ingress proposal is a Cloudflare Tunnel to the existing NAS-hosted HTTPS app, if the owner accepts Cloudflare as a traffic intermediary. Official documentation currently says publishing via Tunnel does not require a paid Access plan, but the Free proxied upload limit is 100 MB per request. Therefore uploads must support resumable chunks below that limit, and realistic large CAD/video transfers must be tested before portal launch. A direct HTTPS ingress is an alternative if a public IP/router setup is available and maintained. Neither option exposes SMB, database or NAS administration.

## Backup and reconciliation

Back up DB metadata, NAS files and revision evidence together by consistent scheduled process; record backup point and test restoring an approved revision and its metadata. Use NAS snapshots/versioning and a separate NAS location/volume where possible. Same-device backups remain a physical single point of failure; off-site copy is a later addition. Alert on checksum mismatch, missing file, orphaned blob, failed transmittal, or backup/restore failure.

References: MINISFORUM N5 Air Docker capability (https://store.minisforum.com/products/minisforum-n5-air-ai-nas); Cloudflare Tunnel published applications (https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/); Free upload limits (https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).
