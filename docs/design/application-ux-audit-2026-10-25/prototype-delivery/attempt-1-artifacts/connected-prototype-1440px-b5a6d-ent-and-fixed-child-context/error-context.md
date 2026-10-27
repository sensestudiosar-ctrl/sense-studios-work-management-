# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-prototype.spec.mjs >> 1440px >> new task submit, correction request, separate assignment and fixed child context
- Location: docs\v1-demo\connected-prototype.spec.mjs:57:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#cx-detail')
Expected: visible
Received: hidden
Timeout:  7000ms

Call log:
  - Expect "toBeVisible" locator('#cx-detail') with timeout 7000ms
  - waiting for locator('#cx-detail')
    17 × locator resolved to <dialog id="cx-detail" class="cx-dialog" aria-labelledby="cx-detail-title"></dialog>
       - unexpected value "hidden"

```

```yaml
- link "Skip to work content":
  - /url: "#connected-surface"
- complementary "Prototype review controls":
  - strong: UX REVIEW · P1 + P2a
  - text: Synthetic data · no backend · session only
  - group: Review controls & scope
- complementary "Main navigation":
  - text: SS Sense Studios WORKSPACE Daily
  - button "Dashboard"
  - button "My Work"
  - button "Tasks"
  - button "Decisions"
  - group: More daily tools
  - group:
    - text: Project work
    - button "Projects"
    - button "Project documents"
    - button "Drawing register"
    - button "Internal reviews"
    - button "Client reviews"
    - button "Turnkey operations"
    - button "Site delivery"
  - group: Management
  - group: Configuration
  - text: SS Sense Studios Internal workspace Interactive UX prototype · v1.0
- main:
  - text: Workspace / Dashboard ◦ Sample data / no backend
  - button "New task"
  - text: Daily / Dashboard
  - heading "Dashboard" [level=1]
  - paragraph: Your work, project context and next actions.
  - button "Open My Work"
  - region "Today at a glance":
    - button "Active tasks 8 Assigned to you":
      - text: Active tasks
      - strong: "8"
      - text: Assigned to you
    - button "Due today 2 Target date today":
      - text: Due today
      - strong: "2"
      - text: Target date today
    - button "Overdue 0 Past their Target":
      - text: Overdue
      - strong: "0"
      - text: Past their Target
    - button "In review 0 Awaiting a decision":
      - text: In review
      - strong: "0"
      - text: Awaiting a decision
    - button "Corrections 1 Linked work required":
      - text: Corrections
      - strong: "1"
      - text: Linked work required
  - heading "Next action" [level=2]
  - paragraph: Continue from the exact task context
  - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence · Asha":
    - strong: Revise bedroom wardrobe working drawing
    - text: SS-142 · Lakeview Residence · Asha
  - text: Correction
  - button "Read review comments"
  - paragraph: Complete the linked correction before resubmitting the original work.
  - heading "Time tracking" [level=2]
  - paragraph: Existing Time workflow
  - paragraph: No timer is running in this sample.
  - button "Open Time context"
  - heading "Projects" [level=2]
  - paragraph: Your authorized sample project context
  - button "Lakeview Residence Open project → Tasks"
  - button "Palm Courtyard Villa Open project → Tasks"
  - button "Swagath Delight Open project → Tasks"
  - heading "Assigned internal reviews" [level=2]
  - paragraph: Named reviewer and exact evidence
  - paragraph: Independent review stays with the named reviewer.
  - button "Open internal reviews"
  - heading "Attention queue" [level=2]
  - paragraph: Two starting rows · statuses may overlap summary counts
  - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence · Asha":
    - strong: Revise bedroom wardrobe working drawing
    - text: SS-142 · Lakeview Residence · Asha
  - text: Correction
  - button "Correct wardrobe clearances from internal review SS-143 · Lakeview Residence · Asha":
    - strong: Correct wardrobe clearances from internal review
    - text: SS-143 · Lakeview Residence · Asha
  - text: In progress
