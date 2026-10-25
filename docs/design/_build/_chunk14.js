/* ================= APP SHELL (sidebar + header) =================
   Replaces the old shell(): that version referenced `me` (only local to
   vSettings) and nav ids 'work'/'tasks' that renderView() never handled.
   NAV lives here because renderView() (chunk17) switches on the same ids. */

/* The signed-in user. `me` was local to vSettings, so chunk9/chunk14's shell
   saw it as undefined. One global alias, defined after byId. */
const ME = byId.u1;
const activeUser = { id: ME.id };
const activePerson = () => byId[activeUser.id];

const NAV = [
  { id:'work',      l:'My Work',   ic:'list',  count:personOpen(ME.id).length },
  { id:'tasks',     l:'Tasks',     ic:'check', count:openTasks.length },
  { id:'projects',  l:'Projects',  ic:'folder',count:PROJ_ORDER.length },
  { id:'people',    l:'People',    ic:'users', count:TEAM.length },
  { id:'dashboard', l:'Dashboard', ic:'chart' },
  { id:'calendar',  l:'Calendar',  ic:'cal' },
  { id:'approvals', l:'Approvals', ic:'lock',  count:APPROVALS.filter(a => a.status === 'pending').length, badge:true },
  { id:'settings',  l:'Settings',  ic:'gear' },
];

function shell() {
  const me = activePerson();
  const myRole = ROLES_META[me.role] || {};
  const t = TITLE[S.view] || TITLE.work;
  let h = '<div class="app'+(S.sbCollapsed ? ' sb-collapsed' : '')+'">';

  /* ---- sidebar ---- */
  h += '<aside class="sb">';
  h += '<div class="sb-h"><span class="logo">'+icon('layers',18)+'</span>';
  h += '<div class="ws"><b>Nordwind</b><span class="tg">Pro</span></div>';
  h += '<button class="icon-btn sm" data-act="toggle-sb" title="Collapse sidebar">'+icon('chev-l',15)+'</button></div>';

  h += '<div class="sb-search"><span>'+icon('search',14)+'</span>';
  h += '<input class="inp" placeholder="Search or jump to…" style="border:0;padding:6px 0;background:transparent;box-shadow:none">';
  h += '<span class="kbd">⌘K</span></div>';

  h += '<div class="sb-nav">';
  navItems().forEach(n => {
    let dot = '';
    if (n.id === 'work')      dot = '<span class="nb">'+taskCountForBoard('mine')+'</span>';
    if (n.id === 'people')    dot = '<span class="nb warn">'+(TEAM.filter(m => m.status === 'invited').length)+'</span>';
    if (n.id === 'approvals') dot = '<span class="nb muted">'+n.count+'</span>';
    h += '<button class="nav-b'+(S.view === n.id ? ' on' : '')+'" data-act="nav" data-view="'+n.id+'">';
    h += '<span class="ni">'+icon(n.ic,17)+'</span><span class="nl">'+n.l+'</span>'+dot+'</button>';
  });

  h += '<div class="sb-sec">In progress</div>';
  PROJ_ORDER.slice(0,4).forEach(pid => {
    const p = PROJECTS[pid];
    h += '<button class="nav-b dim" data-act="nav" data-view="projects">';
    h += '<span class="ni" style="color:'+p.color+'">'+icon('folder',16)+'</span><span class="nl">'+esc(p.name)+'</span>';
    h += '<span class="dot" style="background:'+p.color+'"></span></button>';
  });

  h += '<div class="sb-f">';
  /* util is a fraction (0.60) and cap is weekly hours (54), so committed
     hours = util*cap. pct() would wrongly compare a fraction to hours. */
  h += '<div class="cap-card"><div class="cc-h">Your capacity</div><div class="cc-v">'+Math.round(me.util*me.cap)+'<span class="u">/'+me.cap+'h · '+Math.round(me.util*100)+'%</span></div>';
  h += '<div class="bar sm"><i style="width:'+Math.round(me.util*100)+'%"></i></div>';
  h += '<button class="btn link sm" data-act="nav" data-view="settings">Adjust</button></div>';

  /* ---- signed-in account + account switcher ---- */
  h += '<div class="sb-me">';
  h += '<div class="acct-row" id="acct-switcher">';
  h += '<span class="av" style="background:'+avColor(me.name)+'">'+esc(initials(me.name))+'</span>';
  h += '<div class="sm-bx"><b>'+esc(me.name)+'</b><span class="tiny muted">'+esc(me.title)+'</span></div>';
  h += '<button class="icon-btn xs" id="acct-chevron" data-act="toggle-acct" title="Switch account">'+icon('chev-d',13)+'</button>';
  h += '</div>';
  /* account switcher panel (hidden by default, shown when S.acctOpen) */
  h += '<div class="acct-panel" id="acct-panel"'+(S.acctOpen ? '' : ' style="display:none"')+'>  ';
  /* role badge */
  var _acctRM=ROLES_META[me.role]||{};
  h += '<div class="acct-role" style="color:'+(_acctRM.color||'#6b7280')+'">'+esc(_acctRM.label||me.role)+'</div>';
  /* quick switch: Owner, a designer, a pm, a dev */
  TEAM.filter(m => ['owner','designer','pm','dev'].includes(m.role)).slice(0, 6).forEach(m => {
    const isYou = m.id === me.id;
    h += '<div class="acct-opt'+(isYou ? ' you' : '')+'" data-act="set" data-k="switchUser" data-v="'+m.id+'">';
    h += '<span class="av sm" style="background:'+avColor(m.name)+'">'+esc(initials(m.name))+'</span>';
    h += '<div><b>'+esc(m.name)+'</b><span class="tiny muted"> · '+esc(m.role)+'</span></div>';
    h += isYou ? '<span class="tiny muted">← you</span>' : '';
    h += '</div>';
  });
  h += '</div></div>';
  h += '</div></aside>';

  /* ---- header ---- */
  h += '<div class="main">';
  h += '<header class="tb">';
  h += '<div class="tb-c"><div class="tb-t">'+t.h+'</div><div class="tb-s">'+esc(t.s)+'</div></div>';
  h += '<div class="tb-sp"></div>';
  h += '<button class="btn ghost sm" data-act="nav" data-view="search">'+icon('search',15)+'<span>Search</span></button>';
  h += '<div class="tb-div"></div>';
  h += '<div class="tb-r">';
  h += '<button class="icon-btn'+(NOTIF.some(n => !n.read) ? ' has-badge' : '')+'" data-act="notifs" title="Notifications">';
  h += icon('bell',17)+(NOTIF.some(n => !n.read) ? '<span class="ib-badge"></span>' : '')+'</button>';
  h += '<button class="btn primary sm" data-act="new-task">'+icon('plus',15)+'<span>New task</span></button>';
  h += '</div></header>';
  h += '<div class="content">'+renderView()+'</div>';
  h += '</div>';

  h += notifPop();
  h += modalLayer();
  h += '</div>';
  return h;
}
