# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-prototype.spec.mjs >> 320px >> P1 create, recovery and same-object project/list continuity
- Location: docs\v1-demo\connected-prototype.spec.mjs:30:2

# Error details

```
TimeoutError: locator.selectOption: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('#groupBy')
    - locator resolved to <select id="groupBy" aria-label="Group tasks">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
      - waiting 100ms
    15 × waiting for element to be visible and enabled
       - element is not visible
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to work content" [ref=e2] [cursor=pointer]:
    - /url: "#connected-work"
  - complementary "Prototype review controls" [ref=e3]:
    - strong [ref=e4]: UX REVIEW · P1 + P2a
    - group [ref=e5]:
      - generic "Review controls & scope" [ref=e6] [cursor=pointer]
      - option "Designer" [selected]
      - option "Team Leader"
      - option "Owner"
      - option "Site Employee"
      - option "Ready" [selected]
      - option "Loading"
      - option "Load error"
      - option "Empty"
      - option "Permission changed"
  - main [ref=e8]:
    - button "New task" [ref=e11] [cursor=pointer]
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: WORKSPACE / TASKS
          - heading "My Work" [level=1] [ref=e16]
        - generic "Work scope" [ref=e17]:
          - button "My Work" [ref=e18] [cursor=pointer]
      - generic [ref=e19]:
        - button "Show 2 Needs action tasks" [ref=e20] [cursor=pointer]:
          - generic [ref=e21]:
            - generic [aria-hidden] [ref=e22]: ◈
            - text: Needs action
          - generic [aria-hidden] [ref=e23]: "2"
          - generic [ref=e24]:
            - generic [ref=e25]: Tasks needing attention
            - generic [aria-hidden] [ref=e26]: ↗
        - button "Show 2 Overdue tasks" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]:
            - generic [aria-hidden] [ref=e29]: ◷
            - text: Overdue
          - generic [aria-hidden] [ref=e30]: "2"
          - generic [ref=e31]:
            - generic [ref=e32]: Past due and incomplete
            - generic [aria-hidden] [ref=e33]: ↗
        - button "Show 1 Reviews / corrections task" [ref=e34] [cursor=pointer]:
          - generic [ref=e35]:
            - generic [aria-hidden] [ref=e36]: ◇
            - text: Reviews / corrections
          - generic [aria-hidden] [ref=e37]: "1"
          - generic [ref=e38]:
            - generic [ref=e39]: Tasks with review obligations
            - generic [aria-hidden] [ref=e40]: ↗
        - button "Show 0 Waiting / blocked tasks" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]:
            - generic [aria-hidden] [ref=e43]: ⊘
            - text: Waiting / blocked
          - generic [aria-hidden] [ref=e44]: "0"
          - generic [ref=e45]:
            - generic [ref=e46]: Waiting for next actor
            - generic [aria-hidden] [ref=e47]: ↗
      - region "My work task list" [ref=e48]:
        - heading "Work queue" [level=2] [ref=e51]
        - generic [ref=e52]:
          - generic:
            - text: ⌕
            - searchbox "Search tasks" [active] [ref=e53]: wardrobe
          - generic [ref=e54]:
            - button "☷ Filters" [ref=e55] [cursor=pointer]
            - button "More work queue options" [ref=e56] [cursor=pointer]: ⋯ More
        - generic "Mobile due date shortcuts" [ref=e58]:
          - button "All 2" [pressed] [ref=e59] [cursor=pointer]:
            - text: All
            - generic [ref=e60]: "2"
          - button "Overdue 2" [ref=e61] [cursor=pointer]:
            - text: Overdue
            - generic [ref=e62]: "2"
          - button "Today 0" [ref=e63] [cursor=pointer]:
            - text: Today
            - generic [ref=e64]: "0"
          - button "This week 0" [ref=e65] [cursor=pointer]:
            - text: This week
            - generic [ref=e66]: "0"
          - button "Next week 0" [ref=e67] [cursor=pointer]:
            - text: Next week
            - generic [ref=e68]: "0"
          - button "This month 0" [ref=e69] [cursor=pointer]:
            - text: This month
            - generic [ref=e70]: "0"
          - button "Later 0" [ref=e71] [cursor=pointer]:
            - text: Later
            - generic [ref=e72]: "0"
          - button "No date 0" [ref=e73] [cursor=pointer]:
            - text: No date
            - generic [ref=e74]: "0"
        - list [ref=e75]:
          - generic [ref=e76]:
            - button "▾ Pinned 1" [expanded] [ref=e77] [cursor=pointer]:
              - generic [ref=e78]: ▾
              - text: Pinned
              - generic [ref=e79]: "1"
            - listitem "Open Revise bedroom wardrobe working drawing; Correction; High priority; 1d overdue" [ref=e80] [cursor=pointer]:
              - generic [ref=e81]:
                - generic [ref=e82]:
                  - generic [ref=e83]: Drawing
                  - button "Unpin Revise bedroom wardrobe working drawing" [ref=e84]: ◆
                - generic [ref=e85]:
                  - generic [ref=e86]: Revise bedroom wardrobe working drawing
                  - generic [ref=e87]: Lakeview Residence · Working drawings
                - generic [ref=e88]:
                  - generic [ref=e89]: Correction
                  - generic [ref=e90]: High
                  - generic [ref=e91]: 1d overdue
                - generic [ref=e92]:
                  - generic "Asha" [ref=e93]: AS
                  - generic [ref=e94]:
                    - strong [ref=e95]: Asha
                    - text: +1 collaborating · by Meera
                - generic [ref=e96]:
                  - generic [ref=e97]:
                    - strong [ref=e98]: "Next:"
                    - text: Open correction
                  - button "Open task ↗" [ref=e99]
          - generic [ref=e100]:
            - button "▾ Needs My Action 1" [expanded] [ref=e101] [cursor=pointer]:
              - generic [ref=e102]: ▾
              - text: Needs My Action
              - generic [ref=e103]: "1"
            - listitem "Open Correct wardrobe clearances from internal review; In progress; High priority; 1d overdue" [ref=e104] [cursor=pointer]:
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]: Drawing
                  - button "Pin Correct wardrobe clearances from internal review" [ref=e108]: ◇
                - generic [ref=e109]:
                  - generic [ref=e110]: Correct wardrobe clearances from internal review
                  - generic [ref=e111]: Lakeview Residence · Working drawings
                - generic [ref=e112]:
                  - generic [ref=e113]: In progress
                  - generic [ref=e114]: High
                  - generic [ref=e115]: 1d overdue
                - generic [ref=e116]:
                  - generic "Asha" [ref=e117]: AS
                  - generic [ref=e118]:
                    - strong [ref=e119]: Asha
                    - text: · by Meera
                - generic [ref=e120]:
                  - generic [ref=e121]:
                    - strong [ref=e122]: "Next:"
                    - text: Complete linked correction
                  - button "Open task ↗" [ref=e123]
        - button "Create a new task" [ref=e124] [cursor=pointer]: ＋
      - generic [ref=e125]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - navigation "Mobile navigation" [ref=e126]:
    - button "Home" [ref=e127] [cursor=pointer]
    - button "My Work" [ref=e128] [cursor=pointer]
    - button "Projects" [ref=e129] [cursor=pointer]
    - button "Decisions" [ref=e130] [cursor=pointer]
    - button "More" [ref=e131] [cursor=pointer]
  - status [ref=e132]
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
> 32 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator('#search').fill('wardrobe');await p.locator('#groupBy').selectOption('project');
     |                                                                                                                                                ^ TimeoutError: locator.selectOption: Timeout 8000ms exceeded.
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
  78 |  test('Owner assignment preserves personal scope; denied request retains draft',async({page:p})=>{
  79 |   await persona(p,'Owner');await p.locator('#cx-new').click();await root(p).locator('#new-title').fill('Assignment sample');await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await root(p).locator('#new-target').fill('2026-11-05');await root(p).locator('#new-reason').fill('Delegate the drawing');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-owner')).toBeFocused();
  80 |   await root(p).locator('#new-owner').selectOption('designer2');await root(p).locator('#scenario-settings').evaluate(e=>e.open=true);await root(p).locator('#new-scenario').selectOption('denied');await root(p).locator('#new-submit').click();await expect(root(p).locator('#new-message')).toContainText('access changed');expect(await p.evaluate(()=>window.taskCreateRefinement.receiptCount())).toBe(0);await expect(root(p).locator('#new-title')).toHaveValue('Assignment sample');await save(p,`${width}-creation-denied`);
  81 |   await root(p).locator('#new-scenario').selectOption('success');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail')).toBeVisible();const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await expect(p.locator('#cx-detail')).toContainText('Neha');await close(p);await p.evaluate(()=>document.querySelector('[data-cx-route="/my-work"]').click());await expect(p.locator(`#connected-work .task-row[data-id="${id}"]`)).toHaveCount(0);expect((await p.evaluate(()=>window.connectedPrototype.snapshot())).tasks.find(t=>t.id===id).primaryWorker).toBe('designer2');
  82 |  });
  83 | });
  84 | async function seedFromAny(p){await p.evaluate(()=>document.querySelector('[data-cx-route="/dashboard"]').click());await seed(p);}
  85 | 
```