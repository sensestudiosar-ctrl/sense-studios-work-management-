/* ================= VIEWS ================= */
const NAV = [
  { id:'dashboard', label:'Dashboard',  icon:'home',   count:openTasks.length },
  { id:'tasks',     label:'My Work',    icon:'list',   count:personOpen('u1').length },
  { id:'projects',  label:'Projects',   icon:'folder', count:PROJ_ORDER.length },
  { id:'people',    label:'People',     icon:'people', count:TEAM.length },
  { id:'approvals', label:'Approvals',  icon:'check',  count:APPROVALS.filter(a => a.status==='pending').length, badge:true },
  { id:'settings',  label:'Settings',   icon:'gear' },
];
function sidebar(){
  let h = '<aside class="sidebar">';
  h += '<div class="brand"><span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span><span class="bt">SenseWork<span class="bd">v1 demo</span></span></div>';
  h += '<div class="ws"><div class="ws-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M9 4v16"/></svg></div><div class="ws-tx"><div class="ws-n">Nordwind Studio</div><div class="ws-s">148 members · 6 projects</div></div></div>';
  h += '<div class="nav-lbl">Workspace</div>';
  NAV.forEach(n => {
    const on = S.view === n.id ? ' active' : '';
    h += '<a class="nav-item'+on+'" data-nav="'+n.id+'"><span class="ic">'+icon(n.icon,18)+'</span><span>'+n.label+'</span>';
    if (n.badge && n.count) h += '<span class="badge b-danger">'+n.count+'</span>';
    else if (n.count) h += '<span class="nav-count">'+n.count+'</span>';
    h += '</a>';
  });
  h += '<div class="sb-foot"><div class="av" style="background:'+avColor(byId.u1.name)+'">'+esc(initials(byId.u1.name))+'</div><div class="sb-tx"><div class="sb-n">'+esc(byId.u1.name)+'</div><div class="sb-r">'+ROLES.owner.name+' · workspace owner</div></div></div>';
  h += '</aside>';
  return h;
}
const TITLES = {
  dashboard:{ h:'Dashboard',          s:'Nordwind Studio · '+TEAM.length+' people · '+openTasks.length+' open tasks' },
  tasks:    { h:'My Work',            s:'Your tasks, decisions and reviews — '+personOpen('u1').length+' open' },
  projects: { h:'Projects',           s:'Six active projects · '+PROJ_ORDER.reduce((s,p)=>s+PROJECTS[p].openTasks,0)+' open tasks' },
  people:   { h:'People',             s:TEAM.length+' members · '+TEAM.reduce((s,m)=>s+m.cap,0)+'h weekly capacity' },
  approvals:{ h:'Approvals',          s:APPROVALS.filter(a=>a.status==='pending').length+' awaiting your decision' },
  settings: { h:'Settings',           s:'Workspace, security, roles and preferences' },
  search:   { h:'Search',             s:'Find anything across tasks, projects and people' },
};
function topbar(){
  const t = TITLES[S.view] || {};
  let h = '<header class="topbar"><div class="tb-t"><h1>'+esc(t.h||'')+'</h1>';
  if (t.s) h += '<p>'+esc(t.s)+'</p>';
  h += '</div><div class="tb-sp"></div><div class="tb-a">';
  h += '<button class="btn ghost" id="tb-search" data-act="nav" data-view="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>Search<input placeholder="Search tasks, people…">⌘K</button>';
  h += '<button class="icon-btn" data-act="nav" data-view="approvals" title="Approvals"><span class="ib-ic">'+icon('check',20)+'</span><span class="ib-badge">'+APPROVALS.filter(a=>a.status==='pending').length+'</span></button>';
  h += '<button class="icon-btn'+(S.notifRead?'':' has-badge')+'" data-act="notifs" title="Notifications"><span class="ib-ic">'+icon('bell',20)+'</span></button>';
  h += '<span class="tb-div"></span>';
  h += '<button class="btn primary" data-act="new-task"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New task</button>';
  h += '</div></header>';
  return h;
}
function render(){
  const v = S.view;
  let body = v==='dashboard'?vDashboard() : v==='tasks'?vTasks() : v==='projects'?vProjects() : v==='people'?vPeople()
           : v==='approvals'?vApprovals() : v==='settings'?vSettings() : vSearch();
  document.getElementById('app').innerHTML = sidebar() + '<div class="main"><div class="view">'+topbar()+body+'</div></div>';
  document.querySelector('.sidebar').scrollTop = 0;
}
function open(id){
  S.view = id;
  S.taskModal = null; S.personDrawer = null; S.projectDrawer = null;
  if (id === 'tasks') S.board = 'mine';
  if (id === 'approvals') S.approvalsView = false;
  render();
}

