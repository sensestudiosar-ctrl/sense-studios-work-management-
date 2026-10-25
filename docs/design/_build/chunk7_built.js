/* ---- Owner's own queue: decisions and reviews Elena owns directly.
       Row shape: [key, title, project, prio, dueOffset, note, cost, total] ---- */
const OWNER_Q = [
  ['NW-301','Budget increase — Platform Migration','platform','urgent',3,'Finance to approve a $120k increase for the cutover window. Phase 3 cannot start without it.',3,30],
  ['NW-302','Hire: senior migration engineer','ops','high',7,'Headcount request for the phase-3 rollback work. Interview shortlist is ready and the two finalists are booked.',2,26],
  ['NW-303','Meridian renewal terms — Q1','app','urgent',5,'Q1 pricing decision, 40 days before expiry. Two options are in front of you; the client prefers the annual plan.',3,22],
  ['NW-304','Approve KMS key policy','platform','high',1,'Security posture item. Platform has been waiting on your sign-off for the audit-log export work.',1,8],
  ['NW-305','Passwordless pilot cohort','ops','med',4,'30-person pilot limited to platform and QA. Low blast radius, reversible in an afternoon.',1,10],
  ['NW-306','Decide: design-system licensing model','design','med',10,'Seat-based versus flat licensing across four client engagements. Flat is cheaper at the current size but scales badly.',4,18],
  ['NW-307','Contractor extension — 2 FTE','crm','med',14,'CRM data quality work extends into November. Two-month extension requested by Diego.',2,20],
  ['NW-308','Review Q3 delivery retro','ops','low',21,'Facilitate the retro readout for the four project leads. Read the notes first; the pattern is capacity, not process.',1,6],
  ['NW-309','Vendor renewal: observability stack','ops','high',9,'$31k annual renewal. Two alternatives are priced and one is 40% cheaper with the same retention window.',2,14],
  ['NW-310','Customer escalation: invoice discrepancy','app','urgent',1,'Client finance flagged an $18,400 overcharge on the September invoice. They want a response before Friday.',1,6],
];
OWNER_Q.forEach(function (r, i) {
  const proj = PROJECTS[r[2]];
  const status = r[3] === 'urgent' ? 'blocked' : r[3] === 'high' ? 'inProgress' : 'todo';
  const total = r[7];
  const done = status === 'blocked' ? Math.round(total * 0.3) : status === 'inProgress' ? Math.round(total * 0.45) : 0;
  TASKS.push({
    id: uid('o'), key: r[0], title: r[1], project: r[2], type: 'task', status: status,
    prio: r[3], tags: ['decision'], assignee: 'u1', reportee: 'u1',
    due: due(r[4]), story: r[5], cost: r[6], total: total, done: done,
    effort: [2, 3, 5, 8][i % 4],
    blockers: status === 'blocked' ? [r[5]] : [],
    blockedSince: status === 'blocked' ? ago(20 + i * 4) : null,
    created: due(-(6 + i * 2)), updated: due(-((i * 3) % 4)), completedAt: null,
    dependencies: [], activity: [
      { state: 'done', date: due(-5 - i), by: 'u19', what: 'Brief prepared' },
      { state: 'cur', date: due(-1), by: 'u1', what: status === 'blocked' ? 'Awaiting your decision' : 'In progress' },
      { state: 'todo', date: due(2), by: 'u1', what: 'Decision recorded' },
    ],
    watch: 4 + (i % 4), comments: (i * 3) % 5,
    projectLabel: proj.name, projectColor: proj.color,
  });
});
TASKS.forEach(function (t) { TASK_BY_ID[t.id] = t; });
openTasks.length = 0;
doneTasks.length = 0;
TASKS.forEach(function (t) { (t.status === 'done' ? doneTasks : openTasks).push(t); });
const OWNER_TASKS = TASKS.filter(function (t) { return t.assignee === 'u1'; });
