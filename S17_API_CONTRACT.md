# S17 settled implementation handoff

Implemented S17 contract for development/local staging; acceptance is recorded in S17_COMPLETION_REPORT.md. Base `/api/v1/workforce`; internal session and same-origin CSRF writes follow TimeController. JSON dates are YYYY-MM-DD; timestamps ISO offsets. Command mutations carry `commandId` UUID and `reason` (3–1000 characters); existing-record actions carry `expectedVersion`. Safe server errors use ordinary Nest HTTP responses.

## Reads

- `GET /setup`: `{owner,employeeId,employees:[{id,label,branchId,teamId}],branches:[{id,label}],tasks:[{id,title,employeeIds}],policies:[],schedules:[],sites:[]}`. Scoped management eligibility is server-filtered. Owners may configure; employees may submit their own leave/attendance. Empty policies mean setup is required, not zero allowance.
- `GET /?scope=mine|managed&from=YYYY-MM-DD&to=YYYY-MM-DD`: `{schedules:[],holidays:[],allocations:[],leaves:[],attendance:[],balances:[],workload:[]}`. Lists only scoped employee data, maximum 366-day interval. Rows retain `id`, `version` and readable evidence. Leave rows include `state`,`typeKey`,`employeeId`,`days`,`approvalLevel`,`approvalRequestId`,`cancellationRequestId`,`history`. Workload rows include employee/date, `scheduledMinutes`,`leaveMinutes`,`allocatedMinutes`,`availableMinutes`,`category`,`affectedTasks`.

## Owner configuration

- `POST /policies`: `{branchId,effectiveFrom,annualAllowanceDays,selfieNoticeDays?:1..3650,types:[{key,label,paid,consumesBalance,approvalLevels:["MANAGER"|"OWNER"]}],thresholds:{under,near,over},commandId,reason}`. WFH always consumes no balance. Thresholds are utilization percentages in increasing order. No active numeric defaults. Owner-approved expiring carry is consumed first; no configurable contrary default. The explicit notice interval activates automatic hourly advance notices and scheduled eligible expiry deletion. Documented holds block deletion; expired evidence is unreadable unless held.
- `POST /schedules`: `{employeeId,effectiveFrom,effectiveTo:null|date,workingDays:[0..6],startMinute,endMinute,breakMinutes,dailyCapacityMinutes,employmentType:"FULL_TIME"|"PART_TIME",commandId,reason}`. Overnight end before start is permitted; attributed to start date. Capacity is explicit and bounded by shift minus break. Effective versions retain history.
- `POST /overrides`: same schedule fields plus employee/date range; scoped `workforce.manage` or Owner.
- `POST /holidays`: `{branchId,date,label,commandId,reason}`.
- `POST /sites`: `{projectId,label,latitude,longitude,radiusMetres,qrCode,commandId,reason}`. Owner setup; location captured only at check-in. QR secret is write-only and never returned/audited in plaintext.

## Allocations and leave

- `POST /allocations`: `{taskId,employeeId,date,minutes,acknowledgeOverload:false|true,commandId,reason}`. Explicit person/date; participant eligibility and current task/project authority required. Overloaded unacknowledged mutation returns HTTP409 with overload warning; no automatic division or reassignment.
- `POST /leave`: `{typeKey,days:[{date,portion:"FULL"|"HALF"|"HOURLY",minutes?:number}],emergency,commandId,reason}`. Subject is current employee; Owner/scoped manager may provide `employeeId`. Each day stores the schedule-derived minute snapshot; WFH doesn't debit entitlement/reduce ordinary capacity.
- `POST /leave/:id/decide`: `{outcome:"APPROVED"|"REJECTED",expectedVersion,commandId,reason}`. Only current configured level approver; multilevel advances until final decision; no self-approval.
- `POST /leave/:id/cancel`: `{dates:[date],expectedVersion,commandId,reason}`. Employee requests eligible unused days; pending request changes nothing.
- `POST /leave/:id/cancel-decide`: `{outcome:"APPROVED"|"REJECTED",expectedVersion,commandId,reason}`. Original approval-level routing preserved; independent reversal ledger entries and future-impact alerts. Partial past days stay consumed.

## Attendance

- `POST /attendance/check-in`: `{mode:"OFFICE"|"SITE",siteId?:uuid,latitude?:number,longitude?:number,qrCode?:string,selfie?:{mime:"image/jpeg"|"image/png",base64:string},provisionalReason?:string,commandId,reason}`. Server capture time; site evidence required unless provisional reason given; no browser-supplied capture time override. Response row includes `id`,`version`,`state:"OPEN"`,`provisional`,`reviewState`,`checkedInAt`.
- `POST /attendance/:id/check-out`: `{expectedVersion,commandId,reason}`.
- `POST /attendance/:id/review`: `{outcome:"APPROVED"|"REJECTED",expectedVersion,commandId,reason}`. Scoped manager separate from employee.
- `GET /attendance/:id/selfie`: authorized private image stream, no-store, expiry/hold enforcement. Owner retention controls and controlled purge must preserve attendance event/history; separate contract added during storage design.

- `POST /attendance/:id/selfie-retention`: `{action:"notice"|"hold"|"release"|"purge",noticeDays?:number,expectedVersion,commandId,reason}`. Owner only; notice requires explicit interval. Purge requires capture+90days, elapsed advance notice and no hold. Durable intent commits before physical deletion; separate completion retains proof. Replaying/reconciling recovers partial failure. The worker also schedules eligible unheld expiry purges after notice; Owner controls allow early hold/release and recovery.
- `POST /attendance/selfie-purges/reconcile`: `{reason}`; Owner only, completes retained pending deletion intents.
- `POST /entitlements/sync`: `{reason,year?:number}`; Owner only, persists exact effective-policy annual credit/proration/carry snapshots. The worker performs current-year reconciliation at startup/hourly. `GET` reads do not create ledger rows.

Setup also returns current scoped `projects:[{id,label}]` for site selection. Attendance list rows include safe selfie `{expiresAt,noticeAt,holdReason,purgedAt,purgeRequestedAt,noticeDays}` metadata. Workload list returns daily rows and `workloadPeriods` grouped by employee and effective policy, with summed scheduled/leave/capacity/allocated minutes and server-configured utilization category; differing policies retain separate categories. Daily/selected seven-day/calendar-month UI intervals show their explicit date bounds. Eligibility and entitlement use exact rational snapshots; nine-decimal ledger summaries are display values.

## Luna UI scope

Add Workforce navigation and responsive `workforce.tsx`/CSS, Owner setup forms, self leave/WFH and attendance, management decision/cancellation/provisional review, explicit task allocation and daily/weekly/monthly workload views. Display setup-required/errors/loading/empty states, exact approved versus pending cancellation effects and retained history. Use existing auth/CSRF conventions. UI/mock tests can target this contract; escalate interface changes. Acceptance is S17_SPEC.md; no frontend grant is authorization.
