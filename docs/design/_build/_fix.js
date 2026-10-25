/* ================= FIX: missing definitions ================= */

/* --- 1. S state init (add to chunk 14's S = {}) --- */
/* Append to S = {} in chunk14 or write as: */
const _S_EXTRA = `  notifRead: false,
  taskModal: null,
  personDrawer: null,
  projectDrawer: null,
  board: 'mine',
  approvalsView: false,
  peopleFilter: 'all',
  boardFilter: 'all',
  boardStatus: 'all',
  searchQuery: '',
`;

/* --- 2. vApprovals view (add to chunk 6 or a new chunk) --- */
/* vApprovals, vSettings, vSearch — called in chunk 6 router but undefined */
function vApprovals(){
  const p = APPROVALS.filter(a => a.status === 'pending');
  const r = APPROVALS.filter(a => a.status === 'approved' || a.status === 'rejected');
  var h = '';
  h += '<div class="tb-sub"><div class="seg"><button class="seg-b on">Pending ('+p.length+')</button><button class="seg-b">History ('+r.length+')</button></div>';
  h += '<div class="tb-sp"></div><div class="chips"><button class="chip">All types</button><button class="chip">Approvals</button><button class="chip">Sign-offs</button></div></div>';
  h += '<div class="card"><div class="card-h"><div><div class="card-t">Pending approvals</div><div class="card-s">'+p.length+' items awaiting your decision</div></div></div>';
  if (p.length === 0) {
    h += '<div class="card-b" style="text-align:center;padding:32px;color:var(--mut)"><div style="font-size:32px;margin-bottom:8px">'+icon('check',32)+'</div>No pending approvals</div>';
  } else {
    p.forEach(function(a){
      h += '<div class="attn" data-act="open-task" data-id="'+esc(a.taskId)+'">';
      h += '<div class="attn-i i-acc">'+icon('check',15)+'</div>';
      h += '<div class="attn-tx"><div class="attn-h">'+esc(a.title)+'</div>';
      h += '<div class="attn-s">'+esc(a.requestedByName)+' · '+relT(a.requestedAt)+'</div></div>';
      h += '<div class="badge badge-warn">'+esc(a.type)+'</div>';
      h += '<button class="btn ghost sm" style="margin-left:6px">Review</button></div>';
    });
  }
  h += '</div>';
  return h;
}

/* --- 3. vSettings view --- */
function vSettings(){
  var h = '';
  h += '<div class="grid2" style="max-width:760px">';
  /* General */
  h += '<div class="card"><div class="card-h"><div class="card-t">General</div></div><div class="msec-b">';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Weekly email digest</div><div class="tg-d">Summary every Monday morning</div></div><div class="tog on" data-act="toggle" data-v="emailDigest"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Mention notifications</div><div class="tg-d">When someone tags you in a comment</div></div><div class="tog on" data-act="toggle" data-v="mentions"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Task due date reminders</div><div class="tg-d">24h before and at due time</div></div><div class="tog on" data-act="toggle" data-v="dueReminders"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Approval reminders</div><div class="tg-d">Remind after 48h of inactivity</div></div><div class="tog on" data-act="toggle" data-v="approvalReminders"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Marketing emails</div><div class="tg-d">Product updates and tips</div></div><div class="tog" data-act="toggle" data-v="marketing"><i></i></div></div>';
  h += '</div></div>';
  /* Privacy */
  h += '<div class="card"><div class="card-h"><div class="card-t">Privacy & access</div></div><div class="msec-b">';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Profile visible to team</div><div class="tg-d">Others can see your name and role</div></div><div class="tog on"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Show online status</div><div class="tg-d">Display activity indicator</div></div><div class="tog on"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Two-factor authentication</div><div class="tg-d">Extra security for your account</div></div><div class="tog on"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Allow guest access</div><div class="tg-d">Invite external collaborators</div></div><div class="tog" data-act="toggle" data-v="guests"><i></i></div></div>';
  h += '</div></div>';
  /* Appearance */
  h += '<div class="card"><div class="card-h"><div class="card-t">Appearance</div></div><div class="msec-b">';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Compact mode</div><div class="tg-d">Reduce spacing throughout the UI</div></div><div class="tog" data-act="toggle" data-v="compact"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">High contrast text</div><div class="tg-d">Increase text weight and spacing</div></div><div class="tog" data-act="toggle" data-v="highContrast"><i></i></div></div>';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Keyboard shortcuts</div><div class="tg-d">Show shortcut hints in the UI</div></div><div class="tog on"><i></i></div></div>';
  h += '<div class="togrow" style="border-bottom:0"><div class="tg-tx"><div class="tg-n">Animations</div><div class="tg-d">UI motion and transitions</div></div><div class="tog on"><i></i></div></div>';
  h += '</div></div>';
  /* Notifications */
  h += '<div class="card"><div class="card-h"><div class="card-t">Notifications</div></div><div class="msec-b">';
  h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Browser notifications</div><div class="tg-d">System-level push alerts</div></div><div class="tog on"><i></i></div></div>';
  h += '<div class="togrow" style="border-bottom:0"><div class="tg-tx"><div class="tg-n">Sound</div><div class="tg-d">Play sound on new notifications</div></div><div class="tog on"><i></i></div></div>';
  h += '</div></div>';
  h += '</div>';
  return h;
}

