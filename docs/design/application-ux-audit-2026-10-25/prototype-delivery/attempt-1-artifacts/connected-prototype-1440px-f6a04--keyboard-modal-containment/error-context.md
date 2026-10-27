# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-prototype.spec.mjs >> 1440px >> responsive shells, state recovery and keyboard modal containment
- Location: docs\v1-demo\connected-prototype.spec.mjs:69:2

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Cannot set properties of null (setting 'textContent')",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to work content" [ref=e2] [cursor=pointer]:
    - /url: "#connected-surface"
  - complementary "Prototype review controls" [ref=e3]:
    - strong [ref=e4]: UX REVIEW · P1 + P2a
    - generic [ref=e5]: Synthetic data · no backend · session only
    - group [ref=e6]:
      - generic "Review controls & scope" [ref=e7] [cursor=pointer]
      - option "Designer" [selected]
      - option "Team Leader"
      - option "Owner"
      - option "Site Employee"
      - option "Ready" [selected]
      - option "Loading"
      - option "Load error"
      - option "Empty"
      - option "Permission changed"
  - generic [ref=e8]:
    - complementary "Main navigation" [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: SS
        - generic [ref=e12]:
          - generic [ref=e13]: Sense Studios
          - text: WORKSPACE
      - generic [ref=e14]:
        - generic [ref=e15]: Daily
        - button "Dashboard" [ref=e16] [cursor=pointer]
        - button "My Work" [ref=e18] [cursor=pointer]
        - button "Tasks" [ref=e20] [cursor=pointer]
        - button "Decisions" [ref=e22] [cursor=pointer]
        - group [ref=e24]:
          - generic "More daily tools" [ref=e25] [cursor=pointer]
        - group [ref=e26]:
          - generic "Project work" [ref=e27] [cursor=pointer]
          - button "Projects" [ref=e28] [cursor=pointer]
          - button "Project documents" [ref=e30] [cursor=pointer]
          - button "Drawing register" [ref=e32] [cursor=pointer]
          - button "Internal reviews" [ref=e34] [cursor=pointer]
          - button "Client reviews" [ref=e36] [cursor=pointer]
          - button "Turnkey operations" [ref=e38] [cursor=pointer]
          - button "Site delivery" [ref=e40] [cursor=pointer]
        - group [ref=e42]:
          - generic "Management" [ref=e43] [cursor=pointer]
        - group [ref=e44]:
          - generic "Configuration" [ref=e45] [cursor=pointer]
      - generic [ref=e46]:
        - generic [ref=e47]:
          - generic [ref=e48]: SS
          - generic [ref=e49]: Sense StudiosInternal workspace
        - generic [ref=e50]: Interactive UX prototype · v1.0
    - main [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]: Workspace / More
        - generic [ref=e54]:
          - generic [ref=e55]: ◦ Sample data / no backend
          - button "New task" [ref=e56] [cursor=pointer]
      - text: ⌕
      - generic [ref=e58]:
        - generic [ref=e60]:
          - generic [ref=e61]: Daily / More
          - heading "More" [level=1] [ref=e62]
          - paragraph [ref=e63]: Retained capability destinations. Only P1 + P2a are interactive in this review.
        - generic [ref=e64]: This workflow remains in the current application. It has not been reimplemented in this prototype.
        - generic [ref=e65]:
          - button "Dashboard · /dashboard" [ref=e66] [cursor=pointer]
          - button "My Work · /my-work" [ref=e67] [cursor=pointer]
          - button "Tasks · /tasks" [ref=e68] [cursor=pointer]
          - button "Decisions · /decisions" [ref=e69] [cursor=pointer]
          - button "Time · /time" [ref=e70] [cursor=pointer]
          - button "Workforce · /workforce" [ref=e71] [cursor=pointer]
          - button "Learning · /learning" [ref=e72] [cursor=pointer]
          - button "Projects · /projects" [ref=e73] [cursor=pointer]
          - button "Project documents · /documents" [ref=e74] [cursor=pointer]
          - button "Drawing register · /revisions" [ref=e75] [cursor=pointer]
          - button "Internal reviews · /reviews" [ref=e76] [cursor=pointer]
          - button "Client reviews · /client-reviews" [ref=e77] [cursor=pointer]
          - button "Turnkey operations · /turnkey" [ref=e78] [cursor=pointer]
          - button "Site delivery · /site" [ref=e79] [cursor=pointer]
          - button "People · /people" [ref=e80] [cursor=pointer]
          - button "Sales & clients · /crm" [ref=e81] [cursor=pointer]
          - button "Performance · /performance" [ref=e82] [cursor=pointer]
          - button "Project Health · /project-health" [ref=e83] [cursor=pointer]
          - button "Reports · /reports" [ref=e84] [cursor=pointer]
          - button "Scheduled summaries · /scheduled-summaries" [ref=e85] [cursor=pointer]
          - button "Evidence assistance · /evidence-assistance" [ref=e86] [cursor=pointer]
          - button "Settings · /settings" [ref=e87] [cursor=pointer]
          - button "Automation · /automation" [ref=e88] [cursor=pointer]
          - button "External access · /external-access" [ref=e89] [cursor=pointer]
          - button "Audit & retention · /audit" [ref=e90] [cursor=pointer]
  - status [ref=e91]
  - dialog [ref=e92]:
    - generic [ref=e93]:
      - banner [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96]: MAKE THE NEXT STEP CLEAR
          - heading "Create task" [level=2] [ref=e97]
          - paragraph [ref=e98]: A clear brief. One accountable owner.
        - generic [ref=e99]:
          - group [ref=e100]:
            - generic "Demo states" [ref=e101] [cursor=pointer]
            - option "Success" [selected]
            - option "Lost response after creation"
            - option "Capacity warning"
            - option "Access denied"
          - button "Close create task" [ref=e102] [cursor=pointer]: ×
      - group "Task details" [ref=e105]:
        - navigation "Task scope" [ref=e107]:
          - button "▧ Project task" [pressed] [ref=e108] [cursor=pointer]
          - button "☷ Non-project task" [ref=e109] [cursor=pointer]
        - generic [ref=e110]:
          - generic [ref=e111]:
            - text: Task name *
            - textbox "Task name *" [ref=e112]:
              - /placeholder: e.g. Revise the bedroom lighting plan
          - complementary "Task assignment" [ref=e113]:
            - generic [ref=e114]:
              - strong [ref=e115]: Assignment & timing
              - generic [ref=e116]: To do
            - generic [ref=e117]:
              - text: Project *
              - combobox "Project *" [ref=e118]:
                - option "Choose a project" [selected]
                - option "Lakeview Residence"
                - option "Palm Courtyard Villa"
                - option "Studio Office Fit-out"
                - option "Swagath Delight"
            - generic [ref=e119]:
              - generic [ref=e120]: Primary owner *
              - generic [ref=e121]:
                - generic [ref=e122]: AS
                - generic [ref=e123]: Asha · You
              - paragraph [ref=e124]: One person is accountable for this task.
            - generic [ref=e125]:
              - text: Target date *
              - textbox "Target date *" [ref=e126]
            - generic [ref=e127]:
              - text: Priority
              - combobox "Priority" [ref=e128]:
                - option "Normal" [selected]
                - option "High"
                - option "Urgent"
                - option "Low"
            - generic [ref=e129]:
              - text: Review requirement
              - combobox "Review requirement" [ref=e130]:
                - option "No review required" [selected]
                - option "Internal review"
                - option "Client review"
                - option "Internal and client review"
            - paragraph [ref=e131]: Reviewer selection and decisions stay in the review workflow.
          - generic [ref=e132]:
            - text: Task brief · optional
            - textbox "Task brief · optional A useful brief helps the next person start without another conversation." [ref=e133]:
              - /placeholder: What needs to be delivered? Add scope, context and the expected result.
            - paragraph [ref=e134]: A useful brief helps the next person start without another conversation.
          - generic [ref=e135]:
            - text: Why is this task needed? *
            - textbox "Why is this task needed? * Kept with the task’s creation history." [ref=e136]:
              - /placeholder: e.g. Incorporate the agreed client feedback
            - paragraph [ref=e137]: Kept with the task’s creation history.
          - region "Optional task details" [ref=e138]:
            - text: +
            - group [ref=e139]:
              - generic "Planning · stage, start date & effort +" [ref=e140] [cursor=pointer]:
                - generic [ref=e141]: Planning · stage, start date & effort
                - text: +
              - option "No linked plan item" [selected]
              - option "Drawing" [selected]
              - option "Design"
              - option "Evidence"
              - option "Site report"
              - option "Training"
              - option "Other"
            - group [ref=e142]:
              - generic "Checklist & tags · optional +" [ref=e143] [cursor=pointer]:
                - generic [ref=e144]: Checklist & tags · optional
                - text: +
      - contentinfo [ref=e145]:
        - generic [ref=e146]: 4 required details remaining
        - generic [ref=e149]:
          - button "Cancel" [ref=e150] [cursor=pointer]
          - button "Create task" [ref=e151] [cursor=pointer]
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
> 29 |  test.afterEach(async({page})=>{expect(page.__errors).toEqual([]);expect(page.__requests).toEqual([]);});
     |                                                       ^ Error: expect(received).toEqual(expected) // deep equality
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