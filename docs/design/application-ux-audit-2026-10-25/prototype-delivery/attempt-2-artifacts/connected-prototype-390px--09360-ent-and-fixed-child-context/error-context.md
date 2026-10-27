# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-prototype.spec.mjs >> 390px >> new task submit, correction request, separate assignment and fixed child context
- Location: docs\v1-demo\connected-prototype.spec.mjs:57:2

# Error details

```
TimeoutError: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('[data-cx-route="/reviews"]').first()
    - locator resolved to <button class="nav-btn" data-cx-route="/reviews">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    14 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to work content" [ref=e2] [cursor=pointer]:
    - /url: "#connected-surface"
  - complementary "Prototype review controls" [ref=e3]:
    - strong [ref=e4]: UX REVIEW · P1 + P2a
    - group [ref=e5]:
      - generic "Review controls & scope" [active] [ref=e6] [cursor=pointer]
      - option "Designer"
      - option "Team Leader" [selected]
      - option "Owner"
      - option "Site Employee"
      - option "Ready" [selected]
      - option "Loading"
      - option "Load error"
      - option "Empty"
      - option "Permission changed"
  - main [ref=e8]:
    - button "New task" [ref=e11] [cursor=pointer]
    - text: ⌕
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Daily / Dashboard
          - heading "Dashboard" [level=1] [ref=e17]
          - paragraph [ref=e18]: Your work, project context and next actions.
        - button "Open My Work" [ref=e20] [cursor=pointer]
      - region "Today at a glance" [ref=e21]:
        - button "Active tasks 6 Assigned to you" [ref=e22] [cursor=pointer]:
          - generic [ref=e23]: Active tasks
          - strong [ref=e24]: "6"
          - generic [ref=e25]: Assigned to you
        - button "Due today 3 Target date today" [ref=e26] [cursor=pointer]:
          - generic [ref=e27]: Due today
          - strong [ref=e28]: "3"
          - generic [ref=e29]: Target date today
        - button "Overdue 1 Past their Target" [ref=e30] [cursor=pointer]:
          - generic [ref=e31]: Overdue
          - strong [ref=e32]: "1"
          - generic [ref=e33]: Past their Target
        - button "In review 3 Awaiting a decision" [ref=e34] [cursor=pointer]:
          - generic [ref=e35]: In review
          - strong [ref=e36]: "3"
          - generic [ref=e37]: Awaiting a decision
        - button "Corrections 0 Linked work required" [ref=e38] [cursor=pointer]:
          - generic [ref=e39]: Corrections
          - strong [ref=e40]: "0"
          - generic [ref=e41]: Linked work required
      - generic [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e46]:
              - heading "Next action" [level=2] [ref=e47]
              - paragraph [ref=e48]: Continue from the exact task context
            - generic [ref=e49]:
              - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence · Asha" [ref=e50] [cursor=pointer]:
                - strong [ref=e51]: Revise bedroom wardrobe working drawing
                - generic [ref=e52]: SS-142 · Lakeview Residence · Asha
              - generic [ref=e53]: Correction
            - generic [ref=e54]:
              - button "Read review comments" [ref=e55] [cursor=pointer]
              - paragraph [ref=e56]: Complete the linked correction before resubmitting the original work.
          - generic [ref=e57]:
            - generic [ref=e59]:
              - heading "Time tracking" [level=2] [ref=e60]
              - paragraph [ref=e61]: Existing Time workflow
            - generic [ref=e62]:
              - paragraph [ref=e63]: No timer is running in this sample.
              - button "Open Time context" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e68]:
              - heading "Projects" [level=2] [ref=e69]
              - paragraph [ref=e70]: Your authorized sample project context
            - button "Lakeview Residence Open project → Tasks" [ref=e72] [cursor=pointer]:
              - text: Lakeview Residence
              - generic [ref=e73]: Open project → Tasks
            - button "Palm Courtyard Villa Open project → Tasks" [ref=e75] [cursor=pointer]:
              - text: Palm Courtyard Villa
              - generic [ref=e76]: Open project → Tasks
            - button "Swagath Delight Open project → Tasks" [ref=e78] [cursor=pointer]:
              - text: Swagath Delight
              - generic [ref=e79]: Open project → Tasks
          - generic [ref=e80]:
            - generic [ref=e82]:
              - heading "Assigned internal reviews" [level=2] [ref=e83]
              - paragraph [ref=e84]: Named reviewer and exact evidence
            - generic [ref=e85]:
              - paragraph [ref=e86]: Review the submitted task round in context.
              - button "Open internal reviews" [ref=e87] [cursor=pointer]
      - generic [ref=e88]:
        - generic [ref=e90]:
          - heading "Attention queue" [level=2] [ref=e91]
          - paragraph [ref=e92]: Two starting rows · statuses may overlap summary counts
        - generic [ref=e93]:
          - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence · Asha" [ref=e94] [cursor=pointer]:
            - strong [ref=e95]: Revise bedroom wardrobe working drawing
            - generic [ref=e96]: SS-142 · Lakeview Residence · Asha
          - generic [ref=e97]: Correction
        - generic [ref=e98]:
          - button "Correct wardrobe clearances from internal review SS-143 · Lakeview Residence · Asha" [ref=e99] [cursor=pointer]:
            - strong [ref=e100]: Correct wardrobe clearances from internal review
            - generic [ref=e101]: SS-143 · Lakeview Residence · Asha
          - generic [ref=e102]: In progress
  - navigation "Mobile navigation" [ref=e103]:
    - button "Home" [ref=e104] [cursor=pointer]
    - button "My Work" [ref=e105] [cursor=pointer]
    - button "Projects" [ref=e106] [cursor=pointer]
    - button "Decisions" [ref=e107] [cursor=pointer]
    - button "More" [ref=e108] [cursor=pointer]
  - status [ref=e109]: Sample task created. Your My Work view was preserved.
  - text: + + +
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
  20 |  await expect(p.locator('#cx-detail')).toBeVisible();return p.evaluate(()=>window.taskCreateRefinement.lastCreated());
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
  49 |   await p.getByRole('button',{name:'Return to original task SS-142',exact:true}).click();for(const c of await p.locator('[data-cx-check]').all())await c.check();await reason(p);await p.locator('#cx-evidence').fill('Wardrobe_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();
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
> 60 |   await persona(p,'Team Lead');await p.locator('[data-cx-route="/reviews"]').first().click();await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('Explain');
     |                                                                                      ^ TimeoutError: locator.click: Timeout 8000ms exceeded.
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
  78 |  test('Owner assignment preserves personal scope; denied request retains draft',async({page:p})=>{
  79 |   await persona(p,'Owner');await p.locator('#cx-new').click();await root(p).locator('#new-title').fill('Assignment sample');await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await root(p).locator('#new-target').fill('2026-11-05');await root(p).locator('#new-reason').fill('Delegate the drawing');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-owner')).toBeFocused();
  80 |   await root(p).locator('#new-owner').selectOption('designer2');await root(p).locator('#scenario-settings').evaluate(e=>e.open=true);await root(p).locator('#new-scenario').selectOption('denied');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-message')).toContainText('access changed');expect(await p.evaluate(()=>window.taskCreateRefinement.receiptCount())).toBe(0);await expect(root(p).locator('#new-title')).toHaveValue('Assignment sample');await save(p,`${width}-creation-denied`);
  81 |   await root(p).locator('#new-scenario').selectOption('success');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail')).toBeVisible();const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await expect(p.locator('#cx-detail')).toContainText('Neha');await close(p);await p.evaluate(()=>document.querySelector('[data-cx-route="/my-work"]').click());await expect(p.locator(`#connected-work .task-row[data-id="${id}"]`)).toHaveCount(0);expect((await p.evaluate(()=>window.connectedPrototype.snapshot())).tasks.find(t=>t.id===id).primaryWorker).toBe('designer2');
  82 |  });
  83 | });
  84 | async function seedFromAny(p){await p.evaluate(()=>document.querySelector('[data-cx-route="/dashboard"]').click());await seed(p);}
  85 | 
```