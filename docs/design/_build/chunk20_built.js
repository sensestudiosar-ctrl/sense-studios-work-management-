/* ==== CSS 2 — dashboard, search, notifications, modal, calendar, reports ==== */
/* Appends to _chunk15.js. Classes already defined there are NOT repeated. */

/* ---- b-* status tints (chunk6 uses b-ok/b-info/b-violet/b-danger/b-gray) ---- */
.badge.b-ok{background:var(--ok-bg);color:var(--ok)}
.badge.b-info{background:#e7f0ff;color:var(--blue)}
.badge.b-violet{background:#f1ebff;color:var(--purple)}
.badge.b-danger{background:var(--danger-bg);color:var(--danger)}
.badge.b-gray{background:var(--line-2);color:var(--mut)}
.bar.b-ok i{background:var(--ok)}
.bar.b-info i{background:var(--blue)}
.bar.b-violet i{background:var(--purple)}
.bar.b-danger i{background:var(--danger)}
.bar.b-gray i{background:var(--mut2)}

/* ---- dashboard KPI strip ---- */
.kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;box-shadow:var(--sh)}
.kpi-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.kpi-ic{width:30px;height:30px;border-radius:8px;background:var(--accent-bg);color:var(--accent);display:grid;place-items:center}
.kpi-v{font-size:27px;font-weight:700;letter-spacing:-.025em;line-height:1.1}
.kpi-l{font-size:12px;color:var(--mut);font-weight:550;margin-top:4px}
.kpi-t{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600}

/* ---- dashboard project rows ---- */
.prows{display:flex;flex-direction:column}
.prows .prow{padding:11px 0;border-bottom:1px solid var(--line-2)}
.prows .prow:last-child{border-bottom:0}
.prow-stack{display:flex;align-items:center;gap:12px}
.prow-h{font-size:13px;font-weight:600}
.prow-n{font-size:14px;font-weight:680;letter-spacing:-.02em;min-width:38px;text-align:right}
.prow-p{font-size:12px;color:var(--mut);font-weight:550}
.prow-s{font-size:12px;color:var(--mut);margin-top:4px}
.prow-t{font-size:12.5px;color:var(--tx2);margin-top:5px}

/* ---- timeline ---- */
.tl-rail{position:relative;padding-left:16px}
.tl-rail:before{content:'';position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:var(--line-2);border-radius:2px}
.tl-h{font-size:12px;font-weight:600;color:var(--mut);margin-bottom:10px;padding-left:16px}
.tl-step{position:relative}
.tl-step:before{content:'';position:absolute;left:-16px;top:1px;width:10px;height:10px;border-radius:50%;background:var(--mut2);border:2px solid var(--panel);box-sizing:content-box}
.tl-step.done:before{background:var(--ok)}
.tl-i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:var(--accent-bg);color:var(--accent);flex-shrink:0}
.tl-n{font-size:12px;font-weight:550;color:var(--mut)}
.tl-s{font-size:12px;color:var(--tx2)}
.tl-add-btn{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:var(--mut);cursor:pointer}
.tl-add-btn:hover{background:var(--bg)}

/* ---- actions / attention ---- */
.act{padding:10px 0;border-bottom:1px solid var(--line-2)}
.act:last-child{border-bottom:0}
.act-bx{display:flex;align-items:center;gap:11px}
.act-t{font-size:13px;font-weight:600}
.act-tx{min-width:0;flex:1}

/* ---- more ---- */
.more{font-size:11px;font-weight:650;padding:2px 8px;border-radius:99px;background:var(--line-2);color:var(--tx2);display:inline-flex;align-items:center}

/* ---- search ---- */
.searchwrap{max-width:620px;margin:0 auto}
.searchin{width:100%;box-sizing:border-box;height:44px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-size:14px;font-family:inherit;color:var(--tx);box-shadow:var(--sh-md);outline:none}
.searchin:focus{border-color:var(--accent-2);box-shadow:0 0 0 3px var(--accent-bg)}
.res{margin-top:14px;display:flex;flex-direction:column;gap:2px}

