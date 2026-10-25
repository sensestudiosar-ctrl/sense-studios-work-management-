/* ================= TASK DETAIL MODAL ================= */
function vTaskDetail(t){
  let h = '<div class="m-h"><div class="m-ht"><span class="mono muted">'+t.key+'</span><span class="badge '+STATUS[t.status].c+'"><span class="dot sm"></span>'+STATUS[t.status].l+'</span>'+prBadge(t.prio)+'</div>';
  h += '<h2 class="m-t">'+esc(t.title)+'</h2><p class="m-s">'+esc(t.projectLabel)+' · '+t.type+' · created '+fmtD(t.created)+'</p></div>';
  h += '<div class="split"><div class="col">';
  h += '<div class="msec"><div class="msec-h">Description</div><p class="msec-b">'+esc(t.story || 'No description yet.')+'</p></div>';
  if (t.blockers.length){
    h += '<div class="msec"><div class="msec-h">Blocked by</div>';
    t.blockers.forEach(b => h += '<div class="warnrow">'+icon('lock',15)+'<div><div class="wh">'+esc(b)+'</div>'+(t.blockedSince?'<div class="ws2">Since '+fmtD(t.blockedSince)+'</div>':'')+'</div></div>');
    h += '</div>';
  }
  h += '<div class="msec"><div class="msec-h">Timeline <span class="muted">'+t.activity.length+' steps · '+t.done+'/'+t.total+' pts</span></div><div class="bar sm"><i style="width:'+pct(t.done,t.total)+'%"></i></div><div class="tl" style="margin-top:12px">';
  t.activity.forEach(a => {
    const cls = a.state==='done'?'done':a.state==='cur'?'cur':'todo';
    h += '<div class="tl-i"><div class="tl-rail"><span class="tl-n '+cls+'">'+(cls==='done'?'✓':cls==='cur'?'●':'○')+'</span></div>';
    h += '<div><div class="tl-h">'+esc(a.what)+'</div><div class="tl-s"><span class="muted">'+(a.by&&byId[a.by]?esc(byId[a.by].name):'Unassigned')+'</span></div></div></div>';
  });
  h += '<button class="btn ghost sm" data-act="close-modal" style="margin-top:10px">'+icon('plus',14)+' Add step</button></div></div>';
  h += '<div class="msec"><div class="msec-h">Related</div>';
  if (t.dependencies.length){
    t.dependencies.forEach(did => {
      const d = TASK_BY_ID[did];
      if (d) h += '<div class="res-i" data-act="open-task" data-id="'+d.id+'"><span class="mono">'+d.key+'</span><div><div class="ri-t">'+esc(d.title)+'</div><div class="ri-s">'+esc(d.projectLabel)+'</div></div>'+badge(d.status)+'</div>';
    });
  }
  h += '<div class="muted tiny" style="padding:8px 0 0">+'+TASKS.filter(x=>x.project===t.project&&x.id!==t.id).length+' other tasks in '+esc(t.projectLabel)+'</div></div>';
  h += '</div><aside class="col side">';
  h += '<div class="msec"><div class="msec-h">Details</div>';
  h += '<div class="def"><div class="dk">Assignee</div><div class="dv">'+(t.assignee==='u1'?'<span class="me">You</span>':av(t.assignee))+'<b>'+esc(byId[t.assignee].name)+'</b></div></div>';
  h += '<div class="def"><div class="dk">Reporting</div><div class="dv"><b>'+esc(byId[t.reportee].name)+'</b></div></div>';
  h += '<div class="def"><div class="dk">Due</div><div class="dv">'+dueLabel(t.due)+'</div></div>';
  h += '<div class="def"><div class="dk">Project</div><div class="dv"><b style="color:'+t.projectColor+'">'+esc(t.projectLabel)+'</b></div></div>';
  h += '<div class="def"><div class="dk">Effort</div><div class="dv"><b>'+t.effort+'</b></div></div>';
  h += '<div class="def"><div class="dk">Estimate</div><div class="dv"><b>'+t.cost+'</b> cost · <b>'+t.total+'</b> pts</div></div>';
  h += '</div>';
  h += '<div class="msec"><div class="msec-h">Tags</div><div class="tagrow">'+t.tags.map(tg=>'<span class="tg">'+esc(tg)+'</span>').join('')+'</div></div>';
  h += '<div class="msec"><div class="msec-h">Progress</div>';
  h += '<div class="def"><div class="dk">Completed</div><div class="dv"><b>'+t.done+'</b> of '+t.total+' pts</div></div>';
  h += '<div class="bar sm"><i style="width:'+pct(t.done,t.total)+'%"></i></div>';
  h += '<div class="tagrow" style="margin-top:10px"><span class="tg">'+t.watch+' watching</span><span class="tg">'+t.comments+' comments</span></div></div>';
  h += '<div class="msec"><div class="msec-h">Watchers</div><div class="ava-stack">'+avStack(projMemberObjs(t.project).map(m=>m.id).slice(0,4))+'</div></div>';
  h += '</aside></div>';
  return h;
}
