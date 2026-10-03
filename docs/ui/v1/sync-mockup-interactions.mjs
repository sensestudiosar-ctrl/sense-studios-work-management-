import { readFile, writeFile } from 'node:fs/promises';
const file = new URL('./mockups.html', import.meta.url);
const html = await readFile(file, 'utf8');
const start = html.indexOf('    function applyViewState()');
const already = html.indexOf("    let affectedSection = 'whole';");
const from = already >= 0 ? already : start;
const end = html.indexOf('  })();', from);
if (from < 0 || end < from) throw new Error('Expected mockup interaction boundary is missing');
const replacement = await readFile(new URL('./mockup-interactions.js', import.meta.url), 'utf8');
let prefix=html.slice(0, from);
if (!prefix.includes('data-preview-task=')) {
  const target = '<div class="task-project">${t.code} · ${t.project}</div>';
  if (!prefix.includes(target)) throw new Error('Task preview insertion point missing');
  prefix = prefix.replace(target, target + '<button class="text-link task-peek" data-preview-task="${t.id}" aria-label="Preview ${t.code}">Preview task</button>');
}
if (!prefix.includes('/* research task preview */')) {
  prefix = prefix.replace('/* v1 acceptance refinements */', `/* research task preview */
    #taskPreviewDialog{position:fixed;inset:12px 12px 12px auto;margin:0;width:min(440px,calc(100vw - 24px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;padding:22px}#taskPreviewDialog h2{font-size:24px;overflow-wrap:anywhere}.preview-facts{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;margin:22px 0}.preview-facts dt{color:var(--muted)}.preview-facts dd{margin:0;font-weight:650;overflow-wrap:anywhere}.task-peek{font-size:12px;margin-top:9px;min-height:32px}.work-display{margin:0 0 12px;border:1px solid var(--line);border-radius:9px;padding:10px 12px}.work-display summary{cursor:pointer;font-size:12px;font-weight:650}.work-display .actions{margin-top:12px}@media(max-width:767px){#taskPreviewDialog{inset:12px;margin:0 auto;width:calc(100vw - 24px);padding:18px}.preview-facts{grid-template-columns:100px minmax(0,1fr)}.task-peek{min-height:44px}}.forced-mobile #taskPreviewDialog{width:min(366px,calc(100vw - 24px));inset:12px;margin:0 auto}
    /* v1 acceptance refinements */`);
}
prefix=prefix.replace(/ {4}function taskDetail\(\).*?\n {4}function reviewDetail/s, '    function reviewDetail');
prefix=prefix.replace("review:'Review round 1 · R1'", "review:'Review round 2 · R2'");
prefix=prefix.replace('No new notifications.', 'Notifications list is outside this design preview.');
prefix=prefix.replace('<span class="notification-dot" aria-hidden="true"></span>', '');
prefix=prefix.replace('data-message="Notifications screen design is outside this preview."><span class="nav-icon" aria-hidden="true">♧</span>Help', 'data-message="Help screen design is outside this preview."><span class="nav-icon" aria-hidden="true">♧</span>Help');
prefix=prefix.replace("owner:'Unassigned'", "owner:'Eli Brooks (exited)'");
prefix=prefix.replace(/Project · Interior Design/g, 'Project · Design');
prefix=prefix.replace('<dt>Delivery</dt><dd>Interior Design</dd>', '<dt>Delivery</dt><dd>Design</dd>');
prefix=prefix.replace(/Round 2<\/button><\/div><div class="task-project">Task WH-215 · Exact revision R1/g, 'Round 2</button></div><div class="task-project">Task WH-215 · Exact revision R2');
prefix=prefix.replace('2 active rounds', '1 active round · 1 completed correction');
prefix=prefix.replace(/Correction in progress/g, 'Correction completed');
prefix=prefix.replace("projectTaskFilter==='review'?['In review','Correction required','Correction completed'].includes(t.status)", "projectTaskFilter==='review'?(t.status==='In review'||Boolean(t.correction)&&t.status!=='Completed')");
prefix=prefix.replace('Complete · approved internally', 'Stage marked complete');
prefix=prefix.replace(/Assigned to Avery Morgan · committed 2 Oct 2026/g, 'Task WH-215 · current review gate');
prefix=prefix.replace(/Assigned to Jordan Lee · committed 8 Oct 2026/g, 'Required milestone · pending completion');
prefix=prefix.replace("taskData.filter(t=>['t1','t2'].includes(t.id))", "taskData.filter(t=>['t1','t4','t5'].includes(t.id))");
prefix=prefix.replace("activeFilter==='approaching'?['t1','t2','t4'].includes(t.id)", "activeFilter==='approaching'?['t1','t4','t5'].includes(t.id)");
prefix=prefix.replace("activeFilter==='review'?['In review','Correction required','Correction in progress'].includes(t.status)", "activeFilter==='review'?(t.status==='In review'||Boolean(t.correction)&&t.status!=='Completed')");
prefix=prefix.replace('>In review</button><button class="filter-chip" data-filter="completed"', '>Review &amp; correction</button><button class="filter-chip" data-filter="completed"');
prefix=prefix.replace('<option>Escalate</option>', '');
prefix=prefix.replace(".join('')}</tbody></table>", ".join('')||'<tr><td colspan=\"6\">No documents match. <button class=\"text-link\" data-action=\"reset-docs\">Reset</button></td></tr>'}</tbody></table>");
if (!prefix.includes('/* v1 acceptance refinements */')) prefix=prefix.replace('</style>', `
    /* v1 acceptance refinements */
    :root{--radius:12px}.sidebar{width:224px}.topbar{min-height:64px}.row-label{font-size:11px;color:var(--muted)}.date-pair{display:grid;gap:6px}.date-pair>span{display:block}.doc-mobile-cards{display:none}.doc-card{padding:16px}.doc-card-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.field-label{display:block;margin:16px 0 6px;font-weight:650}.field-label[hidden]{display:none}dialog{border:1px solid var(--line);border-radius:12px;max-width:560px;width:calc(100% - 32px);padding:24px;color:var(--ink);box-shadow:var(--shadow)}dialog::backdrop{background:#24312c66}.dialog-head{display:flex;gap:16px;justify-content:space-between;align-items:start}.dialog-head h2{margin:0}dialog .search{width:100%;box-sizing:border-box}textarea{font:inherit}.bottom-nav button{min-height:44px}.profile-card{font-size:12px}.project-tabs{flex-wrap:wrap;overflow:visible}.attention-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.forced-mobile .table-wrap{display:none}.forced-mobile .doc-mobile-cards{display:grid}.forced-mobile .task-row .date-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.forced-mobile input,.forced-mobile select,.forced-mobile textarea{font-size:16px}.forced-mobile .button,.forced-mobile .icon-button,.forced-mobile .filter-chip{min-height:44px}.forced-mobile .project-tabs{flex-wrap:wrap}.forced-mobile .task-row .row-label{font-size:11px}
    @media(max-width:767px){body:not(.forced-mobile) .sidebar{display:none}body:not(.forced-mobile) .bottom-nav{display:grid;grid-template-columns:repeat(4,1fr);position:static;background:white;border-top:1px solid var(--line);padding:8px 4px}body:not(.forced-mobile) .table-wrap{display:none}body:not(.forced-mobile) .doc-mobile-cards{display:grid;gap:9px}body:not(.forced-mobile) .button,body:not(.forced-mobile) .icon-button,body:not(.forced-mobile) .filter-chip{min-height:44px}body:not(.forced-mobile) input,body:not(.forced-mobile) select,body:not(.forced-mobile) textarea{font-size:16px}body:not(.forced-mobile) .task-row .date-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.project-tabs{flex-wrap:wrap}.attention-grid{grid-template-columns:1fr}.lab-controls{gap:8px}.lab select{max-width:100%;min-width:0}.topbar{flex-wrap:wrap}.content{padding:20px 16px 28px}.task-row{display:flex;flex-wrap:wrap}.task-main{width:100%}.overview-grid,.detail-layout,.review-grid{grid-template-columns:1fr}}
    .forced-mobile .bottom-nav{position:static}.forced-mobile .content{padding-bottom:28px}
  </style>`);
