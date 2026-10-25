/* ==== ICONS + SHARED HELPERS ====
   Provides: icon(), iconTitle(), iso(), WEEK, WEEK_DAYS,
   and patches PROJECTS with healthBadge / goal. */

/* ---- icon() : 15 names, each a full <svg> ---- */
function icon(n, s) {
  s = s || 20;
  const o = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const P = {
    plus:     '<path d="M12 5v14M5 12h14"/>',
    folder:   '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    lock:     '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    'chev-l': '<path d="M15 6l-6 6 6 6"/>',
    check:    '<path d="M4 12l5 5L20 6"/>',
    bell:     '<path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/>',
    x:        '<path d="M18 6L6 18M6 6l12 12"/>',
    users:    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
    msg:      '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    layers:   '<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    eye:      '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
    dots:     '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    alert:    '<path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
    home:     '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
    list:     '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    grid:     '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    flag:     '<path d="M4 22V4c0-.5.5-1 1-1h14l-3 5 3 5H5"/>',
    dollar:   '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    chart:    '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    people:   '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    user:     '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    cal:      '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  };
  return '<svg width="'+s+'" height="'+s+'" '+o+'>' + (P[n] || P.x) + '</svg>';
}

/* ---- iconTitle() : used by chunk14 shell header ---- */
function iconTitle(n) {
  if (n === 'bell')   return 'Notifications';
  if (n === 'check')  return 'Approvals';
  if (n === 'search') return 'Search';
  return '';
}

/* ---- WEEK : 7 days from (TODAY-6) through TODAY ---- */
/* (iso() already defined in _chunk1.js) */
const WEEK_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEK = (() => {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - i);
    out.push({ d: d, end: new Date(d), label: WEEK_DAYS[d.getDay()] });
  }
  return out;
})();

/* ---- patch PROJECTS: healthBadge, goal ---- */
PROJ_ORDER.forEach(pid => {
  const p = PROJECTS[pid];
  p.healthBadge = p.health >= 80 ? 'badge-ok' : (p.health >= 60 ? 'badge-warn' : 'badge-danger');
  if (!p.goal) {
    p.goal = p.health >= 80
      ? 'On track — all milestones within plan.'
      : p.health >= 60
        ? 'Watch — risks identified, mitigating now.'
        : 'At risk — intervention needed this week.';
  }
});
