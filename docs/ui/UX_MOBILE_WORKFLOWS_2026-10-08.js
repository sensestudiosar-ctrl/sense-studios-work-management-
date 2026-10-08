// Mobile-only progressive disclosures for the existing low-fidelity prototype.
// The caller invokes this after render only at <=760px. Existing source buttons remain canonical.
/* exported uxMobileWorkflowsEnhance */
function uxMobileWorkflowsEnhance(root){
 if(!root||!window.matchMedia('(max-width: 760px)').matches)return;
 uxMobileHealth(root);
 uxMobileSavedReports(root);
 uxMobileReview(root);
 uxMobileLabelTables(root);
}

function uxMobileHealth(root){
 const directory=root.querySelector('.ih-health-directory');
 if(!directory||directory.dataset.uxMobileReady)return;
 const list=directory.querySelector('.ih-health-projects');
 if(!list)return;
 const buttons=[...list.querySelectorAll('button[data-ih-health-project]')];
 if(!buttons.length)return;
 // The unselected gallery is the initial directory and must expose every accessible project.
 if(!buttons.some(b=>b.getAttribute('aria-pressed')==='true'))return;
 directory.dataset.uxMobileReady='true';
 const active=buttons.find(b=>b.getAttribute('aria-pressed')==='true');
 const picker=document.createElement('label');picker.className='ux-mobile-picker ux-mobile-control';picker.innerHTML='<span>Selected project</span>';
 const select=document.createElement('select');select.setAttribute('aria-label','Selected accessible project');select.className='ux-mobile-picker-control';
 for(const button of buttons){const option=document.createElement('option');option.value=button.dataset.ihHealthProject;option.textContent=button.querySelector('.ih-health-project-name')?.textContent.trim()||button.textContent.trim();option.selected=button===active;select.append(option)}
 select.addEventListener('change',()=>buttons.find(b=>b.dataset.ihHealthProject===select.value)?.click());picker.append(select);
 const disclosure=document.createElement('details');disclosure.className='ux-mobile-project-directory';disclosure.dataset.uxMobileKey='health-project-directory';
 const summary=document.createElement('summary');summary.textContent=`All accessible projects (${buttons.length})`;disclosure.append(summary);
 const target=document.createElement('div');target.className='ux-mobile-project-options';buttons.forEach(b=>target.append(b));disclosure.append(target);
 list.classList.add('ux-mobile-original');directory.prepend(picker);directory.append(disclosure);
}

function uxMobileSavedReports(root){
 const directory=root.querySelector('.ir-definition-directory');
 if(!directory||directory.dataset.uxMobileReady)return;
 const sourceButtons=[...directory.querySelectorAll('button[data-ir="definition"]')];
 if(!sourceButtons.length)return;
 directory.dataset.uxMobileReady='true';
 const draft=typeof irState!=='undefined'&&!!irState.newDefinition;
 const currentId=draft?'':typeof irState!=='undefined'?irState.selectedDefinition:'';
 const selected=sourceButtons.find(b=>b.dataset.id===currentId)||(currentId?sourceButtons.find(b=>b.classList.contains('selected')):null);
 const picker=document.createElement('label');picker.className='ux-mobile-picker ux-mobile-control';picker.innerHTML='<span>Selected saved definition</span>';
 const select=document.createElement('select');select.className='ux-mobile-picker-control';select.setAttribute('aria-label','Select saved definition');
 if(draft||!selected){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=draft?'New definition draft':'Select a saved definition';placeholder.selected=true;select.append(placeholder)}
 for(const button of sourceButtons){const option=document.createElement('option');option.value=button.dataset.id;option.textContent=button.innerText.replace(/\s+/g,' ').trim();option.selected=!draft&&button===selected;select.append(option)}
 select.addEventListener('change',()=>sourceButtons.find(b=>b.dataset.id===select.value)?.click());picker.append(select);
 const details=document.createElement('details');details.className='ux-mobile-saved-directory';
 details.dataset.uxMobileKey='saved-report-directory';
 const summary=document.createElement('summary');summary.textContent=draft?'Saved report directory · New definition draft':selected?`Saved report directory · ${selected.innerText.replace(/\s+/g,' ').trim()}${typeof irState!=='undefined'&&currentId?` · v${irState.selectedVersion}`:''}`:'Saved report directory · Select a saved definition';details.append(summary);
 const contents=document.createElement('div');contents.className='ux-mobile-saved-options';
 for(const node of [...directory.children]){
   if(node===picker||node===details)continue;
   if(node.matches('button[data-ir="goto-reports"]'))continue;
   contents.append(node);
 }
 details.append(contents);
 const fixedReports=directory.querySelector('button[data-ir="goto-reports"]');
 directory.prepend(picker);directory.append(details);
 if(fixedReports)directory.append(fixedReports);
}

function uxMobileReview(root){
 const identity=root.querySelector('.review-identity'),layout=root.querySelector('.review-layout');
 if(!identity||!layout)return;
 const evidence=layout.querySelector('.review-evidence'),feedback=layout.querySelector('.review-feedback');
 if(!evidence||!feedback)return;
 identity.classList.add('ux-mobile-review-identity');
 evidence.classList.add('ux-mobile-review-evidence');
 feedback.classList.add('ux-mobile-review-feedback');
 layout.classList.add('ux-mobile-review-layout');
 // Keep exact identity, evidence, unresolved feedback, and current action as visible content.
 // Only the already-native History / planning details remain disclosures.
 const action=feedback.querySelector('.current-action');
 if(action)action.classList.add('ux-mobile-current-action');
}

function uxMobileLabelTables(root){
 for(const table of root.querySelectorAll('table')){
   if(table.classList.contains('workforce-matrix'))continue;
   const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s+/g,' ').trim());
   if(!headers.length)continue;
   for(const row of table.querySelectorAll('tbody tr')){
     [...row.children].forEach((cell,index)=>{
       if(cell.matches('th')||cell.hasAttribute('data-label'))return;
       const label=headers[index];if(label)cell.setAttribute('data-label',label);
     });
   }
 }
}