- status
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import path from 'node:path';
  3  | import {pathToFileURL} from 'node:url';
  4  | const url=pathToFileURL(path.resolve('docs/v1-demo/task-creation-completed-demo.html')).href;
  5  | const out=path.resolve('docs/design/application-ux-audit-2026-10-25/prototype-delivery/screenshots');
  6  | const sizes=[[1440,900],[1024,900],[783,900],[768,900],[767,900],[390,844],[320,740]];
  7  | const root=p=>p.locator('#task-create-refinement');
  8  | async function persona(p,value){await p.locator('.cx-harness summary').click();await p.locator('#role').selectOption(value);await p.locator('.cx-harness summary').click();}
  9  | async function reason(p){await p.locator('#cx-reason').fill('Complete the agreed scope');}
  10 | async function save(p,name){await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
  11 | async function seed(p){await p.getByRole('button',{name:'Read review comments',exact:true}).click();}
  12 | async function close(p){await p.getByRole('button',{name:'Close task details',exact:true}).click();}
  13 | async function create(p,title,{lost=false,owner=''}={}){
  14 |  await p.locator('#cx-new').click();await root(p).locator('#new-title').fill(title);await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});
  15 |  if(owner)await root(p).locator('#new-owner').selectOption(owner);
  16 |  await root(p).locator('#new-target').fill('2026-11-05');await root(p).locator('#new-reason').fill('Coordinate approved design scope');await root(p).locator('#new-review').selectOption('INTERNAL');
  17 |  if(lost){await root(p).locator('#scenario-settings').evaluate(e=>e.open=true);await root(p).locator('#new-scenario').selectOption('lost');}
  18 |  await root(p).locator('#new-submit').click();
  19 |  if(lost){await expect(root(p).getByText('Check before creating another copy')).toBeVisible();await root(p).locator('#new-recover').click();}
