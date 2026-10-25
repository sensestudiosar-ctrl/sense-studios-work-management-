/* ================= MY WORK ================= */
const BOARD_COL = [
  { id:'blocked',   l:'Blocked',    c:'#dc2626' },
  { id:'todo',      l:'To do',      c:'#9ca3af' },
  { id:'inProgress',l:'In progress',c:'#2563eb' },
  { id:'inReview',  l:'In review',  c:'#7c3aed' },
  { id:'done',      l:'Done',       c:'#059669' },
];
const BOARD_COLS = BOARD_COL;
function vTasks(){
  let h = '<div class="tb-sub">';
  h += '<div class="seg"><button class="seg-b'+(S.board==='mine'?' on':'')+'" data-act="set" data-k="board" data-v="mine">Assigned to me</button><button class="seg-b'+(S.board==='reporting'?' on':'')+'" data-act="set" data-k="board" data-v="reporting">Reporting to me</button><button class="seg-b'+(S.board==='all'?' on':'')+'" data-act="set" data-k="board" data-v="all">All tasks</button></div>';
  h += '<div class="tb-sp"></div>';
  h += '<div class="chips">';
  [['all','All'],['blocked','Blocked'],['urgent','Urgent'],['decide','Needs decision']].forEach(f => {
    h += '<button class="chip'+(S.taskFilter===f[0]?' on':'')+'" data-act="set" data-k="taskFilter" data-v="'+f[0]+'">'+f[1]+'</button>';
  });
  h += '</div>';
  h += '<button class="btn primary" data-act="new-task"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New task</button>';
  h += '</div>';

  const mine = S.board === 'mine' ? OWNER_TASKS : S.board === 'reporting' ? REPORT_TO_ME : openTasks;
  let list = mine.filter(t => t.status !== 'done');
  if (S.taskFilter === 'blocked') list = list.filter(t => t.status === 'blocked');
  if (S.taskFilter === 'urgent')  list = list.filter(t => t.prio === 'urgent');
  if (S.taskFilter === 'decide')  list = list.filter(t => t.tags.includes('decision'));
  list = list.slice().sort((a,b) => prRank(a.prio)-prRank(b.prio) || a.due-b.due);

  h += '<div class="split-37"><div class="col">';
  BOARD_COL.forEach(c => {
    const items = list.filter(t => t.status === c.id);
    const pts = items.reduce((s,t) => s + t.total, 0);
    h += '<div class="bk"><div class="bk-h"><span class="bk-t" style="color:'+c.c+'">'+c.l+'</span><span class="bk-n">'+items.length+'</span><span class="bk-pts">'+pts+' pts</span></div>';
    items.slice(0,6).forEach(t => {
      h += '<div class="card tc" data-act="open-task" data-id="'+t.id+'"><div class="tc-h"><span class="mono muted">'+t.key+'</span>'+prBadge(t.prio)+'</div>';
      h += '<div class="tc-t">'+esc(t.title)+'</div>';
      h += '<div class="tc-f"><span class="pl" style="background:'+t.projectColor+'">'+esc(t.projectLabel)+'</span>'+dueLabel(t.due)+'</div>';
      if (t.status === 'blocked' && t.blockers.length) h += '<div class="tc-blk">'+icon('lock',12)+esc(t.blockers[0].slice(0,72))+'</div>';
      h += '<div class="tc-b">'+(t.assignee==='u1'?'<span class="me">You</span>':av(t.assignee))+'<span class="tc-sp"></span><span class="mut">'+t.done+'/'+t.total+'</span>'+(t.comments?'<span class="tc-ic">'+icon('msg',13)+t.comments+'</span>':'')+(t.watch?'<span class="tc-ic">'+icon('eye',13)+t.watch+'</span>':'')+'</div></div>';
    });
    if (!items.length) h += '<div class="bk-empty">No tasks here</div>';
    h += '<button class="btn ghost sm" data-act="new-task" style="width:100%;margin-top:8px">+ Add to '+c.l+'</button>';
    h += '</div>';
  });
  h += '</div>';

  h += '<aside class="col side">';
  h += '<section class="card"><div class="card-h"><div class="card-t">Focus</div><div class="card-s">Your load this week</div></div>';
  const mineAll = OWNER_TASKS;
  const mineOpen = mineAll.filter(t => t.status !== 'done');
  const minePts = mineOpen.reduce((s,t) => s + t.total, 0);
  h += '<div class="stat3"><div><div class="s-v">'+mineOpen.length+'</div><div class="s-l">open</div></div><div><div class="s-v">'+minePts+'</div><div class="s-l">points</div></div><div><div class="s-v">'+mineOpen.filter(t=>t.prio==='urgent').length+'</div><div class="s-l">urgent</div></div></div>';
  h += '<div class="mini-h" style="margin-top:14px">This week</div>';
  WEEK.slice().reverse().forEach(d => {
    const n = mineOpen.filter(t => t.due >= d.d && t.due <= d.end).length;
    h += '<div class="wk"><span class="wk-d">'+d.label+'</span><div class="wk-b"><i style="width:'+Math.max(4,n*22)+'%"></i></div><span class="wk-n">'+n+'</span></div>';
  });
  h += '</section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Needs your decision</div><div class="card-s">'+NEEDS.length+' items</div></div>';
  NEEDS.slice(0,4).forEach(n => {
    h += '<div class="attn" data-act="open-task" data-key="'+esc(n.key)+'"><span class="attn-i '+(n.kind==='approve'?'i-ok':n.kind==='blocked'?'i-warn':'i-acc')+'">'+icon(n.kind==='approve'?'check':n.kind==='blocked'?'lock':'eye',15)+'</span><div class="attn-tx"><div class="attn-h">'+esc(n.title)+'</div><div class="attn-s">'+esc(n.note)+'</div></div><span class="attn-d">'+esc(n.due)+'</span></div>';
  });
  h += '</section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Recently updated</div></div>';
  TASKS.filter(t => t.updated >= due(-2)).slice().sort((a,b)=>b.updated-a.updated).slice(0,6).forEach(t => {
    h += '<div class="act" data-act="open-task" data-id="'+t.id+'"><span class="av sm" style="background:'+avColor(byId[t.assignee].name)+'">'+esc(initials(byId[t.assignee].name))+'</span><div class="act-bx"><div class="act-tx"><b>'+esc(t.key)+'</b> '+esc(t.title.slice(0,38))+'</div><div class="act-t">'+agoLabel(t.updated)+' · '+esc(t.projectLabel)+'</div></div></div>';
  });
  h += '</section></aside></div>';
  return h;
}
const REPORT_TO_ME = TASKS.filter(function (t) { return t.reportee === 'u1'; });
function prRank(p){ return p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'med' ? 2 : 3; }
