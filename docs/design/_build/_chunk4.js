/* ---- project membership: every project gets a real, distinct crew ---- */
const PROJECT_MEMBERS = {};
PROJ_ORDER.forEach(pid => { PROJECT_MEMBERS[pid] = new Set(); });
const assignPeople = (pid, ids) => ids.forEach(id => { if (byId[id]) PROJECT_MEMBERS[pid].add(id); });
assignPeople('app', ['u2','u10','u19','u2','u6','u24','u37','u66','u72','u39','u23','u2','u16']);
assignPeople('platform', ['u3','u13','u26','u47','u52','u56','u58','u62','u70','u76','u84','u92','u98','u3','u21','u43']);
assignPeople('qa', ['u4','u40','u8','u12','u18','u25','u28','u32','u36','u46','u51','u57','u61','u65','u75','u79','u4','u137']);
assignPeople('crm', ['u5','u30','u39','u14','u22','u60','u68','u104','u122','u128','u130','u5','u30','u45']);
assignPeople('design', ['u2','u10','u16','u27','u34','u42','u49','u55','u63','u71','u77','u83','u87','u93','u2','u105']);
assignPeople('ops', ['u137','u14','u23','u30','u38','u53','u59','u67','u81','u89','u95','u101','u107','u119','u123','u131','u1','u137']);
const MEMBER_POOL = {};
PROJ_ORDER.forEach(pid => { MEMBER_POOL[pid] = [...PROJECT_MEMBERS[pid]]; });
PROJ_ORDER.forEach(pid => {
  const proj = PROJECTS[pid];
  proj.members = MEMBER_POOL[pid];
  proj.memberCount = proj.members.length;
  const pks = TASKS.filter(t => t.project === pid);
  proj.taskCount = pks.length;
  proj.openTasks = pks.filter(t => t.status !== 'done').length;
  proj.doneTasks = pks.filter(t => t.status === 'done').length;
  proj.committed = pks.reduce((s,t) => s + t.total, 0);
  proj.completed = pks.reduce((s,t) => s + t.done, 0);
  proj.burn = pks.filter(t => t.status !== 'done' && t.updated >= due(-7)).length;
});
TASKS.forEach(t => {
  const pool = MEMBER_POOL[t.project] || [];
  if (!byId[t.assignee] || !pool.includes(t.assignee)) {
    const cands = pool.filter(id => id !== t.reportee);
    t.assignee = cands.length ? cands[taskHash(t) % cands.length] : null;
  }
  if (!byId[t.reportee] || !pool.includes(t.reportee)) {
    const cands = pool.filter(id => id !== t.assignee);
    t.reportee = cands.length ? cands[taskHash(t) % cands.length] : null;
  }
});
function taskHash(t){
  let h=0;
  for (let i=0;i<t.key.length;i++) h=(h*31+t.key.charCodeAt(i))&0xffff;
  return h;
}
const teamOf = pid => PROJECT_MEMBERS[pid] ? [...PROJECT_MEMBERS[pid]] : [];
const projMemberObjs = pid => teamOf(pid).map(id => byId[id]).filter(Boolean);
const peopleIn = id => PROJ_ORDER.filter(pid => PROJECT_MEMBERS[pid].has(id));
const personTasks = id => TASKS.filter(t => t.assignee === id || t.reportee === id);
const personOpen = id => personTasks(id).filter(t => t.status !== 'done');

