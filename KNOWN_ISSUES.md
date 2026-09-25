# Known issues and risks

No application defects are confirmed because no application exists.

## Confirmed architectural risk

The approved backup decision uses the existing NAS as primary backup storage. Production files and same-NAS backups share one physical failure domain (R-091, R-111); a device loss could remove both. The architecture keeps an off-site copy easy to add later and requires restore tests. This is an accepted current constraint, not evidence that a backup has already been configured.

## Verification gaps

The existing NAS has 8 GB RAM and MinisCloud OS, but exact hardware/available storage and application load have not been measured. NAS-hosted production capacity remains unverified. If the proposed Cloudflare Tunnel is chosen, its free proxied request upload limit affects large files; FILE_STORAGE.md plans chunked uploads and a real transfer test. These are planning risks, not current application defects.
