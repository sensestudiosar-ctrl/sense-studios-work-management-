import {test,expect} from '@playwright/test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const url=pathToFileURL(path.resolve('docs/v1-demo/task-creation-completed-demo.html')).href;
const out=path.resolve('docs/design/application-ux-audit-2026-10-25/prototype-delivery/screenshots');
const sizes=[[1440,900],[1024,900],[783,900],[768,900],[767,900],[390,844],[320,740]];
const root=p=>p.locator('#task-create-refinement');
async function persona(p,value){await p.locator('.cx-harness summary').click();await p.locator('#role').selectOption(value);await p.locator('.cx-harness summary').click();}
async function reason(p){await p.locator('#cx-reason').fill('Complete the agreed scope');}
async function save(p,name){await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
async function seed(p){await p.getByRole('button',{name:'Read review comments',exact:true}).click();}
async function close(p){await p.getByRole('button',{name:'Close task details',exact:true}).click();}
async function reviews(p){if(p.viewportSize().width<768){await p.locator('.mobile-nav [data-cx-route="more"]').click();await p.locator('#connected-surface [data-cx-route="/reviews"]').click();}else await p.locator('.sidebar [data-cx-route="/reviews"]').click();}
async function create(p,title,{lost=false,owner=''}={}){
 await p.locator('#cx-new').click();await root(p).locator('#new-title').fill(title);await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});
 if(owner)await root(p).locator('#new-owner').selectOption(owner);
 await root(p).locator('#new-target').fill('2026-11-05');await root(p).locator('#new-reason').fill('Coordinate approved design scope');await root(p).locator('#new-review').selectOption('INTERNAL');
 if(lost){await root(p).locator('#scenario-settings').evaluate(e=>e.open=true);await root(p).locator('#new-scenario').selectOption('lost');}
 await root(p).locator('#new-submit').click();
 if(lost){await expect(root(p).getByText('Check before creating another copy')).toBeVisible();await root(p).locator('#new-recover').click();}
 await expect(p.locator('#cx-detail')).toBeVisible();return p.evaluate(()=>window.taskCreateRefinement.lastCreated());
}
for(const [width,height] of sizes)test.describe(`${width}px`,()=>{
 test.use({viewport:{width,height}});
 test.beforeEach(async({page})=>{
  page.__errors=[];page.__requests=[];page.on('pageerror',e=>page.__errors.push(e.message));
  await page.route(/^https?:/,route=>{page.__requests.push(route.request().url());return route.abort();});
  await page.addInitScript(()=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-25T06:00:00.000Z']));}static now(){return 1792908000000;}};});
  await page.goto(url);await expect(page.locator('#cx-page-title')).toHaveText('Dashboard');
 });
 test.afterEach(async({page})=>{expect(page.__errors).toEqual([]);expect(page.__requests).toEqual([]);});
 test('visual snapshot states',async({page:p})=>{
  await expect(p).toHaveScreenshot(`${width}-dashboard.png`,{animations:'disabled',maxDiffPixels:0});
  await seed(p);await expect(p).toHaveScreenshot(`${width}-review-feedback.png`,{animations:'disabled',maxDiffPixels:0});
 });
 test('P1 create, recovery and same-object project/list continuity',async({page:p})=>{
  await save(p,`${width}-dashboard`);
  await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator('#search').fill('wardrobe');if(await p.locator('#groupBy').isVisible())await p.locator('#groupBy').selectOption('project');else{await p.locator('#mobileQueueMore').click();await p.locator('#mqMoreGroup').selectOption('project');await p.getByRole('button',{name:'Apply',exact:true}).click();}
  await save(p,`${width}-my-work`);
  await p.locator('#cx-new').click();await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-title')).toBeFocused();await root(p).locator('#new-close').click();
  const id=await create(p,'Connected lighting plan',{lost:true});
  expect(await p.evaluate(()=>window.taskCreateRefinement.receiptCount())).toBe(1);
  await expect(p.locator('#cx-detail-title')).toHaveText('Connected lighting plan');await save(p,`${width}-task-detail`);
  await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('#connected-surface')).toContainText(id);
  await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await expect(p.locator('#cx-detail-title')).toHaveText('Connected lighting plan');
  await close(p);await p.getByRole('button',{name:'Return to My Work',exact:true}).click();await expect(p.locator('#search')).toHaveValue('wardrobe');await expect(p.locator('#groupBy')).toHaveValue('project');
  const own=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(own.tasks.find(t=>t.id===id).primaryWorker).toBe('designer1');
 });
 test('P2a linked correction gate, new evidence and independent internal approval',async({page:p})=>{
  await seed(p);await expect(p.locator('#cx-detail')).toContainText('Resubmission blocked');await expect(p.getByRole('button',{name:'Resubmit for internal review',exact:true})).toHaveCount(0);
  await save(p,`${width}-review-comments`);await p.getByRole('button',{name:'Open linked correction',exact:true}).click();
  await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('reason');await reason(p);
  await p.locator('[data-cx-check="0"]').check();await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Correction complete');
  await p.getByRole('button',{name:'Return to original task SS-142',exact:true}).click();await reason(p);await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Add a file or link');await p.locator('#cx-evidence').fill('Wardrobe_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();
  await expect(p.locator('#cx-feedback')).toContainText('new round');await expect(p.locator('#cx-detail')).toContainText('Round 1 · Changes requested');await expect(p.locator('#cx-detail')).toContainText('Round 2 · Pending review');
  await expect(p.getByRole('button',{name:'Approve internal round',exact:true})).toHaveCount(0);await save(p,`${width}-resubmitted`);await close(p);
  await persona(p,'Team Lead');await seed(p);await expect(p.locator('#cx-detail')).toContainText('Reviewing the exact round 2');await reason(p);await p.getByRole('button',{name:'Approve internal round',exact:true}).click();
  await expect(p.locator('#cx-detail')).toContainText('Internally approved');await expect(p.getByRole('button',{name:'Complete approved task',exact:true})).toHaveCount(0);await close(p);
  await persona(p,'Designer');await seed(p);await reason(p);await p.getByRole('button',{name:'Complete approved task',exact:true}).click();await expect(p.locator('#cx-detail')).toContainText('Completed');
  const data=await p.evaluate(()=>window.connectedPrototype.snapshot());const rounds=data.rounds.find(([id])=>id==='SS-142')[1];expect(rounds).toHaveLength(2);expect(rounds[0].evidence).toContain('R1.pdf');expect(rounds[1].evidence).toBe('Wardrobe_R2.pdf');expect(rounds[1].author).not.toBe(rounds[1].reviewer);
 });
 test('new task submit, correction request, separate assignment and fixed child context',async({page:p})=>{
  const id=await create(p,'New internal review work');await expect(p.getByRole('button',{name:'Submit for internal review',exact:true})).toHaveCount(0);await expect(p.locator('#cx-detail')).toContainText('Assign an independent reviewer');await close(p);await persona(p,'Team Lead');await reviews(p);await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Assign reviewer',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');await close(p);await persona(p,'Designer');await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');
  await reason(p);await p.locator('#cx-evidence').fill('Sample lighting R1.pdf');await p.getByRole('button',{name:'Submit for internal review',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Submitted');await close(p);
  await persona(p,'Team Lead');await reviews(p);await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Explain');
  await p.locator('#cx-comment').fill('Add the missing switch dimensions');await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Assign linked correction',exact:true})).toBeVisible();
  let snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.rounds.find(([i])=>i===id)[1][0].correctionId).toBeUndefined();
  await reason(p);await p.getByRole('button',{name:'Assign linked correction',exact:true}).click();await expect(p.locator('#cx-detail')).toContainText('Open linked correction COR-');await close(p);
  await persona(p,'Designer');await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await expect(p.getByRole('button',{name:'Resubmit for internal review',exact:true})).toHaveCount(0);
  await p.getByRole('button',{name:'Create subtask',exact:true}).click();await expect(root(p).locator('#new-task-title')).toHaveText('Create subtask');await expect(root(p).locator('#new-project')).toBeDisabled();await expect(root(p).locator('#new-project')).toHaveValue('Lakeview Residence');
  await save(p,`${width}-create-task`);await root(p).locator('#new-title').fill('Linked subtask');await root(p).locator('#new-target').fill('2026-11-06');await root(p).locator('#new-reason').fill('Prepare required detail');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Linked subtask');
  snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.tasks.find(t=>t.title==='Linked subtask').parentId).toBe(id);
 });
 test('responsive shells, state recovery and keyboard modal containment',async({page:p})=>{
  for(const s of ['loading','error','empty','permission']){await p.locator('.cx-harness summary').click();await p.locator('#cx-state').selectOption(s);await p.locator('.cx-harness summary').click();await expect(p.locator('#connected-surface [role]')).toBeVisible();await save(p,`${width}-state-${s}`);await p.locator('[data-cx-action="retry"]').click();await expect(p.locator('#cx-page-title')).toHaveText('Dashboard');}
  for(const dest of ['dashboard','my-work','projects','tasks','reviews','more']){await p.evaluate(d=>{document.querySelector(`[data-cx-route="${d==='more'?'more':'/'+d}"]`)?.click();},dest);await expect.poll(()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  if(width<768){await expect(p.locator('.mobile-nav')).toBeVisible();expect(await p.locator('.mobile-nav button').count()).toBe(5);await expect(p.locator('.sidebar')).toBeHidden();}else{await expect(p.locator('.mobile-nav')).toBeHidden();await expect(p.locator('.sidebar')).toBeVisible();}
  await p.locator('#cx-new').click();await expect(root(p).locator('#new-title')).toBeFocused();
  for(let i=0;i<32;i++){await p.keyboard.press('Tab');expect(await root(p).locator('#refined-create').evaluate(d=>d.contains(d.getRootNode().activeElement))).toBe(true);}
  await root(p).locator('#new-title').fill('Draft retained');await p.keyboard.press('Escape');await expect(root(p).locator('#new-discard')).toBeVisible();await root(p).locator('#new-keep').click();await expect(root(p).locator('#new-title')).toHaveValue('Draft retained');await p.keyboard.press('Escape');await root(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  await seedFromAny(p);for(let i=0;i<20;i++){await p.keyboard.press('Tab');expect(await p.locator('#cx-detail').evaluate(d=>d.contains(document.activeElement))).toBe(true);}await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();
 });
 test('Owner assignment preserves personal scope; denied request retains draft',async({page:p})=>{
  await persona(p,'Owner');await p.locator('#cx-new').click();await root(p).locator('#new-title').fill('Assignment sample');await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await root(p).locator('#new-target').fill('2026-11-05');await root(p).locator('#new-reason').fill('Delegate the drawing');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-owner')).toBeFocused();
  await root(p).locator('#new-owner').selectOption('designer2');await root(p).locator('#scenario-settings').evaluate(e=>e.open=true);await root(p).locator('#new-scenario').selectOption('denied');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-message')).toContainText('access changed');expect(await p.evaluate(()=>window.taskCreateRefinement.receiptCount())).toBe(0);await expect(root(p).locator('#new-title')).toHaveValue('Assignment sample');await save(p,`${width}-creation-denied`);
  await root(p).locator('#new-scenario').selectOption('success');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail')).toBeVisible();const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await expect(p.locator('#cx-detail')).toContainText('Neha');await close(p);await p.evaluate(()=>document.querySelector('[data-cx-route="/my-work"]').click());await expect(p.locator(`#connected-work .task-row[data-id="${id}"]`)).toHaveCount(0);expect((await p.evaluate(()=>window.connectedPrototype.snapshot())).tasks.find(t=>t.id===id).primaryWorker).toBe('designer2');
 });
});
async function seedFromAny(p){await p.evaluate(()=>document.querySelector('[data-cx-route="/dashboard"]').click());await seed(p);}
