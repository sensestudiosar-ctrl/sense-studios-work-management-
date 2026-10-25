/* ================= PEOPLE ================= */
function vPeople(){
  const cap = TEAM.reduce((s,m)=>s+m.cap,0);
  const freeH = TEAM.reduce((s,m)=>s+m.cap*(1-m.util),0);
  const over = TEAM.filter(m=>m.util>0.95).length;
  const under = TEAM.filter(m=>m.util<0.55).length;
  let h = '<div class="tb-sub"><div class="chips">';
  [['all','Everyone'],['load','Overloaded'],['free','Available'],['mgr','Managers']].forEach(f => {
    h += '<button class="chip'+(S.peopleFilter===f[0]?' on':'')+'" data-act="set" data-k="peopleFilter" data-v="'+f[0]+'">'+f[1]+'</button>';
  });
  h += '</div><div class="tb-sp"></div>';
  h += '<div class="fld"><input class="inp" placeholder="Search people…" value=""></div>';
  h += '<button class="btn primary" data-act="new-task">'+icon('plus',16)+' Invite people</button></div>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Capacity</div><div class="card-s">All '+TEAM.length+' members · week of '+esc(fmtD(due(-1)))+'</div></div></div><div class="split">';
  h += '<div class="cap-col"><div class="cap-h">'+icon('clock',15)+'Total capacity</div><div class="cap-v">'+cap+'<span class="u">h / week</span></div><div class="tiny muted">'+TEAM.length+' people · avg '+(cap/Math.round(TEAM.length))+'h each</div></div>';
  h += '<div class="cap-col"><div class="cap-h" style="color:var(--ok)">'+icon('check',15)+'Available</div><div class="cap-v" style="color:var(--ok)">'+Math.round(freeH)+'<span class="u">h</span></div><div class="tiny muted">'+Math.round(freeH/cap*100)+'% of capacity is free</div></div>';
  h += '<div class="cap-col"><div class="cap-h" style="color:var(--warn)">'+icon('alert',15)+'Overloaded</div><div class="cap-v" style="color:var(--warn)">'+over+'<span class="u"> people</span></div><div class="tiny muted">at or above 95% load</div></div>';
  h += '<div class="cap-col"><div class="cap-h">'+icon('users',15)+'Underutilized</div><div class="cap-v">'+under+'<span class="u"> people</span></div><div class="tiny muted">below 55% load</div></div></div></section>';

  /* Filter the team before paginating */
  let roster = TEAM.slice();
  if (S.peopleFilter === 'load') roster = roster.filter(m => m.util > 0.95);
  else if (S.peopleFilter === 'free') roster = roster.filter(m => m.util < 0.55);
  else if (S.peopleFilter === 'mgr')  roster = roster.filter(m => ['pm','admin','owner'].includes(m.role));

  const PAGE_SIZE = 24;
  const totalPages = Math.max(1, Math.ceil(roster.length / PAGE_SIZE));
  const page = Math.min(S.peoplePage, totalPages);
  const slice = roster.slice().sort((a,b) => b.util - a.util).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  h += '<div class="split-37"><div class="col"><section class="card"><div class="card-h"><div><div class="card-t">Team</div><div class="card-s">'+roster.length+' members across '+PROJ_ORDER.length+' projects</div></div><button class="btn link" data-act="nav" data-view="dashboard">Dashboard →</button></div>';
  /* TEAM members carry title/loc/util/cap/skills/onboard. There is no
     per-person week or trend series in the data, so no sparkline column —
     drawing one from util alone would be a single flat point, not a trend. */
  h += '<div class="tm-hd"><span class="th1">Member</span><span class="th2">Role · location</span><span class="th3">Capacity</span><span class="th4">Load</span><span class="th5">Onboarding</span></div>';
  slice.forEach(m => {
    const st = m.util>0.95?'over':m.util>0.8?'busy':m.util>0.55?'ok':'free';
    const stLabel = m.util>0.95?'Overloaded':m.util>0.8?'Busy':m.util>0.55?'Healthy':'Available';
    h += '<div class="tm-r" data-act="open-person" data-id="'+m.id+'">';
    h += '<span class="tm-1">'+av(m.id)+'<div class="tm-n"><b>'+esc(m.name)+'</b><span class="tiny muted">'+esc(m.email||'')+'</span></div></span>';
    h += '<span class="tm-2"><b>'+esc(m.title)+'</b><span class="tiny muted">'+esc(m.loc||'')+'</span></span>';
    h += '<span class="tm-3"><div class="cap-mini"><i class="'+st+'" style="width:'+Math.min(100,m.util*100)+'%"></i></div><div class="tiny muted">'+Math.round(m.util*m.cap)+'/'+m.cap+'h</div></span>';
    h += '<span class="tm-4"><span class="lv '+st+'">'+esc(stLabel)+' · '+Math.round(m.util*100)+'%</span></span>';
    h += '<span class="tm-5"><span class="tiny'+(m.onboard<100?' muted':'')+'">'+(m.onboard>=100?'Active':'Day '+m.onboard)+'</span></span>';
    h += '</div>';
  });

  /* ---- pagination controls ---- */
  h += '<div class="pg-row">';
  h += '<span class="pg-info">Showing '+(page*PAGE_SIZE-PAGE_SIZE+1)+'–'+Math.min(page*PAGE_SIZE,roster.length)+' of '+roster.length+'</span>';
  h += '<div class="pg-btns">';
  h += '<button class="btn ghost sm'+(page<=1?' disabled':'')+'" data-act="set" data-k="peoplePage" data-v="prev"'+(page<=1?' disabled':'')+'>'+icon('chev-l',13)+' Prev</button>';
  for (let p = Math.max(1, page-2); p <= Math.min(totalPages, page+2); p++) {
    h += '<button class="btn ghost sm'+(p===page?' on':'')+'" data-act="set" data-k="peoplePage" data-v="'+p+'">'+p+'</button>';
  }
  h += '<button class="btn ghost sm'+(page>=totalPages?' disabled':'')+'" data-act="set" data-k="peoplePage" data-v="next"'+(page>=totalPages?' disabled':'')+'>Next '+icon('chev-r',13)+'</button>';
  h += '</div></div>';
  h += '<div class="card-f"><button class="btn ghost sm" data-act="nav" data-view="projects">View by project →</button></div></section></div>';

  h += '<aside class="col side">';
  h += '<section class="card"><div class="card-h"><div class="card-t">Load distribution</div><div class="card-s">Where the team sits</div></div>';
  const bands = [{l:'0-25%', c:'#059669', r:[0,0.25]}, {l:'25-55%', c:'#10b981', r:[0.25,0.55]}, {l:'55-80%', c:'#2563eb', r:[0.55,0.8]}, {l:'80-95%', c:'#d97706', r:[0.8,0.95]}, {l:'95%+', c:'#dc2626', r:[0.95,2]}];
  bands.forEach(b => {
    const n = TEAM.filter(m=>m.util>=b.r[0]&&m.util<b.r[1]).length;
    const p = Math.round(n/TEAM.length*100);
    h += '<div class="dist"><span class="dist-l">'+b.l+'</span><div class="dist-b"><i style="width:'+p+'%;background:'+b.c+'"></i></div><span class="dist-n">'+n+'</span></div>';
  });
  h += '</section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Project capacity</div><div class="card-s">Free hours by project</div></div>';
  PROJ_ORDER.forEach(pid => {
    const p = PROJECTS[pid];
    const members = projMemberObjs(pid);
    const c = members.reduce((s,m)=>s+m.cap,0);
    const f = members.reduce((s,m)=>s+m.cap*(1-m.util),0);
    h += '<div class="pcap"><span class="dot" style="background:'+p.color+'"></span><div class="pcap-tx"><div class="pcap-n">'+esc(p.name)+'</div><div class="pcap-b"><i style="width:'+pct(f,c)+'%"></i></div></div><div class="pcap-v"><b>'+Math.round(f)+'</b><span class="tiny muted"> of '+c+'h free</span></div></div>';
  });
  h += '</section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Hiring needs</div><div class="card-s">3 open requests</div></div>';
  [[ 'Senior migration engineer','platform','In review'],['CRM data quality analyst','crm','Sourcing'],['QA automation engineer','qa','Approved'] ].forEach((x,i) => {
    h += '<div class="attn"><span class="attn-i i-acc">'+icon('plus',15)+'</span><div class="attn-tx"><div class="attn-h">'+esc(x[0])+'</div><div class="attn-s">'+esc(PROJECTS[x[1]].name)+' · '+esc(x[1])+'</div></div><span class="badge '+(['badge','badge-warn','badge-ok'][i]||'badge')+'">'+esc(x[2])+'</span></div>';
  });
  h += '</section></aside></div>';
  return h;
}