/* ---- activity feed (real dates, real people, cross-project) ---- */
const ACT_SPEC = [
  [0.5,'added',   'NW-128','Client onboarding wizard','app','todo','u19','u2','u2','Created the task and set the due date for Nov 5.'],
  [2,  'commented','NW-102','Payment retry backoff','app','bug','u5','u6','u6','Can we add jitter? Fixed intervals tend to herd retries after an outage.'],
  [3,  'moved',   'NW-112','Dashboard widget framework','ops','task','u6','u3','u3','Moved from To do to In progress after the grid spec was agreed.'],
  [5,  'assigned','NW-119','Accessibility audit — Q3 findings','app','epic','u2','u10','u2','Reassigned to Aisha now that the design review for the Q4 work is wrapped.'],
  [6,  'commented','NW-105','Legacy CRM export spec','crm','epic','u30','u1','u1','Vendor has not responded to the second follow-up. Escalating to account management today.'],
  [8,  'blocked', 'NW-101','Design review gate for billing flow','app','task','u19','u2','u2','Marked blocked — compliance sign-off is the gating item, not us.'],
  [11, 'completed','NW-114','Design tokens pipeline','design','task','u34','u2','u2','Merged. CI now fails on token drift across CSS, iOS and Android targets.'],
  [14, 'commented','NW-103','Migration cutover runbook','platform','task','u137','u3','u3','Rewrote the rollback section and corrected the DNS TTL in the cutover appendix.'],
  [16, 'added',   'NW-131','Passwordless pilot','ops','task','u137','u1','u1','Scoped a 30-person pilot before we go all-in with the whole org.'],
  [20, 'moved',   'NW-122','Time entry reconciliation','app','task','u30','u5','u5','Moved to In review — the override path is traced and the fix is up for look.'],
  [23, 'assigned','NW-106','Nightly regression matrix','qa','task','u4','u40','u4','Assigned the smoke tier definition to Olivia.'],
  [26, 'commented','NW-110','Session timeout race','platform','bug','u3','u9','u9','Good catch on the 1-in-50 repro rate. Please keep the fix behind a flag until staging.'],
  [29, 'completed','NW-124','Weekly digest email','ops','task','u30','u1','u1','Shipped to the four project leads.'],
  [33, 'moved',   'NW-104','Load test staging','platform','task','u47','u3','u3','Moved to In progress; harness is built and scheduled for tonight.'],
  [38, 'added',   'NW-138','Contract clause library','app','task','u23','u1','u1','Set an 11-week horizon; legal wants it before the Meridian renewal.'],
  [44, 'commented','NW-107','Token consolidation','design','task','u16','u2','u2','127 values is the real count after deduping the dark-theme variants.'],
  [50, 'assigned','NW-111','Role template library','ops','epic','u1','u137','u1','Assigned to Vera; five templates, one per recurring project shape.'],
  [58, 'completed','NW-113','Data migration dry run #3','crm','task','u30','u5','u5','1.2M records reconciled, zero unmatched foreign keys, 18 minutes wall clock.'],
  [66, 'blocked', 'NW-109','Audit log export to S3','ops','task','u13','u3','u3','Blocked on the KMS key policy approval from platform.'],
  [74, 'moved',   'NW-108','Empty-state copy pass','app','task','u10','u2','u2','Moved to In progress with the copy draft attached.'],
  [80, 'added',   'NW-142','Security posture review','platform','epic','u4','u3','u3','Opened the quarterly review; starts with the dependency sweep.'],
  [88, 'commented','NW-116','Invoice PDF generation','app','bug','u39','u5','u5','Confirmed the total is dropped, not mis-summed — the renderer stops at 40 rows.'],
  [96, 'assigned','NW-120','Client sandbox provisioning','platform','task','u3','u43','u3','Assigned the auto-expiry job to Luke.'],
  [104,'moved',   'NW-115','Onboarding checklist component','design','task','u10','u2','u2','Moved to In review after the a11y pass flagged the focus trap.'],
  [112,'completed','NW-133','Icon set refresh','design','task','u27','u2','u2','48 new icons in, 26 deprecated out.'],
  [120,'commented','NW-118','API rate limiting','platform','task','u56','u3','u3','Drafting the 429 telemetry first so we can show integrators what to expect.'],
  [130,'added',   'NW-149','QA runbook v2','qa','task','u40','u4','u4','Replaces the runbook from last year; the old one references environments we no longer run.'],
  [138,'blocked', 'NW-140','Contract test suite','qa','task','u8','u4','u4','Blocked — the contract suite needs the migration audit logs, which are blocked too.'],
  [150,'assigned','NW-126','Migration phase 2 rollback','platform','task','u3','u84','u3','Assigned to Jonas ahead of the cutover rehearsal.'],
  [160,'moved',   'NW-136','Passwordless pilot','ops','task','u137','u1','u1','Moved to In progress; the pilot list is the 30 people closest to launch.'],
  [170,'commented','NW-121','Performance budget','platform','epic','u52','u3','u3','Baseline is 312KB today. Setting the gate at 250KB will require real work, not just a flag.'],
  [180,'added',   'NW-152','Onboarding checklist automation','ops','task','u1','u137','u1','Added so new hires stop relying on tribal knowledge for week one.'],
  [190,'completed','NW-144','Sticky session handling','platform','task','u56','u3','u3','Landed behind the session-service flag.'],
  [200,'moved',   'NW-155','Migration phase 2 audit logging','platform','task','u30','u3','u3','Moved to In review; the checksum job is included for completeness.'],
  [210,'assigned','NW-158','Lead scoring rules','crm','task','u30','u5','u5','Assigned ahead of the sales enablement session next week.'],
  [220,'commented','NW-160','Data table filter UX','design','task','u2','u2','u2','Filter row needs to survive a 40-column export. Testing with the CRM team’s widest view.'],
  [230,'added',   'NW-163','Client status feed','app','task','u19','u2','u2','Added to close the gap clients flagged in the Q3 survey.'],
  [240,'blocked', 'NW-167','Access review automation','ops','task','u14','u1','u1','Blocked on the finalise-role-templates decision upstream.'],
  [250,'completed','NW-171','Cross-browser matrix','qa','task','u8','u4','u4','Matrix now covers Chrome, Firefox, Safari and Edge across Windows and macOS.'],
  [260,'moved',   'NW-174','Icon set refresh','design','task','u16','u2','u2','Moved to In review.'],
  [270,'assigned','NW-178','Cutover go/no-go checklist','platform','task','u3','u137','u3','Assigned to Vera for the cutover rehearsal on Nov 1.'],
  [280,'commented','NW-181','Test data factory','qa','task','u65','u4','u4','The factory needs deterministic seeds or the nightly diffs will never settle.'],
  [290,'completed','NW-184','Legacy endpoint sunset','platform','task','u43','u3','u3','Sunset notice sent; the endpoint goes dark in December.'],
  [300,'added',   'NW-187','Migration observability dashboard','crm','task','u30','u5','u5','Added so migration runs are visible without asking the platform team.'],
  [310,'moved',   'NW-190','Chart theming','design','task','u27','u2','u2','Moved to In progress.'],
  [320,'assigned','NW-193','Weekly usage digest','ops','task','u1','u30','u1','Assigned to Lena to build on the existing digest renderer.'],
  [330,'commented','NW-196','Client portal login flow','app','task','u19','u2','u2','Two clients still hit the legacy login. Redirect is in place but not announced yet.'],
  [340,'completed','NW-199','Skeleton loaders','design','task','u34','u2','u2','Shipped to the portal and the ops dashboards.'],
  [350,'added',   'NW-202','Role template library draft','ops','task','u137','u1','u1','Draft templates pulled from the three most common project shapes.'],
  [360,'blocked', 'NW-205','Contact dedupe scoring','crm','task','u60','u5','u5','Blocked on the CRM data quality report — we are scoring against a bad baseline.'],
  [370,'moved',   'NW-208','Passwordless pilot','ops','task','u26','u3','u3','Moved to In progress with the pilot cohort confirmed.'],
  [380,'assigned','NW-211','Mobile regression pack','qa','task','u40','u4','u4','Assigned ahead of the iOS 26 certification pass.'],
  [390,'commented','NW-214','Session policy review','ops','task','u14','u1','u1','Current 30-minute timeout is shorter than two clients’ standard workflow. Revising.'],
  [400,'completed','NW-217','Design doc template','design','task','u55','u2','u2','Template is live and used on the last three design docs.'],
  [410,'added',   'NW-220','License usage report','ops','task','u137','u1','u1','Added for the November vendor renegotiation.'],
  [420,'moved',   'NW-223','Legacy CRM field mapping','crm','task','u39','u5','u5','Moved to In review after the vendor field map finally arrived.'],
  [430,'assigned','NW-226','Redline compare view','app','task','u23','u2','u2','Assigned to close the biggest gap in the contract workflow.'],
  [440,'blocked', 'NW-229','Vendor API rate budget','crm','task','u45','u5','u5','Blocked on a rate-limit increase from the vendor.'],
  [450,'completed','NW-232','Table density tokens','design','task','u49','u2','u2','Tokens shipped; three dashboards moved off hard-coded heights.'],
];
const ACTS = ACT_SPEC.map(a => {
  const h=a[0], proj=PROJECTS[a[4]], person=byId[a[6]]||byId[a[7]];
  return {
    date: ago(h), verb:a[1], key:a[2], title:a[3], project:a[4],
    who: a[6], whoName: person.name, whoColor: avColor(person.name),
    initials: initials(person.name), projectLabel: proj.name, projectColor: proj.color,
    note:a[9],
  };
});
const ACTIVITY = ACTS.slice().sort((a,b) => a.date - b.date);

