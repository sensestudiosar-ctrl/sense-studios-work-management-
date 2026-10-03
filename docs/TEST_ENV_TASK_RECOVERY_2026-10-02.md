# Private test environment task recovery — 2026-10-02

Owner reported that Create task was disabled. The retained private HTTPS test database `sense_iphone_https_dev` had only 20 applied migrations (before S09 task persistence), while current source contains 77. TaskWorkspace enables its entry button only after setup and task list load successfully; its submit button separately requires a reason of at least three characters and an employee selection when assigning.

## Recovery performed

- Started the retained PostgreSQL 18 instance on port 56432.
- Saved a custom-format backup at `C:\Users\HI\AppData\Local\Temp\sense-task-recovery-20261002.dump` before migration.
- Ran `pnpm db:migrate:deploy` against this dedicated test database: all 57 pending existing migrations applied successfully, bringing it to 77.
- Built `@sense/contracts` and `@sense/api`, including Prisma client generation: both commands exited 0.
- Started the API on port 4001 and Vite on port 5176 with the private HTTPS origin configuration.
- API readiness returned `ready`, with database `ready`; the private HTTPS home page returned HTTP 200.

Read-only real-service diagnosis found an active Owner account but no Organization record. A valid task actor could therefore not be constructed; authenticated task setup/list and creation remain unverified until organization setup is completed.

This is test environment recovery, not a new slice implementation or production deployment. Existing account data was retained. The Owner's authenticated browser submission is not yet verified; readiness alone does not prove task creation succeeds. No full quality suite was run for this operational recovery. Context intake and read-only diagnosis used GPT-6.1 Sol; no Luna implementation was needed.

## Retry guidance

Refresh the private test page, open Tasks, and click Create task. Complete Task name, Target date and Reason (at least three characters). An Owner without an Employee record must choose Assign to an employee and an eligible Primary owner; the backend requires an Employee task owner. If no eligible employee exists, complete employee setup first.
