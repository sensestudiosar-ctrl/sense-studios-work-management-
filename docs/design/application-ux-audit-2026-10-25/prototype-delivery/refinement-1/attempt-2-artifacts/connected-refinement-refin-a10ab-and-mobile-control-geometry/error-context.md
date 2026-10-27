# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 1024px >> unsaved details, keyboard focus return and mobile control geometry
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
                - generic [ref=e124]: Due
                - generic [ref=e125]: Status
                - generic [ref=e126]: Priority
                - generic [ref=e127]: Next action
              - listitem "Open Revise bedroom wardrobe working drawing; Correction; High priority; 1d overdue" [ref=e128] [cursor=pointer]:
                - generic [ref=e129]:
                  - button "Unpin Revise bedroom wardrobe working drawing" [ref=e130]: ◆
                  - generic [ref=e131]:
                    - strong [ref=e133]: Revise bedroom wardrobe working drawing
                    - generic [ref=e134]: SS-142 · Lakeview Residence · Working drawings
                    - generic [ref=e135]: "Next: Open correction"
                - 'button "People on Revise bedroom wardrobe working drawing: responsible Asha, 1 collaborators, assigned by Meera" [ref=e137]':
                  - generic [ref=e138]:
                    - generic "Asha" [ref=e139]: AS
                    - generic "Neha" [ref=e140]: NE
                  - generic [ref=e141]:
                    - strong [ref=e142]: Asha +1
                    - generic [ref=e143]: By Meera
                - generic [ref=e144]: 1d overdue
                - generic [ref=e145]: Correction
                - generic [ref=e147]: High
                - button "Open correction" [ref=e150]
            - generic [ref=e151]:
              - button "▾ Needs My Action 4" [expanded] [ref=e152] [cursor=pointer]:
                - generic [ref=e153]: ▾
                - text: Needs My Action
                - generic [ref=e154]: "4"
              - generic [ref=e155]:
                - generic [ref=e156]: Task
                - generic [ref=e157]: People
                - generic [ref=e158]: Due
                - generic [ref=e159]: Status
                - generic [ref=e160]: Priority
                - generic [ref=e161]: Next action
              - listitem "Open Correct wardrobe clearances from internal review; In progress; High priority; 1d overdue" [ref=e162] [cursor=pointer]:
                - generic [ref=e163]:
                  - button "Pin Correct wardrobe clearances from internal review" [ref=e164]: ◇
                  - generic [ref=e165]:
                    - strong [ref=e167]: Correct wardrobe clearances from internal review
                    - generic [ref=e168]: SS-143 · Lakeview Residence · Working drawings
                    - generic [ref=e169]: "Next: Complete linked correction"
                - 'button "People on Correct wardrobe clearances from internal review: responsible Asha, 0 collaborators, assigned by Meera" [active] [ref=e171]':
                  - generic "Asha" [ref=e173]: AS
                  - generic [ref=e174]:
                    - strong [ref=e175]: Asha
                    - generic [ref=e176]: By Meera
                - generic [ref=e177]: 1d overdue
                - generic [ref=e178]: In progress
                - generic [ref=e180]: High
                - button "Complete linked correction" [ref=e183]
              - listitem "Open Request revised ceiling working drawing; To do; High priority; Tomorrow" [ref=e184] [cursor=pointer]:
                - generic [ref=e185]:
                  - button "Pin Request revised ceiling working drawing" [ref=e186]: ◇
                  - generic [ref=e187]:
                    - strong [ref=e189]: Request revised ceiling working drawing
                    - generic [ref=e190]: SS-224 · Swagath Delight · Site execution
                    - generic [ref=e191]: "Next: Open task"
                - 'button "People on Request revised ceiling working drawing: responsible Kiran, 1 collaborators, assigned by Meera" [ref=e193]':
                  - generic [ref=e194]:
                    - generic "Kiran" [ref=e195]: KI
                    - generic "Asha" [ref=e196]: AS
                  - generic [ref=e197]:
                    - strong [ref=e198]: Kiran +1
                    - generic [ref=e199]: By Meera
                - generic [ref=e200]: Tomorrow
                - generic [ref=e201]: To do
                - generic [ref=e203]: High
                - button "Open task" [ref=e206]
              - listitem "Open Submit kitchen 3D perspective; In progress; Normal priority; Today" [ref=e207] [cursor=pointer]:
                - generic [ref=e208]:
                  - button "Pin Submit kitchen 3D perspective" [ref=e209]: ◇
                  - generic [ref=e210]:
                    - strong [ref=e212]: Submit kitchen 3D perspective
                    - generic [ref=e213]: SS-153 · Palm Courtyard Villa · 3D design
                    - generic [ref=e214]: "Next: Upload design"
                - 'button "People on Submit kitchen 3D perspective: responsible Neha, 1 collaborators, assigned by Meera" [ref=e216]':
                  - generic [ref=e217]:
                    - generic "Neha" [ref=e218]: NE
                    - generic "Asha" [ref=e219]: AS
                  - generic [ref=e220]:
                    - strong [ref=e221]: Neha +1
                    - generic [ref=e222]: By Meera
                - generic [ref=e223]: Today
                - generic [ref=e224]: In progress
                - generic [ref=e226]: Normal
                - button "Upload design" [ref=e229]
              - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 27 Oct" [ref=e230] [cursor=pointer]:
                - generic [ref=e231]:
                  - button "Pin Update lounge false-ceiling plan" [ref=e232]: ◇
                  - generic [ref=e233]:
                    - strong [ref=e235]: Update lounge false-ceiling plan
                    - generic [ref=e236]: SS-176 · Swagath Delight · Working drawings
                    - generic [ref=e237]: "Next: Open task"
                - 'button "People on Update lounge false-ceiling plan: responsible Asha, 0 collaborators, assigned by Meera" [ref=e239]':
                  - generic "Asha" [ref=e241]: AS
                  - generic [ref=e242]:
                    - strong [ref=e243]: Asha
                    - generic [ref=e244]: By Meera
                - generic [ref=e245]: 27 Oct
                - generic [ref=e246]: To do
                - generic [ref=e248]: Normal
                - button "Open task" [ref=e251]
            - generic [ref=e252]:
              - button "▾ Next week 1" [expanded] [ref=e253] [cursor=pointer]:
                - generic [ref=e254]: ▾
                - text: Next week
                - generic [ref=e255]: "1"
              - generic [ref=e256]:
                - generic [ref=e257]: Task
                - generic [ref=e258]: People
                - generic [ref=e259]: Due
                - generic [ref=e260]: Status
                - generic [ref=e261]: Priority
                - generic [ref=e262]: Next action
              - listitem "Open Personal learning and SOP review; To do; Low priority; 5 Nov" [ref=e263] [cursor=pointer]:
                - generic [ref=e264]:
                  - button "Pin Personal learning and SOP review" [ref=e265]: ◇
                  - generic [ref=e266]:
                    - strong [ref=e268]: Personal learning and SOP review
                    - generic [ref=e269]: SS-427 · Sense Studios Internal · Training
                    - generic [ref=e270]: "Next: Open task"
                - 'button "People on Personal learning and SOP review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e272]':
                  - generic "Asha" [ref=e274]: AS
                  - generic [ref=e275]:
                    - strong [ref=e276]: Asha
                    - generic [ref=e277]: By Meera
                - generic [ref=e278]: 5 Nov
                - generic [ref=e279]: To do
                - generic [ref=e281]: Low
                - button "Open task" [ref=e284]
            - generic [ref=e285]:
              - button "▾ Later 1" [expanded] [ref=e286] [cursor=pointer]:
                - generic [ref=e287]: ▾
                - text: Later
                - generic [ref=e288]: "1"
              - generic [ref=e289]:
                - generic [ref=e290]: Task
                - generic [ref=e291]: People
                - generic [ref=e292]: Due
                - generic [ref=e293]: Status
                - generic [ref=e294]: Priority
                - generic [ref=e295]: Next action
              - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 11 Nov" [ref=e296] [cursor=pointer]:
                - generic [ref=e297]:
                  - button "Pin Coordinate fixture specification samples" [ref=e298]: ◇
                  - generic [ref=e299]:
                    - strong [ref=e301]: Coordinate fixture specification samples
                    - generic [ref=e302]: SS-190 · Palm Courtyard Villa · Material selection
                    - generic [ref=e303]: "Next: Confirm samples"
                - 'button "People on Coordinate fixture specification samples: responsible Asha, 0 collaborators, assigned by Meera" [ref=e305]':
                  - generic "Asha" [ref=e307]: AS
                  - generic [ref=e308]:
                    - strong [ref=e309]: Asha
                    - generic [ref=e310]: By Meera
                - generic [ref=e311]: 11 Nov
                - generic [ref=e312]: To do
                - generic [ref=e314]: Normal
                - button "Confirm samples" [ref=e317]
            - generic [ref=e318]:
              - button "▾ Without a date 1" [expanded] [ref=e319] [cursor=pointer]:
                - generic [ref=e320]: ▾
                - text: Without a date
                - generic [ref=e321]: "1"
              - generic [ref=e322]:
                - generic [ref=e323]: Task
                - generic [ref=e324]: People
                - generic [ref=e325]: Due
                - generic [ref=e326]: Status
                - generic [ref=e327]: Priority
                - generic [ref=e328]: Next action
              - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e329] [cursor=pointer]:
                - generic [ref=e330]:
                  - button "Pin Review archived concept references" [ref=e331]: ◇
                  - generic [ref=e332]:
                    - strong [ref=e334]: Review archived concept references
                    - generic [ref=e335]: SS-192 · Studio Office Fit-out · Planning
                    - generic [ref=e336]: "Next: Open backlog"
                - 'button "People on Review archived concept references: responsible Asha, 0 collaborators, assigned by Meera" [ref=e338]':
                  - generic "Asha" [ref=e340]: AS
                  - generic [ref=e341]:
                    - strong [ref=e342]: Asha
                    - generic [ref=e343]: By Meera
                - generic [ref=e344]: No date
                - generic [ref=e345]: To do
                - generic [ref=e347]: Low
                - button "Open backlog" [ref=e350]
        - generic [ref=e351]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - dialog [ref=e353]:
    - heading "People · SS-143" [level=3] [ref=e354]
    - generic [ref=e356]:
      - generic [ref=e357]: Sample participants only. Assigned by, task owner, collaborators and reviewer are separate relationships; live membership and audit data must come from existing APIs.
      - generic [ref=e358]:
        - generic "Asha" [ref=e359]: AS
        - generic [ref=e360]:
          - generic [ref=e361]: Asha
          - generic [ref=e362]: Responsible worker · Designer
      - generic [ref=e363]: No collaborators assigned
      - generic [ref=e364]:
        - generic "Meera" [ref=e365]: ME
        - generic [ref=e366]:
          - generic [ref=e367]: Meera
          - generic [ref=e368]: Assigned by · from task assignment history, not a collaborator
      - paragraph [ref=e369]: "Reviewer: Team Leader · Reviewer is a separate role, not automatically a worker."
    - generic [ref=e370]:
      - button "Close" [ref=e371] [cursor=pointer]
      - button "Open task details" [ref=e372] [cursor=pointer]
  - status [ref=e373]
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