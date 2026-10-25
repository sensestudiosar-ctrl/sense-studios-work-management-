/* ==== TITLES, AGO, APPROVALS VIEW, CALENDAR, REPORTS ==== */

/* ---- TITLES ---- */
const TITLE = {
  work:      { h:'My Work',   s:'Your tasks, reviews and decisions' },
  dashboard: { h:'Dashboard', s:'Studio overview for '+fmtD(TODAY) },
  tasks:     { h:'Tasks',     s:'Every open task across the studio' },
  projects:  { h:'Projects',  s:PROJ_ORDER.length+' active projects' },
  people:    { h:'People',    s:TEAM.length+' people in the studio' },
  approvals: { h:'Approvals', s:APPROVALS.filter(a => a.status === 'pending').length+' awaiting your decision' },
  settings:  { h:'Settings',  s:'Workspace, roles and preferences' },
  search:    { h:'Search',    s:'Find tasks, projects and people' },
  calendar:  { h:'Calendar',  s:'Due dates across every project' },
  reports:   { h:'Reports',   s:'Delivery, capacity and quality signals' },
};

/* ---- agoLabel ---- */
function agoLabel(d) {
  const h = Math.round((TODAY - d) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  const dd = Math.round(h / 24);
  return dd === 1 ? 'yesterday' : dd + 'd ago';
}

/* ---- APPROVALS ---- */
function vApprovals() {
  const pend = APPROVALS.filter(a => a.status === 'pending');
  const done = APPROVALS.filter(a => a.status !== 'pending');
  let h = '<div class="stat3">';
  h += '<div><div class="s-v">'+pend.length+'</div><div class="s-l">pending</div></div>';
  h += '<div><div class="s-v">'+APPROVALS.filter(a => a.status === 'approved').length+'</div><div class="s-l">approved</div></div>';
  h += '<div><div class="s-v">'+APPROVALS.filter(a => a.status === 'rejected').length+'</div><div class="s-l">rejected</div></div>';
  h += '</div>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Pending approvals</div>';
  h += '<div class="card-s">'+pend.length+' items awaiting your decision</div></div>';
  h += '<div class="seg"><button class="seg-b on">Pending</button><button class="seg-b">History ('+done.length+')</button></div></div>';

  if (!pend.length) {
    h += '<div class="card-b" style="text-align:center;padding:34px;color:var(--mut)"><div style="margin-bottom:8px">'+icon('check', 28)+'</div>No pending approvals</div>';
  } else {
    pend.forEach(a => {
      const od = a.due < TODAY;
      h += '<div class="attn" data-act="open-task" data-key="'+esc(a.task)+'">';
      h += '<div class="attn-i i-acc">'+icon('lock', 15)+'</div>';
      h += '<div class="attn-tx"><div class="attn-h">'+esc(a.title)+'</div>';
      h += '<div class="attn-s">'+esc(a.reqName)+' · '+esc(a.task)+' · due '+(od ? '<span class="mut" style="color:var(--danger)">'+fmtD(a.due)+' (overdue)</span>' : fmtD(a.due))+'</div></div>';
      h += '<span class="badge '+(od ? 'badge-danger' : 'badge-warn')+'">'+esc(a.due < TODAY ? 'Overdue' : 'Due '+fmtD(a.due))+'</span></div>';
    });
  }
  h += '</section>';

  if (done.length) {
    h += '<section class="card"><div class="card-h"><div><div class="card-t">History</div><div class="card-s">'+done.length+' resolved</div></div></div>';
    done.forEach(a => {
      h += '<div class="attn">';
      h += '<div class="attn-i i-'+(a.status === 'approved' ? 'ok' : 'warn')+'">'+icon(a.status === 'approved' ? 'check' : 'x', 15)+'</div>';
      h += '<div class="attn-tx"><div class="attn-h">'+esc(a.title)+'</div><div class="attn-s">'+esc(a.reqName)+' · '+esc(a.task)+'</div></div>';
      h += '<span class="badge '+(a.status === 'approved' ? 'badge-ok' : 'badge-danger')+'">'+esc(cap(a.status))+'</span></div>';
    });
    h += '</section>';
  }
  return h;
}

/* ---- CALENDAR ---- */
function vCalendar() {
  const first = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const startDow = first.getDay();
  const cells = Math.ceil((startDow + new Date(first.getFullYear(), first.getMonth()+1, 0).getDate()) / 7) * 7;
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = '<section class="card"><div class="card-h"><div><div class="card-t">'+MON[TODAY.getMonth()]+' '+TODAY.getFullYear()+'</div>';
  h += '<div class="card-s">'+openTasks.length+' open tasks have due dates</div></div></div>';

  h += '<div class="cal">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { h += '<div class="cal-d">'+d+'</div>'; });
  for (let i = 0; i < cells; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 + startDow + i);
    const inMonth = d.getMonth() === TODAY.getMonth();
    const isToday = d.getTime() === TODAY.getTime();
    const tasks = TASKS.filter(t => t.status !== 'done' && t.due && t.due.getTime() === d.getTime());
    h += '<div class="cal-c'+(inMonth ? '' : ' out')+(isToday ? ' today' : '')+'">';
    h += '<div class="cal-n">'+d.getDate()+'</div>';
    tasks.slice(0, 3).forEach(t => {
      h += '<div class="cal-t" data-act="open-task" data-id="'+esc(t.id)+'" title="'+esc(t.title)+'">';
      h += '<span class="dot" style="background:'+t.projectColor+'"></span>'+esc(t.key)+'</div>';
    });
    if (tasks.length > 3) h += '<div class="cal-x">'+(tasks.length - 3)+' more</div>';
    h += '</div>';
  }
  h += '</div></section>';
  return h;
}

