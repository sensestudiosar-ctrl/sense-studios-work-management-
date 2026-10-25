/* ==== VIEWS: DASHBOARD + small helpers (extracted from _chunk6.js) ====

   Chunk 6 is excluded wholesale: duplicate shell()/render()/open(), a dead
   vSettings, and it references the non-existent `me` global (ME is the real
   one, defined in chunk14). Only two functions from it are salvaged:

     vDashboard  - not defined anywhere else (this was the boot blocker).
     verbWord    - not defined anywhere else.

   agoLabel is deliberately NOT taken from chunk 6: chunk18 already defines it
   and redeclaring would be a duplicate function declaration.

   Dependencies, all present in the included chunks:
     openTasks(c3) TEAM/PROJ_ORDER/PROJECTS(c3) due(c1) icon(c16)
     ring/av/dueLabel/esc(c5) pct(c1) verbWord/agoLabel(see above/c18).
*/

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
