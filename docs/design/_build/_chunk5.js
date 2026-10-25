/* ---- project launch checklists: 120 steps, mixed progress per project ---- */
const CHECKLISTS = PROJ_ORDER.map(pid => {
  const proj = PROJECTS[pid];
  const lead = byId[proj.lead];
  const doneCount = clamp(Math.round((proj.health - 52) * 0.19), 3, 11);
  return {
    project: pid, label: proj.name, lead: lead.name, leadId: proj.lead,
    items: [
      { t:'Kickoff and stakeholders aligned', d:'Done', by:lead.name, date:due(-46), state:'done' },
      { t:'Scope, owners and definition of done', d:'Done', by:'u19' in byId?byId.u19.name:lead.name, date:due(-40), state:'done' },
      { t:'Budget and capacity confirmed', d:'Done', by:'u1' in byId?byId.u1.name:lead.name, date:due(-34), state:'done' },
      { t:'Design and technical review completed', d:'Done', by:byId.u2?byId.u2.name:lead.name, date:due(-27), state:'done' },
      { t:'Dependencies mapped and communicated', d:'Done', by:lead.name, date:due(-20), state:'done' },
      { t:'First deliverable shipped', d:'Done', by:byId.u24?byId.u24.name:lead.name, date:due(-13), state:'done' },
      { t:'Quality and regression suite in place', d:'In progress', by:byId.u40?byId.u40.name:lead.name, date:due(2), state:'cur' },
      { t:'Stakeholder demo and feedback round', d:'In progress', by:lead.name, date:due(4), state:'cur' },
      { t:'Risk review and mitigation plan', d:'Next', by:byId.u1?byId.u1.name:lead.name, date:due(7), state:'todo' },
      { t:'Go / no-go decision recorded', d:'Next', by:'u1' in byId?byId.u1.name:lead.name, date:due(10), state:'todo' },
      { t:'Launch window booked', d:'Next', by:lead.name, date:due(12), state:'todo' },
      { t:'Communication sent to stakeholders', d:'Next', by:byId.u30?byId.u30.name:lead.name, date:due(13), state:'todo' },
      { t:'Launch checklist executed', d:'Next', by:lead.name, date:due(14), state:'todo' },
      { t:'Post-launch monitoring window', d:'Next', by:byId.u47?byId.u47.name:lead.name, date:due(15), state:'todo' },
      { t:'Retrospective and lessons recorded', d:'Next', by:'u1' in byId?byId.u1.name:lead.name, date:due(18), state:'todo' },
    ].map((it,i) => ({ ...it, state: i < doneCount ? 'done' : (i === doneCount ? 'cur' : 'todo') })),
  };
});
CHECKLISTS.forEach(c => {
  c.doneCount = c.items.filter(i => i.state === 'done').length;
  c.total = c.items.length;
  c.progress = pct(c.doneCount, c.total);
});
const CHECK_BY_PROJ = {};
CHECKLISTS.forEach(c => { CHECK_BY_PROJ[c.project] = c; });

/* ---- global mutable state ---- */