> 20 |  await expect(p.locator('#cx-detail')).toBeVisible();return p.evaluate(()=>window.taskCreateRefinement.lastCreated());
     |                                        ^ Error: expect(locator).toBeVisible() failed
  21 | }
  22 | for(const [width,height] of sizes)test.describe(`${width}px`,()=>{
  23 |  test.use({viewport:{width,height}});
  24 |  test.beforeEach(async({page})=>{
  25 |   page.__errors=[];page.__requests=[];page.on('pageerror',e=>page.__errors.push(e.message));
  26 |   await page.route(/^https?:/,route=>{page.__requests.push(route.request().url());return route.abort();});
  27 |   await page.goto(url);await expect(page.locator('#cx-page-title')).toHaveText('Dashboard');
  28 |  });
  29 |  test.afterEach(async({page})=>{expect(page.__errors).toEqual([]);expect(page.__requests).toEqual([]);});
  30 |  test('P1 create, recovery and same-object project/list continuity',async({page:p})=>{
  31 |   await save(p,`${width}-dashboard`);
  32 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator('#search').fill('wardrobe');await p.locator('#groupBy').selectOption('project');
  33 |   await save(p,`${width}-my-work`);
  34 |   await p.locator('#cx-new').click();await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-title')).toBeFocused();await root(p).locator('#new-close').click();
  35 |   const id=await create(p,'Connected lighting plan',{lost:true});
  36 |   expect(await p.evaluate(()=>window.taskCreateRefinement.receiptCount())).toBe(1);
  37 |   await expect(p.locator('#cx-detail-title')).toHaveText('Connected lighting plan');await save(p,`${width}-task-detail`);
  38 |   await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('#connected-surface')).toContainText(id);
  39 |   await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await expect(p.locator('#cx-detail-title')).toHaveText('Connected lighting plan');
  40 |   await close(p);await p.getByRole('button',{name:'Return to My Work',exact:true}).click();await expect(p.locator('#search')).toHaveValue('wardrobe');await expect(p.locator('#groupBy')).toHaveValue('project');
  41 |   const own=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(own.tasks.find(t=>t.id===id).primaryWorker).toBe('designer1');
  42 |  });
  43 |  test('P2a linked correction gate, new evidence and independent internal approval',async({page:p})=>{
  44 |   await seed(p);await expect(p.locator('#cx-detail')).toContainText('Resubmission blocked');await expect(p.getByRole('button',{name:'Resubmit for internal review',exact:true})).toHaveCount(0);
  45 |   await save(p,`${width}-review-comments`);await p.getByRole('button',{name:'Open linked correction',exact:true}).click();
  46 |   await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Add a file or link');
  47 |   await p.locator('#cx-evidence').fill('Wardrobe_R2.pdf');await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('checklist');
  48 |   await p.locator('[data-cx-check="0"]').check();await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Correction complete');
  49 |   await p.getByRole('button',{name:'Return to original task SS-142',exact:true}).click();await reason(p);await p.locator('#cx-evidence').fill('Wardrobe_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();
  50 |   await expect(p.locator('#cx-feedback')).toContainText('new round');await expect(p.locator('#cx-detail')).toContainText('Round 1 · Changes requested');await expect(p.locator('#cx-detail')).toContainText('Round 2 · Pending review');
  51 |   await expect(p.getByRole('button',{name:'Approve internal round',exact:true})).toHaveCount(0);await save(p,`${width}-resubmitted`);await close(p);
  52 |   await persona(p,'Team Lead');await seed(p);await expect(p.locator('#cx-detail')).toContainText('Reviewing the exact round 2');await reason(p);await p.getByRole('button',{name:'Approve internal round',exact:true}).click();
  53 |   await expect(p.locator('#cx-detail')).toContainText('Internally approved');await expect(p.getByRole('button',{name:'Complete approved task',exact:true})).toHaveCount(0);await close(p);
  54 |   await persona(p,'Designer');await seed(p);await reason(p);await p.getByRole('button',{name:'Complete approved task',exact:true}).click();await expect(p.locator('#cx-detail')).toContainText('Completed');
  55 |   const data=await p.evaluate(()=>window.connectedPrototype.snapshot());const rounds=data.rounds.find(([id])=>id==='SS-142')[1];expect(rounds).toHaveLength(2);expect(rounds[0].evidence).toContain('R1.pdf');expect(rounds[1].evidence).toBe('Wardrobe_R2.pdf');expect(rounds[1].author).not.toBe(rounds[1].reviewer);
  56 |  });
  57 |  test('new task submit, correction request, separate assignment and fixed child context',async({page:p})=>{
  58 |   const id=await create(p,'New internal review work');await expect(p.getByRole('button',{name:'Submit for internal review',exact:true})).toHaveCount(0);await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');
  59 |   await reason(p);await p.locator('#cx-evidence').fill('Sample lighting R1.pdf');await p.getByRole('button',{name:'Submit for internal review',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Submitted');await close(p);
  60 |   await persona(p,'Team Lead');await p.locator('[data-cx-route="/reviews"]').first().click();await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Explain');
  61 |   await p.locator('#cx-comment').fill('Add the missing switch dimensions');await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Assign linked correction',exact:true})).toBeVisible();
  62 |   let snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.rounds.find(([i])=>i===id)[1][0].correctionId).toBeUndefined();
  63 |   await reason(p);await p.getByRole('button',{name:'Assign linked correction',exact:true}).click();await expect(p.locator('#cx-detail')).toContainText('Open linked correction COR-');await close(p);
  64 |   await persona(p,'Designer');await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await expect(p.getByRole('button',{name:'Resubmit for internal review',exact:true})).toHaveCount(0);
  65 |   await p.getByRole('button',{name:'Create subtask',exact:true}).click();await expect(root(p).locator('#new-task-title')).toHaveText('Create subtask');await expect(root(p).locator('#new-project')).toBeDisabled();await expect(root(p).locator('#new-project')).toHaveValue('Lakeview Residence');
  66 |   await save(p,`${width}-create-task`);await root(p).locator('#new-title').fill('Linked subtask');await root(p).locator('#new-target').fill('2026-11-06');await root(p).locator('#new-reason').fill('Prepare required detail');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Linked subtask');
  67 |   snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.tasks.find(t=>t.title==='Linked subtask').parentId).toBe(id);
  68 |  });
  69 |  test('responsive shells, state recovery and keyboard modal containment',async({page:p})=>{
  70 |   for(const s of ['loading','error','empty','permission']){await p.locator('.cx-harness summary').click();await p.locator('#cx-state').selectOption(s);await p.locator('.cx-harness summary').click();await expect(p.locator('#connected-surface [role]')).toBeVisible();await save(p,`${width}-state-${s}`);await p.locator('[data-cx-action="retry"]').click();await expect(p.locator('#cx-page-title')).toHaveText('Dashboard');}
  71 |   for(const dest of ['dashboard','my-work','projects','tasks','reviews','more']){await p.evaluate(d=>{document.querySelector(`[data-cx-route="${d==='more'?'more':'/'+d}"]`)?.click();},dest);await expect.poll(()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  72 |   if(width<768){await expect(p.locator('.mobile-nav')).toBeVisible();expect(await p.locator('.mobile-nav button').count()).toBe(5);await expect(p.locator('.sidebar')).toBeHidden();}else{await expect(p.locator('.mobile-nav')).toBeHidden();await expect(p.locator('.sidebar')).toBeVisible();}
  73 |   await p.locator('#cx-new').click();await expect(root(p).locator('#new-title')).toBeFocused();
  74 |   for(let i=0;i<32;i++){await p.keyboard.press('Tab');expect(await root(p).locator('#refined-create').evaluate(d=>d.contains(d.getRootNode().activeElement))).toBe(true);}
  75 |   await root(p).locator('#new-title').fill('Draft retained');await p.keyboard.press('Escape');await expect(root(p).locator('#new-discard')).toBeVisible();await root(p).locator('#new-keep').click();await expect(root(p).locator('#new-title')).toHaveValue('Draft retained');await p.keyboard.press('Escape');await root(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  76 |   await seedFromAny(p);for(let i=0;i<20;i++){await p.keyboard.press('Tab');expect(await p.locator('#cx-detail').evaluate(d=>d.contains(document.activeElement))).toBe(true);}await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();
  77 |  });
  78 | });
  79 | async function seedFromAny(p){await p.evaluate(()=>document.querySelector('[data-cx-route="/dashboard"]').click());await seed(p);}
  80 | 
```