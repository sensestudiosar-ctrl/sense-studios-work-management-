// Mobile-only worklist ordering for the low-fidelity UX prototype.
// Call after uxMobileShellEnhance(root) and uxMobileWorkflowsEnhance(root); existing handlers remain authoritative.
/* exported uxMobileWorklistsEnhance */
function uxMobileWorklistsEnhance(root){
 if(!root||!window.matchMedia('(max-width: 760px)').matches)return;
 const $=(s,p=root)=>p.querySelector(s), $$=(s,p=root)=>Array.from(p.querySelectorAll(s));
 const makeDetails=(summary,key)=>{const d=document.createElement('details');d.className='ux-mobile-worklist-details';d.dataset.uxMobileKey=key;const s=document.createElement('summary');s.textContent=summary;d.append(s);return d};
 const wrapChoices=(labels)=>{
   const found=labels.map(label=>$('.ux-mobile-control select[aria-label="'+label+'"]')?.closest('.ux-mobile-control')).filter(Boolean);
   if(!found.length)return null;
   const row=document.createElement('div');row.className='ux-mobile-choice-row';
   found.forEach(node=>row.append(node));return row;
 };
 const moveAfter=(node,anchor)=>{if(node&&anchor?.parentNode)anchor.parentNode.insertBefore(node,anchor.nextSibling)};

 if(current==='tasks'){
   root.dataset.uxMobilePage='tasks';
   const heading=$('.page-heading');
   const toolbar=$('.work-toolbar');
   const search=$('#taskDirectorySearch')?.closest('label');
   const choices=wrapChoices(['Task scope','Task view']);
   if(heading&&toolbar){
     if(search){search.classList.add('ux-mobile-work-search');moveAfter(search,heading)}
     if(choices)moveAfter(choices,search||heading);
     const detail=makeDetails('Filters and sorting','tasks-filter-sort');
     const filterToggle=$('[data-task-filter-toggle]');
     const sort=$('#taskSort')?.closest('label');
     const clear=$('[data-clear-task-filters]');
     if(filterToggle)detail.append(filterToggle);
     if(sort)detail.append(sort);
     if(clear)detail.append(clear);
     const secondary=$('#taskSecondaryFilters');
     if(secondary)detail.append(secondary);
     const active=$('.active-filters');
     if(detail.children.length>1){toolbar.after(detail);detail.open=!!taskFiltersOpen;}
     if(active)moveAfter(active,detail);
     toolbar.classList.add('ux-mobile-worklist-toolbar');
   }
 }

 if(current==='mywork'){
   root.dataset.uxMobilePage='mywork';
   const heading=$('.page-heading');
   const toolbar=$('.work-toolbar');
   const search=$('#workSearch')?.closest('label');
   const choices=wrapChoices(['My Work scope','My Work view']);
   if(heading&&toolbar){
     const actorContext=heading.nextElementSibling;
     const scopeNav=$('[aria-label="My Work states"]');
     if(search){search.classList.add('ux-mobile-work-search');moveAfter(search,heading)}
     if(choices)moveAfter(choices,search||heading);
     const detail=makeDetails('Filters and sorting','mywork-filter-sort');
     const sort=$('#workSort')?.closest('label');
     const clear=$('[data-clear-work-filters]');
     if(sort)detail.append(sort);
     if(clear)detail.append(clear);
     const contextLine=$$('p.compact').find(p=>p.textContent.includes('Next / In progress / Review work is identified'));
     const rows=$('#workRows');
     const context=makeDetails('Work context','mywork-context');
     if(actorContext&&actorContext.matches('p.compact'))context.append(actorContext);
     if(contextLine)context.append(contextLine);
     if(rows&&context.children.length>1)rows.after(context);
     if(detail.children.length>1){toolbar.after(detail);}
     toolbar.classList.add('ux-mobile-worklist-toolbar');
     scopeNav?.classList.add('ux-mobile-native-scope');
   }
 }

 if(current==='dashboard'){
   root.dataset.uxMobilePage='dashboard';
   const primary=$('.dashboard-primary');
   const grid=$('.dashboard-grid');
   if(primary&&grid){
     const projectsSection=$('#dash-projects');
     const reviews=$('#dash-reviews');
     const decisions=$('#dash-decisions');
     [projectsSection,reviews,decisions].forEach(section=>{if(section)primary.append(section)});
     primary.classList.add('ux-mobile-dashboard-primary');
     grid.classList.add('ux-mobile-dashboard-secondary');
     const debug=$('.dash-toolbar details');
     const secondary=makeDetails('More dashboard information','dashboard-more');
     if(debug){debug.dataset.uxMobileKey='dashboard-read-model-states';secondary.append(debug)}
     const sourceStatus=document.createElement('div');sourceStatus.className='ux-mobile-dashboard-source-status';sourceStatus.setAttribute('aria-label','Dashboard source status');
     $$('.notice[data-source-state]',grid).forEach(notice=>sourceStatus.append(notice));
     [reviews,decisions].forEach(section=>{
       if(!section)return;
       $$('.notice[data-source-state]',section).forEach(notice=>sourceStatus.append(notice));
       const summary=section.querySelector(':scope > summary');
       const counts=document.createElement('div');counts.className='actions ux-mobile-dashboard-counts';
       $$('[data-dash-route]',section).forEach(button=>counts.append(button));
       section.open=false;
       if(summary&&counts.children.length)section.after(counts);
     });
     secondary.append(...Array.from(grid.children));
     secondary.open=false;
     grid.after(secondary);
     if(sourceStatus.children.length)primary.after(sourceStatus);
     $$('.dashboard-primary > details, .ux-mobile-dashboard-secondary > details, .ux-mobile-worklist-details').forEach((d,i)=>{
       if(!d.dataset.uxMobileKey)d.dataset.uxMobileKey='dashboard-widget-'+(d.id||i);
     });
   }
 }
}