/* ---- notifications, tasks needing decisions, approvals ---- */
const NEEDS = [
  { id:'nd1', kind:'review',  key:'NW-102', title:'Payment retry backoff',        task:'NW-102', due:'today',  who:'u5',  note:'Your review is blocking the deploy of the billing fix.' },
  { id:'nd2', kind:'approve', key:'NW-103', title:'Migration cutover runbook',    task:'NW-103', due:'in 2 days',who:'u1', note:'Runbook v3 needs Owner sign-off before the cutover rehearsal.' },
  { id:'nd3', kind:'blocked', key:'NW-105', title:'Legacy CRM export spec',       task:'NW-105', due:'7 days', who:'u30', note:'Blocked on the vendor field map for merged contacts.' },
  { id:'nd4', kind:'review',  key:'NW-122', title:'Time entry reconciliation',    task:'NW-122', due:'today',  who:'u30',note:'Review requested on the override-path fix.' },
  { id:'nd5', kind:'decision',key:'NW-112', title:'Dashboard widget framework',   task:'NW-112', due:'in 3 days',who:'u3', note:'Security needs a decision on per-widget permission scoping.' },
  { id:'nd6', kind:'blocked', key:'NW-109', title:'Audit log export to S3',       task:'NW-109', due:'5 days', who:'u13',note:'Waiting on the KMS key policy approval from platform.' },
  { id:'nd7', kind:'approve', key:'NW-115', title:'Onboarding checklist component',task:'NW-115',due:'in 1 day',who:'u2', note:'Component is ready to ship after the a11y fixes land.' },
  { id:'nd8', kind:'blocked', key:'NW-240', title:'Access review automation',     task:'NW-240', due:'9 days', who:'u14',note:'Blocked on the role-templates decision upstream.' },
];
const NOTIF = [
  { id:'n1', date:ago(0.5), icon:'msg',  tone:'info',   text:'Marcus Reed commented on Payment retry backoff', sub:'Can we add jitter? Fixed intervals tend to herd retries after an outage.', link:'task', ref:'NW-102' },
  { id:'n2', date:ago(2),   icon:'at',   tone:'accent', text:'You were assigned a review on Payment retry backoff', sub:'Requested by Sofia Romano · due today', link:'task', ref:'NW-102' },
  { id:'n3', date:ago(5),   icon:'lock', tone:'warn',   text:'Legacy CRM export spec is blocked', sub:'Vendor field map still outstanding · reported by Elena Rossi', link:'task', ref:'NW-105' },
  { id:'n4', date:ago(7),   icon:'check',tone:'ok',     text:'Design tokens pipeline was completed', sub:'Merged to main by Anna Kowalski', link:'task', ref:'NW-114' },
  { id:'n5', date:ago(9),   icon:'at',   tone:'accent', text:'You were mentioned in Time entry reconciliation', sub:'The drift is coming from the manual override path.', link:'task', ref:'NW-122' },
  { id:'n6', date:ago(11),  icon:'clock',tone:'danger', text:'Design review gate for billing flow is overdue', sub:'Due Oct 15 · blocked since Oct 10', link:'task', ref:'NW-101' },
  { id:'n7', date:ago(16),  icon:'user', tone:'info',   text:'Vera Lindholm was invited to Internal Ops Tools', sub:'Invitation pending · owner role', link:'people', ref:'u137' },
  { id:'n8', date:ago(20),  icon:'check',tone:'ok',     text:'Data migration dry run #3 passed', sub:'1.2M records · 0 unmatched keys · 18 minutes', link:'task', ref:'NW-113' },
  { id:'n9', date:ago(26),  icon:'lock', tone:'warn',   text:'Audit log export to S3 is blocked', sub:'Waiting on the KMS key policy approval', link:'task', ref:'NW-109' },
  { id:'n10',date:ago(34),  icon:'flag', tone:'info',   text:'Security posture review opened for Q3', sub:'Dependency sweep, secret scan and admin access review', link:'task', ref:'NW-232' },
];
const APPROVALS = [
  { id:'ap1', title:'Migration cutover runbook v3',       task:'NW-103', req:'u3',  reqName:'Marcus Reed',      due:due(2),  status:'pending',  note:'Owner sign-off required before the Nov 1 cutover rehearsal. Rollback section redrafted on Oct 12.' },
  { id:'ap2', title:'KMS key policy for audit exports',   task:'NW-109', req:'u13', reqName:'Noah Patel',       due:due(-2), status:'pending',  note:'Platform to approve the key policy so audit logs can be exported to immutable S3 storage.' },
  { id:'ap3', title:'Role template library — scope',      task:'NW-111', req:'u137',reqName:'Vera Lindholm',    due:due(6),  status:'pending',  note:'Five templates, applied to the three live projects. Needs Owner approval before we re-map existing access.' },
  { id:'ap4', title:'Passwordless pilot cohort (30 users)',task:'NW-131',req:'u137',reqName:'Vera Lindholm',    due:due(4),  status:'pending',  note:'Pilot limited to platform and QA staff to keep blast radius small.' },
  { id:'ap5', title:'Onboarding checklist component',      task:'NW-115', req:'u2',  reqName:'Ava Chen',         due:due(1),  status:'pending',  note:'Ready to ship after the focus-trap fix lands. Unblocks the portal redesign milestone.' },
  { id:'ap6', title:'Session timeout policy change',       task:'NW-214', req:'u14', reqName:'Fatima Zouari',    due:due(-1), status:'approved', note:'Approved Oct 13 — 30 minutes extended to 60 for portal workflows, kept at 15 for the admin console.' },
  { id:'ap7', title:'Legacy CRM endpoint sunset',          task:'NW-199', req:'u43', reqName:'Luke Fletcher',    due:due(-6), status:'approved', note:'Approved. Endpoint goes dark December 15; notice sent to all integrators on Oct 8.' },
  { id:'ap8', title:'Vendor API rate-limit increase',      task:'NW-229', req:'u45', reqName:'Miguel Santos',    due:due(-9), status:'rejected', note:'Rejected — vendor will not move off the shared quota. Miguel is scoping a local queue instead.' },
];