/* ---- notifications dropdown ---- */
.dn{position:fixed;top:56px;right:24px;width:390px;max-height:430px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh-lg);z-index:70;overflow:hidden;display:flex;flex-direction:column}
.dn-h{padding:12px 14px;font-size:12.5px;font-weight:650;border-bottom:1px solid var(--line-2)}
.dn-b{overflow-y:auto}
.dn-i{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-bottom:1px solid var(--line-2);cursor:pointer}
.dn-i:hover{background:var(--bg)}
.dn-i.new{background:#fbfbff}
.dn-i.new:before{content:'';position:absolute;width:0}
.dn-i .ic-s{width:24px;height:24px;margin-top:1px}
.dn-t{font-size:12.5px;font-weight:550;line-height:1.35}
.dn-s{font-size:11.5px;color:var(--mut);margin-top:2px;line-height:1.35}
.dn-d{font-size:10.5px;color:var(--mut2);white-space:nowrap;margin-left:auto;padding-left:6px}
.dn-f{display:block;width:100%;padding:10px;border:0;border-top:1px solid var(--line-2);background:var(--panel);font-size:12px;font-weight:600;color:var(--accent-2);font-family:inherit;cursor:pointer}
.dn-f:hover{background:var(--accent-bg)}

/* ---- icon button badge ---- */
.ib-ic{display:grid;place-items:center}
.ib-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:var(--danger);color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;line-height:1}
.icon-btn.has-badge{position:relative}

/* ---- chips row ---- */
.chips{display:flex;gap:6px;flex-wrap:wrap}

/* ---- task modal ---- */
.ov{position:fixed;inset:0;background:rgba(16,20,24,.44);backdrop-filter:blur(2px);z-index:90;display:grid;place-items:center;padding:24px;overflow-y:auto}
/* .m-box is the single grid child of .ov that holds the .m-h header and
   body. Without it the header and body are separate grid cells, each
   painted on the dark backdrop with no card surface behind them. */
.m-box{background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 50px rgba(16,20,24,.22);width:680px;max-width:92vw;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column}
.m-h{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--line-2)}
.m-h .m-ht{font-size:16px;font-weight:680;letter-spacing:-.015em}
.m-eyebrow{font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:3px}
.m-s{font-size:12px;color:var(--mut);margin-top:3px}
.m-t{font-size:14px;font-weight:600}
.m-b{padding:16px 18px;overflow-y:auto;max-height:62vh}
.m-f{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 18px;border-top:1px solid var(--line-2);background:var(--bg);border-radius:0 0 var(--r) var(--r)}
.m-fh{font-size:12px;color:var(--mut);font-weight:550;margin-right:auto;display:flex;align-items:center;gap:7px}

/* ---- misc form rows ---- */
.chkrow{display:flex;align-items:center;gap:9px;padding:8px 0;font-size:13px;cursor:pointer}
.chkrow input{width:16px;height:16px;accent-color:var(--accent-2)}
.fld-hint{font-size:11px;color:var(--mut);font-weight:450}

/* ---- project drawer / task columns ---- */
.prow-stack .badge{margin-left:auto}

