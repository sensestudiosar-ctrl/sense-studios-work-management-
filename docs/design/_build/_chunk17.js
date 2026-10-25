/* ==== RENDER, VIEW DISPATCH, NOTIFICATIONS, MODAL LAYER ====
   shell() and NAV live in _chunk14.js. TITLE lives in _chunk18.js. */

function render() {
  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = shell();
}

/* ---- view dispatch: nav ids ARE view ids ---- */
function renderView() {
  switch (S.view) {
    case 'work':      return vTasks();        // My Work — task board
    case 'tasks':     return vTasks();        // Tasks — same board, all statuses
    case 'projects':  return vProjects();
    case 'people':    return vPeople();
    case 'dashboard': return vDashboard();
    case 'calendar':  return vCalendar();
    case 'reports':   return vReports();
    case 'approvals': return vApprovals();
    case 'settings':  return vSettings();
    case 'search':    return vSearch();
    default:          return vTasks();
  }
}

/* ---- notifications dropdown (rendered outside .main so it isn't clipped) ---- */
function notifPop() {
  if (S.notifOpen !== true) return '';
  const unread = NOTIF.filter(n => !n.read);
  let h = '<div class="dn" id="dn"><div class="dn-h">Notifications '+(unread.length ? '· '+unread.length+' new' : '')+'</div><div class="dn-b">';
  if (!NOTIF.length) h += '<div class="tiny muted" style="padding:16px 14px">No notifications.</div>';
  NOTIF.slice(0, 8).forEach(n => {
    const tone = n.tone === 'ok' ? 'ok' : (n.tone === 'warn' || n.tone === 'danger' ? 'warn' : 'acc');
    h += '<div class="dn-i'+(n.read ? '' : ' new')+'" data-act="notifs" data-ref="'+esc(n.ref || '')+'">';
    h += '<span class="ic-s i-'+tone+'">'+icon(n.icon, 14)+'</span>';
    h += '<div><div class="dn-t">'+esc(n.text)+'</div><div class="dn-s">'+esc(n.sub || '')+'</div></div>';
    h += '<span class="dn-d">'+agoLabel(n.date)+'</span></div>';
  });
  h += '<button class="dn-f" data-act="notifs" data-clear="1">Mark all as read</button></div></div>';
  return h;
}

/* ---- task modal: created by 'new-task' or 'open-task' ----
   'new' opens the form; anything else is a task id from the board,
   calendar or notifications. Unknown ids fall back to the form rather
   than rendering an empty modal.

   vTaskForm() and vTaskDetail() both return the .m-h header and the
   body as siblings. .ov is a CSS grid (place-items:center), so without
   a wrapper the header and body become two separate grid cells side by
   side, each drawn directly on the dark backdrop — no white card, no
   border-radius, no shadow. .m-box is that single grid child. */
function modalLayer() {
  if (!S.taskModal) return '';
  const t = S.taskModal === 'new' ? null : TASK_BY_ID[S.taskModal];
  return '<div class="ov" data-act="close-modal"><div class="m-box">'+(t ? vTaskDetail(t) : vTaskForm())+'</div></div>';
}

/* ---- toast ---- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, 2600);
}
