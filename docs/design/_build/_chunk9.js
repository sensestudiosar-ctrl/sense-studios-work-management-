/* ================= NEW TASK FORM ================= */
function vTaskForm(){
  const me = byId.u1;
  let h = '<div class="m-h"><div><div class="m-eyebrow">New task</div><h2 class="m-t">Create a task</h2><p class="m-s">Tasks land in My Work with a status, owner and timeline. You can add more detail once it is created.</p></div><button class="icon-btn" data-act="close-modal">'+icon('x',18)+'</button></div>';
  h += '<div class="form"><div class="fld"><label class="lb" for="f-title">Title <span class="req">*</span></label>';
  h += '<input class="inp" id="f-title" type="text" value="Set up the billing sandbox for Meridian" placeholder="Short, action-oriented title"></div>';
  h += '<div class="fld"><label class="lb" for="f-desc">Description</label><textarea class="ta" id="f-desc" rows="4" placeholder="What needs to happen, and what done looks like?">Provision the sandbox with a copy of the staging schema so the client can run their own approval flow before the Nov 20 go-live.</textarea></div>';
  h += '<div class="grid2"><div class="fld"><label class="lb" for="f-proj">Project <span class="req">*</span></label><select class="sel" id="f-proj">'+
    PROJ_ORDER.map(p => '<option value="'+p+'"'+(p==='app'?' selected':'')+'>'+esc(PROJECTS[p].name)+'</option>').join('')+'</select></div>';
  h += '<div class="fld"><label class="lb" for="f-type">Type</label><select class="sel" id="f-type"><option value="task" selected>Task</option><option value="bug">Bug</option><option value="epic">Epic</option></select></div></div>';
  h += '<div class="grid3"><div class="fld"><label class="lb" for="f-assign">Assignee</label><div class="pa">'+av('u2')+'<select class="sel" id="f-assign">'+TEAM.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>'<option value="'+m.id+'"'+(m.id==='u2'?' selected':'')+'>'+esc(m.name)+'</option>').join('')+'</select></div></div>';
  h += '<div class="fld"><label class="lb" for="f-prio">Priority</label><select class="sel" id="f-prio"><option value="low">Low</option><option value="med" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>';
  h += '<div class="fld"><label class="lb" for="f-due">Due date</label><input class="inp" id="f-due" type="date" value="'+iso(due(14))+'"></div></div>';
  h += '<div class="grid2"><div class="fld"><label class="lb" for="f-eff">Effort</label><select class="sel" id="f-eff"><option value="1">1 · Small</option><option value="2" selected>2 · Medium</option><option value="3">3 · Large</option><option value="5">5 · Very large</option></select></div>';
  h += '<div class="fld"><label class="lb" for="f-report">Reporting to</label><div class="pa">'+av('u5')+'<select class="sel" id="f-report">'+MAN.map(id=>'<option value="'+id+'"'+(id==='u5'?' selected':'')+'>'+esc(byId[id].name)+'</option>').join('')+'</select></div></div></div>';
  h += '<div class="fld"><label class="lb">Tags</label><div class="tagi">'+['billing','client','integration'].map(t=>'<span class="tg">'+t+'<button class="tg-x" data-act="rm-tag">×</button></span>').join('')+'<input class="taginp" placeholder="Add a tag…" data-act="add-tag"></div></div>';
  h += '<div class="fld"><label class="lb">Timeline</label><div class="fld-hint">Steps define the path from To do to Done. Add them as you learn the shape of the work.</div><div class="tl-add">'+
    '<div class="tl-step"><span class="tl-n todo">●</span><div class="tl-step-tx"><div class="tl-step-h">Scope the data sets to copy</div><div class="tl-step-s">Estimated 2 days</div></div></div>'+
    '<div class="tl-step"><span class="tl-n todo">●</span><div class="tl-step-tx"><div class="tl-step-h">Provision and seed the sandbox</div><div class="tl-step-s">Estimated 3 days</div></div></div>'+
    '<div class="tl-step"><span class="tl-n todo">●</span><div class="tl-step-tx"><div class="tl-step-h">Hand off to the client with walkthrough</div><div class="tl-step-s">Estimated 1 day</div></div></div>'+
    '<button class="btn ghost sm" data-act="add-step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Add step</button></div></div>';
  h += '<div class="fld"><label class="lb">Notifications</label><div class="chkrow"><label class="chk"><input type="checkbox" checked> Notify the project channel when the status changes</label><label class="chk"><input type="checkbox" checked> Notify my assignee on status change</label><label class="chk"><input type="checkbox"> Include in the weekly digest</label></div></div>';
  h += '</div>';
  h += '<div class="m-f"><span class="m-fh muted">Created by '+esc(me.name)+' as '+esc(me.role)+'</span><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn primary" data-act="submit-task">Create task</button></div>';
  return h;
}
function vSearch(){
  let h = '<div class="searchwrap"><input class="searchin" placeholder="Search tasks, projects, people…" autofocus><div class="res">';
  TASKS.filter(t => t.title.toLowerCase().includes('billing') || t.tags.includes('billing')).slice(0,4).forEach(t => {
    h += '<div class="res-i" data-act="open-task" data-id="'+t.id+'"><span class="mono">'+t.key+'</span><div><div class="ri-t">'+esc(t.title)+'</div><div class="ri-s">'+esc(t.projectLabel)+' · '+badge(t.status)+'</div></div>'+av(t.assignee)+'</div>';
  });
  PROJ_ORDER.slice(0,3).forEach(pid => { const p = PROJECTS[pid]; h += '<div class="res-i" data-act="nav" data-view="projects"><span class="ic-s" style="color:'+p.color+'">'+icon('folder',16)+'</span><div><div class="ri-t">'+esc(p.name)+'</div><div class="ri-s">'+p.memberCount+' people · '+p.openTasks+' open tasks</div></div><span class="badge '+p.healthBadge+'">'+p.status+'</span></div>'; });
  h += '</div></div>';
  return h;
}