/* ---- ACCESS CONTROL MODEL ----
   The real app gates reads and writes server-side. This model mirrors the same
   decisions in the prototype so the UI can present them honestly.
   Role hierarchy (highest first):
     owner  — full workspace access; can manage people, roles, billing
     admin  — workspace config, no billing
     pm      — manage own team's tasks and project tasks; invite/gate team members
     designer — manage own tasks; contribute to design project
     dev     — manage own tasks; contribute to assigned projects
     qa      — manage own tasks; contribute to qa project
     guest   — view assigned tasks and project content only
   Account kind:
     owner — the single workspace owner account
     staff — everyone else (employee, site staff, or guest)
*/
const ROLES_META = {
  owner:   { label:'Owner',        kind:'owner',  color:'#dc2626', canManageBilling:true,  canManagePeople:true, canAssignRoles:true, canManageAllTasks:true, canManageProjects:true },
  admin:   { label:'Admin',        kind:'staff',   color:'#7c3aed', canManageBilling:false, canManagePeople:true, canAssignRoles:true, canManageAllTasks:true, canManageProjects:true },
  pm:      { label:'Project Mgr',  kind:'staff',   color:'#2563eb', canManageBilling:false, canManagePeople:false,canAssignRoles:false, canManageAllTasks:false,canManageProjects:true },
  designer: { label:'Designer',     kind:'staff',   color:'#d97706', canManageBilling:false, canManagePeople:false,canAssignRoles:false, canManageAllTasks:false,canManageProjects:false },
  dev:     { label:'Developer',    kind:'staff',   color:'#0891b2', canManageBilling:false, canManagePeople:false,canAssignRoles:false, canManageAllTasks:false,canManageProjects:false },
  qa:      { label:'QA',          kind:'staff',   color:'#059669', canManageBilling:false, canManagePeople:false,canAssignRoles:false, canManageAllTasks:false,canManageProjects:false },
  guest:   { label:'Guest',       kind:'staff',   color:'#6b7280', canManageBilling:false, canManagePeople:false,canAssignRoles:false, canManageAllTasks:false,canManageProjects:false },
};

/* switchUser(id): change the signed-in identity (account switcher).
   activeUser.id is the reference all role-conditional UI reads from.
   Triggers a full re-render so the nav, header, and view all update. */
function switchUser(id) {
  if (!byId[id]) return;
  activeUser.id = id;
  S.view = 'dashboard';
  S.taskModal = null;
  S.notifOpen = false;
  render();
}

/* can(...) evaluates what the currently signed-in user (ME) can do.
   - OWNER account: everything granted.
   - STAFF account: follows ROLES_META[ME.role].
   - Any account kind not in ROLES_META: deny everything. */
function can(action) {
  if (ME.role === 'owner') return true;
  const r = ROLES_META[ME.role];
  if (!r) return false;
  switch (action) {
    case 'manageBilling':   return r.canManageBilling;
    case 'managePeople':   return r.canManagePeople;
    case 'assignRoles':    return r.canAssignRoles;
    case 'manageAllTasks':  return r.canManageAllTasks;
    case 'manageProjects': return r.canManageProjects;
    default:               return false;
  }
}

/* myProjects: projects where ME is a member (any role, incl. guest). */
const myProjects = () => PROJ_ORDER.filter(pid => PROJECT_MEMBERS[pid].has(ME.id));
/* myManagedProjects: projects where ME is the project lead. */
const myManagedProjects = () => PROJ_ORDER.filter(pid => PROJECTS[pid].lead === ME.id);

/* myReports: team members whose manager is ME (direct reports). */
const myReports = () => TEAM.filter(m => m.manager === ME.id && m.id !== ME.id);

/* navItems: the sidebar navigation items available to the current account.
   Unavailable items are excluded entirely (not shown dimmed). */
const navItems = () => NAV.map(n => {
  if (n.id === 'settings' && !can('manageBilling') && !can('managePeople') && !can('manageProjects'))
    return null;
  return n;
}).filter(Boolean);

/* taskCountForBoard(board): open-task count shown in sidebar badge.
   - 'mine': tasks assigned to ME
   - 'reporting': tasks assigned to ME's direct reports
   - 'all': all open tasks (only for owner/admin) */
const taskCountForBoard = (board) => {
  if (board === 'mine')     return OWNER_TASKS.length;
  if (board === 'reporting') return REPORT_TO_ME.length;
  return can('manageAllTasks') ? openTasks.length : openTasks.length; // staff sees all for now
};

/* peopleCount: how many people are visible in the directory for the current account.
   Owner/admin sees everyone; staff sees their direct reports + self. */
const peopleCount = () => can('managePeople') ? TEAM.length : myReports().length + 1;

/* settingsSections: tab list for the Settings panel.
   Personal tabs are always shown. Owner config tabs require can(...). */
