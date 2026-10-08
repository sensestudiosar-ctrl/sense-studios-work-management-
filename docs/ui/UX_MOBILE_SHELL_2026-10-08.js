// Mobile-only shell enhancement for the low-fidelity UX prototype.
// Invoke as uxMobileShellEnhance(document.querySelector('#content')) after render.
// Existing desktop controls and canonical click/change handlers remain authoritative.
/* exported uxMobileShellEnhance */
function uxMobileShellEnhance(root){
 if(!root||!window.matchMedia('(max-width: 760px)').matches)return;
 const $=(s,p=root)=>p.querySelector(s), $$=(s,p=root)=>Array.from(p.querySelectorAll(s));
 $$('.ux-mobile-control').forEach(x=>x.remove());
 $$('.ux-mobile-hidden').forEach(x=>x.classList.remove('ux-mobile-hidden'));
 const selectControl=(label,items,value,onChange)=>{
   const wrap=document.createElement('label');wrap.className='ux-mobile-control';wrap.append(document.createTextNode(label+' '));
   const select=document.createElement('select');select.setAttribute('aria-label',label);
   for(const item of items){const option=document.createElement('option');option.value=item.value;option.textContent=item.label;option.selected=item.value===value;select.append(option)}
   select.addEventListener('change',()=>onChange(select.value));wrap.append(select);return wrap;
 };
 const insertAfter=(target,node)=>target?.parentNode?.insertBefore(node,target.nextSibling);
 const buttonFor=(selector,attr,value)=>$$(selector).find(x=>x.getAttribute(attr)===value);
 const group=(name,selector,attr,active)=>{
   const buttons=$$(selector);if(!buttons.length)return;
   const selected=buttons.find(b=>b.getAttribute(attr)===active)||buttons.find(b=>b.getAttribute('aria-pressed')==='true'||b.getAttribute('aria-current')==='page');
   const target=selected||buttons[0];
   const items=buttons.map(b=>({value:b.getAttribute(attr),label:b.textContent.trim()}));
   const parent=target.closest('nav,.actions')||target.parentElement;
   insertAfter(parent,selectControl(name,items,target.getAttribute(attr),v=>buttonFor(selector,attr,v)?.click()));
   buttons.forEach(b=>b.classList.add('ux-mobile-hidden'));
 };
 const pageTitle=$('h1')?.textContent.trim()||'';
 if(pageTitle==='More'){
   const workSection=$$('section.box').find(s=>s.querySelector('h2')?.textContent.trim()==='Work');
   if(workSection&&!workSection.querySelector('[data-go="assistance"]')){
     const link=permittedLinks([['Evidence assistance','assistance']])[0];
     if(link){const button=document.createElement('button');button.dataset.go=link[1];button.textContent=link[0];workSection.append(button)}
   }
   const intro=$('h1')?.nextElementSibling;
   if(intro){const search=document.createElement('label');search.className='ux-mobile-control ux-more-search';search.append(document.createTextNode('Find a destination '));const input=document.createElement('input');input.type='search';input.placeholder='Search permitted destinations';input.setAttribute('aria-label','Search permitted destinations');search.append(input);insertAfter(intro,search);
     const details=$$('details').map(d=>({node:d,open:d.open}));const work=$$('section.box').find(s=>s.querySelector('h2')?.textContent.trim()==='Work');
     input.addEventListener('input',()=>{const query=input.value.trim().toLowerCase();for(const {node,open} of details){const links=$$('button[data-go]',node);const matches=links.filter(b=>b.textContent.toLowerCase().includes(query));links.forEach(b=>b.hidden=!!query&&!matches.includes(b));node.hidden=!!query&&!matches.length;node.open=query?matches.length>0:open;}if(work){const links=$$('button[data-go],button[data-project]',work);const matches=links.filter(b=>b.textContent.toLowerCase().includes(query));links.forEach(b=>b.hidden=!!query&&!matches.includes(b));work.hidden=!!query&&!matches.length;}});}
 }
 // Keep the appropriate bottom destination active on child routes. Preserve
 // task/project list context rather than labeling every detail as More.
 const mobile=document.querySelector('#mobile');if(mobile){let parentRoute=current;if(current==='task'){parentRoute=taskListContext?.label==='My Work'?'mywork':taskListContext?.label?.includes('Project')?'projects':taskListContext?.label==='Tasks'?'tasks':'more'}else if(current==='project')parentRoute='projects';else if(current==='createTask')parentRoute=createReturn==='project'?'projects':createReturn==='mywork'?'mywork':createReturn==='tasks'&&mobileVariant==='B'?'tasks':'more';else if(['review','reviewQueue','clientPackage','decision'].includes(current))parentRoute=current==='decision'?'decisions':'more';
   if(current==='task'&&taskOrigin==='project')parentRoute='projects';
   const navButtons=[...mobile.querySelectorAll('button[data-go]')];const hasParent=navButtons.some(b=>b.dataset.go===parentRoute);navButtons.forEach(b=>{b.removeAttribute('aria-current');if(b.dataset.go===parentRoute||b.dataset.go==='more'&&!hasParent)b.setAttribute('aria-current','page')});}
 if(pageTitle==='Settings'){
   $('.settings-navigation')?.classList.add('ux-mobile-hidden');
   // The host's #settingsCategory already drives its original change handler.
 }
 if(current==='project'){
   const nav=$('[data-tab-select]')?.closest('.actions');const buttons=$$('[data-tab-select]');
   if(buttons.length){const active=buttons.find(b=>b.getAttribute('aria-current')==='page')||buttons[0];insertAfter(nav,selectControl('Project section',buttons.map(b=>({value:b.dataset.tabSelect,label:b.textContent.trim()})),active.dataset.tabSelect,v=>buttonFor('[data-tab-select]','data-tab-select',v)?.click()));buttons.forEach(b=>b.classList.add('ux-mobile-hidden'));}
 }
 if(current==='project'&&tab==='tasks')group('Project task view','[data-task-view]','data-task-view',taskView);
 if(current==='tasks'){
   group('Task scope','[data-task-scope]','data-task-scope',taskScope);
   group('Task view','[data-task-view]','data-task-view',taskView);
 }
 if(current==='mywork'){
   group('My Work scope','[data-filter]','data-filter',filter);
   group('My Work view','[data-workmode]','data-workmode',workMode);
 }
 if(current==='reviewQueue')group('Review scope','[data-review-filter]','data-review-filter',reviewQueueFilter);
 if(current==='projects'){
   group('Project view','[data-mode]','data-mode',mode);
   const attention=$('[data-project-attention]');if(attention){const toolbar=attention.closest('.work-toolbar');const select=selectControl('Project scope',[{value:'all',label:'All accessible projects'},{value:'attention',label:'Needs action only'}],attention.getAttribute('aria-pressed')==='true'?'attention':'all',v=>{if((v==='attention')!==(attention.getAttribute('aria-pressed')==='true'))attention.click()});insertAfter(toolbar,select);attention.classList.add('ux-mobile-hidden');}
 }
}
