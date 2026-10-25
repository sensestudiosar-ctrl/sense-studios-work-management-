/* ================= PROJECTS ================= */
function vProjects(){
  let h = '<div class="tb-sub"><div class="chips">';
  [['all','All projects'],['track','On track'],['warn','At risk'],['live','Live']].forEach(f => {
    h += '<button class="chip'+(S.projFilter===f[0]?' on':'')+'" data-act="set" data-k="projFilter" data-v="'+f[0]+'">'+f[1]+'</button>';
  });
  h += '</div><div class="tb-sp"></div>';
  h += '<div class="fld"><input class="inp" placeholder="Search projects…" value=""></div>';
  h += '<button class="btn primary" data-act="new-task">'+icon('plus',16)+' New project</button></div>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Portfolio overview</div><div class="card-s">Six projects · '+openTasks.length+' open tasks · $1.4M committed of $2.0M</div></div></div>';
  h += '<div class="grid2">';
  const onT = PROJ_ORDER.filter(p=>PROJECTS[p].status==='On track').length;
  const warn = PROJ_ORDER.filter(p=>PROJECTS[p].status==='At risk').length;
  h += '<div class="split"><div><div class="tiny muted">On track</div><div class="lg">'+onT+'<span class="u"> of '+PROJ_ORDER.length+'</span></div>'+spark([3,4,4,5,5,onT],'#059669',40)+'</div>';
  h += '<div><div class="tiny muted">At risk</div><div class="lg" style="color:var(--warn)">'+warn+'</div>'+spark([2,1,2,2,3,warn],'#d97706',40)+'</div>';
  h += '<div><div class="tiny muted">Budget used</div><div class="lg">70%</div>'+spark([40,48,55,60,66,70],'#4f46e5',40)+'</div>';
  h += '<div><div class="tiny muted">Velocity (pts/wk)</div><div class="lg">42</div>'+spark([28,31,26,34,38,42],'#2563eb',40)+'</div></div>';
  h += '<div class="prow-stack">';
  PROJ_ORDER.forEach(pid => { const p = PROJECTS[pid];
    h += '<div class="prow" data-act="nav" data-view="projects"><span class="dot" style="background:'+p.color+'"></span><div class="prow-t"><div class="prow-n">'+esc(p.name)+'</div><div class="prow-s">'+esc(p.goal)+'</div></div><div class="prow-p">'+esc(p.status)+'</div><div class="prow-h">'+ring(p.health,30,'xs')+'</div></div>';
  });
  h += '</div></div></section>';

  h += '<div class="grid2">';
  PROJ_ORDER.slice().sort((a,b)=>PROJECTS[a].health-PROJECTS[b].health).forEach(pid => {
    const p = PROJECTS[pid], c = CHECK_BY_PROJ[pid];
    const blocked = TASKS.filter(t=>t.project===pid&&t.status==='blocked').length;
    const done7 = TASKS.filter(t=>t.project===pid&&t.status==='done'&&t.completedAt>=due(-7)).reduce((s,t)=>s+t.total,0);
    h += '<section class="card pc"><div class="pc-h" style="border-color:'+p.color+'">';
    h += '<div class="pc-t"><span class="pc-ic" style="background:'+p.color+'22;color:'+p.color+'">'+icon('folder',18)+'</span><div><div class="pc-n">'+esc(p.name)+'</div><div class="pc-s">'+esc(p.goal)+'</div></div></div>';
    h += '<div class="pc-av"><span class="av sm" style="background:'+p.color+'">'+esc(initials(p.name))+'</span></div></div>';
    h += '<div class="pc-b">';
    h += '<div class="kv"><div><div class="kv-l">Health</div><div class="kv-v">'+p.health+'</div></div><div><div class="kv-l">Burn</div><div class="kv-v">'+p.burn+' pts</div></div><div><div class="kv-l">Budget</div><div class="kv-v">'+p.budget+'</div></div><div><div class="kv-l">People</div><div class="kv-v">'+p.memberCount+'</div></div></div>';
    h += '<div class="pc-mid"><div class="mini-h">Tasks</div><div class="bar"><i style="width:'+pct(p.doneTasks,p.taskCount)+'%;background:'+p.color+'"></i></div><div class="tiny muted">'+p.doneTasks+' done · '+p.openTasks+' open · '+blocked+' blocked</div></div>';
    h += '<div class="pc-mid"><div class="mini-h">Launch checklist</div><div class="bar"><i style="width:'+c.progress+'%"></i></div><div class="tiny muted">'+c.doneCount+' of '+c.total+' steps</div></div>';
    h += '<div class="def"><div class="dk">Lead</div><div class="dv">'+av(p.lead)+'<b>'+esc(byId[p.lead].name)+'</b></div></div>';
    h += '<div class="def"><div class="dk">Crew</div><div class="dv">'+avStack(projMemberObjs(pid).map(m=>m.id).slice(0,5))+'<span class="mut">'+p.memberCount+' people</span></div></div>';
    h += '<div class="def"><div class="dk">Last 7 days</div><div class="dv"><b>'+done7+'</b> pts done · <b>'+p.committed+'</b> pts committed</div></div>';
    h += '<div class="card-f" style="margin-top:12px"><button class="btn ghost sm" data-act="nav" data-view="tasks">Open in My Work →</button><button class="btn ghost sm" data-act="open-proj" data-id="'+pid+'">Details</button></div>';
    h += '</div></section>';
  });
  h += '</div>';
  return h;
}
