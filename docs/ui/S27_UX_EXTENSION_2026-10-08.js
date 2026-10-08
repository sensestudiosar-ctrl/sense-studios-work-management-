// Additive low-fidelity S27 extension for UX_VALIDATION_LOW_FIDELITY_2026-10-07.html.
/* exported s27Render */
// The host prototype owns render(), navigation, task access and task finalization.
// Insert `else if(current==='assistance'){html=s27Render()}` before the initial render branch.
// This is an in-memory demonstrator; it does not call the API or persist evidence.
const s27State={runs:[],selected:'',form:{kind:'DAILY',projectId:'',taskId:'',purpose:'PRIMARY_OWNER',from:'2026-10-07',to:'2026-10-07',reason:'',broader:false},decisionReason:'',selection:'',outcomeReason:'',state:'ready',notice:'',error:''};
const s27Esc=value=>esc(String(value??''));
function s27Allowed(){return internal()}
function s27TaskRows(){return Object.entries(tasks).filter(([,t])=>taskAccessible(t)&&!t.nonproject)}
function s27ProjectRows(){const ids=new Set(s27TaskRows().map(([,t])=>t.project));return Object.entries(projects).filter(([id])=>ids.has(id))}
function s27RunCurrent(r){if(r.actorId!==people[actor]?.account)return false;if(r.taskIds?.some(id=>!tasks[id]||!taskAccessible(tasks[id])))return false;if(r.projectId&&!s27ProjectRows().some(([id])=>id===r.projectId))return false;return true}
function s27Candidates(task,purpose){
  if(!task)return [];
  // Fixture-only project membership illustration; this does not assert current-Team eligibility.
  // Reviewer independence excludes the owner and collaborators in this sample.
  const names=task.project==='palm'?['Meera Iyer','Rohan Das']:['Ananya Rao','Kabir Shah','Meera Iyer'];
  const excluded=new Set(purpose==='REVIEWER'?[task.ownerEmployeeId,...(task.collaborators||[])]:[]);
  const rows=Object.entries(people).filter(([name,p])=>names.includes(name)&&(purpose!=='REVIEWER'||!excluded.has(p.employee)));
  return rows.sort(([a],[b])=>a.localeCompare(b)).map(([name,p])=>({name,id:p.employee,team:'Sample project member · eligibility unverified'}));
}
function s27DateWindow(){const f=s27State.form;if(!f.from||!f.to)return false;const a=Date.parse(f.from+'T00:00:00Z'),b=Date.parse(f.to+'T00:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)&&b>=a&&b-a<=30*86400000}
function s27FixtureDateIncluded(){return s27State.form.from<='2026-10-07'&&s27State.form.to>='2026-10-07'}
function s27SelectionIsCurrent(run,task,decision){
  if(!task||!decision?.selection)return false;
  const id=decision.selection;
  if(run.purpose==='PRIMARY_OWNER')return task.ownerEmployeeId===id;
  if(run.purpose==='COLLABORATOR')return (task.collaborators||[]).includes(id);
  if(run.purpose==='REVIEWER')return people[String(task.reviewer||'').split(' · ')[0]]?.employee===id;
  return false;
}
function s27Render(){
  if(!s27Allowed())return '<h1>Evidence assistance</h1><section class="box" role="status"><h2>Access unavailable</h2><p>Current internal access could not be confirmed. No retained evidence is shown.</p></section>';
  const f=s27State.form, projectsList=s27ProjectRows(), taskRows=s27TaskRows();
  const capability=['DAILY','ASSIGNMENT'].includes(f.kind)||f.kind==='PROJECT'&&projectsList.length>0||f.kind==='MANAGEMENT'&&owner();
  const selectedRaw=s27State.runs.find(r=>r.id===s27State.selected);
  const accessRevoked=!!selectedRaw&&!s27RunCurrent(selectedRaw);
  const blocked=['loading','error','accesslost'].includes(s27State.state)||accessRevoked;
  const runs=blocked?[]:s27State.runs.filter(s27RunCurrent);
  const selected=runs.find(r=>r.id===s27State.selected);
  const task=selected&&tasks[selected.taskId];
  const candidates=selected?.kind==='ASSIGNMENT'?s27Candidates(task,selected.purpose):[];
  const eligible=candidates.filter(c=>taskAccessible(task)&&(selected.purpose!=='REVIEWER'||c.id!==task.ownerEmployeeId));
  const candidateStale=!!selected&&selected.kind==='ASSIGNMENT'&&JSON.stringify(eligible.map(c=>c.id))!==JSON.stringify(selected.candidateSnapshot||[]);
  const lastDecision=selected?.decisions?.[selected.decisions.length-1];
  const latest=lastDecision&&['ACCEPTED','OVERRIDDEN'].includes(lastDecision.outcome)?lastDecision:null;
  const formOptions=['DAILY','PROJECT','ASSIGNMENT',...(owner()?['MANAGEMENT']:[])];
  let html='<div class="page-heading"><div><h1>Evidence assistance</h1><p>Deterministic evidence assistance · deterministic-evidence-v1 · model none. No live inference or external transmission.</p></div><button data-s27="refresh">Refresh current scope</button></div><details><summary>Demonstration states</summary><div class="actions">'+['ready','loading','empty','error','stale','accesslost'].map(v=>'<button data-s27="state" data-value="'+v+'">Show '+v+'</button>').join('')+'</div></details>'+
    '<details class="box" '+(runs.length?'':'open')+'><summary>Request new bounded evidence</summary><p>Summaries and candidate illustrations are evidence aids. Human decisions do not assign owners or reviewers. Use the ordinary authorized task workflow to finalize an action.</p>'+
    '<form data-s27-form="request"><div class="grid">'+
    '<label>Request type<select name="kind">'+formOptions.map(k=>'<option '+(f.kind===k?'selected':'')+'>'+k+'</option>').join('')+'</select></label>'+
    (f.kind==='PROJECT'?'<label>Accessible project<select name="projectId"><option value="">Choose project</option>'+projectsList.map(([id,p])=>'<option value="'+s27Esc(id)+'" '+(f.projectId===id?'selected':'')+'>'+s27Esc(p.name)+'</option>').join('')+'</select></label>':'')+
    (f.kind==='ASSIGNMENT'?'<label>Exact accessible task<select name="taskId"><option value="">Choose task</option>'+taskRows.map(([id,t])=>'<option value="'+s27Esc(id)+'" '+(f.taskId===id?'selected':'')+'>'+s27Esc(t.title)+' · '+s27Esc(projects[t.project]?.name||'Project unavailable')+'</option>').join('')+'</select></label><label>Purpose<select name="purpose">'+['PRIMARY_OWNER','COLLABORATOR','REVIEWER'].map(p=>'<option '+(f.purpose===p?'selected':'')+'>'+p+'</option>').join('')+'</select></label>':'')+
    '<label>From<input name="from" type="date" value="'+s27Esc(f.from)+'" required></label><label>To<input name="to" type="date" value="'+s27Esc(f.to)+'" required></label><label class="ai-assist-wide">Mandatory reason<textarea name="reason" minlength="3" maxlength="1000" required>'+s27Esc(f.reason)+'</textarea></label></div>'+
    (f.kind==='ASSIGNMENT'&&owner()?'<label><input type="checkbox" name="broader" '+(f.broader?'checked':'')+'> Broader search (fixture does not provide a broader candidate source)</label>':'')+
    '<button class="primary" type="submit" '+(!capability?'disabled':'')+'>Generate evidence summary</button><p class="muted">Ordered window, maximum 31 calendar days. Assignment candidate illustrations use sample project members; current Team eligibility is unavailable and no membership is granted.</p>'+(s27State.error?'<p role="alert">'+s27Esc(s27State.error)+'</p>':'')+'</form></details>'+
    (s27State.state==='loading'?'<p role="status">Loading current access and evidence…</p>':'')+
    (s27State.state==='empty'?'<section class="box"><h2>No evidence</h2><p>No source records match the requested scope. An observed zero is shown only when the source confirms zero; unavailable factors are listed separately.</p><button data-s27="state" data-value="ready">Return to ready state</button></section>':'')+
    (s27State.state==='error'?'<section class="box" role="alert"><h2>Evidence unavailable</h2><p>Could not refresh current evidence. Retained facts are hidden until access is rechecked.</p><button data-s27="refresh">Retry</button></section>':'')+
    ((s27State.state==='accesslost'||accessRevoked)?'<section class="box" role="alert"><h2>Access changed</h2><p>Current source access is unavailable. Retained facts and candidate details are hidden.</p><button data-s27="refresh">Recheck access</button></section>':'')+
    (blocked?'<section class="box"><h2>Saved evidence</h2><p>Retained evidence hidden until current access is rechecked.</p></section>':'<div class="grid"><section class="box"><h2>Saved evidence</h2>'+(!runs.length?'<p>No evidence summaries in this current sample scope.</p>':'<ul>'+runs.map(r=>'<li><button data-s27="open" data-id="'+s27Esc(r.id)+'">'+s27Esc(r.kind)+' · '+s27Esc(r.date)+' · '+s27Esc(r.label)+'</button></li>').join('')+'</ul>')+'</section><section class="box"><h2>Selected evidence</h2>'+(!selected?'<p>Choose a saved item to review evidence currently available in scope.</p>':s27State.state==='stale'||candidateStale?'<p role="alert">Candidate or decision is stale; refresh to create a new evidence run before deciding again.</p>':
    '<p><strong>'+s27Esc(selected.kind)+'</strong> · '+s27Esc(selected.date)+' · '+s27Esc(selected.label)+'</p><p>'+s27Esc(selected.summary)+'</p><p class="muted">Unranked alphabetical fixture display; order is not a recommendation.</p>'+
    '<h3>Evidence sources</h3><ul>'+selected.facts.map(x=>'<li><strong>'+s27Esc(x.label)+'</strong>: '+s27Esc(x.value)+' · canonical source <button data-s27="'+(x.projectId?'project':'task')+'" data-id="'+s27Esc(x.projectId||x.taskId||selected.taskId||'')+'">'+s27Esc(x.link)+'</button> · sample source date '+s27Esc(x.date)+'</li>').join('')+'</ul>'+
    '<h3>Unavailable factors</h3><ul>'+selected.unavailable.map(x=>'<li>'+s27Esc(x)+'</li>').join('')+'</ul>'+
    (selected.kind==='ASSIGNMENT'?'<h3>Candidate illustrations · unranked</h3><p>Sample project membership only; current Team eligibility and assignment eligibility are not verified in this prototype.</p><ul>'+eligible.map(c=>'<li><label><input type="radio" name="s27selection" value="'+s27Esc(c.id)+'" '+(s27State.selection===c.id?'checked':'')+' data-s27-select>'+s27Esc(c.name)+' · '+s27Esc(c.team)+'</label></li>').join('')+'</ul>':'')+
    '<h3>Decision history</h3><ol>'+selected.decisions.map(d=>'<li>'+s27Esc(d.outcome)+' · '+s27Esc(d.reason)+(d.selection?' · selected '+s27Esc(d.selection):'')+(d.outcome==='OBSERVED'?' · task state '+s27Esc(d.sourceState)+' · fixture history '+s27Esc(d.sourceHistory)+' · observed '+s27Esc(d.observedAt)+' (sample only; no persisted receipt)':'')+'</li>').join('')+'</ol>'+
    (candidateStale?'<p role="alert">Candidate evidence is stale. Refresh to create a new evidence run before deciding.</p>':'<label>Decision reason<textarea data-s27-field="decisionReason">'+s27Esc(s27State.decisionReason)+'</textarea></label><div class="actions"><button data-s27="decide" data-outcome="ACCEPTED">Accept</button><button data-s27="decide" data-outcome="REJECTED">Reject</button>'+(selected.kind==='ASSIGNMENT'?'<button data-s27="decide" data-outcome="OVERRIDDEN">Override candidate</button>':'')+'</div><p>Decision is append-only and nonbinding; no domain record changes here.</p>')+
    (latest&&selected.kind==='ASSIGNMENT'&&s27SelectionIsCurrent(selected,task,latest)?'<h3>Later source observation</h3><p>Observation requires the selected person to appear in the actual current assignment fields and a later task history change. It does not establish causation or success.</p><label>Observation reason<textarea data-s27-field="outcomeReason">'+s27Esc(s27State.outcomeReason)+'</textarea></label><button data-s27="outcome">Record sample source observation</button>':'')+
    (selected.kind==='ASSIGNMENT'?'<p><button data-s27="finalize" data-id="'+s27Esc(selected.taskId)+'">Open ordinary task workflow</button> · owner remains unchanged until that workflow records an authorized action.</p>':'') )+'</section></div>');
  return html;
}
// Install once in the host's existing delegated event flow; all controls are namespaced.
document.addEventListener('submit',e=>{
  const form=e.target.closest('form[data-s27-form="request"]');if(!form)return;e.preventDefault();
  const d=new FormData(form),f=s27State.form;
  Object.assign(f,{kind:String(d.get('kind')),projectId:String(d.get('projectId')||''),taskId:String(d.get('taskId')||''),purpose:String(d.get('purpose')||'PRIMARY_OWNER'),from:String(d.get('from')||''),to:String(d.get('to')||''),reason:String(d.get('reason')||'').trim(),broader:d.has('broader')});
  s27State.error='';
  if(f.reason.length<3)s27State.error='Enter a reason of at least 3 characters.';
  else if(!s27DateWindow())s27State.error='Choose an ordered date range of no more than 31 calendar days.';
  else if(!['DAILY','PROJECT','ASSIGNMENT'].includes(f.kind)&&!(f.kind==='MANAGEMENT'&&owner()))s27State.error='This request type is not available for your current scope.';
  else if(f.kind==='PROJECT'&&!s27ProjectRows().some(([id])=>id===f.projectId)||f.kind==='ASSIGNMENT'&&!s27TaskRows().some(([id])=>id===f.taskId))s27State.error='Choose an accessible project or exact task.';
  else if(f.broader&&!owner())s27State.error='Broader search is available to Owner only.';
  if(s27State.error){render();return}
  s27State.state='loading';render();
  setTimeout(()=>{
    const task=tasks[f.taskId],rows=f.kind==='ASSIGNMENT'?s27Candidates(task,f.purpose):[];
    if(f.kind==='ASSIGNMENT'&&(!task||!taskAccessible(task))){s27State.state='accesslost';render();return}
    const id='S27-'+Date.now(),date=f.from+' – '+f.to,hasFixtureDate=s27FixtureDateIncluded();
    let taskRecords=[];
    if(hasFixtureDate&&f.kind==='ASSIGNMENT')taskRecords=[[f.taskId,task]];
    else if(hasFixtureDate&&f.kind==='PROJECT')taskRecords=s27TaskRows().filter(([,t])=>t.project===f.projectId);
    else if(hasFixtureDate&&f.kind==='DAILY')taskRecords=s27TaskRows().filter(([,t])=>owner()||t.ownerEmployeeId===people[actor]?.employee).slice(0,5);
    const facts=f.kind==='PROJECT'&&hasFixtureDate?[{label:'Project',value:projects[f.projectId].name,projectId:f.projectId,link:'Projects / '+f.projectId,date:'2026-10-07 fixture snapshot'}]:taskRecords.map(([tid,t])=>({label:f.kind==='ASSIGNMENT'?'Exact task':'Task',value:t.title+' · '+t.state,taskId:tid,link:'Tasks / '+tid,date:'2026-10-07 fixture snapshot'}));
    s27State.runs.unshift({id,actorId:people[actor]?.account,taskIds:taskRecords.map(([tid])=>tid),kind:f.kind,date,label:f.kind==='ASSIGNMENT'?task.title:f.kind==='PROJECT'?projects[f.projectId].name:'Authorized task evidence',summary:f.kind==='ASSIGNMENT'?'Candidate evidence for this exact task and purpose; the fixture does not verify ordinary assignment eligibility.':'Evidence summary from accessible sample records; no predictive score or hidden context.',taskId:f.taskId,baselineTaskState:task?.state,baselineHistoryLength:task?((histories['task:'+f.taskId]||[]).length):0,purpose:f.purpose,projectId:f.kind==='PROJECT'?f.projectId:'',facts,unavailable:['Skills/productivity prediction: unavailable','Missing source setup/data is unavailable, not zero',...(f.kind==='MANAGEMENT'?['Management evidence source unavailable in this fixture']:[]),...(f.broader?['Broader candidate source unavailable in this fixture; results remain sample project-member illustrations']:[])],candidates:rows,candidateSnapshot:rows.map(c=>c.id),decisions:[]});
    s27State.selected=id;s27State.selection='';s27State.state=facts.length?'ready':'empty';render();
  },0);
});
document.addEventListener('change',e=>{if(e.target.matches('[data-s27-select]')){s27State.selection=e.target.value;return}const form=e.target.closest('form[data-s27-form="request"]');if(!form)return;const d=new FormData(form),f=s27State.form;Object.assign(f,{kind:String(d.get('kind')),projectId:String(d.get('projectId')||''),taskId:String(d.get('taskId')||''),purpose:String(d.get('purpose')||'PRIMARY_OWNER'),from:String(d.get('from')||''),to:String(d.get('to')||''),reason:String(d.get('reason')||'').trim(),broader:d.has('broader')});if(e.target.name==='kind'){f.projectId='';f.taskId='';render()}});
document.addEventListener('input',e=>{if(e.target.dataset.s27Field)s27State[e.target.dataset.s27Field]=e.target.value});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-s27]');if(!b)return;
  const action=b.dataset.s27,run=s27State.runs.find(r=>r.id===s27State.selected);
  if(action==='open'){
    const next=s27State.runs.find(r=>r.id===b.dataset.id);
    if(!next||!s27RunCurrent(next)){s27State.state='accesslost';render();return}
    s27State.selected=b.dataset.id;s27State.state='ready';s27State.selection='';render();return;
  }
  if(action==='state'){s27State.state=b.dataset.value;render();return}
  if(action==='refresh'){
    if(run?.kind==='ASSIGNMENT'){
      const task=tasks[run.taskId];
      if(!task||!taskAccessible(task)){s27State.state='accesslost';render();return}
      const candidates=s27Candidates(task,run.purpose),id='S27-'+Date.now();
      const refreshed={...run,id,label:task.title,summary:'Refreshed candidate evidence for this exact task. Current-Team and ordinary assignment eligibility remain unavailable in this fixture.',facts:[{label:'Exact task',value:task.title+' · '+task.state,taskId:run.taskId,link:'Tasks / '+run.taskId,date:'2026-10-07 fixture snapshot'}],baselineTaskState:task.state,baselineHistoryLength:(histories['task:'+run.taskId]||[]).length,candidates,candidateSnapshot:candidates.map(c=>c.id),decisions:[]};
      s27State.runs.unshift(refreshed);s27State.selected=id;s27State.selection='';
    }
    s27State.state='ready';s27State.error='';s27State.notice='Current sample access rechecked; refreshed evidence is a new in-memory run.';render();return;
  }
  if(action==='project'){const id=b.dataset.id;if(id&&s27ProjectRows().some(([key])=>key===id))openProject(id,'overview');else{s27State.state='accesslost';render()}return}
  if(action==='task'||action==='finalize'){const id=b.dataset.id;if(id&&tasks[id]&&taskAccessible(tasks[id]))openTask(id);else{s27State.state='accesslost';render()}return}
  if(action==='decide'&&run){
    if(['loading','error','accesslost','stale'].includes(s27State.state)||!s27RunCurrent(run)){s27State.state='accesslost';render();return}
    const outcome=b.dataset.outcome,reason=s27State.decisionReason.trim(),task=tasks[run.taskId],candidates=s27Candidates(task,run.purpose),candidate=candidates.find(c=>c.id===s27State.selection);
    if(reason.length<3||outcome!=='REJECTED'&&run.kind==='ASSIGNMENT'&&!candidate)return;
    if(run.kind==='ASSIGNMENT'&&(!task||!taskAccessible(task)||JSON.stringify(candidates.map(c=>c.id))!==JSON.stringify(run.candidateSnapshot||[])||candidate&&!candidates.some(c=>c.id===candidate.id))){s27State.state='stale';render();return}
    run.decisions.push({outcome,reason,selection:outcome==='REJECTED'?'':candidate?.id||''});s27State.decisionReason='';render();return;
  }
  if(action==='outcome'&&run){
    const last=run.decisions[run.decisions.length-1];
    if(['loading','error','accesslost','stale'].includes(s27State.state)||!s27RunCurrent(run)||!last||!['ACCEPTED','OVERRIDDEN'].includes(last.outcome)||!s27State.outcomeReason.trim())return;
    const t=tasks[run.taskId],sourceHistory=(histories['task:'+run.taskId]||[]);
    if(!t||!taskAccessible(t)){s27State.state='accesslost';render();return}
    if(!s27SelectionIsCurrent(run,t,last)){s27State.error='The selected person is not present in the task’s actual current owner, collaborator, or reviewer field. No outcome is available.';render();return}
    if(t.state===run.baselineTaskState||sourceHistory.length<=run.baselineHistoryLength){s27State.error='No later ordinary task action is recorded in this fixture. Record an actual task change through its normal workflow first.';render();return}
    run.decisions.push({outcome:'OBSERVED',reason:s27State.outcomeReason.trim(),selection:'',sourceState:t.state,sourceHistory:sourceHistory[sourceHistory.length-1],observedAt:new Date().toLocaleString()});s27State.outcomeReason='';render();
  }
});
