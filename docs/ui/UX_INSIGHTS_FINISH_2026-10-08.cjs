// Completes bounded prototype drafts after delegated work stopped. No production files.
const fs=require('node:fs'),path=require('node:path');
const file=n=>path.join(__dirname,n);
let r=fs.readFileSync(file('UX_INSIGHTS_REPORTS_SAVED_2026-10-08.js'),'utf8');
r=r.replace("chart:'text counts'","chart:'none'").replaceAll('decisions.find(', 'decisionRecords.find(').replaceAll('decisions.some(', 'decisionRecords.some(');
r=r.replace("for(const [id,t] of Object.entries(tasks))add", "for(const [id,t] of Object.entries(tasks).filter(([,t])=>!t.nonproject&&projects[t.project]))add");
r=r.replace("function irCanSee(row){", "function irCanSee(row){if(!internal()||!irAccess)return false;");
r=r.replace("if(row.kind==='task')", "if(row.kind==='employee'&&!irEmployeeVisible(row.employee))return false;if(row.kind==='task')");
r=r.replace("return irManager()?irDefinitions.filter(d=>d.creator===actor):[]", "return irManager()?irDefinitions.filter(d=>irOwner()||d.creator===actor):[]");
r=r.replace("r=>r.creator===actor", "r=>irOwner()||r.creator===actor").replaceAll("r=>r.id===s.selectedRun&&r.creator===actor", "r=>r.id===s.selectedRun&&(irOwner()||r.creator===actor)").replaceAll("x=>x.id===state.selectedRun&&x.creator===actor", "x=>x.id===state.selectedRun&&(irOwner()||x.creator===actor)");
// Remove superseded click handler; the canonical handler below owns every command.
let a=r.indexOf("document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.irOpen)");
let z=r.indexOf("document.addEventListener('input'",a);if(a>=0&&z>a)r=r.slice(0,a)+r.slice(z);
r=r.replace("if(t.dataset.ir==='search'){irState.search=t.value;render();return}","if(t.dataset.ir==='search'){irState.search=t.value;const caret=t.selectionStart;render();const input=document.querySelector('[data-ir=search]');if(input){input.focus();input.setSelectionRange(caret,caret)}return}");
r=r.replace("function insightsReportsRender(){", "function insightsReportsRender(){if(!internal()||!irAccess)return irDenied();");
r=r.replace("function insightsSavedReportsRender(){", "function insightsSavedReportsRender(){if(!internal()||!irAccess)return irDenied();");
r=r.replaceAll('<header class="page-heading">','<button data-ir="access">Simulate source access loss</button><header class="page-heading">');
r=r.replace("function irHandleAction(action,b){", "function irHandleAction(action,b){if(!internal()||!irAccess)return true;");
r=r.replace("if(action==='version'){state.selectedVersion", "if(action==='version'){if(b.dataset.id&&irVisibleDefinitions().some(d=>d.id===b.dataset.id))state.selectedDefinition=b.dataset.id;state.selectedVersion");
r=r.replace('data-ir="version" data-version="${v.version}"','data-ir="version" data-id="${irEsc(def.id)}" data-version="${v.version}"');
r=r.replace("if(action==='save-run'){if(!def||!irManager())return true;const all=irSafeRows(state.form.source,state.form.from,state.form.to);const visible=irApplyFilters(all,state.form.filters);", "if(action==='save-run'){if(!def||!irManager())return true;const version=irCurrentVersion(def);if(!version||!irRangeValid(version.from,version.to))return true;const all=irSafeRows(version.source,version.from,version.to);const visible=irApplyFilters(all,version.filters);");
r=r.replace('config:JSON.parse(JSON.stringify({...state.form}))','config:JSON.parse(JSON.stringify(version))');
r=r.replace("else if(state.category&&!irSafeRows(state.category,state.from,state.to).every(irCanSee))", "else if(!(current==='savedReports'?irSavedRows():irSafeRows(state.category,state.from,state.to)).length)");
r=r.replace('CURRENT PREVIEW · NOT A RETAINED RUN','CURRENT DRAFT PREVIEW · NOT A RETAINED RUN').replace('Generate retained run</button>','Generate run from saved version</button>');
r=r.replace('<p>Chart counts are report rows; charts require a group.', '<p>NONE requires no group. BAR/PIE require a group. Chart counts are report rows; charts require a group.');
r+=`\nfunction irDenied(){return '<h1>Insights source access unavailable</h1><p>Current preview, definitions, retained manifests and actions are concealed.</p><button data-ir="access">Recheck sample access</button>'}
document.addEventListener('toggle',e=>{if(e.target.closest('.ir-config'))irState.manageOpen=e.target.open},true);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-ir],[data-ir-open],[data-feature-action="reports"],[data-feature-action="savedReports"]');if(!b)return;
 if(b.dataset.ir==='access'){irAccess=!irAccess;irState.notice='';render();return}
 if(!internal()||!irAccess)return;
 if(b.dataset.featureAction){e.preventDefault();e.stopImmediatePropagation();const label=b.dataset.actionLabel||'';
 if(b.dataset.featureAction==='reports'&&label.includes('columns'))go('savedReports');
 else if(label.includes('automation'))go('automation');
 else{irState.manageOpen=true;irState.notice=label+': use the scoped controls in this workspace. Export outcomes are simulated.';render()}return;}
 if(b.dataset.irOpen){const id=b.dataset.id,pid=b.dataset.project;
 if(b.dataset.irOpen==='task'&&tasks[id]&&taskAccessible(tasks[id]))openTask(id);
 if(b.dataset.irOpen==='project'&&sampleProjectAccess(pid))openProject(pid,'documents');
 if(b.dataset.irOpen==='review'&&sampleProjectAccess(pid))openReview(pid);
 if(b.dataset.irOpen==='time'){const row=timeEntries.find(x=>x.id===id);if(row&&irSourcePersonVisible(row.person)){go('time');selectedTimeEntry=id;render()}}
 if(b.dataset.irOpen==='attendance'){const row=attendancePunches.find(x=>x.id===id);if(row&&irAttendanceVisible(row)){go('attendance');attendancePunchId=id;render()}}
 if(b.dataset.irOpen==='decision')openExactDecision(id);return;}
 if(b.dataset.ir)irHandleAction(b.dataset.ir,b);
},true);
`;
fs.writeFileSync(file('UX_INSIGHTS_REPORTS_SAVED_2026-10-08.js'),r);
let p=fs.readFileSync(file('UX_INSIGHTS_PERFORMANCE_HEALTH_2026-10-08.js'),'utf8');
p=p.replace("{metric:'First-pass correction-free',source:'kitchen',sourceLabel:'A-201 R1',sourceKind:'REVIEW_ROUND',fact:'Exact Cedar review round 1 is represented in the fixture; Ananya is not the task owner.',raw:null,unit:'ratio unavailable'},", "{metric:'First-pass review',source:'rcp',sourceLabel:'RCP-103 exact review',sourceKind:'REVIEW_ROUND',fact:'Azure review is pending; complete eligible first-pass history is unavailable.',raw:null,unit:'ratio unavailable'},\n{metric:'Correction-free review',source:'rcp',sourceLabel:'RCP-103 exact review',sourceKind:'REVIEW_ROUND',fact:'Complete correction-round evidence for Ananya is unavailable; no correction-free rate is inferred.',raw:null,unit:'ratio unavailable'},");
p=p.replaceAll('first-pass correction-free','first-pass review, correction-free review').replace("['first_pass','First-pass correction-free']", "['first_pass','First-pass review'],['correction_free','Correction-free review']");
p=p.replace("s=>people.includes(s.person)&&", "s=>s.person===insightsState.person&&people.includes(s.person)&&").replace("c=>people.includes(c.person)&&", "c=>c.person===insightsState.person&&people.includes(c.person)&&");
p=p.replace("if(tasks[id]&&tasks[id].project===insightsState.project&&taskAccessible(tasks[id]))", "if(tasks[id]&&taskAccessible(tasks[id]))");
p=p.replace("const people=ihPeople();", "if(!ihInternal())return ihShell('Performance','', '');const people=ihPeople();");
p=p.replace("const rows=ihProjects();", "if(!ihInternal())return ihShell('Project Health','', '');const rows=ihProjects();");
p=p.replaceAll('<tr><td>${ihEsc(label)}</td><td>${ihEsc(item.text)}</td><td>', '<tr><td data-label="Component">${ihEsc(label)}</td><td data-label="Observed fact">${ihEsc(item.text)}</td><td data-label="Exact source">');
p=p.replace("'<button data-decision=\"CP-03\">CP-03</button>'", "'<button data-package=\"CP-03\">CP-03 exact client package</button>'");
p=p.replaceAll("name=\"date\" type=\"date\" min=\"${cycle.from}\" max=\"${cycle.to}\"", "name=\"date\" type=\"date\"");
p+=`\nfunction insightsCaptureState(){const keys=['performanceTab','healthTab','person','period','family','cycleId','project','healthPeriod','healthEmployee'];return Object.fromEntries(keys.map(k=>[k,insightsState[k]]))}
function insightsApplyState(frame){if(frame)Object.assign(insightsState,frame)}\n`;
fs.writeFileSync(file('UX_INSIGHTS_PERFORMANCE_HEALTH_2026-10-08.js'),p);