/* ---- calendar ---- */
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--line-2);border-top:1px solid var(--line-2)}
.cal-d{background:var(--bg);padding:8px 9px;font-size:10.5px;font-weight:680;letter-spacing:.05em;text-transform:uppercase;color:var(--mut)}
.cal-c{background:var(--panel);min-height:96px;padding:7px 8px;display:flex;flex-direction:column;gap:4px}
.cal-c.out{background:#fafbfc}
.cal-c.out .cal-n{color:var(--mut2)}
.cal-n{font-size:12px;font-weight:650;color:var(--tx2);margin-bottom:2px}
.cal-c.today .cal-n{background:var(--accent);color:#fff;border-radius:6px;padding:1px 6px;width:max-content}
.cal-t{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--tx2);padding:3px 6px;border-radius:6px;background:var(--bg);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cal-t:hover{background:var(--accent-bg);color:var(--accent-2)}
.cal-t .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.cal-x{font-size:10.5px;font-weight:650;color:var(--mut);padding:1px 6px}

/* ---- reports ---- */
.cols7{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;align-items:end;height:150px}
.col-bx{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;height:100%}
.col-bar{width:100%;max-width:34px;min-height:8px;border-radius:7px 7px 3px 3px;background:var(--accent-2);display:flex;align-items:flex-start;justify-content:center}
.col-bar span{font-size:10px;font-weight:680;color:#fff;margin-top:4px}
.col-lb{font-size:10.5px;font-weight:650;color:var(--mut)}
.bar-row{display:flex;align-items:center;gap:11px;padding:7px 0}
.bar-lb{width:86px;font-size:12.5px;font-weight:550;color:var(--tx2);flex-shrink:0}
.bar-row .bar{flex:1}
.bar-n{width:30px;text-align:right;font-size:12.5px;font-weight:680}

/* ---- toast ---- */
.toast{position:fixed;bottom:26px;left:50%;transform:translate(-50%,12px);background:var(--tx);color:#fff;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:550;box-shadow:var(--sh-lg);opacity:0;transition:opacity .22s,transform .22s;z-index:120;pointer-events:none}
.toast.show{opacity:1;transform:translate(-50%,0)}

/* ---- sidebar collapsed ---- */
.app.sb-collapsed .sb{width:66px}
.app.sb-collapsed .sb .ws,.app.sb-collapsed .sb .nl,.app.sb-collapsed .sb .sb-tx,.app.sb-collapsed .sb .sb-nl{display:none}
.app.sb-collapsed .sb-nav{padding:0 8px}
.app.sb-collapsed .sb-me{justify-content:center}

/* ---- responsive ---- */
@media (max-width:1180px){
  .kpi-strip{grid-template-columns:repeat(2,1fr)}
  .split-37{grid-template-columns:1fr}
}
@media (max-width:760px){
  .sb{display:none}
  .kpi-strip{grid-template-columns:1fr}
  .cols7{grid-template-columns:repeat(4,1fr);height:120px}
  .cal-c{min-height:72px}
}

/* ---- SETTINGS PANELS ---- */
/* tab bar for settings sub-navigation */
.set-seg{margin-bottom:4px}
.set-seg .seg-b{min-width:80px;text-align:center}

/* role access rows */
.role-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line-2);gap:16px}
.role-row:last-child{border-bottom:0}
.rr-info{display:flex;align-items:center;gap:10px;min-width:140px}
.rr-info .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.rr-info b{font-size:13px;font-weight:600}
.rr-powers{display:flex;flex-wrap:wrap;gap:5px}
.pill{font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;border:1px solid var(--line);color:var(--mut);background:var(--bg)}
.pill.ok{background:#ecfdf5;color:#059669;border-color:#a7f3d0}

/* interactive toggles */
.tog{width:36px;height:20px;border-radius:10px;background:var(--line);position:relative;cursor:pointer;display:inline-block;transition:.15s;flex-shrink:0}
.tog i{position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.15);transition:transform .15s}
.tog.on{background:var(--accent)}
.tog.on i{transform:translateX(16px)}
button.tog{outline:none}
button.tog:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* denied state */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 32px;text-align:center;gap:10px}
.empty-state .ic-s{color:var(--mut2)}
.es-t{font-size:15px;font-weight:680;color:var(--tx)}
.es-s{font-size:13px;color:var(--mut)}

/* ---- PEOPLE TABLE HEADERS ---- */
.tm-hd{display:grid;grid-template-columns:2.4fr 2fr 1.1fr .9fr 1fr;gap:10px;padding:9px}
.th1,.th2,.th3,.th4,.th5{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mut2);white-space:nowrap}

/* ---- PAGINATION ---- */
.pg-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;border-top:1px solid var(--line-2);flex-wrap:wrap}
.pg-info{font-size:12px;color:var(--mut);font-weight:550}
.pg-btns{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.pg-btns .btn{min-width:32px;padding:5px 10px}
.pg-btns .btn.on{background:var(--accent);border-color:var(--accent);color:#fff}
.pg-btns .btn.disabled{opacity:.4;pointer-events:none}

/* ---- ACCOUNT SWITCHER ---- */
.acct-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;transition:background .12s}
.acct-row:hover{background:var(--bg)}
.acct-row .av{width:28px;height:28px;flex-shrink:0}
.acct-row .sm-bx{flex:1;min-width:0}
.acct-row .sm-bx b{font-size:12px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.acct-row .sm-bx .tiny{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.acct-row .icon-btn.xs{width:22px;height:22px;border-radius:6px;color:var(--mut);font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.12s}
.acct-row .icon-btn.xs:hover{color:var(--tx);background:var(--line-2)}
.acct-panel{position:absolute;bottom:100%;left:0;right:0;margin-bottom:6px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px;box-shadow:0 6px 24px rgba(16,20,24,.13);display:none;flex-direction:column;gap:4px;z-index:60}
.acct-panel .acct-role{font-size:11px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px 6px;border-bottom:1px solid var(--line-2);margin-bottom:4px}
.acct-opt{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;transition:background .1s}
.acct-opt:hover{background:var(--bg)}
.acct-opt.you{background:var(--bg)}
.acct-opt .av.sm{width:24px;height:24px;font-size:9px;flex-shrink:0}
.acct-opt b{font-size:12px;font-weight:550}
.acct-opt .tiny{font-size:10.5px;color:var(--mut)}
.sb-f{position:relative}
