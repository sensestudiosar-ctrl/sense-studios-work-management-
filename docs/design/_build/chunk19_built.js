/* ==== EVENT DELEGATION + BOOT ==== */

/* nav ids ARE view ids (see NAV in chunk14), so renderView() switches on them. */
const SET_KEYS = { board:1, taskFilter:1, peopleFilter:1, projFilter:1, switchUser:1, settingsTab:1, peoplePage:1 };
const TASK_BY_KEY = {};
TASKS.forEach(t => { TASK_BY_KEY[t.key] = t.id; });

function closeNotifs() {
  if (S.notifOpen) { S.notifOpen = false; render(); }
}

/* ---- navigation. `nav` handler must be identical to open() ----
   My Work and Tasks render the same board; the board scope is what makes
   them different. Without this the two tabs are indistinguishable, which is
   why "My Work" used to show every task in the studio. */
function open(view) {
  if (!TITLE[view]) view = 'work';
  S.view = view;
  const panel = document.getElementById('acct-panel');
  if (panel) panel.style.display = 'none';
  if (view === 'work')  S.board = 'mine';
  if (view === 'tasks') S.board = 'all';
  S.taskModal = null;
  S.notifOpen = false;
  if (view === 'approvals') S.approvalsView = false;
  render();
}

/* account switcher panel: open/close on chevron click, close on outside-click */
document.addEventListener('click', function (e) {
  const chevron = e.target.closest('#acct-chevron');
  const panel = document.getElementById('acct-panel');
  if (chevron && panel) {
    const wasOpen = panel.style.display !== 'none';
    panel.style.display = wasOpen ? 'none' : '';
    e.stopPropagation();
    return;
  }
  if (panel && panel.style.display !== 'none' && !e.target.closest('#acct-switcher')) {
    panel.style.display = 'none';
  }

  const b = e.target.closest ? e.target.closest('[data-act]') : null;
  if (b) {
    switch (b.getAttribute('data-act')) {
      case 'nav':        open(b.getAttribute('data-view')); break;
      case 'new-task':   S.taskModal = 'new'; S.notifOpen = false; render(); break;
      case 'close-modal':
        S.taskModal = null;
        render();
        break;
      case 'open-task': {
        const id = b.getAttribute('data-id') || TASK_BY_KEY[b.getAttribute('data-key')];
        S.taskModal = id || 'new';
        S.notifOpen = false;
        render();
        break;
      }
      case 'open-proj':
        S.projFilter = b.getAttribute('data-id');
        open('projects');
        break;
      case 'notifs':
        if (b.hasAttribute('data-clear')) {
          NOTIF.forEach(n => { n.read = true; });
        } else if (b.getAttribute('data-ref')) {
          S.taskModal = TASK_BY_KEY[b.getAttribute('data-ref')] || 'new';
          S.notifOpen = false;
          render();
          break;
        }
        S.notifOpen = !S.notifOpen;
        S.notifRead = false;
        render();
        break;
      case 'set':
        if (b.getAttribute('data-k') === 'switchUser') {
          switchUser(b.getAttribute('data-v'));
        } else if (b.getAttribute('data-k') === 'settingsTab') {
          S.settingsTab = b.getAttribute('data-v');
          render();
        } else if (b.getAttribute('data-k') === 'peopleFilter') {
          S.peoplePage = 1;
          if (SET_KEYS[b.getAttribute('data-k')]) {
            S[b.getAttribute('data-k')] = b.getAttribute('data-v');
            render();
          }
        } else if (b.getAttribute('data-k') === 'peoplePage') {
          /* 'prev'/'next' are not numeric values; convert to delta. */
          const dir = b.getAttribute('data-v');
          if (dir === 'prev') S.peoplePage = Math.max(1, S.peoplePage - 1);
          else if (dir === 'next') S.peoplePage = S.peoplePage + 1;
          else S.peoplePage = parseInt(b.getAttribute('data-v')) || 1;
          render();
        } else if (SET_KEYS[b.getAttribute('data-k')]) {
          S[b.getAttribute('data-k')] = b.getAttribute('data-v');
          render();
        }
        break;
      case 'toggle-sb':  S.sbCollapsed = !S.sbCollapsed; render(); break;
      case 'toggle-set': {
        const key = b.getAttribute('data-key');
        const val = b.getAttribute('data-val');
        const span = b.tagName === 'BUTTON' ? b : null;
        if (span) {
          span.classList.toggle('on', val === 'on');
          b.setAttribute('data-val', val === 'on' ? 'off' : 'on');
          toast('Setting saved');
        }
        break;
      }
      case 'save-profile':  toast('Profile saved'); render(); break;
      case 'submit-task': S.taskModal = null; render(); toast('Task created'); break;
      default: break;
    }
  } else if (S.notifOpen && !(e.target.closest && e.target.closest('#dn'))) {
    closeNotifs();
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && S.taskModal) { S.taskModal = null; render(); }
});

function boot() {
  const root = document.getElementById('app');
  if (!root) {
    document.body.innerHTML = '<pre style="padding:24px;color:#dc2626">boot failed: #app missing</pre>';
    return;
  }
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
