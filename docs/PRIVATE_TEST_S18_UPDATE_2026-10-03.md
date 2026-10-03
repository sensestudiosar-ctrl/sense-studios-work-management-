# Private test server S18 update — 2026-10-03

The Owner reported that Learning was missing on https://desktop-7u1i620.tailb6f275.ts.net. The HTTPS proxy serves Vite on5176 and API on4001. The UI already contained the Learning link on the signed-in home page below Account, beside Time/Workforce, and the /learning route. The retained API process was older: /api/v1/library/setup returned404. Its dedicated development database sense_iphone_https_dev on localhost56432 had77 migrations, one organization and five accounts.

## Recovery and preservation

The verified owned API4001 process was paused to prevent concurrent writes. A custom-format full backup preserved data/owners/ACL, with a readable1404-entry table of contents. Backup and112-table original-column SHA256 snapshots are retained privately under .env.s18-tools/iphone-upgrade.

A distinct local clone rehearsed reviewed migrations78–91. Its restored baseline and migrated original table counts/digests matched. The same reviewed chain then applied to the retained dedicated test database:91 successful migrations, zero failed migrations, all112 original table/column snapshots unchanged. Accounts, authentication, demo records and existing edits were retained; no reset/reseed or permission expansion occurred.

The API restarted from the latest compiled source with the existing private env/origin on4001 (verified owned PID32204 at this checkpoint). Vite5176 and HTTPS routing were retained. HTTPS readiness returned200 with database ready; /learning returned200; /api/v1/library/setup now returned401 without authentication, demonstrating the registered protected endpoint rather than the former404.

## Authenticated verification

A read-only diagnostic invoked actual Skills/Library/Training setup services using an existing active Owner session. No session/token/authentication was created or changed. All three setups passed: zero catalogue skills, three eligible employees, three Library author kinds, three Training employees, zero authored modules and zero assignments. These empty learning content states are real; the earlier demo seed did not create S18 learning content.

Refresh the private HTTPS page and choose Learning in the signed-in home navigation, or open /learning directly. Skills & Training and Library are separate tabs.

Vite serves current source edits; a running compiled API and database do not automatically update when source changes. This recovery explicitly refreshed the retained API and schema. No NAS_ROOT was configured in the existing private environment; that setting was preserved. File upload therefore requires explicit private storage configuration, while the verified Learning setup/text/profile features are available.

This is operational recovery of the retained local development server, not production deployment or a new full quality run. S18's independent final3 pnpm verify acceptance remains recorded in S18_COMPLETION_REPORT.md. Actual recovery routing used GPT-6.1 Sol for interpretation/review/diagnosis and GPT-6 Luna for the guarded backup/clone/migration/preservation helper; parent performed verified process restart and HTTP checks.
