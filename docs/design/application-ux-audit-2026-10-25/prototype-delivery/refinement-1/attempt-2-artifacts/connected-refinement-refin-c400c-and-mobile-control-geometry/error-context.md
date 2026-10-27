# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 768px >> unsaved details, keyboard focus return and mobile control geometry
- Location: docs\v1-demo\connected-refinement.spec.mjs:36:2

# Error details

```
TimeoutError: locator.fill: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('#cx-reason')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to work content" [ref=e2] [cursor=pointer]:
    - /url: "#connected-work"
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
      - generic [ref=e10]: SS
      - generic [ref=e12]:
        - button [ref=e13] [cursor=pointer]
        - button [ref=e14] [cursor=pointer]
        - button [ref=e15] [cursor=pointer]
        - button [ref=e16] [cursor=pointer]
        - group [ref=e17]:
          - generic "More daily tools" [ref=e18] [cursor=pointer]
        - group [ref=e19]:
          - generic "Project work" [ref=e20] [cursor=pointer]
          - button [ref=e21] [cursor=pointer]
          - button [ref=e22] [cursor=pointer]
          - button [ref=e23] [cursor=pointer]
          - button [ref=e24] [cursor=pointer]
          - button [ref=e25] [cursor=pointer]
          - button [ref=e26] [cursor=pointer]
          - button [ref=e27] [cursor=pointer]
        - group [ref=e28]:
          - generic "Management" [ref=e29] [cursor=pointer]
        - group [ref=e30]:
          - generic "Configuration" [ref=e31] [cursor=pointer]
      - generic [ref=e32]: SS
    - main [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: Workspace / My Work
        - generic [ref=e38]:
          - generic [ref=e39]: ◦ Sample data / no backend
          - button "New task" [ref=e40] [cursor=pointer]
      - generic [ref=e41]:
        - generic [ref=e42]:
          - generic [ref=e43]:
            - generic [ref=e44]: WORKSPACE / TASKS
            - heading "My Work" [level=1] [ref=e45]
            - paragraph [ref=e46]: Your priorities, reviews and next actions — in one place.
          - generic "Work scope" [ref=e47]:
            - button "My Work" [ref=e48] [cursor=pointer]
        - generic [ref=e49]:
          - button "Show 5 Needs action tasks" [ref=e50] [cursor=pointer]:
            - generic [ref=e51]:
              - generic [aria-hidden] [ref=e52]: ◈
              - text: Needs action
            - generic [aria-hidden] [ref=e53]: "5"
            - generic [ref=e54]:
              - generic [ref=e55]: Tasks needing attention
              - generic [aria-hidden] [ref=e56]: ↗
          - button "Show 2 Overdue tasks" [ref=e57] [cursor=pointer]:
            - generic [ref=e58]:
              - generic [aria-hidden] [ref=e59]: ◷
              - text: Overdue
            - generic [aria-hidden] [ref=e60]: "2"
            - generic [ref=e61]:
              - generic [ref=e62]: Past due and incomplete
              - generic [aria-hidden] [ref=e63]: ↗
          - button "Show 1 Reviews / corrections task" [ref=e64] [cursor=pointer]:
            - generic [ref=e65]:
              - generic [aria-hidden] [ref=e66]: ◇
              - text: Reviews / corrections
            - generic [aria-hidden] [ref=e67]: "1"
            - generic [ref=e68]:
              - generic [ref=e69]: Tasks with review obligations
              - generic [aria-hidden] [ref=e70]: ↗
          - button "Show 0 Waiting / blocked tasks" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]:
              - generic [aria-hidden] [ref=e73]: ⊘
              - text: Waiting / blocked
            - generic [aria-hidden] [ref=e74]: "0"
            - generic [ref=e75]:
              - generic [ref=e76]: Waiting for next actor
              - generic [aria-hidden] [ref=e77]: ↗
        - region "My work task list" [ref=e78]:
          - generic [ref=e79]:
            - generic [ref=e80]:
              - heading "Work queue" [level=2] [ref=e81]
              - paragraph [ref=e82]: 8 visible tasks · Sample data · Action shortcuts are not duplicate tasks
            - generic [ref=e83]:
              - button "＋ Create task" [ref=e84] [cursor=pointer]
              - button "⚙ Customize" [ref=e85] [cursor=pointer]
          - generic [ref=e86]:
            - generic [ref=e87]:
              - text: ⌕
              - searchbox "Search tasks" [ref=e88]
            - generic [ref=e89]:
              - button "☷ Filters" [ref=e90] [cursor=pointer]
              - button "◇ Save view" [ref=e91] [cursor=pointer]
              - combobox "Saved view" [ref=e92]:
                - option "Default view" [selected]
          - generic [ref=e94]:
            - generic [ref=e95]:
              - text: 8 tasks ·
              - generic [ref=e96]:
                - text: Group
                - combobox "Group tasks" [ref=e97]:
                  - option "Due date" [selected]
                  - option "Project"
                  - option "Status"
                  - option "Priority"
                  - option "Primary worker"
            - generic [ref=e98]:
              - text: "Sort:"
              - combobox "Sort tasks" [ref=e99]:
                - option "Priority · due" [selected]
                - option "Nearest due"
                - option "Task name"
          - group "Filter by task status colour" [ref=e100]:
            - generic [ref=e101]: Status colours
            - generic [ref=e102]:
              - button "To do" [ref=e103] [cursor=pointer]
              - button "In progress" [ref=e105] [cursor=pointer]
              - button "Review" [ref=e107] [cursor=pointer]
              - button "Correction" [ref=e109] [cursor=pointer]
              - button "Waiting" [ref=e111] [cursor=pointer]
              - button "Done" [ref=e113] [cursor=pointer]
            - generic [ref=e115]: Select a colour to filter
          - list [ref=e116]:
            - generic [ref=e117]:
              - button "▾ Pinned 1" [expanded] [ref=e118] [cursor=pointer]:
                - generic [ref=e119]: ▾
                - text: Pinned
                - generic [ref=e120]: "1"
              - generic [ref=e121]:
                - generic [ref=e122]: Task
                - generic [ref=e123]: People
                - generic [ref=e124]: Status
                - generic [ref=e125]: Priority
              - listitem "Open Revise bedroom wardrobe working drawing; Correction; High priority; 1d overdue" [ref=e126] [cursor=pointer]:
                - generic [ref=e127]:
                  - button "Unpin Revise bedroom wardrobe working drawing" [ref=e128]: ◆
                  - generic [ref=e129]:
                    - strong [ref=e131]: Revise bedroom wardrobe working drawing
                    - generic [ref=e132]: SS-142 · Lakeview Residence · Working drawings
                    - generic [ref=e133]: "Next: Open correction"
                - 'button "People on Revise bedroom wardrobe working drawing: responsible Asha, 1 collaborators, assigned by Meera" [ref=e135]':
                  - generic [ref=e136]:
                    - generic "Asha" [ref=e137]: AS
                    - generic "Neha" [ref=e138]: NE
                  - generic [ref=e139]:
                    - strong [ref=e140]: Asha +1
                    - generic [ref=e141]: By Meera
                - generic [ref=e142]: Correction
                - generic [ref=e144]: High
            - generic [ref=e146]:
              - button "▾ Needs My Action 4" [expanded] [ref=e147] [cursor=pointer]:
                - generic [ref=e148]: ▾
                - text: Needs My Action
                - generic [ref=e149]: "4"
              - generic [ref=e150]:
                - generic [ref=e151]: Task
                - generic [ref=e152]: People
                - generic [ref=e153]: Status
                - generic [ref=e154]: Priority
              - listitem "Open Correct wardrobe clearances from internal review; In progress; High priority; 1d overdue" [ref=e155] [cursor=pointer]:
                - generic [ref=e156]:
                  - button "Pin Correct wardrobe clearances from internal review" [ref=e157]: ◇
                  - generic [ref=e158]:
                    - strong [ref=e160]: Correct wardrobe clearances from internal review
                    - generic [ref=e161]: SS-143 · Lakeview Residence · Working drawings
                    - generic [ref=e162]: "Next: Complete linked correction"
                - 'button "People on Correct wardrobe clearances from internal review: responsible Asha, 0 collaborators, assigned by Meera" [active] [ref=e164]':
                  - generic "Asha" [ref=e166]: AS
                  - generic [ref=e167]:
                    - strong [ref=e168]: Asha
                    - generic [ref=e169]: By Meera
                - generic [ref=e170]: In progress
                - generic [ref=e172]: High
              - listitem "Open Request revised ceiling working drawing; To do; High priority; Tomorrow" [ref=e174] [cursor=pointer]:
                - generic [ref=e175]:
                  - button "Pin Request revised ceiling working drawing" [ref=e176]: ◇
                  - generic [ref=e177]:
                    - strong [ref=e179]: Request revised ceiling working drawing
                    - generic [ref=e180]: SS-224 · Swagath Delight · Site execution
                    - generic [ref=e181]: "Next: Open task"
                - 'button "People on Request revised ceiling working drawing: responsible Kiran, 1 collaborators, assigned by Meera" [ref=e183]':
                  - generic [ref=e184]:
                    - generic "Kiran" [ref=e185]: KI
                    - generic "Asha" [ref=e186]: AS
                  - generic [ref=e187]:
                    - strong [ref=e188]: Kiran +1
                    - generic [ref=e189]: By Meera
                - generic [ref=e190]: To do
                - generic [ref=e192]: High
              - listitem "Open Submit kitchen 3D perspective; In progress; Normal priority; Today" [ref=e194] [cursor=pointer]:
                - generic [ref=e195]:
                  - button "Pin Submit kitchen 3D perspective" [ref=e196]: ◇
                  - generic [ref=e197]:
                    - strong [ref=e199]: Submit kitchen 3D perspective
                    - generic [ref=e200]: SS-153 · Palm Courtyard Villa · 3D design
                    - generic [ref=e201]: "Next: Upload design"
                - 'button "People on Submit kitchen 3D perspective: responsible Neha, 1 collaborators, assigned by Meera" [ref=e203]':
                  - generic [ref=e204]:
                    - generic "Neha" [ref=e205]: NE
                    - generic "Asha" [ref=e206]: AS
                  - generic [ref=e207]:
                    - strong [ref=e208]: Neha +1
                    - generic [ref=e209]: By Meera
                - generic [ref=e210]: In progress
                - generic [ref=e212]: Normal
              - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 27 Oct" [ref=e214] [cursor=pointer]:
                - generic [ref=e215]:
                  - button "Pin Update lounge false-ceiling plan" [ref=e216]: ◇
                  - generic [ref=e217]:
                    - strong [ref=e219]: Update lounge false-ceiling plan
                    - generic [ref=e220]: SS-176 · Swagath Delight · Working drawings
                    - generic [ref=e221]: "Next: Open task"
                - 'button "People on Update lounge false-ceiling plan: responsible Asha, 0 collaborators, assigned by Meera" [ref=e223]':
                  - generic "Asha" [ref=e225]: AS
                  - generic [ref=e226]:
                    - strong [ref=e227]: Asha
                    - generic [ref=e228]: By Meera
                - generic [ref=e229]: To do
                - generic [ref=e231]: Normal
            - generic [ref=e233]:
              - button "▾ Next week 1" [expanded] [ref=e234] [cursor=pointer]:
                - generic [ref=e235]: ▾
                - text: Next week
                - generic [ref=e236]: "1"
              - generic [ref=e237]:
                - generic [ref=e238]: Task
                - generic [ref=e239]: People
                - generic [ref=e240]: Status
                - generic [ref=e241]: Priority
              - listitem "Open Personal learning and SOP review; To do; Low priority; 5 Nov" [ref=e242] [cursor=pointer]:
                - generic [ref=e243]:
                  - button "Pin Personal learning and SOP review" [ref=e244]: ◇
                  - generic [ref=e245]:
                    - strong [ref=e247]: Personal learning and SOP review
                    - generic [ref=e248]: SS-427 · Sense Studios Internal · Training
                    - generic [ref=e249]: "Next: Open task"
                - 'button "People on Personal learning and SOP review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e251]':
                  - generic "Asha" [ref=e253]: AS
                  - generic [ref=e254]:
                    - strong [ref=e255]: Asha
                    - generic [ref=e256]: By Meera
                - generic [ref=e257]: To do
                - generic [ref=e259]: Low
            - generic [ref=e261]:
              - button "▾ Later 1" [expanded] [ref=e262] [cursor=pointer]:
                - generic [ref=e263]: ▾
                - text: Later
                - generic [ref=e264]: "1"
              - generic [ref=e265]:
                - generic [ref=e266]: Task
                - generic [ref=e267]: People
                - generic [ref=e268]: Status
                - generic [ref=e269]: Priority
              - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 11 Nov" [ref=e270] [cursor=pointer]:
                - generic [ref=e271]:
                  - button "Pin Coordinate fixture specification samples" [ref=e272]: ◇
                  - generic [ref=e273]:
                    - strong [ref=e275]: Coordinate fixture specification samples
                    - generic [ref=e276]: SS-190 · Palm Courtyard Villa · Material selection
                    - generic [ref=e277]: "Next: Confirm samples"
                - 'button "People on Coordinate fixture specification samples: responsible Asha, 0 collaborators, assigned by Meera" [ref=e279]':
                  - generic "Asha" [ref=e281]: AS
                  - generic [ref=e282]:
                    - strong [ref=e283]: Asha
                    - generic [ref=e284]: By Meera
                - generic [ref=e285]: To do
                - generic [ref=e287]: Normal
            - generic [ref=e289]:
              - button "▾ Without a date 1" [expanded] [ref=e290] [cursor=pointer]:
                - generic [ref=e291]: ▾
                - text: Without a date
                - generic [ref=e292]: "1"
              - generic [ref=e293]:
                - generic [ref=e294]: Task
                - generic [ref=e295]: People
                - generic [ref=e296]: Status
                - generic [ref=e297]: Priority
              - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e298] [cursor=pointer]:
                - generic [ref=e299]:
                  - button "Pin Review archived concept references" [ref=e300]: ◇
                  - generic [ref=e301]:
                    - strong [ref=e303]: Review archived concept references
                    - generic [ref=e304]: SS-192 · Studio Office Fit-out · Planning
                    - generic [ref=e305]: "Next: Open backlog"
                - 'button "People on Review archived concept references: responsible Asha, 0 collaborators, assigned by Meera" [ref=e307]':
                  - generic "Asha" [ref=e309]: AS
                  - generic [ref=e310]:
                    - strong [ref=e311]: Asha
                    - generic [ref=e312]: By Meera
                - generic [ref=e313]: To do
                - generic [ref=e315]: Low
        - generic [ref=e317]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - dialog [ref=e319]:
    - heading "People · SS-143" [level=3] [ref=e320]
    - generic [ref=e322]:
      - generic [ref=e323]: Sample participants only. Assigned by, task owner, collaborators and reviewer are separate relationships; live membership and audit data must come from existing APIs.
      - generic [ref=e324]:
        - generic "Asha" [ref=e325]: AS
        - generic [ref=e326]:
          - generic [ref=e327]: Asha
          - generic [ref=e328]: Responsible worker · Designer
      - generic [ref=e329]: No collaborators assigned
      - generic [ref=e330]:
        - generic "Meera" [ref=e331]: ME
        - generic [ref=e332]:
          - generic [ref=e333]: Meera
          - generic [ref=e334]: Assigned by · from task assignment history, not a collaborator
      - paragraph [ref=e335]: "Reviewer: Team Leader · Reviewer is a separate role, not automatically a worker."
    - generic [ref=e336]:
      - button "Close" [ref=e337] [cursor=pointer]
      - button "Open task details" [ref=e338] [cursor=pointer]
  - status [ref=e339]
  - text: + + +
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
  26 |   await p.locator('.task-row[data-id="SS-142"]').scrollIntoViewIfNeeded();const scroll=await p.evaluate(()=>scrollY);await p.locator('.task-row[data-id="SS-142"]').click();await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('[data-project-task="SS-142"]')).toHaveAttribute('aria-current','true');await expect(p.locator('[data-project-task="SS-142"]')).toContainText('Opened from your task');await p.locator('[data-cx-task="SS-142"]').first().click();await close(p);await p.locator('[data-ref-return]').click();await expect(p.locator('#search')).toHaveValue('wardrobe');await expect(p.locator('#groupBy')).toHaveValue('project');await expect(p.locator('.task-row[data-id="SS-142"]')).toBeFocused();const snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.origin.filters.project).toBe('Lakeview Residence');expect(snapshot.origin.filters.priority).toBe('High');expect(Math.abs((await p.evaluate(()=>scrollY))-scroll)).toBeLessThan(3);
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
> 38 |   await p.locator('.task-row[data-id="SS-143"]').click();await p.locator('#cx-reason').fill('Unsent change');p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).toBeVisible();await expect(p.locator('#cx-reason')).toHaveValue('Unsent change');p.once('dialog',d=>d.accept());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();await expect(p.locator('.task-row[data-id="SS-143"]')).toBeFocused();
     |                                                                                        ^ TimeoutError: locator.fill: Timeout 8000ms exceeded.
  39 |   await p.locator('#cx-new').focus();await p.keyboard.press('Enter');await expect(creation(p).locator('#new-title')).toBeFocused();await creation(p).locator('#new-title').fill('Unsaved creation');await p.keyboard.press('Escape');await expect(creation(p).locator('#new-discard')).toBeVisible();await creation(p).locator('#new-keep').click();await expect(creation(p).locator('#new-title')).toHaveValue('Unsaved creation');await p.keyboard.press('Escape');await creation(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  40 |  });
  41 | });
  42 | 
```