const settingsSections = () => {
  const s = [
    { id:'personal',  label:'Personal',          access:'always' },
    { id:'team',       label:'Team',              access:'canManagePeople' },
    { id:'roles',      label:'Roles & access',    access:'canAssignRoles' },
    { id:'billing',    label:'Billing & plan',    access:'canManageBilling' },
  ];
  return s.filter(sec => sec.access === 'always' || can(sec.access));
};

const S = {
  view:'dashboard', taskFilter:'all', board:'mine', projFilter:'all', projTab:'overview',
  peopleTab:'people', peopleRole:'all', peopleProject:'all', peopleQ:'', sort:'util',
  notifRead:false, taskModal:null, peopleModal:null,
  settingsTab:'personal',     // 'personal' | 'team' | 'roles' | 'billing'
  peoplePage: 1,              // 1-based page number for the People table
  personDrawer:null, projectDrawer:null, approvalsView:false, approvalsDone:false,
  newTask:false, dark:false,
  acctOpen:false,
};
const $ = (s,r) => (r||document).querySelector(s);
const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
const el = (t,c,h) => { const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; };
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let AV = {};
TEAM.forEach(m => { AV[m.id] = '<span class="av" style="background:'+avColor(m.name)+'" title="'+esc(m.name)+'">'+esc(initials(m.name))+'</span>'; });
const av = id => AV[id] || '<span class="av" style="background:#6b7280">?</span>';
const pAv = id => '<span class="av" style="background:'+avColor(byId[id].name)+'" title="'+esc(byId[id].name)+'">'+esc(initials(byId[id].name))+'</span>';
function avStack(ids, max){
  max = max||4;
  let h = '<div class="ava-stack">';
  ids.slice(0,max).forEach(id => { h += pAv(id); });
  if (ids.length > max) h += '<span class="more chip">+'+(ids.length-max)+'</span>';
  return h + '</div>';
}
function badge(status){
  const s = STATUS[status];
  return '<span class="badge '+s.c+'"><span class="dot sm"></span>'+esc(s.l)+'</span>';
}
function prBadge(p){
  const v = PRIO[p];
  return '<span class="'+v.cls+'">'+esc(v.l)+'</span>';
}
function dueLabel(d){
  const n = daysFrom(d);
  if (n < 0)  return '<span class="due-over">'+fmtD(d)+' · '+Math.abs(n)+'d overdue</span>';
  if (n === 0)return '<span class="due-over">Due today</span>';
  if (n === 1)return '<span class="due-soon">Due tomorrow</span>';
  if (n <= 3) return '<span class="due-soon">'+fmtD(d)+' · in '+n+'d</span>';
  return '<span class="due-ok">'+fmtD(d)+'</span>';
}
function spark(vals, color, h){
  h = h||36;
  const w = 200, mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
  const span = (mx-mn) || 1;
  const pts = vals.map((v,i) => (i*(w/(vals.length-1))).toFixed(1)+','+(h-4-((v-mn)/span)*(h-12)).toFixed(1)).join(' ');
  const area = '0,'+h+' '+pts+' '+w+','+h;
  const id = 'sp'+Math.floor(rnd()*1e9);
  return '<svg class="kpi-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0%" stop-color="'+color+'" stop-opacity=".26"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
    '<polygon points="'+area+'" fill="url(#'+id+')"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function ring(p, size, cls, color){
  size = size||34; cls = cls||'xs';
  const r = (size-6)/2, c = 2*Math.PI*r;
  const col = color || (p>=80?'var(--ok)':p>=50?'var(--warn)':'var(--danger)');
  return '<div class="ring '+cls+'"><svg width="'+size+'" height="'+size+'">'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--surface-3)" stroke-width="4"/>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="4" stroke-linecap="round" '+
    'stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-p/100)).toFixed(1)+'"/></svg>'+
    '<span class="pct">'+p+'</span></div>';
}