/* ---- REPORTS ---- */
function vReports() {
  let h = '<div class="stat3">';
  const total = TASKS.length;
  h += '<div><div class="s-v">'+pct(TASKS.filter(t => t.status === 'done').length, total)+'%</div><div class="s-l">complete</div></div>';
  h += '<div><div class="s-v">'+TASKS.filter(t => t.status === 'done' && t.completedAt >= due(-7)).length+'</div><div class="s-l">done this week</div></div>';
  h += '<div><div class="s-v">'+TASKS.filter(t => t.status === 'blocked').length+'</div><div class="s-l">blocked</div></div>';
  h += '</div>';

  h += '<div class="split-37"><div class="col">';
  h += '<section class="card"><div class="card-h"><div><div class="card-t">Completion by status</div></div></div><div class="card-b">';
  Object.keys(STATUS).forEach(k => {
    const n = TASKS.filter(t => t.status === k).length;
    h += '<div class="bar-row"><span class="bar-lb">'+esc(STATUS[k].l)+'</span>';
    h += '<span class="bar"><i style="width:'+pct(n, total)+'%;background:'+STATUS[k].c.replace('b-', '')+'"></i></span>';
    h += '<span class="bar-n">'+n+'</span></div>';
  });
  h += '</div></section>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Throughput — last 7 days</div></div></div><div class="card-b">';
  const dayPts = WEEK.map(w => TASKS.filter(t => t.status === 'done' && t.completedAt && t.completedAt.getTime() === w.d.getTime()).reduce((s, t) => s + t.total, 0));
  const mx = Math.max(1, Math.max.apply(null, dayPts));
  h += '<div class="cols7">';
  WEEK.forEach((w, i) => {
    h += '<div class="col-bx"><div class="col-bar" style="height:'+(8 + dayPts[i] / mx * 70)+'%"><span>'+dayPts[i]+'</span></div><div class="col-lb">'+w.label+'</div></div>';
  });
  h += '</div></section>';
  h += '</div><aside class="col side">';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Project health</div></div></div><div class="card-b">';
  PROJ_ORDER.forEach(pid => {
    const p = PROJECTS[pid];
    h += '<div class="mini-h"><span style="color:'+p.color+'">●</span> '+esc(p.name)+'</div>';
    h += '<div class="bar" style="margin-top:5px"><i style="width:'+p.health+'%;background:'+p.color+'"></i></div>';
    h += '<div class="tiny mut" style="margin-top:4px">'+p.health+' health · '+p.memberCount+' people · '+p.openTasks+' open</div>';
  });
  h += '</div></section>';
  h += '</aside></div>';
  return h;
}