const intermediateWidthRules = `    /* v1 intermediate-width refinements */
    @media(min-width:768px) and (max-width:1023px){.sidebar{width:126px;padding:16px 8px}.brand{gap:6px;font-size:10px}.brand-mark{width:26px;height:26px}.workspace-label{font-size:9px;padding-left:5px}.nav-item{justify-content:flex-start;padding:9px 6px;font-size:11px;line-height:1.2;gap:6px}.nav-item .nav-icon{width:17px;height:17px;flex:none}.nav-item .visual-icon{width:16px;height:16px}.profile-card{justify-content:flex-start;gap:5px;padding:14px 0 3px}.profile-card .avatar{width:27px;height:27px;font-size:9px}.profile-name,.profile-role{display:block;font-size:9px;line-height:1.25}.task-row,.task-list .task-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px 14px}.task-row>.task-main{flex:1 1 100%;min-width:0}.task-row>.row-meta,.task-row>.date-pair,.task-row>.tag{flex:0 1 auto}.task-row .date-pair{display:flex;flex-wrap:wrap;gap:8px 16px}.task-row .date-pair>span{min-width:92px}.overview-grid,.detail-layout,.review-grid,.file-detail{grid-template-columns:minmax(0,1fr)}.task-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.table-wrap{display:none}.doc-mobile-cards{display:grid;gap:9px}}`;
const intermediateBlock = / {4}\/\* v1 intermediate-width refinements \*\/[\s\S]*?(?=\n {2}<\/style>)/;
if (intermediateBlock.test(prefix)) prefix=prefix.replace(intermediateBlock, intermediateWidthRules);
else prefix=prefix.replace('</style>', `
${intermediateWidthRules}
  </style>`);
await writeFile(file, prefix + replacement + '\n' + html.slice(end));
console.log('Standalone mockup interaction section synchronized.');
