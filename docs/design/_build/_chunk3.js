/* ---- 24 hand-authored tasks for narrative control ---- */
const T0 = [
  // id, key, title, project, type, status, assignee, reportee, prio, due(+days), tags, story, cost, blocker
  ['a01','NW-101','Design review gate for billing flow',   'app',  'task', 'blocked',   'u10','u2',  'urgent', 1,   ['ux-review','billing'],       5,32,'Awaiting Meridian compliance sign-off on the new invoice layout before it can ship to pilot users.'],
  ['a02','NW-102','Payment retry backoff',                 'app',  'bug',  'inReview',  'u6', 'u5',  'high',  0,   ['billing','stability'],       3,18,'Introduced a fixed 2s retry interval. Reviewer wants exponential backoff with jitter and a max attempt cap so a failed processor doesn’t hammer the API.'],
  ['a03','NW-103','Migration cutover runbook',             'platform','task','inReview','u3', 'u1',  'urgent', 2,  ['migration','runbook'],        6,36,'Draft v3. The rollback section still references the retired cluster names and the DNS TTL is overstated by half.'],
  ['a04','NW-104','Load test staging',                     'platform','task','inProgress','u47','u3','high', 4,  ['perf','load'],              4,24,'Need 2k concurrent users sustained for 30 minutes before we can commit to the cutover window.'],
  ['a05','NW-105','Legacy CRM export spec',                'crm',  'epic', 'blocked',   'u30','u1',  'high',  5,   ['crm','integration'],         8,44,'Blocked on the vendor’s field map for the merged contact records — promised last week, still nothing.'],
  ['a06','NW-106','Nightly regression matrix',             'qa',   'task', 'inProgress','u40','u4',  'med',   1,   ['ci','regression'],           4,20,'Split the suite into a 25-minute smoke tier and a full overnight tier so main stays green and CI stops timing out.'],
  ['a07','NW-107','Token consolidation',                   'design','task','todo',     'u2', 'u1',  'high',  10,  ['tokens'],                    3,15,'127 colour values collapse to 42. Needs a deprecation table so teams can grep for old names.'],
  ['a08','NW-108','Empty-state copy pass',                 'app',  'task', 'inProgress','u10','u2',  'low',   7,   ['copy','ux-review'],          2,10,'Twelve screens still say “No data”. Copy needs to explain what to do next, not just report absence.'],
  ['a09','NW-109','Audit log export to S3',                'ops',  'task', 'blocked',   'u13','u3',  'med',   3,   ['audit','export'],            3,16,'Security wants signed, immutable exports. Blocked on the KMS key policy approval from the platform team.'],
  ['a10','NW-110','Session timeout race',                  'platform','bug','inProgress','u9', 'u3','urgent',0,['auth','security'],       2,11,'Concurrent requests after logout can still read a revoked session for up to 90s. Reproduces about 1 in 50 times.'],
  ['a11','NW-111','Role template library',                 'ops',  'epic', 'todo',     'u137','u1','med',14, ['roles','permissions'],     6,30,'Five reusable templates so new projects stop re-deriving the same access matrix by hand.'],
  ['a12','NW-112','Dashboard widget framework',            'ops',  'task', 'inProgress','u6', 'u3',  'high',  6,  ['dashboard'],                 6,28,'Grid, filters and per-widget permissions. The permission scoping is the hard part and needs a decision from security.'],
  ['a13','NW-113','Data migration dry run #3',             'crm',  'task', 'done',     'u30','u5',  'high', -6,  ['crm','migration'],         4,20,'Third dry run finished clean — 1.2M records, 0 unmatched foreign keys, under 20 minutes.'],
  ['a14','NW-114','Design tokens pipeline',                'design','task','done',     'u34','u2',  'med',  -13, ['tokens','automation'],       3,12,'Tokens now compile to CSS, iOS and Android from one source, and CI fails on drift.'],
  ['a15','NW-115','Onboarding checklist component',        'design','task','inReview', 'u16','u2',  'med',   3,   ['component'],                 2,10,'Reviewer flagged keyboard ordering on the expandable items and a focus trap on the modal summary.'],
  ['a16','NW-116','Invoice PDF generation',                'app',  'bug',  'inProgress','u39','u5',  'high',  5,  ['billing','reporting'],       4,19,'Line items over 40 rows overflow the second page and the total is silently dropped.'],
  ['a17','NW-117','Contract clause library',               'app',  'task', 'todo',     'u23','u1',  'med',   20,  ['legal'],                     8,38,'Standard clauses the team re-types every engagement. Needs versioning so old contracts keep pointing at what they signed.'],
  ['a18','NW-118','API rate limiting',                     'platform','task','inProgress','u56','u3','high',9,['platform','security'],     5,22,'Per-key limits with a burst allowance. Needs to be transparent enough that integrators can plan for 429s.'],
  ['a19','NW-119','Accessibility audit — Q3 findings',     'app',  'epic', 'inProgress','u10','u2',  'high',  2,  ['a11y','ux-review'],          7,34,'47 findings from the last audit. 19 fixed; the remaining 28 are grouped here with the four critical ones prioritised.'],
  ['a20','NW-120','Client sandbox provisioning',           'platform','task','inProgress','u43','u3','med',11,['platform','client'],       3,14,'Self-serve sandbox with 7-day auto-expiry and a snapshot restore, so demos stop eating production data.'],
  ['a21','NW-121','Performance budget',                    'platform','epic','todo',   'u52','u3',  'med',   15,  ['perf','budget'],             5,26,'Gate builds on a 250KB budget. Needs the baseline measured before it becomes a hard fail.'],
  ['a22','NW-122','Time entry reconciliation',             'app',  'task', 'inReview', 'u6', 'u5',  'med',   4,   ['time','reporting'],          2,10,'Timesheet totals drift from task estimates by about 6%. Suspect the manual override path.'],
  ['a23','NW-123','Security posture review',               'platform','epic','todo',   'u4', 'u3',  'high',  12,  ['security','audit'],          8,36,'Quarterly review. Includes dependency sweep, secret scan and the access review for the 12 people with admin.'],
  ['a24','NW-124','Weekly digest email',                   'ops',  'task', 'done',     'u30','u1',  'low',  -21, ['comms'],                     2,9, 'Digest is live for the four project leads. Open rate is low but nobody has asked to be removed, which is the sign.'],
];
const TL = {
  a01:[['done',-9,'Brief written','u10'],['done',-6,'First pass designed','u10'],['cur',-4,'Compliance sign-off','u19'],['todo',0,'Ship to pilot','u6']],
  a02:[['done',-5,'Intermittent failures reproduced','u6'],['done',-2,'Backoff with jitter implemented','u6'],['cur',-1,'Review in progress','u5'],['todo',1,'Deploy','u47']],
  a03:[['done',-20,'Phases scoped','u3'],['done',-8,'Draft v2','u3'],['cur',-2,'Rollback section redrafted','u137'],['todo',1,'Cutover rehearsal','u47']],
  a04:[['done',-3,'Harness built','u47'],['cur',0,'Run 2k users 30 min','u47'],['todo',2,'Report + headroom analysis','u19']],
  a05:[['done',-30,'Scope agreed','u30'],['done',-16,'Vendor engagement opened','u30'],['cur',-12,'Field map request','u30'],['todo',0,'Export script','u39']],
  a06:[['done',-4,'Suites inventoried','u40'],['cur',-1,'Smoke tier defined','u40'],['todo',1,'Overnight tier wired to CI','u65']],
  a07:[['todo',0,'Audit 127 values','u34'],['todo',0,'Propose 42','u16'],['todo',0,'Deprecation table','u10'],['todo',0,'Migrate apps','u37']],
  a08:[['done',-2,'Listed 12 screens','u10'],['cur',0,'Copy drafted','u10'],['todo',3,'Design sign-off','u2'],['todo',5,'Implemented','u24']],
  a09:[['done',-6,'Scope agreed','u13'],['cur',-3,'KMS key policy request','u13'],['todo',2,'Signed export writer','u62'],['todo',4,'Retention job','u62']],
  a10:[['done',-4,'Race reproduced 1/50','u9'],['done',-2,'Fix implemented','u9'],['cur',0,'Pending review','u3']],
  a11:[['todo',0,'List templates','u137'],['todo',0,'Draft five','u14'],['todo',0,'Apply to live projects','u5']],
  a12:[['done',-7,'Grid spec agreed','u6'],['cur',-2,'Widget framework','u6'],['todo',3,'Permission scoping','u3'],['todo',6,'Ship to ops','u26']],
  a13:[['done',-20,'Sources reconciled','u30'],['done',-13,'Dry run #2','u30'],['done',-6,'Dry run #3 clean','u30']],
  a14:[['done',-30,'One source defined','u34'],['done',-18,'Multi-target compiler','u34'],['done',-13,'CI drift gate','u34']],
  a15:[['done',-9,'Component built','u16'],['done',-5,'Docs written','u16'],['cur',-1,'A11y review','u10'],['todo',1,'Ship','u2']],
  a16:[['done',-8,'Overflow reproduced','u39'],['cur',-3,'Pagination fix','u39'],['todo',1,'Regression test','u25'],['todo',3,'Deploy','u47']],
  a17:[['todo',0,'Collect in-use clauses','u23'],['todo',0,'Versioning model','u23'],['todo',0,'Insertion picker','u66']],
  a18:[['done',-9,'Design agreed','u56'],['cur',-4,'Limit engine','u56'],['todo',2,'429 telemetry','u26'],['todo',5,'Docs for integrators','u56']],
  a19:[['done',-24,'Audit completed','u10'],['done',-11,'19 findings fixed','u24'],['cur',-2,'Critical 28 triaged','u2'],['todo',10,'Remaining 24','u37']],
  a20:[['done',-6,'Provisioning spec','u43'],['cur',-1,'Auto-expiry job','u43'],['todo',2,'Snapshot restore','u13'],['todo',5,'Sandbox UI','u24']],
  a21:[['todo',0,'Measure baseline','u52'],['todo',0,'Set 250KB budget','u19'],['todo',0,'Wire build gate','u47']],
  a22:[['done',-7,'Drift quantified at 6%','u6'],['done',-2,'Override path traced','u6'],['cur',-1,'Review in progress','u30']],
  a23:[['todo',0,'Dependency sweep','u4'],['todo',0,'Secret scan','u4'],['todo',0,'Admin access review','u1'],['todo',0,'Report to Owner','u19']],
  a24:[['done',-40,'Content model agreed','u30'],['done',-28,'Renderer built','u24'],['done',-21,'Shipped to 4 leads','u30']],
};
const TASKS = T0.map((t,i) => {
  const id=t[0], key=t[1], title=t[2], project=t[3], type=t[4], status=t[5], assignee=t[6], reportee=t[7],
        prio=t[8], dueD=t[9], tags=t[10], story=t[11], cost=t[12], blocker=t[13];
  const proj = PROJECTS[project];
  const total = Math.round(cost * (0.72 + rnd()*0.6));
  let done = 0;
  if (status === 'done') done = total;
  else if (status === 'blocked') done = Math.round(total * (0.25 + rnd()*0.25));
  else if (status === 'inReview') done = Math.round(total * 0.86);
  else if (status === 'inProgress') done = Math.round(total * (0.2 + rnd()*0.45));
  else if (rnd() < 0.25) done = Math.round(total * rnd() * 0.4);
  const t2 = (TL[id] || []).map(s => ({ state:s[0], date: due(s[1]), by:s[2], what:s[3] }));
  return {
    id, key, title, project, type, status, prio, tags,
    assignee: byId[assignee] ? assignee : null,
    reportee: byId[reportee] ? reportee : null,
    due: due(dueD), story, cost, total, done,
    effort: [2,4,8,13,21][i % 5],
    blockers: status === 'blocked' ? [blocker] : [],
    blockedSince: status === 'blocked' ? ago(60 + i*9) : null,
    created: due(-(10 + ((i*37)%26))),
    updated: due(-((i*7)%6)),
    completedAt: status === 'done' ? due(-((i*3)%18) - 1) : null,
    dependencies: i % 9 === 0 && i > 2 ? [T0[(i+3)%T0.length][0]] : [],
    activity: t2, watch: 2 + (i % 6), comments: (i*3) % 7,
    projectLabel: proj.name, projectColor: proj.color,
  };
});
const TASK_TITLES = {
  app:['Client onboarding wizard','Billing line-item edit','Notification centre','Dark mode contrast pass','Empty-state illustrations','Keyboard shortcuts reference','Export to Excel','Client portal login flow','Rate sheet editor','Task template library','Weekly digest to clients','Contract attachment upload','Portal search relevance','Mobile offline queue','Invoice number customisation','Client status feed','Redline compare view','Time entry bulk edit','Milestone dependency graph','Client approval gate','Portal notification digests','Sandbox account creation','Client access expiry','Usage export to CSV','Portal theme picker'],
  platform:['Migration phase 2 rollback','Migration audit logging','Migration checksum validation','Feature flag rollout plan','Staging promotion gate','Database index audit','Sticky session handling','Cutover comms plan','Canary release script','Backfill job hardening','Read replica lag alert','Schema diff report','Migration progress telemetry','Cutover go/no-go checklist','Legacy endpoint sunset','Deprecation notice schedule','Rollback drill','Zero-downtime deploy runbook','Connection pooling review','Graceful shutdown test'],
  qa:['A11y smoke tier','Contract test suite','Cross-browser matrix','Flaky test quarantine','Mock server hardening','Nightly perf baseline','Regression report email','Visual diff baseline','Test data factory','Coverage gate on main','Mobile regression pack','Security regression pack','Load test nightly','Snapshot regression suite','Chaos test for deploys','Test environment resets','Defect triage board','Sign-off checklist','Release readiness report','QA runbook v2'],
  crm:'Lead scoring rules|Legacy CRM field mapping|Duplicate contact merge|Contact sync conflict rules|CRM history migration|Legacy pricing table import|Archive purge job|CRM export schema review|Vendor API rate budget|Migration rollback plan|Contact dedupe scoring|Legacy address normalisation|Migration observability dashboard|Sync retry queue|Legacy CRM read-only lock|Migration acceptance tests'.split('|'),
  design:['Icon set refresh','Motion guidelines','Type scale cleanup','Spacing scale audit','Empty state library','Form validation states','Tooltip component','Modal focus management','Table density tokens','Skeleton loaders','Stepper component','Tag component','Data table filter UX','Chart theming','Error state patterns','Loading strategy guide','Component naming audit','Design doc template','Token deprecation notice','Storybook navigation'],
  ops:['User audit report','Role template library draft','Passwordless pilot','Session policy review','Sandbox expiry job','Access review automation','Provisioning dry run','De-provisioning checklist','Weekly usage digest','Org chart import','Team capacity snapshot','Project health report','Onboarding checklist automation','Invite flow permissions','License usage report','Retention policy review','Admin action log','Service account rotation','Vendor access review','Ops dashboard v1'],
};
const PROJ_T = { app:TASK_TITLES.app, platform:TASK_TITLES.platform, qa:TASK_TITLES.qa, crm:TASK_TITLES.crm, design:TASK_TITLES.design, ops:TASK_TITLES.ops };
const ST_TITLE = {
  todo:['Draft','Scope','Audit','Plan','Review request','Inventory','Collect','List','Spec draft','Define'],
  inProgress:['In flight','Underway','Building','Iterating','Reviewing','Investigating','Implementing'],
  inReview:['In review','Review pass','Awaiting approval','Sign-off pending','Polish pass'],
  blocked:['Blocked: awaiting','Stalled on','Waiting on','Blocked by','Halted by'],
  done:['Complete','Shipped','Landed','Done','Closed','Merged'],
};
const ST_TAG = {
  todo:['planning','discovery'], inProgress:['delivery'], inReview:['review'], blocked:['risk'], done:['done'],
};
const ST_DUE = { todo:[3,30], inProgress:[0,18], inReview:[-1,6], blocked:[0,10], done:[-30,-2] };
const ST_PRIO = { todo:['low','med','med','high','urgent'], inProgress:['med','high','high','urgent','low'], inReview:['med','high'], blocked:['high','urgent','med'], done:['low','med','high','med','urgent'] };
const ST_ACT = {
  todo:[['todo',-2,'Brief drafted',''],['todo',0,'Scope defined',''],['todo',2,'Discovery calls','']],
  inProgress:[['done',-6,'Brief drafted',''],['done',-3,'Kickoff held',''],['cur',0,'Implementation underway',''],['todo',3,'Review hand-off','']],
  inReview:[['done',-5,'Brief drafted',''],['done',-2,'Implementation done',''],['cur',-1,'In review',''],['todo',1,'Merge + deploy','']],
  blocked:[['done',-8,'Brief drafted',''],['done',-4,'Work started',''],['cur',-3,'Blocked',''],['todo',0,'Resume once unblocked','']],
  done:[['done',-9,'Brief drafted',''],['done',-5,'Implementation done',''],['done',-2,'Review passed',''],['done',-1,'Shipped','']],
};
const ST_STATE = { todo:'todo', inProgress:'inProgress', inReview:'inReview', blocked:'blocked', done:'done' };
let TN = 125;
const PPL = TEAM.filter(m => m.status !== 'invited' && !['u1'].includes(m.id));
const MAN = ['u2','u3','u4','u5','u1'];
const GEN_COUNT = 76;
const GEN = [];
for (let i=0;i<GEN_COUNT;i++){
  const r0=rnd();
  const status = r0<0.14?'todo' : r0<0.52?'inProgress' : r0<0.68?'inReview' : r0<0.80?'blocked' : 'done';
  const pid = PROJ_ORDER[i%6];
  const proj = PROJECTS[pid];
  const pool = PROJ_T[pid];
  const title = pool[i%pool.length];
  const a = PPL[(i*3 + Math.floor(rnd()*11)) % PPL.length];
  const rep = MAN[i%5];
  const prio = ST_PRIO[status][i % ST_PRIO[status].length];
  const rng = ST_DUE[status];
  const dueD = rng[0] + Math.floor(rnd()*(rng[1]-rng[0]+1));
  const cost = Math.round(2 + rnd()*16);
  const total = Math.round(cost * (0.72 + rnd()*0.6));
  let done = status==='done'? total : status==='blocked'? Math.round(total*(0.22+rnd()*0.28)) : status==='inReview'? Math.round(total*0.88) : status==='inProgress'? Math.round(total*(0.2+rnd()*0.45)) : 0;
  const tags = ['delivery','planning'].slice(0,1);
  ST_TAG[status].forEach(t => { if (!tags.includes(t)) tags.push(t); });
  if (pid==='app' && i%4===0) tags.push('billing');
  if (pid==='platform' && i%3===0) tags.push('migration');
  if (i%5===0) tags.push('a11y');
  const act = ST_ACT[status].map(s => ({ state:s[0], date:due(s[1]), by:s[3]||a.id, what:s[2] }));
  GEN.push({
    id: uid('g'), key: 'NW-'+(++TN), title, project: pid, type: i%11===0?'epic':(i%7===0?'bug':'task'),
    status: ST_STATE[status], prio, tags, assignee: a.id, reportee: rep,
    due: due(dueD), story: '', cost, total, done, effort: [2,3,5,8,13][i%5],
    blockers: status==='blocked' ? ['Waiting on an external decision from the client before this can move.'] : [],
    blockedSince: status==='blocked' ? ago(30+i*7) : null,
    created: due(-(8+((i*31)%22))), updated: due(-((i*11)%5)),
    completedAt: status==='done'? due(-((i*5)%20)-1) : null,
    dependencies: [], activity: act, watch: 1+(i%5), comments: (i*3)%6,
    projectLabel: proj.name, projectColor: proj.color,
  });
}
TASKS.push(...GEN);
const TASK_BY_ID = {};
TASKS.forEach(t => { TASK_BY_ID[t.id] = t; });
const openTasks = TASKS.filter(t => t.status !== 'done');
const doneTasks = TASKS.filter(t => t.status === 'done');
