# NAS production and mobile delivery runbook

Implementation: NAS-01–04, authorized16October2026. Source progress and actual check results: [NAS_IMPLEMENTATION_PROGRESS_2026-10-16.md](operations/NAS_IMPLEMENTATION_PROGRESS_2026-10-16.md). This document is an operating procedure, not evidence that a NAS deployment, migration, backup or restore has happened. Whole-V1, actual-project R-104/R-105, real-phone and production gates remain separate.

## 1. Inputs before activation

- Exact MINISFORUM model, CPU architecture, MinisCloud version and supported Docker/Compose installation. The Owner reports8GB RAM. This package targets PostgreSQL17 and initially Linux/amd64 images; verify the actual hardware and filesystem before choosing images. Never point PostgreSQL17 at a data directory from another major.
- Permanent HTTPS app origin on the existing domain, e.g. `https://work.<your-domain>`. The exact domain has not been provided. Preserve the website address and existing website/email DNS records. If Cloudflare zone onboarding needs DNS delegation, review and preserve A/AAAA/CNAME/MX/TXT records before changing nameservers; do not assume the current DNS provider.
- Existing separate directories for documents, PostgreSQL17, encrypted local backups, retained hashed assets and backup SSH material. Use real canonical Linux paths with no symlink aliases or nested/overlapping roots. These are application-specific folders, not a whole NAS data volume.
- Offsite computer/NAS at a different physical location, with SFTP access, quota and availability. Verify the host key through a trusted channel and prepare a dedicated backup SSH identity/known_hosts. No insecure TLS/SSH bypass is part of this package.
- Backup key custody and offline recovery material, Owner operational mail recipient, maintenance window, acceptable restoration downtime, phone/OS inventory, user/concurrency/file sizes and pilot projects/users. C-007 already approves at most one day of loss; no restoration-time SLA is invented.

The NAS requires Docker/Compose and Node24.19.0 for short-lived operational CLI commands. Application containers supply their own runtime. Install the correct official Node build only after OS/architecture verification. Build/test on a workstation or CI; avoid running builds, full regressions, AI inference or a second permanent staging stack on the8GB NAS.

## 2. Prepare an exact release and private configuration

Preserve existing development changes. Select and review a committed source candidate; run the pinned full quality gates on dedicated test targets. Do not fold unrelated work or credentials into a release. The manual `NAS release candidate images` workflow requires a successful `S01 quality` run for that exact commit, tests the production PWA and Nginx image, then publishes the tested API/web images and immutable digests. Configure the `nas-release` GitHub environment/protection before using it. Hosted execution is not claimed by merely adding the workflow.

Use the repository's NAS Deploy skill for final commit/push/promotion, retaining protected `nas-deploy` if selected. Publication/promotion is separate from NAS host activation. Do not automatically deploy development pushes. Keep API/web source revision labels equal to the selected40-character commit. API and worker share one API image; the web image must be built with `--target production`. Set `VCS_REF` on both builds.

Copy `infra/nas.production.env.example` to a private file **outside the checkout**, mode600. Replace every placeholder. Values must remain literal/single-quoted; generate distinct random secrets, URL-encode database passwords in datasource URLs and retain recovery keys away from the NAS. Do not paste the completed file into chat, commit it, include it in an image, or print rendered Compose environment output. The CLI checks field names and reports errors without their values.

Keep database credentials, the external-share encryption key, email HMAC key and backup password stable across ordinary releases. The template is not an instruction to regenerate them each time. Rotate only through a reviewed procedure that preserves old encrypted shares/backups and existing operational recovery.

`NAS_APP_DATABASE_URL` must name `sense_app_runtime` at `db:5432`, and match `NAS_APP_DB_PASSWORD`; the separate migration datasource names `NAS_DB_USER` and `NAS_DB_PASSWORD` at the same explicit database. Bootstrap email/secret are a temporary matching pair. Configure the real Brevo sender, domain authentication and quotas before email-dependent onboarding. `NAS_OFFSITE_CONFIRMED=yes` is an operator assertion made only after physical-location verification, not a substitute for it.

