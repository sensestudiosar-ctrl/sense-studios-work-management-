# Changelog

## [0.2.0] - 2026-09-27

### Added

- Added passkey sign-in, secure sessions, Owner identity controls, and staff enrollment and recovery.
- Added organization, branch, team, employee, and scoped role-permission management with persisted audit history.
- Added append-only audit events, transactional outbox delivery, an in-app inbox, notification preferences and quiet hours, and verified mailbox challenges for email eligibility.
- Added Owner audit corrections, retention holds and notices, and guarded expiry with deletion tombstones.
- Added local verification and recovery workflows for PostgreSQL-backed deployments.

### Changed

- Delivery workers now claim one outbox item at a time and renew its fenced lease while processing.
- Owner audit search now uses a case-insensitive exact event key backed by an ordered composite index.
- Improved organization administration loading so changing the selected employee does not reload organization data.
