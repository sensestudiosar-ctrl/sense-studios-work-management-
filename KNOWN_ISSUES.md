# Known issues and risks

No application defects are confirmed because no application exists.

## Confirmed architectural risk

C-007 supersedes the source's same-NAS backup assumption in R-091/R-111: nightly encrypted database-and-file backups must reach an always-reachable computer or NAS at a different physical location. The Owner accepts up to one day of data loss after total primary-NAS loss. The remote host, secure connection, key custody and successful restore are unverified production prerequisites; no backup has been configured.

## Verification gaps

The existing NAS has 8 GB RAM and MinisCloud OS, but exact hardware/available storage and application load have not been measured. NAS-hosted production capacity remains unverified. The Owner selected Cloudflare Tunnel. Its free proxied request upload limit affects large files; FILE_STORAGE.md plans chunked uploads and a real transfer test. These are planning risks, not current application defects.