/* --- 4. vSearch view --- */
function vSearch(){
  var h = '';
  h += '<div style="max-width:600px;margin:0 auto;padding-top:8px">';
  h += '<div class="searchwrap">';
  h += '<div class="sm-tl">';
  h += '<div class="sm-h">Search</div>';
  h += '<div class="sm-s">Find tasks, projects and people across Nordwind Studio</div>';
  h += '</div>';
  h += '<input class="searchin" id="search-input" placeholder="Search tasks, projects, people…" autofocus>';
  h += '<div class="sm-b">';
  /* Recent */
  h += '<div class="msec-h">Recent</div>';
  h += '<div class="res">';
  var recent = TASKS.slice(-5).reverse();
  recent.forEach(function(t){
    h += '<div class="res-i" data-act="open-task" data-id="'+esc(t.id)+'">';
    h += '<span class="badge" style="background:var(--accent-bg);color:var(--accent)">'+esc(t.key)+'</span>';
    h += '<div><div class="ri-t">'+esc(t.title)+'</div><div class="ri-s">'+esc(projLabel(t.projectId))+' · '+esc(memberName(t.assignedTo[0]))+'</div></div>';
    h += '</div>';
  });
  h += '</div>';
  /* Quick filters */
  h += '<div class="msec-h" style="margin-top:14px">Quick filters</div>';
  h += '<div class="chips">';
  [['overdue','Overdue'],['dueToday','Due today'],['blocked','Blocked'],['highPrio','High priority'],['unassigned','Unassigned']].forEach(function(f){
    h += '<button class="chip" data-act="search-filter" data-v="'+f[0]+'">'+f[1]+'</button>';
  });
  h += '</div>';
  h += '</div></div></div>';
  return h;
}

/* --- 5. iconTitle helper (used by chunk 14 shell) --- */
function iconTitle(name){
  if (name === 'bell') return 'ib-ic';
  return '';
}

/* --- 6. toDateStr helper (used by chunk 9 task form) --- */
function toDateStr(d){
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

/* --- 7. healthBadge property — add to each project in PROJECTS (chunk 1) --- */
/* After PROJECTS is built, run: */
PROJECTS && Object.keys(PROJECTS).forEach(function(pid){
  if (PROJECTS[pid] && !PROJECTS[pid].healthBadge) {
    var p = PROJECTS[pid];
    var open = TASKS ? TASKS.filter(function(t){ return t.projectId === pid && t.status !== 'done'; }).length : 0;
    var blk = TASKS ? TASKS.filter(function(t){ return t.projectId === pid && t.blocked; }).length : 0;
    PROJECTS[pid].openTasks = open;
    PROJECTS[pid].blocked = blk;
    PROJECTS[pid].healthBadge = blk > 0 ? 'badge-danger' : open > 3 ? 'badge-warn' : 'badge-ok';
  }
});