Prepare folder ownership/permissions for the image's `node` identity (normally UID/GID1000, subject to the NAS runtime's mapping). Documents must support private reads/writes and atomic finalization. The backup operator/container needs read access to those files; the local backup root is mode700. Verify this on a dedicated NAS fixture and test real upload/retry/checksum/read. Do not work around permission failures with mode777 or whole-NAS mounts. Keep the dedicated PostgreSQL bind directory private and let its approved image initialize only a verified fresh database target on first deployment.

From the accepted checkout on the NAS, these commands inspect configuration; they do not deploy:

```sh
node scripts/nas/cli.mjs validate --env-file /private/sense-production.env
node scripts/nas/verify-compose.mjs
```

The second command uses synthetic data and needs only the Compose client. It does not prove a real mount, image startup or application connection.

Pull the exact API/web/PG17/cloudflared/restic digests into the local NAS Docker engine. Use the existing registry's least-privilege credentials. Then run:

```sh
node scripts/nas/cli.mjs preflight --env-file /private/sense-production.env
```

Preflight rejects public service port mappings, host/privileged mode, Docker-socket mounts, wrong source labels, a staging web image and a different database major. It accepts only a local Linux Docker context. It does not prove NAS performance, writable-mount behavior, offsite custody or restore. Production Compose contains no published host ports. Only the tunnel connects to the web ingress network; database/application networks remain internal.

## 3. Initial activation on a new approved target

First verify `NAS_POSTGRES_DIR` is the intended **new empty** target and that all data paths and image digests are correct. Never initialize, reset or migrate an unidentified retained database. Use an announced maintenance window and serialize release, backup and migration work; no other operator may run a migration during backup quiescence. Docker health alone is not whole-app acceptance.

Run Compose from the accepted checkout with the explicit private environment file. In a trusted shell, keep a command wrapper rather than interpolating secrets:

```sh
sense_compose() {
  docker compose --project-name sense-production --env-file /private/sense-production.env -f infra/compose.production.yaml "$@"
}
```

The project name must match `NAS_PROJECT`; adapt the placeholder file/project to the reviewed target. The explicit file avoids relying on a developer `.env`. Do not use shell `source`, `eval` or `env $(cat ...)` to load it.

```sh
sense_compose up --detach db
sense_compose --profile release run --rm migrate
```

Migrations are an explicit one-shot step and must exit0 before proceeding. API/worker startup does not implicitly run them. Capture applied versions/checksums and preservation evidence on isolated rehearsals before production. Existing migrations110–115 and later accepted migrations are not rewritten by this work. Runtime role initialization occurs through the dedicated PG17 image/init mount; later migration grants/immutable-evidence owners must remain intact.

```sh
node scripts/nas/cli.mjs publish-assets --env-file /private/sense-production.env --confirm-project sense-production
sense_compose up --detach api worker web
sense_compose ps
```

`publish-assets` copies hashed public assets from the exact web image into the dedicated history directory without overwriting conflicts; old open clients can still fetch older chunks. Its temporary source container is identified by an ownership label and removed; its isolated stage is retained for inspection. No asset/history purge is automatic. Review storage growth and retention separately. The web proxy dynamically resolves recreated API containers.

Initialize each **new** backup repository explicitly; never auto-init after an authentication/connection failure:

```sh
node scripts/nas/cli.mjs init-backups --repository local --env-file /private/sense-production.env --confirm-project sense-production
node scripts/nas/cli.mjs init-backups --repository offsite --env-file /private/sense-production.env --confirm-project sense-production
```

