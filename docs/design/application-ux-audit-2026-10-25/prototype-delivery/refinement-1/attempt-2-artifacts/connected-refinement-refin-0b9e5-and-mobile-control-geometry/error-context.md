# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 1440px >> unsaved details, keyboard focus return and mobile control geometry
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
        - generic [ref=e53]: Workspace / My Work
        - generic [ref=e54]:
          - generic [ref=e55]: ◦ Sample data / no backend
          - button "New task" [ref=e56] [cursor=pointer]
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]: WORKSPACE / TASKS
            - heading "My Work" [level=1] [ref=e61]
            - paragraph [ref=e62]: Your priorities, reviews and next actions — in one place.
          - generic "Work scope" [ref=e63]:
            - button "My Work" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - button "Show 5 Needs action tasks" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]:
              - generic [aria-hidden] [ref=e68]: ◈
              - text: Needs action
            - generic [aria-hidden] [ref=e69]: "5"
            - generic [ref=e70]:
              - generic [ref=e71]: Tasks needing attention
              - generic [aria-hidden] [ref=e72]: ↗
          - button "Show 2 Overdue tasks" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]:
              - generic [aria-hidden] [ref=e75]: ◷
              - text: Overdue
            - generic [aria-hidden] [ref=e76]: "2"
            - generic [ref=e77]:
              - generic [ref=e78]: Past due and incomplete
              - generic [aria-hidden] [ref=e79]: ↗
          - button "Show 1 Reviews / corrections task" [ref=e80] [cursor=pointer]:
            - generic [ref=e81]:
              - generic [aria-hidden] [ref=e82]: ◇
              - text: Reviews / corrections
            - generic [aria-hidden] [ref=e83]: "1"
            - generic [ref=e84]:
              - generic [ref=e85]: Tasks with review obligations
              - generic [aria-hidden] [ref=e86]: ↗
          - button "Show 0 Waiting / blocked tasks" [ref=e87] [cursor=pointer]:
            - generic [ref=e88]:
              - generic [aria-hidden] [ref=e89]: ⊘
              - text: Waiting / blocked
            - generic [aria-hidden] [ref=e90]: "0"
            - generic [ref=e91]:
              - generic [ref=e92]: Waiting for next actor
              - generic [aria-hidden] [ref=e93]: ↗
        - region "My work task list" [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]:
              - heading "Work queue" [level=2] [ref=e97]
              - paragraph [ref=e98]: 8 visible tasks · Sample data · Action shortcuts are not duplicate tasks
            - generic [ref=e99]:
              - button "＋ Create task" [ref=e100] [cursor=pointer]
              - button "⚙ Customize" [ref=e101] [cursor=pointer]
          - generic [ref=e102]:
            - generic [ref=e103]:
              - text: ⌕
              - searchbox "Search tasks" [ref=e104]
            - generic [ref=e105]:
              - button "☷ Filters" [ref=e106] [cursor=pointer]
              - button "◇ Save view" [ref=e107] [cursor=pointer]
              - combobox "Saved view" [ref=e108]:
                - option "Default view" [selected]
          - generic [ref=e110]:
            - generic [ref=e111]:
              - text: 8 tasks ·
              - generic [ref=e112]:
                - text: Group
                - combobox "Group tasks" [ref=e113]:
                  - option "Due date" [selected]
                  - option "Project"
                  - option "Status"
                  - option "Priority"
                  - option "Primary worker"
            - generic [ref=e114]:
              - text: "Sort:"
              - combobox "Sort tasks" [ref=e115]:
                - option "Priority · due" [selected]
                - option "Nearest due"
                - option "Task name"
          - group "Filter by task status colour" [ref=e116]:
            - generic [ref=e117]: Status colours
            - generic [ref=e118]:
              - button "To do" [ref=e119] [cursor=pointer]
              - button "In progress" [ref=e121] [cursor=pointer]
              - button "Review" [ref=e123] [cursor=pointer]
              - button "Correction" [ref=e125] [cursor=pointer]
              - button "Waiting" [ref=e127] [cursor=pointer]
              - button "Done" [ref=e129] [cursor=pointer]
            - generic [ref=e131]: Select a colour to filter
          - list [ref=e132]:
            - generic [ref=e133]:
              - button "▾ Pinned 1" [expanded] [ref=e134] [cursor=pointer]:
                - generic [ref=e135]: ▾
                - text: Pinned
                - generic [ref=e136]: "1"
              - generic [ref=e137]:
                - generic [ref=e138]: Task
                - generic [ref=e139]: Project / stage
                - generic [ref=e140]: People
                - generic [ref=e141]: Due
                - generic [ref=e142]: Status
                - generic [ref=e143]: Priority
                - generic [ref=e144]: Next action
              - listitem "Open Revise bedroom wardrobe working drawing; Correction; High priority; 1d overdue" [ref=e145] [cursor=pointer]:
                - generic [ref=e146]:
                  - button "Unpin Revise bedroom wardrobe working drawing" [ref=e147]: ◆
                  - generic [ref=e148]:
                    - strong [ref=e150]: Revise bedroom wardrobe working drawing
                    - generic [ref=e151]: SS-142 · Lakeview Residence · Working drawings
                    - generic [ref=e152]: "Next: Open correction"
                - generic [ref=e153]:
                  - text: Lakeview Residence
                  - generic [ref=e154]: Working drawings
                - 'button "People on Revise bedroom wardrobe working drawing: responsible Asha, 1 collaborators, assigned by Meera" [ref=e156]':
                  - generic [ref=e157]:
                    - generic "Asha" [ref=e158]: AS
                    - generic "Neha" [ref=e159]: NE
                  - generic [ref=e160]:
                    - strong [ref=e161]: Asha +1
                    - generic [ref=e162]: By Meera
                - generic [ref=e163]: 1d overdue
                - generic [ref=e164]: Correction
                - generic [ref=e166]: High
                - button "Open correction" [ref=e169]
            - generic [ref=e170]:
              - button "▾ Needs My Action 4" [expanded] [ref=e171] [cursor=pointer]:
                - generic [ref=e172]: ▾
                - text: Needs My Action
                - generic [ref=e173]: "4"
              - generic [ref=e174]:
                - generic [ref=e175]: Task
                - generic [ref=e176]: Project / stage
                - generic [ref=e177]: People
                - generic [ref=e178]: Due
                - generic [ref=e179]: Status
                - generic [ref=e180]: Priority
                - generic [ref=e181]: Next action
              - listitem "Open Correct wardrobe clearances from internal review; In progress; High priority; 1d overdue" [ref=e182] [cursor=pointer]:
                - generic [ref=e183]:
                  - button "Pin Correct wardrobe clearances from internal review" [ref=e184]: ◇
                  - generic [ref=e185]:
                    - strong [ref=e187]: Correct wardrobe clearances from internal review
                    - generic [ref=e188]: SS-143 · Lakeview Residence · Working drawings
                    - generic [ref=e189]: "Next: Complete linked correction"
                - generic [ref=e190]:
                  - text: Lakeview Residence
                  - generic [ref=e191]: Working drawings
                - 'button "People on Correct wardrobe clearances from internal review: responsible Asha, 0 collaborators, assigned by Meera" [active] [ref=e193]':
                  - generic "Asha" [ref=e195]: AS
                  - generic [ref=e196]:
                    - strong [ref=e197]: Asha
                    - generic [ref=e198]: By Meera
                - generic [ref=e199]: 1d overdue
                - generic [ref=e200]: In progress
                - generic [ref=e202]: High
                - button "Complete linked correction" [ref=e205]
              - listitem "Open Request revised ceiling working drawing; To do; High priority; Tomorrow" [ref=e206] [cursor=pointer]:
                - generic [ref=e207]:
                  - button "Pin Request revised ceiling working drawing" [ref=e208]: ◇
                  - generic [ref=e209]:
                    - strong [ref=e211]: Request revised ceiling working drawing
                    - generic [ref=e212]: SS-224 · Swagath Delight · Site execution
                    - generic [ref=e213]: "Next: Open task"
                - generic [ref=e214]:
                  - text: Swagath Delight
                  - generic [ref=e215]: Site execution
                - 'button "People on Request revised ceiling working drawing: responsible Kiran, 1 collaborators, assigned by Meera" [ref=e217]':
                  - generic [ref=e218]:
                    - generic "Kiran" [ref=e219]: KI
                    - generic "Asha" [ref=e220]: AS
                  - generic [ref=e221]:
                    - strong [ref=e222]: Kiran +1
                    - generic [ref=e223]: By Meera
                - generic [ref=e224]: Tomorrow
                - generic [ref=e225]: To do
                - generic [ref=e227]: High
                - button "Open task" [ref=e230]
              - listitem "Open Submit kitchen 3D perspective; In progress; Normal priority; Today" [ref=e231] [cursor=pointer]:
                - generic [ref=e232]:
                  - button "Pin Submit kitchen 3D perspective" [ref=e233]: ◇
                  - generic [ref=e234]:
                    - strong [ref=e236]: Submit kitchen 3D perspective
                    - generic [ref=e237]: SS-153 · Palm Courtyard Villa · 3D design
                    - generic [ref=e238]: "Next: Upload design"
                - generic [ref=e239]:
                  - text: Palm Courtyard Villa
                  - generic [ref=e240]: 3D design
                - 'button "People on Submit kitchen 3D perspective: responsible Neha, 1 collaborators, assigned by Meera" [ref=e242]':
                  - generic [ref=e243]:
                    - generic "Neha" [ref=e244]: NE
                    - generic "Asha" [ref=e245]: AS
                  - generic [ref=e246]:
                    - strong [ref=e247]: Neha +1
                    - generic [ref=e248]: By Meera
                - generic [ref=e249]: Today
                - generic [ref=e250]: In progress
                - generic [ref=e252]: Normal
                - button "Upload design" [ref=e255]
              - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 27 Oct" [ref=e256] [cursor=pointer]:
                - generic [ref=e257]:
                  - button "Pin Update lounge false-ceiling plan" [ref=e258]: ◇
                  - generic [ref=e259]:
                    - strong [ref=e261]: Update lounge false-ceiling plan
                    - generic [ref=e262]: SS-176 · Swagath Delight · Working drawings
                    - generic [ref=e263]: "Next: Open task"
                - generic [ref=e264]:
                  - text: Swagath Delight
                  - generic [ref=e265]: Working drawings
                - 'button "People on Update lounge false-ceiling plan: responsible Asha, 0 collaborators, assigned by Meera" [ref=e267]':
                  - generic "Asha" [ref=e269]: AS
                  - generic [ref=e270]:
                    - strong [ref=e271]: Asha
                    - generic [ref=e272]: By Meera
                - generic [ref=e273]: 27 Oct
                - generic [ref=e274]: To do
                - generic [ref=e276]: Normal
                - button "Open task" [ref=e279]
            - generic [ref=e280]:
              - button "▾ Next week 1" [expanded] [ref=e281] [cursor=pointer]:
                - generic [ref=e282]: ▾
                - text: Next week
                - generic [ref=e283]: "1"
              - generic [ref=e284]:
                - generic [ref=e285]: Task
                - generic [ref=e286]: Project / stage
                - generic [ref=e287]: People
                - generic [ref=e288]: Due
                - generic [ref=e289]: Status
                - generic [ref=e290]: Priority
                - generic [ref=e291]: Next action
              - listitem "Open Personal learning and SOP review; To do; Low priority; 5 Nov" [ref=e292] [cursor=pointer]:
                - generic [ref=e293]:
                  - button "Pin Personal learning and SOP review" [ref=e294]: ◇
                  - generic [ref=e295]:
                    - strong [ref=e297]: Personal learning and SOP review
                    - generic [ref=e298]: SS-427 · Sense Studios Internal · Training
                    - generic [ref=e299]: "Next: Open task"
                - generic [ref=e300]:
                  - text: Sense Studios Internal
                  - generic [ref=e301]: Training
                - 'button "People on Personal learning and SOP review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e303]':
                  - generic "Asha" [ref=e305]: AS
                  - generic [ref=e306]:
                    - strong [ref=e307]: Asha
                    - generic [ref=e308]: By Meera
                - generic [ref=e309]: 5 Nov
                - generic [ref=e310]: To do
                - generic [ref=e312]: Low
                - button "Open task" [ref=e315]
            - generic [ref=e316]:
              - button "▾ Later 1" [expanded] [ref=e317] [cursor=pointer]:
                - generic [ref=e318]: ▾
                - text: Later
                - generic [ref=e319]: "1"
              - generic [ref=e320]:
                - generic [ref=e321]: Task
                - generic [ref=e322]: Project / stage
                - generic [ref=e323]: People
                - generic [ref=e324]: Due
                - generic [ref=e325]: Status
                - generic [ref=e326]: Priority
                - generic [ref=e327]: Next action
              - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 11 Nov" [ref=e328] [cursor=pointer]:
                - generic [ref=e329]:
                  - button "Pin Coordinate fixture specification samples" [ref=e330]: ◇
                  - generic [ref=e331]:
                    - strong [ref=e333]: Coordinate fixture specification samples
                    - generic [ref=e334]: SS-190 · Palm Courtyard Villa · Material selection
                    - generic [ref=e335]: "Next: Confirm samples"
                - generic [ref=e336]:
                  - text: Palm Courtyard Villa
                  - generic [ref=e337]: Material selection
                - 'button "People on Coordinate fixture specification samples: responsible Asha, 0 collaborators, assigned by Meera" [ref=e339]':
                  - generic "Asha" [ref=e341]: AS
                  - generic [ref=e342]:
                    - strong [ref=e343]: Asha
                    - generic [ref=e344]: By Meera
                - generic [ref=e345]: 11 Nov
                - generic [ref=e346]: To do
                - generic [ref=e348]: Normal
                - button "Confirm samples" [ref=e351]
            - generic [ref=e352]:
              - button "▾ Without a date 1" [expanded] [ref=e353] [cursor=pointer]:
                - generic [ref=e354]: ▾
                - text: Without a date
                - generic [ref=e355]: "1"
              - generic [ref=e356]:
                - generic [ref=e357]: Task
                - generic [ref=e358]: Project / stage
                - generic [ref=e359]: People
                - generic [ref=e360]: Due
                - generic [ref=e361]: Status
                - generic [ref=e362]: Priority
                - generic [ref=e363]: Next action
              - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e364] [cursor=pointer]:
                - generic [ref=e365]:
                  - button "Pin Review archived concept references" [ref=e366]: ◇
                  - generic [ref=e367]:
                    - strong [ref=e369]: Review archived concept references
                    - generic [ref=e370]: SS-192 · Studio Office Fit-out · Planning
                    - generic [ref=e371]: "Next: Open backlog"
                - generic [ref=e372]:
                  - text: Studio Office Fit-out
                  - generic [ref=e373]: Planning
                - 'button "People on Review archived concept references: responsible Asha, 0 collaborators, assigned by Meera" [ref=e375]':
                  - generic "Asha" [ref=e377]: AS
                  - generic [ref=e378]:
                    - strong [ref=e379]: Asha
                    - generic [ref=e380]: By Meera
                - generic [ref=e381]: No date
                - generic [ref=e382]: To do
                - generic [ref=e384]: Low
                - button "Open backlog" [ref=e387]
        - generic [ref=e388]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - dialog [ref=e390]:
    - heading "People · SS-143" [level=3] [ref=e391]
    - generic [ref=e393]:
      - generic [ref=e394]: Sample participants only. Assigned by, task owner, collaborators and reviewer are separate relationships; live membership and audit data must come from existing APIs.
      - generic [ref=e395]:
        - generic "Asha" [ref=e396]: AS
        - generic [ref=e397]:
          - generic [ref=e398]: Asha
          - generic [ref=e399]: Responsible worker · Designer
      - generic [ref=e400]: No collaborators assigned
      - generic [ref=e401]:
        - generic "Meera" [ref=e402]: ME
        - generic [ref=e403]:
          - generic [ref=e404]: Meera
          - generic [ref=e405]: Assigned by · from task assignment history, not a collaborator
      - paragraph [ref=e406]: "Reviewer: Team Leader · Reviewer is a separate role, not automatically a worker."
    - generic [ref=e407]:
      - button "Close" [ref=e408] [cursor=pointer]
      - button "Open task details" [ref=e409] [cursor=pointer]
  - status [ref=e410]
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