/* ================= DASHBOARD ================= */
function vDashboard(){
  const done7 = TASKS.filter(t => t.status === 'done' && t.completedAt >= due(-7));
  const blocked = TASKS.filter(t => t.status === 'blocked');
  const capH = Math.round(TEAM.reduce((s,m) => s + m.cap, 0));
  const avH = Math.round(TEAM.reduce((s,m) => s + m.cap * (1 - m.util), 0));
  const atRisk = PROJ_ORDER.filter(p => PROJECTS[p].health < 70);
  const kpis = [
    { l:'Open tasks', v:openTasks.length,  t:'+4 vs last week',      cls:'up',   ic:'list',  col:'#2563eb', to:'tasks' },
    { l:'Points done · 7d', v:done7.reduce((s,t)=>s+t.total,0), t:'across '+done7.length+' tasks', cls:'up', ic:'check', col:'#059669', to:'tasks' },
    { l:'Blocked',  v:blocked.length,   t:atRisk.length+' projects at risk', cls:'dn', ic:'lock', col:'#dc2626', to:'tasks' },
    { l:'Capacity free', v:Math.round(avH/capH*100)+'%', t:avH+'h of '+capH+'h weekly', cls:'', ic:'clock', col:'#d97706', to:'people' },
    { l:'Active projects', v:PROJ_ORDER.length, t:atRisk.length+' at risk · 4 on track', cls:'', ic:'folder', col:'#7c3aed', to:'projects' },
    { l:'Budget committed', v:'$1.4M', t:'$2.0M total · 19 tasks in flight', cls:'dn', ic:'dollar', col:'#4f46e5', to:'projects' },
  ];
  let h = '<section class="kpi-strip">';
  kpis.forEach(k => {
    h += '<div class="kpi" data-act="nav" data-view="'+k.to+'"><div class="kpi-h"><span class="kpi-ic" style="color:'+k.col+'">'+icon(k.ic,17)+'</span><span class="kpi-l">'+k.l+'</span></div>';
    h += '<div class="kpi-v">'+k.v+'</div>';
    h += '<div class="kpi-t '+(k.cls||'')+'">'+(k.cls==='up'?'▲ ':k.cls==='dn'?'▼ ':'')+esc(k.t)+'</div>';
    h += '</div>';
  });
  h += '</section>';

  h += '<div class="split-37">';
  h += '<div class="col">';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Project status</div><div class="card-s">Live health across all six projects</div></div><button class="btn link" data-act="nav" data-view="projects">View projects →</button></div>';
  h += '<div class="prows">';
  PROJ_ORDER.slice().sort((a,b) => PROJECTS[a].health - PROJECTS[b].health).forEach(pid => {
    const p = PROJECTS[pid];
    h += '<div class="prow" data-act="nav" data-view="projects"><span class="dot" style="background:'+p.color+'"></span>';
    h += '<div class="prow-t"><div class="prow-n">'+esc(p.name)+'</div><div class="prow-s">'+p.memberCount+' people · '+p.openTasks+' open · '+p.doneTasks+' done</div></div>';
    h += '<div class="prow-p">'+esc(p.status)+'</div>';
    h += '<div class="prow-h">'+ring(p.health,34,'xs')+'</div></div>';
  });
  h += '</div></section>';

  const NEXT = ['NW-111','NW-226','NW-217','NW-181','NW-152','NW-131','NW-158','NW-220','NW-163','NW-193'];
  const mts = NEXT.map(k => TASKS.find(t => t.key === k)).filter(Boolean);
  h += '<section class="card"><div class="card-h"><div><div class="card-t">Upcoming milestones</div><div class="card-s">Next 30 days across the workspace</div></div><button class="btn link" data-act="nav" data-view="tasks">My Work →</button></div><div class="tl">';
  mts.forEach(m => {
    const cls = m.status === 'done' ? 'done' : m.status === 'blocked' ? 'blocked' : 'cur';
    h += '<div class="tl-i"><div class="tl-rail"><span class="tl-n '+cls+'">'+(cls==='done'?'✓':cls==='blocked'?'!':'●')+'</span></div>';
    h += '<div><div class="tl-h">'+esc(m.title)+'</div>';
    h += '<div class="tl-s"><span class="muted">'+esc(m.key)+'</span>·<span>'+dueLabel(m.due)+'</span>·'+av(m.assignee)+'</div></div></div>';
  });
  h += '</div></section>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Project timeline</div><div class="card-s">Where each launch is right now</div></div></div><div class="split">';
  ['app','platform'].forEach(pid => {
    const p = PROJECTS[pid], c = CHECK_BY_PROJ[pid];
    h += '<div><div class="mini-h">'+esc(p.name)+'</div><div class="bar '+(p.health<70?'warn':'')+'"><i style="width:'+c.progress+'%"></i></div>';
    h += '<div class="tiny muted" style="margin-top:7px">'+c.doneCount+' of '+c.total+' launch steps · '+c.progress+'% complete</div></div>';
  });
  h += '</div></section>';

  h += '</div><aside class="col side">';

  const needs = NEEDS.slice(0, 5);
  h += '<section class="card"><div class="card-h"><div class="card-t">Needs your attention</div><div class="card-s">'+needs.length+' items</div></div>';
  needs.forEach(n => {
    h += '<div class="attn" data-act="open-task" data-key="'+esc(n.key)+'"><span class="attn-i '+(n.kind==='approve'?'i-ok':n.kind==='blocked'?'i-warn':'i-acc')+'">'+icon(n.kind==='approve'?'check':n.kind==='blocked'?'lock':'eye',15)+'</span>';
    h += '<div class="attn-tx"><div class="attn-h">'+esc(n.title)+'</div><div class="attn-s">'+esc(n.note)+'</div></div>';
    h += '<span class="attn-d">'+esc(n.due)+'</span></div>';
  });
  h += '<div class="card-f"><button class="btn ghost sm" data-act="nav" data-view="approvals">Open all approvals →</button></div></section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Activity</div><div class="card-s">Last 14 days</div></div>';
  ACTIVITY.slice().sort((a,b) => b.date - a.date).slice(0,8).forEach(a => {
    h += '<div class="act"><span class="av sm" style="background:'+a.whoColor+'">'+esc(a.initials)+'</span>';
    h += '<div class="act-bx"><div class="act-tx"><b>'+esc(a.whoName)+'</b> '+verbWord(a.verb)+' <b>'+esc(a.key)+'</b></div><div class="act-t">'+agoLabel(a.date)+'</div></div></div>';
  });
  h += '</section></aside></div>';
  return h;
}
function verbWord(v){
  return { added:'opened', commented:'commented on', moved:'moved', assigned:'assigned', blocked:'blocked', completed:'completed', approved:'approved', rejected:'rejected' }[v] || v;
}
function agoLabel(d){
  const h = Math.round((TODAY - d) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h+'h ago';
  const dd = Math.round(h/24);
  return dd === 1 ? '1 day ago' : dd+' days ago';
}