Offsite initialization copies local chunking parameters for incremental deduplication. Existing repositories are not replaced, unlocked or pruned automatically. [Restic describes copy/deduplication setup.](https://restic.readthedocs.io/en/stable/045_working_with_repos.html)

Run the initial consistent backup and isolated restore rehearsal (section5) before operational reliance. Then configure a Cloudflare published hostname for the selected app origin, service `http://web:8080`, on the app-only tunnel. Preserve all other website/email records. Enable an HTTPS redirect for this app hostname and test it. Restrict the tunnel route/cache rules to that hostname: bypass `/api/*` and private/portal responses, and cache only versioned public static assets. No NAS administration, PostgreSQL, SMB/NFS or SSH public route is allowed.

```sh
sense_compose up --detach tunnel
```

The HTTPS/public client identity settings are valid only through this isolated Cloudflare→cloudflared→web→API path. Nginx overwrites forwarded headers, production fixes the HTTPS scheme, and the API trusts exactly one private proxy hop. `CF-Connecting-IP` is trusted only because no public/direct web port exists; do not reuse the production proxy behind another unreviewed ingress. Application authentication and authorization still apply.

Open the permanent HTTPS origin on the Owner's phone and verify bootstrap, passkey, second passkey and offline recovery-code custody. Once enrolled, remove both bootstrap environment fields and recreate the API using the reviewed Compose target. Enroll each staff member through the existing Owner-controlled workflow; no shared passkey, role picker or NAS account is issued to staff.

## 4. Phone onboarding and safe app updates

Send users the **public** `/install` URL or a QR containing only that URL. A link also appears on the sign-in screen. Android uses Chrome's install menu; iPhone uses Safari Share→Add to Home Screen/Open as Web App. Check the actual supported phones, not only emulated viewport sizes. [Apple installation instructions.](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios)

Test installed-app passkeys, camera/file picking, logout and lost-device revocation, keyboard/safe-area behavior and existing backend permission boundaries. Prepare assigned site contexts online; capture only existing S22-supported records. Require visible synchronized/conflict/failed states after reconnect. Do not promise full offline access, guaranteed background execution, confidentiality for downloaded cached files, or remote erasure of an offline lost phone.

New workers wait. The notice requires a saved-work acknowledgement, no pending IndexedDB commands and a worker-side check that only the requesting app window remains open before activation. “Later” does not reload. IndexedDB is retained; unknown/storage failures block activation. Existing form/permission recovery rules are unchanged. Users should finish current work and close other tabs, then explicitly update. On the first upgrade from the former automatic-worker build, close all app windows after synchronizing captures and reopen; do not clear browser storage as an upgrade shortcut.

Launch messaging stays in-app/Brevo email. No lock-screen push/native wrapper/SMS/WhatsApp system was added. Large CAD/video delivery is not unlimited public Tunnel hosting; test the approved Owner-issued MinisCloud file/revision sharing path separately, including coded seven-day expiry and manual revocation evidence. [Cloudflare large-file routing conditions.](https://developers.cloudflare.com/tunnel/concepts/routing/)

## 5. Consistent backup and isolated restore

```sh
node scripts/nas/cli.mjs backup --env-file /private/sense-production.env --confirm-project sense-production
```

The CLI takes a project-specific lock; confirms exactly one existing web/API/worker at the configured release; checks both repositories; stops those writers; checks they are stopped and no other database client remains; records a logical database dump, password-free global roles/ownership, table row counts, recovery metadata and file checksums; then makes a local encrypted restic snapshot. It restarts the **same container IDs**, refusing replacements, before copying that snapshot offsite. Only matching offsite metadata plus a successful repository check produce `OFFSITE_VERIFIED`. Partial source backups or failed copies do not produce a success receipt. Measure quiescence duration on the actual data; full file hashing can be material on a large NAS.

An initialization/backup/restore operation never terminates another database client, auto-unlocks an old lock or automatically deletes data to recover from a failure. Protected redacted command-error files are placed in `NAS_BACKUP_DIR`. If interrupted, allow the current protected step to finish so writer recovery can run; after a crash/power loss inspect the saved lock and original container IDs before any manual recovery. Never remove a lock merely because it exists. The UPS/restart/forced-stop cases require a real rehearsal.

Successful backups remove only that operation's transient plaintext dump/global-role files. Failed-run staging is retained in the private backup directory; investigate and dispose of those exact transient files deliberately after preserving a valid recovery point. Encrypted local/offsite repositories, authoritative NAS files and restore evidence are not pruned by this tool. Select backup expiry/holds in a separate reviewed procedure consistent with C-003/C-009; no new retention duration is invented.

Use the exact64-character **offsite** snapshot ID returned by backup and a new directory outside every configured application/data/backup root:

```sh
node scripts/nas/cli.mjs restore-rehearsal --env-file /private/sense-production.env --confirm-project sense-production --snapshot FULL_OFFSITE_SNAPSHOT_DIGEST --target /separate-recovery/NEW-REHEARSAL-DIRECTORY
```

The tool refuses an existing destination, restores/cryptographically verifies the offsite snapshot, verifies file inventory/checksums, and creates a fresh labelled PostgreSQL17 cluster with **network=none and no published ports**. It restores original global roles (without their passwords), ownership/grants and data, then compares source/restored table row counts and records the new system identifier. It stops that exact cluster and preserves its container/directory/result. It never points the running app at the restored data or resets the source. [Restic restore guidance.](https://restic.readthedocs.io/en/stable/050_restore.html)

`DATABASE_AND_FILES_RESTORED` is only the physical/logical rehearsal result. Application-role credentials are intentionally not restored from global password hashes. A separately reviewed recovery procedure must configure the correct runtime secret, verify permissions/immutable audit protections, test Owner recovery and an approved drawing/site-photo/approval workflow, and reconcile post-backup work and revoked accounts/sessions before opening any restored instance. It is not an automatic production failover. Record actual restoration downtime and compare with the Owner's eventual target.

## 6. Scheduling and meaningful alerts

Use the NAS-supported scheduler and a private operator account with the required Docker/storage permissions. Schedule at least nightly at the agreed low-traffic time, with enough headroom for measured capture-to-offsite duration so the last recoverable point does not exceed24hours; an additional run may be needed. Call the explicit backup command above. Use a tested cron-mail bridge or approved equivalent to the Owner's chosen address. No recipient, external monitor account or schedule was configured in this session.

Run `node scripts/nas/monitor.mjs --env-file /private/sense-production.env` periodically (suggested every5minutes). It checks container/worker health, eligible outbox backlog age/expired leases/dead work, disk capacity, backup age and existence of the exact snapshot in the currently configured offsite repository. It emits an initial state, changed issue or recovery, and stays quiet for unchanged issues. Normal operation locks younger than six hours are suppressed; an overdue lock needs attention. These initial operational alert thresholds are5minutes for eligible queue delay,85% storage use,20hours backup warning and the approved24hours recovery-point breach; tune the warnings from pilot evidence without changing business policies or retention.

An independent offsite machine must run:

```sh
node scripts/nas/external-probe.mjs --origin https://work.YOUR-ACTUAL-DOMAIN --state /private/sense-app-probe.json
```

The probe performs only a public readiness read, uses a fresh timeout/no redirects, records private state and emits only changed failure/recovery. Validate its alert delivery by stopping the owned pilot target, then recovering it. A monitor on the failed NAS cannot report total NAS/power/network failure. Check disk health, UPS, backup size/growth, memory/swap, CPU and `docker stats` alongside ordinary NAS activity; container limits are an initial3GiB application budget, not measured capacity evidence. Keep backup load away from indexing/transcoding peaks.

## 7. Later releases and recovery

1. Preserve the running release's environment and immutable image/source references privately. Confirm the source candidate and all gates; create a current verified offsite backup using the **old running release's** configuration.
2. Prepare the new outside-checkout environment, pull exact digests and run its preflight. Confirm backward compatibility for old installed clients and pending offline commands. Copy its hashed assets with `publish-assets` before replacing web.
3. During the announced window, stop web/API/worker using the old verified project target. Confirm no other writers. Run the one-shot migration for the new candidate and preserve its result; do not proceed after failure.
4. Recreate API/worker/web with the new configuration; inspect actual health and perform role-specific smoke journeys through the permanent domain. Keep tunnel hostname/origin stable. Record the active source/images/migrations and data-preservation result.
5. Roll back images only if the old code and client queues are compatible with the new schema. Otherwise use a reviewed forward fix or a coordinated restored recovery point, accounting for post-backup work. Never reset/drop production data to make a release pass.

Run a representative small pilot, including real office and site users and both phone platforms if used. Broad rollout requires whole-candidate gates, real NAS persistence/permission/chunk tests, actual install/passkeys, offline/reconnect/conflict tests, external alert tests, full restore/application recovery and separately identified real-project R-104/R-105 acceptance. Local mocks, screenshots and historical slice results do not replace those gates.
