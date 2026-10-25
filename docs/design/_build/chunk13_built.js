/* ================= SETTINGS ================= */
function vSettings(){
  const me = activePerson();
  const tab = S.settingsTab || 'personal';
  const wCapH = Math.round(TEAM.reduce((s,m) => s + m.cap, 0));
  const wUtilPct = Math.round(TEAM.reduce((s,m) => s + m.cap * m.util, 0) / wCapH * 100);

  /* ---- tab bar ---- */
  let h = '<div class="sm"><div class="sm-tl"><div class="sm-h">Settings</div><div class="sm-s">Workspace, security, roles and preferences</div></div>';
  h += '<div class="seg set-seg">';
  settingsSections().forEach(sec => {
    h += '<button class="seg-b'+(tab === sec.id ? ' on' : '')+'" data-act="set" data-k="settingsTab" data-v="'+sec.id+'">'+esc(sec.label)+'</button>';
  });
  h += '</div></div>';

  /* ---- personal tab ---- */
  if (tab === 'personal') {
    h += '<div class="split-37"><div class="col">';
    h += '<section class="card"><div class="card-h"><div class="card-t">Your profile</div><div class="card-s">Shown on your tasks and approvals</div></div><div class="sm-b">';
    h += '<div class="fld"><label class="lb" for="s-name">Full name</label><input class="inp" id="s-name" type="text" value="'+esc(me.name)+'"></div>';
    h += '<div class="grid2"><div class="fld"><label class="lb" for="s-role">Title</label><input class="inp" id="s-role" type="text" value="'+esc(me.title)+'"></div><div class="fld"><label class="lb" for="s-loc">Location</label><input class="inp" id="s-loc" type="text" value="'+esc(me.loc)+'"></div></div>';
    h += '<div class="grid2"><div class="fld"><label class="lb" for="s-em">Email</label><input class="inp" id="s-em" type="email" value="'+esc(me.email)+'"></div><div class="fld"><label class="lb" for="s-tz">Time zone</label><select class="sel" id="s-tz"><option'+(me.loc==='San Francisco'?' selected':'')+'>America/Los_Angeles</option><option>Europe/Rome</option><option>Europe/Berlin</option><option>America/New_York</option><option>Asia/Tokyo</option></select></div></div>';
    h += '</div><div class="card-f"><span class="mut tiny">Last updated today</span><button class="btn primary sm" data-act="save-profile">Save changes</button></div></section>';
    h += '</div><aside class="col side">';
    h += '<section class="card"><div class="card-h"><div class="card-t">Notifications</div><div class="card-s">Control what reaches you</div></div><div class="sm-b">';
    [[ 'task', 'Task assigned or reassigned', true ],
     [ 'comment', 'New comment on a task you watch', true ],
     [ 'mention', 'Someone mentions you', true ],
     [ 'approve', 'Approval requested from you', true ],
     [ 'blocked', 'A task you own gets blocked', true ],
     [ 'digest', 'Weekly digest', false ] ].forEach(r => {
      h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">'+esc(r[1])+'</div></div>';
      h += '<button class="tog'+(r[2]?' on':'')+'" data-act="toggle-set" data-key="notif-'+r[0]+'" data-val="'+(r[2]?'off':'on')+'"><i></i></button></div>';
    });
    h += '</div></section>';
    h += '<section class="card"><div class="card-h"><div class="card-t">Security</div><div class="card-s">Sessions and access</div></div><div class="sm-b">';
    h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Two-factor authentication</div><div class="tg-d">TOTP authenticator, enrolled</div></div><span class="tog on"><i></i></span></div>';
    h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Passwordless login</div><div class="tg-d">Magic link for trusted devices</div></div><span class="tog on"><i></i></span></div>';
    h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Session timeout</div><div class="tg-d">24 hours of inactivity</div></div><button class="tog'+(me.util > 0.5?' on':'')+'" data-act="toggle-set" data-key="session-timeout" data-val="off"><i></i></button></div>';
    h += '<div class="togrow"><div class="tg-tx"><div class="tg-n">Require 2FA for approvals</div><div class="tg-d">Budget and renewal decisions</div></div><button class="tog'+(can('manageBilling')?' on':'')+'" data-act="toggle-set" data-key="require-2fa" data-val="off"><i></i></button></div>';
    h += '</div><div class="card-f"><span class="mut tiny">Password last changed 4 months ago</span><button class="btn ghost sm" data-act="save-profile">Change password</button></div></section>';
    h += '</aside></div>';

  /* ---- team tab (Owner/Admin only) ---- */
  } else if (tab === 'team' && can('managePeople')) {
    h += '<div class="split-37"><div class="col">';
    h += '<section class="card"><div class="card-h"><div class="card-t">People</div><div class="card-s">'+TEAM.length+' members · '+TEAM.filter(m => m.status==='invited').length+' invited</div></div>';
    h += '<div class="tm-hd"><span class="th1">Member</span><span class="th2">Role</span><span class="th3">Location</span><span class="th4">Load</span><span class="th5">Status</span></div>';
    TEAM.slice(0, 20).forEach(m => {
      const st = m.util>0.95?'over':m.util>0.8?'busy':m.util>0.55?'ok':'free';
      h += '<div class="tm-r" data-act="open-person" data-id="'+m.id+'">';
      h += '<span class="tm-1">'+av(m.id)+'<div class="tm-n"><b>'+esc(m.name)+'</b><span class="tiny muted">'+esc(m.title)+'</span></div></span>';
      h += '<span class="tm-2"><span class="pill" style="color:'+(ROLES_META[m.role]?.color||'#6b7280')+';border-color:'+(ROLES_META[m.role]?.color||'#6b7280')+'22">'+esc(ROLES_META[m.role]?.label||m.role)+'</span></span>';
      h += '<span class="tm-3"><span class="tiny muted">'+esc(m.loc)+'</span></span>';
      h += '<span class="tm-4"><span class="lv '+st+'">'+Math.round(m.util*100)+'%</span></span>';
      h += '<span class="tm-5"><span class="tiny'+(m.status==='active'?'':' muted')+'">'+(m.status==='active'?'Active':m.status==='invited'?'Invited':'Exited')+'</span></span>';
      h += '</div>';
    });
    h += '<div class="card-f"><button class="btn ghost sm">View all '+TEAM.length+' →</button></div></section>';
    h += '</div><aside class="col side">';
    h += '<section class="card"><div class="card-h"><div class="card-t">Team overview</div></div><div class="sm-b">';
    h += '<div class="def"><div class="dk">Members</div><div class="dv"><b>'+TEAM.length+'</b></div></div>';
    h += '<div class="def"><div class="dk">Projects</div><div class="dv"><b>'+PROJ_ORDER.length+'</b></div></div>';
    h += '<div class="def"><div class="dk">Weekly capacity</div><div class="dv"><b>'+wCapH+'</b>h</div></div>';
    h += '<div class="def"><div class="dk">Workspace utilization</div><div class="dv"><b>'+wUtilPct+'</b>%</div></div>';
    h += '<div class="def"><div class="dk">Plan</div><div class="dv"><span class="tg">Studio Pro</span></div></div>';
    h += '<div class="def"><div class="dk">Invited</div><div class="dv"><b>'+TEAM.filter(m => m.status==='invited').length+'</b></div></div>';
    h += '</div><div class="card-f"><button class="btn primary sm">Invite member →</button></div></section>';
    h += '</aside></div>';

  /* ---- roles & access tab (Owner only) ---- */
  } else if (tab === 'roles' && can('assignRoles')) {
    h += '<div class="sm">';
    h += '<section class="card"><div class="card-h"><div class="card-t">Job roles &amp; access</div><div class="card-s">What each role can do in the workspace</div></div>';
    Object.entries(ROLES_META).forEach(([key, r]) => {
      const count = TEAM.filter(m => m.role === key).length;
      h += '<div class="role-row">';
      h += '<div class="rr-info"><span class="dot" style="background:'+r.color+'"></span>';
      h += '<div><b>'+esc(r.label)+'</b><span class="tiny muted"> · '+count+' member'+(count===1?'':'s')+'</span></div></div>';
      h += '<div class="rr-powers">';
      if (r.canManageBilling)   h += '<span class="pill ok">Billing</span>';
      if (r.canManagePeople)    h += '<span class="pill ok">People</span>';
      if (r.canAssignRoles)     h += '<span class="pill ok">Roles</span>';
      if (r.canManageAllTasks)  h += '<span class="pill ok">All tasks</span>';
      if (r.canManageProjects)  h += '<span class="pill ok">Projects</span>';
      if (!r.canManageBilling && !r.canManagePeople && !r.canAssignRoles && !r.canManageAllTasks && !r.canManageProjects)
        h += '<span class="pill">Task contributor</span>';
      h += '</div></div>';
    });
    h += '<div class="card-f"><button class="btn ghost sm">Add role →</button></div></section>';
    h += '</div>';

  /* ---- billing & plan tab (Owner only) ---- */
  } else if (tab === 'billing' && can('manageBilling')) {
    h += '<div class="sm">';
    h += '<section class="card"><div class="card-h"><div class="card-t">Billing &amp; plan</div><div class="card-s">Your Nordwind Studio Pro subscription</div></div><div class="sm-b">';
    h += '<div class="def"><div class="dk">Plan</div><div class="dv"><span class="tg">Studio Pro</span></div></div>';
    h += '<div class="def"><div class="dk">Members</div><div class="dv"><b>'+TEAM.length+'</b> of 200</div></div>';
    h += '<div class="def"><div class="dk">Projects</div><div class="dv"><b>'+PROJ_ORDER.length+'</b></div></div>';
    h += '<div class="def"><div class="dk">Next invoice</div><div class="dv"><b>$1,840</b> on Nov 1, 2026</div></div>';
    h += '<div class="def"><div class="dk">Payment method</div><div class="dv">Visa ···· 4242</div></div>';
    h += '</div><div class="card-f"><button class="btn ghost sm">Manage billing →</button></div></section>';
    h += '</div>';

  } else {
    /* tab not accessible — show denied state */
    h += '<div class="sm"><div class="empty-state">';
    h += icon('lock', 36);
    h += '<div class="es-t">Access restricted</div>';
    h += '<div class="es-s">You don\'t have permission to view this section.</div>';
    h += '</div></div>';
  }
  return h;
}
