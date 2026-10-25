/* ---- helpers ---- */
function esc(s){ if(s===null||s===undefined) return ''; return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; }); }
function icon(n, s){ s = s||16; var p = SVG[n]||SVG.grid; return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
function pct(a, b){ return b > 0 ? Math.round(a / b * 100) : 0; }
function spark(a, c, w){ w = w || 56; var mx = Math.max.apply(null, a) || 1; var o = '<svg width="'+w+'" height="22" viewBox="0 0 '+w+' 22">'; for (var i = 0; i < a.length; i++) { var h = Math.max(1.5, a[i]/mx*21); o += '<rect x="'+(i*(w/a.length)).toFixed(2)+'" y="'+(22-h).toFixed(2)+'" width="'+(w/a.length-1).toFixed(2)+'" height="'+h.toFixed(2)+'" rx="1" fill="'+c+'"/>'; } return o + '</svg>'; }
function avColor(n){ var i = 0; for (var k = 0; k < n.length; k++) i = (i * 31 + n.charCodeAt(k)) % 360; return 'hsl(' + i + ' 52% 48%)'; }
function initials(n){ var p = n.split(' '); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function av(id, cls){ var m = byId[id]; if (!m) return ''; return '<span class="av '+(cls||'')+'" style="background:'+avColor(m.name)+'">'+esc(initials(m.name))+'</span>'; }
function avOne(id){ return av(id, 'md'); }
function avaList(ids, n){ n = n || 3; var s = '<div class="ava-stack">'; for (var i = 0; i < Math.min(ids.length, n); i++) s += av(ids[i]); if (ids.length > n) s += '<span class="ava-more">+'+(ids.length-n+1)+'</span>'; return s + '</div>'; }
function fmtD(d){ return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtDT(d){ return fmtD(d) + ' · ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function isMine(t){ return t.assignedTo.indexOf(me.id) >= 0; }
function doneTask(t){ return t.status === 'done'; }
function overdueTask(t){ return t.status !== 'done' && t.due !== null && new Date(t.due).getTime() < Date.now(); }
function dueIn(t){ return Math.round((new Date(t.due).getTime() - Date.now()) / 86400000); }
function relT(t){ var m = Math.floor((Date.now() - new Date(t).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return m+'m ago'; var h = Math.floor(m/60); if (h < 24) return h+'h ago'; return Math.floor(h/24)+'d ago'; }
function projLabel(pid){ var p = PROJECTS[pid]; return p ? p.name : pid; }
function projColor(pid){ var p = PROJECTS[pid]; return p ? p.color : '#94a3b8'; }
function memberName(id){ var m = byId[id]; return m ? m.name : id; }
function myWork(){ return TASKS.filter(isMine); }
function done(){ return TASKS.filter(doneTask); }
function overdue(){ return TASKS.filter(overdueTask); }
function dueToday(){ return TASKS.filter(function(t){ return t.status !== 'done' && t.due !== null && Math.abs(dueIn(t)) <= 0.5; }); }
function projMembers(pid){ return TEAM.filter(function(m){ return m.projectId === pid; }).map(function(m){ return byId[m.id]; }); }
function projMemberObjs(pid){ return projMembers(pid); }
function projTaskObjs(pid){ return TASKS.filter(function(t){ return t.projectId === pid; }); }
function projTaskCount(pid){ return projTaskObjs(pid).length; }
function projDoneCount(pid){ return projTaskObjs(pid).filter(doneTask).length; }
function projDonePct(pid){ return pct(projDoneCount(pid), projTaskCount(pid)); }
function donePct(pid){ return projDonePct(pid); }
function projActiveCount(pid){ return projTaskObjs(pid).filter(function(t){ return t.status === 'active' || t.status === 'review'; }).length; }
function projCap(pid){ return projMembers(pid).reduce(function(s, m){ return s + m.cap; }, 0); }
function projPts(pid){ return projTaskObjs(pid).reduce(function(s, t){ return s + (t.points || 1); }, 0); }
function myOverdueCount(){ return myWork().filter(overdueTask).length; }
function doneByDay(i){ return myWork().filter(function(t){ return t.due !== null && Math.round((new Date(t.due).getTime() - Date.now()) / 86400000) === i; }).length; }
function dueLbl(t){ if (t.due === null) return 'No date'; var d = dueIn(t); if (d < 0) return (-d)+'d overdue'; if (d === 0) return 'Today'; if (d === 1) return 'Tomorrow'; return d+'d left'; }
function dueStyle(t){ if (t.due === null) return ''; var d = dueIn(t); if (d < 0) return 'color:var(--danger)'; if (d <= 1) return 'color:var(--warn)'; return ''; }
function taskById(id){ return TASKS.find(function(t){ return t.id === id; }); }
function myStats(){ var m = myWork(); return { total: m.length, done: m.filter(doneTask).length, overdue: m.filter(overdueTask).length, active: m.filter(function(t){ return t.status === 'active'; }).length, blocked: m.filter(function(t){ return t.blocked; }).length, open: m.filter(function(t){ return !doneTask(t); }).length }; }
function newTask(){ return mk('NT-'+(900+TASKS.length), 'New task', 'Describe the outcome you are trying to reach.', 'todo', 'med', 3, 'general', 'u1', TASKS.length, dueStr(2), TASKS.length < 5); }
function dueStr(n){ var d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); }
