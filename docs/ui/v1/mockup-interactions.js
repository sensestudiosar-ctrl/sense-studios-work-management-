    let affectedSection = 'whole';
    let previewOpener = null;
    let previewScroll = 0;
    let previewReturn = null;
    function closeTaskPreview() {
      const dialog = $('#taskPreviewDialog');
      if (dialog?.open) { dialog.close(); dialog.replaceChildren(); }
    }
    function openTaskPreview(id, opener) {
      if (!['ready', 'readonly'].includes(state)) return;
      const task = taskData.find(item => item.id === id);
      if (!task) return;
      let dialog = $('#taskPreviewDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'taskPreviewDialog';
        dialog.setAttribute('aria-labelledby', 'taskPreviewTitle');
        document.body.append(dialog);
        dialog.addEventListener('close', () => {
          if (dialog.open) return;
          dialog.replaceChildren();
          if (previewOpener?.isConnected) previewOpener.focus({preventScroll:true});
          window.scrollTo(0, previewScroll);
        });
      }
      previewOpener = opener;
      previewScroll = window.scrollY;
      const extra = task.id === 't4' ? '<div class="notice warn"><strong>Extension requested: 5 Oct 2026 · Pending</strong><p>Committed date remains 1 Oct 2026. Approver: Maya Chen.</p></div>' : task.id === 't3' ? '<div class="notice warn"><strong>Waiting — needs reassignment</strong><p>Eli Brooks remains the recorded current owner until an authorized replacement. Ordinary resume is unavailable.</p></div>' : task.review ? `<div class="notice">${escapeHtml(task.review)} · exact WH-215_R2.pdf · assigned reviewer Noah Patel. Required review gates completion.</div>` : task.correction ? `<div class="notice">${escapeHtml(task.correction)}. Completing this correction does not approve its parent.</div>` : '';
      dialog.innerHTML = `<div class="dialog-head"><div><p class="eyebrow">Read-only task preview · fictional data</p><h2 id="taskPreviewTitle">${escapeHtml(task.title)}</h2></div><button class="icon-button" data-preview-close aria-label="Close task preview">×</button></div><p>${escapeHtml(task.code)} · ${escapeHtml(task.project)}</p><dl class="preview-facts"><dt>Status</dt><dd>${escapeHtml(task.status)}</dd><dt>Priority</dt><dd>${escapeHtml(task.priority)}</dd><dt>Current owner</dt><dd>${escapeHtml(task.owner)}</dd><dt>Target</dt><dd>${escapeHtml(task.target)}</dd><dt>Committed</dt><dd>${escapeHtml(task.committed)}</dd></dl>${extra}<p class="tiny muted">Inspect context here; permitted actions are available in full task detail. This prototype saves nothing.</p><button class="button primary" data-preview-open-full="${task.id}">Open full task</button>`;
      dialog.showModal();
      dialog.querySelector('[data-preview-close]').focus();
    }
    let dateBasis='committed', dateFrom='2026-10-01', dateTo='2026-10-07';
    const identities = { avery: ['Avery Morgan', 'AM', 'Designer'], noah: ['Noah Patel', 'NP', 'Named reviewer'], maya: ['Maya Chen', 'MC', 'Project Lead'] };
    function filteredTasks() {
      const toIso=(value)=>{
        if(!value||value==='Not committed')return null;
        const [day,month,year]=value.split(' ');
        const months={Sep:'09',Oct:'10'};
        return `${year}-${months[month]}-${day.padStart(2,'0')}`;
      };
      return taskData.filter((task)=>task.owner===identities[previewRole][0]).filter((task)=>{
        if(activeFilter==='approaching'){
          const date=toIso(task[dateBasis]);
          return task.status!=='Completed'&&Boolean(date)&&date>=dateFrom&&date<=dateTo;
        }
        if(activeFilter==='waiting')return task.status==='Waiting';
        if(activeFilter==='review')return task.status==='In review'||Boolean(task.correction)&&task.status!=='Completed';
        if(activeFilter==='completed')return task.status==='Completed';
        return !['Completed','Stopped'].includes(task.status);
      }).filter((task)=>!searchText.trim()||`${task.code} ${task.title} ${task.project} ${task.owner}`.toLowerCase().includes(searchText.trim().toLowerCase()));
    }
    function shellHead() {
      $('#breadcrumb').textContent=screen==='work' ? 'Workspace / My Work' : globalDocs ? 'Workspace / Documents' : `Projects / Willow House / ${currentScreenLabel()}`;
      document.querySelectorAll('.nav-item,.bottom-nav button').forEach((button)=>{
        const current=screen==='work' ? button.dataset.go==='work' : globalDocs ? button.dataset.go==='global-docs' : button.dataset.go==='projects';
        if(current) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      });
    }
    function taskDetail() {
      const task=taskData.find((item)=>item.id===selectedTaskId) || taskData[0];
      const correction=['t2','t5'].includes(task.id);
      const completed=task.status==='Completed';
      const manager=previewRole==='maya';
      const canWork=previewRole==='avery' && task.owner==='Avery Morgan' && !completed && task.status!=='In review';
      const parent=task.id==='t2' ? 't1' : 't4';
      const description={t1:'Align reception lighting with the joinery. The revised drawing is submitted to an independent reviewer.',t2:'Complete the correction requested in Round 1. The retained work contributed to the separate revised submission.',t3:'Work is waiting for an eligible replacement owner after employee exit. Previous ownership remains in history.',t4:'Confirm the wardrobe dimensions. An extension request is pending; the committed date remains unchanged.',t5:'Address the stair lighting detail correction. The task remains linked to the source task and retained review evidence.',t6:'Completed schedule work remains available as history.'}[task.id];
      const workAction=task.id==='t1' ? '<button class="button primary" data-go="review">View current review</button>' : task.id==='t3' ? `<button class="button primary" data-action="confirm:reassign" ${manager?'':'disabled'}>Reassign owner</button>` : canWork ? '<button class="button" data-action="confirm:wait">Wait with reason</button>' : '';
      const stateStrip=`<div class="task-state-strip" aria-label="Current task state"><div class="state-step">${icon(task.status==='Waiting'?'waiting':task.status==='In review'?'review':task.status==='Completed'?'completed':'inprogress')}<span><strong>Current state</strong>${task.status}</span></div>${task.id==='t1'?'<div class="state-step"><span>Review evidence<br><strong>Current round</strong><br>Round 2 · WH-215_R2.pdf</span></div>':''}${correction?'<div class="state-step"><span>Correction relationship<br><strong>Parent task</strong><br>'+task.correction+'</span></div>':''}${task.id==='t3'?'<div class="state-step"><span><strong>Recorded cause</strong><br>Employee exit · reassignment required</span></div>':''}</div>`;
      const dateGraphic=`<div class="task-date-graphic" aria-label="Task dates"><div class="task-date-card"><span class="row-label">Target</span><strong>${icon('target')}${task.target}</strong></div><div class="task-date-card"><span class="row-label">Committed</span><strong>${icon('calendar')}${task.committed}</strong></div>${task.id==='t4'?'<div class="task-date-card"><span class="row-label">Extension requested · Pending</span><strong class="date-proposed">'+icon('extension')+'5 Oct 2026</strong><small>Committed date remains 1 Oct 2026.</small></div>':''}</div>`;
      const files=task.id==='t1' ? '<p>WH-215_R2.pdf · exact revised submission · Round 2</p><button class="text-link" data-go="review">Open submission evidence →</button>' : task.id==='t2' ? '<p>Correction evidence retained with WH-215 Round 1.</p><button class="text-link" data-go="review">Open retained correction round →</button>' : '<p class="muted">No attached file in this sample record.</p>';
      const events=task.id==='t1' ? '<strong>Round 2 submitted · exact R2</strong><small>1 Oct 2026 · Avery Morgan · Reason: downlight coordination corrected.</small>' : task.id==='t2' ? '<strong>Correction completed</strong><small>1 Oct 2026 · Avery Morgan · Reason: required downlight changes completed.</small>' : task.id==='t3' ? '<strong>Waiting — needs reassignment</strong><small>1 Oct 2026 · Employee exit operation · Former owner: Eli Brooks</small>' : task.id==='t4' ? '<strong>Extension requested: 1 Oct → 5 Oct</strong><small>30 Sep 2026 · Avery Morgan · Reason: awaiting consultant dimensions. Approver: Maya Chen. Pending.</small>' : '<strong>Task assigned</strong><small>24 Sep 2026 · Maya Chen · Reason: delivery coordination.</small>';
      return `<div class="page-head"><div><p class="eyebrow"><button class="text-link" data-go="tasks">Willow House · Tasks</button> / ${task.code}</p><h1>${task.title}</h1><p class="lede">${description}</p></div><div class="actions">${workAction}</div></div><div class="detail-layout"><section class="panel panel-pad"><div class="actions">${tag(task.status,task.status==='Waiting'?'amber':'green')}${tag(task.priority+' priority','gray')}${correction?tag('Correction task','amber'):''}</div>${stateStrip}${dateGraphic}<div class="task-summary"><div class="summary-cell">Primary owner<b>${task.owner}</b></div><div class="summary-cell">Project Lead<b>Maya Chen</b></div><div class="summary-cell">Target date<b>${task.target}</b></div><div class="summary-cell">Committed due date<b>${task.committed}</b></div></div><hr class="divider"><h2 class="panel-title">Work checklist</h2><div class="checklist"><label class="check"><input type="checkbox" ${completed?'checked':''} ${canWork?'':'disabled'} data-local-check> ${correction?'Complete the required drawing correction':'Confirm source information'}</label><label class="check"><input type="checkbox" ${completed?'checked':''} ${canWork?'':'disabled'} data-local-check> ${correction?'Retain evidence for the parent submission':'Check coordination and record evidence'}</label></div><hr class="divider"><h2 class="panel-title">Files and evidence</h2>${files}<hr class="divider"><h2 class="panel-title">Activity history</h2><div class="history-entry">${events}</div><div class="history-entry"><strong>Committed date: ${task.committed}</strong><small>24 Sep 2026 · Maya Chen · Reason: agreed delivery coordination.</small></div></section><aside class="panel panel-pad"><h2 class="panel-title">Connected work</h2>${correction?`<p>${task.correction}</p><button class="text-link" data-task="${parent}">Open parent task →</button><p class="tiny muted">Completing a correction does not approve its parent submission.</p>`:task.id==='t1'?'<p>Round 2 · exact WH-215_R2.pdf</p><p><strong>Noah Patel</strong> · independent named reviewer</p><p class="tiny muted">Required review still gates completion.</p>':task.id==='t3'?'<div class="notice warn">Employee-exit waiting requires a manager to choose an eligible replacement. Ordinary resume is unavailable.</div>':task.id==='t4'?'<div class="notice warn"><strong>Extension pending</strong><p>Requested: 5 Oct 2026<br>Current committed: 1 Oct 2026<br>Approver: Maya Chen</p></div>':'<p class="muted">No pending review for this sample record.</p>'}${task.id==='t4'?`<button class="button" data-action="confirm:extension" ${manager?'':'disabled'}>Review extension decision</button>`:''}<hr class="divider"><h3 class="panel-title">Dependencies</h3><p class="tiny muted">${task.id==='t4'?'None recorded.':'No predecessor details in this sample record.'}</p>${canWork?'<button class="button" data-action="confirm:edit">Edit task details</button>':''}</aside></div>`;
    }
    function applyViewState() {
      if (state === 'ready' || state === 'readonly') return;
      const block = (label, taskSection = false) => state === 'loading'
        ? `<section class="panel panel-pad" aria-busy="true" aria-label="Loading ${label}"><h2 class="panel-title">${label}</h2><div class="skeleton"></div><div class="skeleton"></div><p class="tiny muted" role="status">Loading ${label.toLowerCase()}…</p></section>`
        : state === 'error'
          ? `<section class="panel panel-pad" role="alert"><h2 class="panel-title">${label} could not load</h2><p class="muted">Try again. Your saved work is unchanged.</p><button class="button" data-action="retry">Retry section</button></section>`
          : `<section class="panel panel-pad"><h2 class="panel-title">${label}</h2><p class="muted">${taskSection ? 'No tasks assigned to you yet.' : label === 'Needs your attention' ? 'You’re up to date.' : 'No records yet.'}</p>${taskSection ? '<button class="button" data-action="confirm:new-task">Create self-task</button>' : ''}</section>`;
      if (screen === 'work') {
        const attentionSection = content.querySelector('#attentionSection');
        const taskSection = content.querySelector('[aria-labelledby="tasksTitle"]');
        if (affectedSection !== 'tasks' && attentionSection) attentionSection.outerHTML = block('Needs your attention');
        if (affectedSection !== 'attention' && taskSection) taskSection.outerHTML = block('Your tasks', true);
      } else {
        const project = ['overview', 'tasks', 'reviews', 'documents'].includes(screen) && !globalDocs;
        content.innerHTML = (project ? projectHeader() : `<div class="page-head"><h1>${currentScreenLabel()}</h1></div>`) + block(currentScreenLabel());
      }
    }
    function render() {
      closeTaskPreview();
      shellHead();
      content.innerHTML = ({work, overview, tasks:projectTasks, reviews, documents, task:taskDetail, review:reviewDetail}[screen] || work)();
      applyDensity();
      applyViewState();
      if (screen === 'task' && previewReturn && ['ready', 'readonly'].includes(state)) {
        content.insertAdjacentHTML('afterbegin', '<button class="text-link preview-return" data-preview-return>← Back to source list</button>');
      }
      if (screen === 'work' && ['ready', 'readonly'].includes(state) && content.querySelector('.filter-bar')) {
        content.querySelector('.filter-bar').insertAdjacentHTML('beforebegin', `<details class="work-display" data-work-display><summary>Display options · ${density === 'compact' ? 'Compact' : 'Comfortable'}</summary><div class="actions" role="group" aria-label="Task density"><button class="button small" data-density="comfortable" aria-pressed="${density === 'comfortable'}">Comfortable</button><button class="button small" data-density="compact" aria-pressed="${density === 'compact'}">Compact</button></div><p class="tiny muted">Presentation only. Status, owner and both date labels remain visible.</p></details>`);
      }
      if (screen === 'work' && ['ready','readonly'].includes(state) && previewRole !== 'avery') {
        const ownRows = content.querySelector('#workRows');
        if (ownRows) ownRows.innerHTML = '<div class="panel panel-pad muted">No personal tasks assigned. Your authorized attention items are shown above.</div>';
      }
      if (state === 'readonly') {
        content.insertAdjacentHTML('afterbegin', '<div class="notice warn" role="status" style="margin-bottom:20px"><strong>Read-only</strong> · You can view permitted records. Changes and decisions are unavailable.</div>');
      }
      if(screen==='work' && content.querySelector('#workRows') && activeFilter==='approaching') {
        const filter=content.querySelector('.filter-bar');
        filter.insertAdjacentHTML('afterend',`<div class="filter-bar" id="dateRangeControls"><label>Date basis <select id="dateBasis" class="search"><option value="committed" ${dateBasis==='committed'?'selected':''}>Committed due</option><option value="target" ${dateBasis==='target'?'selected':''}>Target</option></select></label><label>From <input id="dateFrom" class="search" type="date" value="${dateFrom}"></label><label>Through <input id="dateTo" class="search" type="date" value="${dateTo}"></label></div>`);
        content.querySelector('[data-filter="approaching"]').textContent='Approaching';
        const context=content.querySelector('section[aria-labelledby="tasksTitle"] .section-head .tiny');
        if(context)context.textContent=`${dateBasis==='committed'?'Committed due':'Target'} · ${dateFrom}–${dateTo}`;
      }
      if(screen==='review') {
        content.querySelector('.page-head').insertAdjacentHTML('afterend','<p class="notice"><a href="http://127.0.0.1:4180/review-canvas.html">Open conversational review canvas →</a> · New fictional layout for review; no decisions are saved.</p>');
        const context=content.querySelector('.review-grid aside .tiny.muted');
        if(context)context.textContent=`Viewing as ${identities[previewRole][0]} · Assigned reviewer: Noah Patel`;
      }
      content.querySelectorAll('button[data-action^="decision:"],button[data-action^="review:"]').forEach((button) => {
        button.disabled = state !== 'ready' || previewRole !== 'noah';
        button.setAttribute('aria-disabled', String(button.disabled));
      });
      if (state === 'readonly' || state === 'loading' || state === 'error') {
        content.querySelectorAll('button[data-action^="confirm:"],input[type="checkbox"]').forEach((element) => { element.disabled = true; });
      }
      content.querySelectorAll('.project-tab[data-go]').forEach((button) => {
        if (button.dataset.go === screen) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      const [name, initials, role] = identities[previewRole];
      $('.profile-name').textContent = name;
      $('.profile-role').textContent = `${role} · North Branch`;
      $('.profile-card .avatar').textContent = initials;
      $('#profileButton').textContent = initials;
      $('#profileMenu button').textContent=name+' · Profile';
      $('#profileMenu button').dataset.message=name+' · '+role;
      $('#profileMenu').hidden = true;
      $('#profileButton').setAttribute('aria-expanded', 'false');
      document.title = `${currentScreenLabel()} · Sense Studios UI mockup`;
    }
    function showToast(message) {
      const toast = $('#toast');
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => { toast.hidden = true; }, 4500);
    }
    function confirmAction(action) {
      const labels = { 'new-task':'Create self-task', edit:'Edit task', attach:'Attach file', change:'Request task change', comment:'Add review comment', upload:'Upload document', reassign:'Reassign with eligible owner and reason', extension:'Review extension evidence and record a reasoned decision', wait:'Record waiting reason and delay cause' };
      showToast(`${labels[action] || 'Action'}: design preview only; no record is saved.`);
    }
    function openDecision(kind) {
      if (state !== 'ready' || previewRole !== 'noah') return;
      $('#decisionType').value = kind === 'approve' ? 'Approved' : 'Corrections required';
      $('#reason').value = '';
      $('#reason').required = true;
      $('#reason').minLength = 3;
      updateDecisionFields();
      $('#decisionDialog').showModal();
      $('#reason').focus();
    }
    function updateDecisionFields() {
      const correction = $('#decisionType').value === 'Corrections required';
      for (const id of ['category', 'severity']) {
        $('#'+id).hidden = !correction;
        document.querySelector(`label[for="${id}"]`).hidden = !correction;
        $('#'+id).required = correction;
      }
      $('#reason').placeholder = correction ? 'Describe the required correction' : 'Record the reason for this decision';
    }
    $('#screenSelect').addEventListener('change', (event) => { screen=event.target.value; globalDocs=false; render(); });
    $('#stateSelect').addEventListener('change', (event) => { state=event.target.value; render(); });
    $('#roleSelect').addEventListener('change', (event) => { previewReturn=null; previewRole=event.target.value; render(); });
    $('#sectionSelect').addEventListener('change', (event) => { affectedSection=event.target.value; render(); });
    $('#widthSelect').addEventListener('change', (event) => {
      closeTaskPreview();
      body.classList.toggle('forced-mobile', event.target.value === 'mobile');
      preview.classList.toggle('desktop-width', event.target.value === 'desktop');
      preview.style.width = '';
    });
    $('#decisionType').addEventListener('change', updateDecisionFields);
    $('#decisionForm').addEventListener('submit', (event) => {
      if (event.submitter?.value === 'cancel') return;
      event.preventDefault();
      if (!event.target.reportValidity()) return;
      $('#decisionDialog').close();
      showToast('Decision preview complete. Nothing was saved or approved.');
    });
    $('#decisionForm').querySelectorAll('[value="cancel"]').forEach((button) => { button.formNoValidate=true; });
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.previewTask) { openTaskPreview(button.dataset.previewTask, button); return; }
      if (button.hasAttribute('data-preview-close')) { closeTaskPreview(); return; }
      if (button.dataset.previewOpenFull) { const id=button.dataset.previewOpenFull; previewReturn={screen,scroll:previewScroll}; closeTaskPreview(); selectedTaskId=id; go('task'); return; }
      if (button.hasAttribute('data-preview-return')) { const source=previewReturn; previewReturn=null; if(source) { go(source.screen); window.scrollTo(0,source.scroll); } return; }
      if (button.id==='mobileMore') {
        let dialog=$('#moreDialog');
        if(!dialog) {
          dialog=document.createElement('dialog');dialog.id='moreDialog';dialog.setAttribute('aria-label','More navigation');
          dialog.innerHTML='<div class="dialog-head"><h2>More</h2><button class="icon-button" data-close-more aria-label="Close More">×</button></div><nav class="nav-list" aria-label="More destinations">'+$('#moreMenu').innerHTML+'</nav>';
          document.body.append(dialog);
        }
        dialog.showModal();return;
      }
      if(button.hasAttribute('data-close-more')) { $('#moreDialog').close();return; }
      if(button.closest('#moreDialog')) $('#moreDialog').close();
      if (button.dataset.go) { go(button.dataset.go); return; }
      if (button.dataset.openReview) { selectedTaskId='t1'; go('review'); return; }
      if (button.dataset.task) { selectedTaskId=button.dataset.task; go('task'); return; }
      if (button.dataset.filter) { activeFilter=button.dataset.filter; render(); return; }
      if (button.dataset.projectfilter) { projectTaskFilter=button.dataset.projectfilter; render(); return; }
      if (button.dataset.density) { density=button.dataset.density; render(); return; }
      if (button.dataset.taskview) { taskView=button.dataset.taskview; render(); return; }
      if (button.id === 'profileButton') {
        $('#profileMenu').hidden=!$('#profileMenu').hidden;
        button.setAttribute('aria-expanded', String(!$('#profileMenu').hidden));
        return;
      }
      if (button.dataset.message) { showToast(button.dataset.message); return; }
      if (button.dataset.menu) { showToast('Other destinations will be designed in the next UI review.'); return; }
      const action = button.dataset.action;
      if (!action) return;
      if (action === 'reset') { activeFilter='active'; searchText=''; render(); }
      else if (action === 'reset-project-tasks') { projectTaskFilter='all'; projectTaskSearch=''; if (screen==='work') { activeFilter='active'; searchText=''; } render(); }
      else if (action === 'reset-docs') { docSearch=''; docStatus='all'; render(); }
      else if (action === 'retry') { state='ready'; $('#stateSelect').value='ready'; render(); }
      else if (action.startsWith('go:')) go(action.slice(3));
      else if (action.startsWith('menu:')) showToast('Project and task management forms will follow the existing permissioned actions. This preview saves nothing.');
      else if (action.startsWith('review:') || action.startsWith('decision:')) openDecision(action.split(':')[1]);
      else if (action.startsWith('confirm:')) { if (state !== 'readonly') confirmAction(action.slice(8)); }
      else if (action.startsWith('file:')) {
        if (action==='file:review') go('review');
        else {
          const record = button.closest('tr,.doc-card,.revision-item');
          const code = button.dataset.fileCode || record?.dataset.fileCode || '';
          const revision = button.dataset.fileRevision || record?.dataset.fileRevision || record?.querySelector('.doc-version')?.textContent || record?.querySelector('.doc-card-meta strong')?.textContent || '';
          const stateLabel = button.dataset.fileState || record?.dataset.fileState || record?.querySelector('.tag')?.textContent || '';
          const name = record?.querySelector('.doc-name')?.textContent || record?.querySelector('strong')?.textContent || 'Exact permitted file';
          showToast(`${code ? `${code} · ` : ''}${name} · exact ${revision}${stateLabel ? ` · ${stateLabel}` : ''}. File-viewer design preview; no file is downloaded.`);
        }
      }
    });
    document.addEventListener('click', (event) => {
      const selector = event.target.closest('[data-round-select]');
      if (!selector) return;
      const selected = selector.dataset.roundSelect;
      const historicalSummary = content.querySelector('.historical-round-summary');
      if (historicalSummary) historicalSummary.hidden = selected !== 'R1';
    });
    document.addEventListener('input', (event) => {
      const input = event.target;
      if (input.id==='taskSearch') {
        searchText=input.value;
        const rows=$('#workRows');
        if (rows) rows.innerHTML=previewRole==='avery' ? taskRows(filteredTasks()) : '<div class="panel panel-pad muted">No personal tasks assigned.</div>';
      } else if (input.id==='projectTaskSearch') {
        projectTaskSearch=input.value;
        const rows=$('#projectTaskRows');
        if (rows) { rows.innerHTML=taskRows(projectTaskRows()); applyDensity(); }
        else renderKeepingInput(input);
      } else if (input.hasAttribute('data-docsearch')) { docSearch=input.value; renderKeepingInput(input); }
    });
    function renderKeepingInput(input) {
      const selector=input.hasAttribute('data-docsearch') ? '[data-docsearch]' : '#projectTaskSearch';
      const position=input.selectionStart;
      render();
      const replacement=$(selector);
      replacement?.focus();
      if (position!==null) replacement?.setSelectionRange(position,position);
    }
    document.addEventListener('change', (event) => {
      if(['dateBasis','dateFrom','dateTo'].includes(event.target.id)){
        if(event.target.id==='dateBasis')dateBasis=event.target.value;
        if(event.target.id==='dateFrom')dateFrom=event.target.value;
        if(event.target.id==='dateTo')dateTo=event.target.value;
        render();
        if(dateFrom>dateTo){const rows=$('#workRows');if(rows)rows.innerHTML='<p role="alert">Choose a start date on or before the end date.</p>';}
      }
      if (event.target.hasAttribute('data-docstatus')) { docStatus=event.target.value; render(); }
      if (event.target.hasAttribute('data-local-check')) showToast('Checklist change shown locally only; no record is saved.');
    });
    document.addEventListener('keydown', (event) => {
      if (event.key==='Escape' && !$('#profileMenu').hidden) { $('#profileMenu').hidden=true; $('#profileButton').focus(); $('#profileButton').setAttribute('aria-expanded','false'); }
    });
    render();
