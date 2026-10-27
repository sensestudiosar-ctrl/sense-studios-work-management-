# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 390px >> My Work context, exact project task and contextual keyboard return are preserved
- Location: docs\v1-demo\connected-refinement.spec.mjs:23:2

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-project-task="SS-142"]')
Expected substring: "Opened from your task"
Received string:    "Revise bedroom wardrobe working drawingSS-142 · Lakeview ResidenceASNEAsha +1 helpingCorrectionHigh priority"
Timeout: 7000ms

Call log:
  - Expect "toContainText" locator('[data-project-task="SS-142"]') with timeout 7000ms
  - waiting for locator('[data-project-task="SS-142"]')
    17 × locator resolved to <div aria-current="true" class="cx-row cx-origin" data-project-task="SS-142">…</div>
       - unexpected value "Revise bedroom wardrobe working drawingSS-142 · Lakeview ResidenceASNEAsha +1 helpingCorrectionHigh priority"

```

```yaml
- button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators Opened from your task":
  - strong: Revise bedroom wardrobe working drawing
  - text: SS-142 · Lakeview Residence AS NE Asha +1 helping Opened from your task
- text: Correction High priority
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import path from 'node:path';
  3  | import {pathToFileURL} from 'node:url';
  4  | const url=pathToFileURL(path.resolve('docs/v1-demo/task-creation-completed-demo.html')).href;
  5  | const dest=path.resolve('docs/design/application-ux-audit-2026-10-25/prototype-delivery/refinement-1/verified');
  6  | const creation=p=>p.locator('#task-create-refinement');
  7  | async function persona(p,name){await p.locator('.cx-harness summary').click();await p.locator('#role').selectOption(name);await p.locator('.cx-harness summary').click();}
  8  | async function reason(p){await p.locator('#cx-reason').fill('Finish the agreed correction');}
  9  | async function close(p){await p.getByRole('button',{name:'Close task details',exact:true}).click();}
  10 | async function form(p,title){await p.locator('#cx-new').click();await creation(p).locator('#new-title').fill(title);await creation(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await creation(p).locator('#new-target').fill('2026-11-09');await creation(p).locator('#new-reason').fill('Coordinate reviewed project work');await creation(p).locator('#new-review').selectOption('INTERNAL');}
  11 | for(const width of [1440,1024,768,390,320])test.describe(`refinement ${width}px`,()=>{
  12 |  test.use({viewport:{width,height:width<768?844:900}});
  13 |  test.beforeEach(async({page:p})=>{p.errors=[];p.requests=[];p.on('pageerror',e=>p.errors.push(e.message));await p.route(/^https?:/,r=>{p.requests.push(r.request().url());return r.abort();});await p.goto(url);});
  14 |  test.afterEach(async({page:p})=>{expect(p.errors).toEqual([]);expect(p.requests).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});
  15 |  test('authorized manager creates with separate independent reviewer assignment',async({page:p})=>{
  16 |   await persona(p,'Owner');await form(p,'Manager assigned drawing');await creation(p).locator('#new-owner').selectOption('designer1');await expect(creation(p).locator('#new-reviewer')).toBeVisible();await creation(p).locator('#new-reviewer').selectOption('lead');await p.screenshot({path:path.join(dest,`${width}-manager-create.png`)});await creation(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Manager assigned drawing');
  17 |   const data=await p.evaluate(()=>window.connectedPrototype.snapshot());const t=data.tasks.find(t=>t.title==='Manager assigned drawing');expect(data.reviewSetup.find(x=>x.id===t.id).reviewerId).toBe('lead');await expect(p.locator('#cx-detail')).toContainText('Meera');await expect(p.locator('#cx-detail')).toContainText('Separate reviewer assignment confirmed');await expect(p.getByRole('button',{name:'Submit for internal review',exact:true})).toHaveCount(0);await expect(p.locator('#cx-detail .primary')).toHaveCount(0);
  18 |  });
  19 |  test('employee without assignment authority sees responsible manager and correct prerequisites',async({page:p})=>{
  20 |   await form(p,'Employee project work');await expect(creation(p).locator('#new-reviewer')).toHaveCount(0);await expect(creation(p).locator('#new-reviewer-needed')).toContainText('Meera (Project Lead)');await p.screenshot({path:path.join(dest,`${width}-employee-create.png`)});await creation(p).locator('#new-submit').click();await expect(p.locator('#cx-next-guidance')).toContainText('Start your assigned work first');await expect(p.locator('#cx-detail .primary')).toHaveText('Start task');await expect(p.locator('#cx-evidence')).toHaveCount(0);await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-next-guidance')).toContainText('Meera (Project Lead)');await expect(p.locator('#cx-detail .primary')).toHaveCount(0);await expect(p.locator('#cx-detail')).not.toContainText('Submit a file or link reference');await close(p);
  21 |   await persona(p,'Team Lead');await form(p,'Project scoped authority');await creation(p).locator('#new-project').selectOption({label:'Palm Courtyard Villa'});await expect(creation(p).locator('#new-reviewer')).toHaveCount(0);await expect(creation(p).locator('#new-reviewer-needed')).toContainText('authorized manager');
  22 |  });
  23 |  test('My Work context, exact project task and contextual keyboard return are preserved',async({page:p})=>{
  24 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator('#search').fill('wardrobe');await p.locator('#filterBtn').click();await p.locator('#filterProject').selectOption('Lakeview Residence');await p.locator('#filterPriority').selectOption('High');await p.locator('#filterApply').click();
  25 |   if(width<768){await p.locator('#mobileQueueMore').click();await p.locator('#mqMoreGroup').selectOption('project');await p.getByRole('button',{name:'Apply',exact:true}).click();}else await p.locator('#groupBy').selectOption('project');
> 26 |   await p.locator('.task-row[data-id="SS-142"]').scrollIntoViewIfNeeded();const scroll=await p.evaluate(()=>scrollY);await p.locator('.task-row[data-id="SS-142"]').click();await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('[data-project-task="SS-142"]')).toHaveAttribute('aria-current','true');await expect(p.locator('[data-project-task="SS-142"]')).toContainText('Opened from your task');await p.locator('[data-cx-task="SS-142"]').first().click();await close(p);await p.locator('[data-ref-return]').click();await expect(p.locator('#search')).toHaveValue('wardrobe');await expect(p.locator('#groupBy')).toHaveValue('project');await expect(p.locator('.task-row[data-id="SS-142"]')).toBeFocused();const snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.origin.filters.project).toBe('Lakeview Residence');expect(snapshot.origin.filters.priority).toBe('High');expect(Math.abs((await p.evaluate(()=>scrollY))-scroll)).toBeLessThan(3);
     |                                                                                                                                                                                                                                                                                                                                                                                            ^ Error: expect(locator).toContainText(expected) failed
  27 |  });
  28 |  test('all eight project sections remain reachable with current selection and overflow cues',async({page:p})=>{
  29 |   await p.locator('[data-cx-action="seed"]').click();await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('[data-cx-section]')).toHaveCount(8);await expect(p.locator('[data-cx-section="Tasks"]')).toHaveAttribute('aria-current','page');await p.locator('[data-cx-section="Tasks"]').focus();await p.keyboard.press('End');await expect(p.locator('[data-cx-section="Activity"]')).toBeFocused();await expect(p.locator('[data-cx-section="Activity"]')).toHaveAttribute('aria-current','page');await expect(p.locator('.cx-tabs-hint')).toContainText('Scroll for more');
  30 |   for(const section of ['Overview','Plan','Tasks','People','Documents','Reviews','Delivery','Activity']){await p.locator(`[data-cx-section="${section}"]`).click();await expect(p.locator(`[data-cx-section="${section}"]`)).toHaveAttribute('aria-current','page');expect(await p.locator(`[data-cx-section="${section}"]`).evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);}
  31 |   if(width<768)expect(await p.locator('.cx-tabs').evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);await p.locator('[data-cx-section="Tasks"]').click();await p.screenshot({path:path.join(dest,`${width}-project-tabs.png`)});
  32 |  });
  33 |  test('correction return, updated evidence, current round and dashboard guidance change',async({page:p})=>{
  34 |   await p.locator('[data-cx-action="seed"]').click();await expect(p.locator('#cx-detail .primary')).toHaveText('Open linked correction');await p.getByRole('button',{name:'Open linked correction',exact:true}).click();await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Return to original task');await p.getByRole('button',{name:'Return to original task',exact:true}).click();await expect(p.locator('#cx-next-guidance')).toContainText('Add the updated file or link evidence');await expect(p.locator('#cx-detail .primary')).toHaveText('Resubmit for internal review');await reason(p);await p.locator('#cx-evidence').fill('Wardrobe_Updated_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();await expect(p.locator('#cx-current-round')).toHaveText('Round 2 · Awaiting Meera');await expect(p.locator('#cx-detail .primary')).toHaveCount(0);await expect(p.locator('#cx-next-guidance')).not.toContainText('must complete correction');await p.screenshot({path:path.join(dest,`${width}-resubmitted.png`)});await close(p);await expect(p.locator('#cx-dashboard-guidance')).toContainText('Round 2 is awaiting Meera');await expect(p.locator('#cx-dashboard-guidance')).not.toContainText('Complete the linked correction');
  35 |  });
  36 |  test('unsaved details, keyboard focus return and mobile control geometry',async({page:p})=>{
  37 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();if(width<768){const s=await p.locator('#search').boundingBox(),f=await p.locator('#filterBtn').boundingBox(),v=await p.locator('#mobileQueueMore').boundingBox();expect(s.width).toBeGreaterThan(width-100);expect(f.y).toBeGreaterThan(s.y+s.height-1);expect(Math.abs(f.y-v.y)).toBeLessThan(2);for(const loc of ['#filterBtn','#mobileQueueMore'])expect((await p.locator(loc).boundingBox()).height).toBeGreaterThanOrEqual(44);for(const metric of await p.locator('#summary .metric').all())expect(await metric.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);}
  38 |   await p.locator('.task-row[data-id="SS-143"]').click();await p.locator('#cx-reason').fill('Unsent change');p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).toBeVisible();await expect(p.locator('#cx-reason')).toHaveValue('Unsent change');p.once('dialog',d=>d.accept());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();await expect(p.locator('.task-row[data-id="SS-143"]')).toBeFocused();
  39 |   await p.locator('#cx-new').focus();await p.keyboard.press('Enter');await expect(creation(p).locator('#new-title')).toBeFocused();await creation(p).locator('#new-title').fill('Unsaved creation');await p.keyboard.press('Escape');await expect(creation(p).locator('#new-discard')).toBeVisible();await creation(p).locator('#new-keep').click();await expect(creation(p).locator('#new-title')).toHaveValue('Unsaved creation');await p.keyboard.press('Escape');await creation(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  40 |  });
  41 | });
  42 | 
```