# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mandatory-evidence.spec.mjs >> evidence 1024px >> CLIENT staff preparation uses the same guard without granting client publication
- Location: docs\v1-demo\mandatory-evidence.spec.mjs:36:2

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Start task', exact: true }) resolved to 2 elements:
    1) <button data-quick="DEMO-1792991489604">Start task</button> aka getByRole('listitem', { name: 'Open Mandatory evidence' }).getByRole('button', { name: 'Start task' })
    2) <button class="cx-btn primary" data-cx-action="start-task">Start task</button> aka locator('#cx-detail').getByRole('button', { name: 'Start task' })

Call log:
  - waiting for getByRole('button', { name: 'Start task', exact: true })

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
          - button "Show 6 Needs action tasks" [ref=e50] [cursor=pointer]:
            - generic [ref=e51]:
              - generic [aria-hidden] [ref=e52]: ◈
              - text: Needs action
            - generic [aria-hidden] [ref=e53]: "6"
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
              - paragraph [ref=e82]: 9 visible tasks · Sample data · Action shortcuts are not duplicate tasks
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
              - text: 9 tasks ·
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
                    - generic [ref=e135]: "Next: Open linked correction"
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
                - button "Open linked correction" [ref=e150]
            - generic [ref=e151]:
              - button "▾ Needs My Action 5" [expanded] [ref=e152] [cursor=pointer]:
                - generic [ref=e153]: ▾
                - text: Needs My Action
                - generic [ref=e154]: "5"
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
                    - generic [ref=e169]: "Next: Complete correction"
                - 'button "People on Correct wardrobe clearances from internal review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e171]':
                  - generic "Asha" [ref=e173]: AS
                  - generic [ref=e174]:
                    - strong [ref=e175]: Asha
                    - generic [ref=e176]: By Meera
                - generic [ref=e177]: 1d overdue
                - generic [ref=e178]: In progress
                - generic [ref=e180]: High
                - button "Complete correction" [ref=e183]
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
              - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 28 Oct" [ref=e230] [cursor=pointer]:
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
                - generic [ref=e245]: 28 Oct
                - generic [ref=e246]: To do
                - generic [ref=e248]: Normal
                - button "Open task" [ref=e251]
              - listitem "Open Mandatory evidence CLIENT; To do; Normal priority; 12 Nov" [ref=e252] [cursor=pointer]:
                - generic [ref=e253]:
                  - button "Pin Mandatory evidence CLIENT" [ref=e254]: ◇
                  - generic [ref=e255]:
                    - strong [ref=e257]: Mandatory evidence CLIENT
                    - generic [ref=e258]: DEMO-1792991489604 · Lakeview Residence · No linked plan item
                    - generic [ref=e259]: "Next: Start task"
                - 'button "People on Mandatory evidence CLIENT: responsible Asha, 0 collaborators, assigned by Principal Architect" [ref=e261]':
                  - generic "Asha" [ref=e263]: AS
                  - generic [ref=e264]:
                    - strong [ref=e265]: Asha
                    - generic [ref=e266]: By Principal Architect
                - generic [ref=e267]: 12 Nov
                - generic [ref=e268]: To do
                - generic [ref=e270]: Normal
                - button "Start task" [ref=e273]
            - generic [ref=e274]:
              - button "▾ Next week 1" [expanded] [ref=e275] [cursor=pointer]:
                - generic [ref=e276]: ▾
                - text: Next week
                - generic [ref=e277]: "1"
              - generic [ref=e278]:
                - generic [ref=e279]: Task
                - generic [ref=e280]: People
                - generic [ref=e281]: Due
                - generic [ref=e282]: Status
                - generic [ref=e283]: Priority
                - generic [ref=e284]: Next action
              - listitem "Open Personal learning and SOP review; To do; Low priority; 6 Nov" [ref=e285] [cursor=pointer]:
                - generic [ref=e286]:
                  - button "Pin Personal learning and SOP review" [ref=e287]: ◇
                  - generic [ref=e288]:
                    - strong [ref=e290]: Personal learning and SOP review
                    - generic [ref=e291]: SS-427 · Sense Studios Internal · Training
                    - generic [ref=e292]: "Next: Open task"
                - 'button "People on Personal learning and SOP review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e294]':
                  - generic "Asha" [ref=e296]: AS
                  - generic [ref=e297]:
                    - strong [ref=e298]: Asha
                    - generic [ref=e299]: By Meera
                - generic [ref=e300]: 6 Nov
                - generic [ref=e301]: To do
                - generic [ref=e303]: Low
                - button "Open task" [ref=e306]
            - generic [ref=e307]:
              - button "▾ Later 1" [expanded] [ref=e308] [cursor=pointer]:
                - generic [ref=e309]: ▾
                - text: Later
                - generic [ref=e310]: "1"
              - generic [ref=e311]:
                - generic [ref=e312]: Task
                - generic [ref=e313]: People
                - generic [ref=e314]: Due
                - generic [ref=e315]: Status
                - generic [ref=e316]: Priority
                - generic [ref=e317]: Next action
              - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 12 Nov" [ref=e318] [cursor=pointer]:
                - generic [ref=e319]:
                  - button "Pin Coordinate fixture specification samples" [ref=e320]: ◇
                  - generic [ref=e321]:
                    - strong [ref=e323]: Coordinate fixture specification samples
                    - generic [ref=e324]: SS-190 · Palm Courtyard Villa · Material selection
                    - generic [ref=e325]: "Next: Confirm samples"
                - 'button "People on Coordinate fixture specification samples: responsible Asha, 0 collaborators, assigned by Meera" [ref=e327]':
                  - generic "Asha" [ref=e329]: AS
                  - generic [ref=e330]:
                    - strong [ref=e331]: Asha
                    - generic [ref=e332]: By Meera
                - generic [ref=e333]: 12 Nov
                - generic [ref=e334]: To do
                - generic [ref=e336]: Normal
                - button "Confirm samples" [ref=e339]
            - generic [ref=e340]:
              - button "▾ Without a date 1" [expanded] [ref=e341] [cursor=pointer]:
                - generic [ref=e342]: ▾
                - text: Without a date
                - generic [ref=e343]: "1"
              - generic [ref=e344]:
                - generic [ref=e345]: Task
                - generic [ref=e346]: People
                - generic [ref=e347]: Due
                - generic [ref=e348]: Status
                - generic [ref=e349]: Priority
                - generic [ref=e350]: Next action
              - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e351] [cursor=pointer]:
                - generic [ref=e352]:
                  - button "Pin Review archived concept references" [ref=e353]: ◇
                  - generic [ref=e354]:
                    - strong [ref=e356]: Review archived concept references
                    - generic [ref=e357]: SS-192 · Studio Office Fit-out · Planning
                    - generic [ref=e358]: "Next: Open backlog"
                - 'button "People on Review archived concept references: responsible Asha, 0 collaborators, assigned by Meera" [ref=e360]':
                  - generic "Asha" [ref=e362]: AS
                  - generic [ref=e363]:
                    - strong [ref=e364]: Asha
                    - generic [ref=e365]: By Meera
                - generic [ref=e366]: No date
                - generic [ref=e367]: To do
                - generic [ref=e369]: Low
                - button "Open backlog" [ref=e372]
        - generic [ref=e373]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - status [ref=e374]: Sample task created. Your My Work view was preserved.
  - text: + + +
  - dialog [ref=e375]:
    - generic [ref=e376]:
      - banner [ref=e377]:
        - generic [ref=e378]:
          - generic [ref=e379]: DEMO-1792991489604 · PROJECT
          - heading "Mandatory evidence CLIENT" [level=2] [ref=e380]
          - generic [ref=e381]: To do
          - generic [ref=e382]: Normal priority
        - button "Close task details" [ref=e383] [cursor=pointer]: ×
      - generic [ref=e384]:
        - button "Lakeview Residence → Project Tasks" [ref=e386] [cursor=pointer]
        - region "Next eligible action" [ref=e387]:
          - heading "Start task" [level=3] [ref=e388]
          - paragraph [ref=e389]: Start your assigned work first. Submission is available after start and independent reviewer assignment.
          - status
        - generic [ref=e391]:
          - generic [ref=e392]:
            - term [ref=e393]: Primary owner & collaborators
            - definition [ref=e394]:
              - generic "Primary owner Asha; 0 collaborators" [ref=e395]:
                - generic "Asha" [ref=e396]: AS
                - generic [ref=e397]: Asha
          - generic [ref=e398]:
            - term [ref=e399]: Target
            - definition [ref=e400]: 2026-11-12
          - generic [ref=e401]:
            - term [ref=e402]: Review requirement
            - definition [ref=e403]: CLIENT
          - generic [ref=e404]:
            - term [ref=e405]: Independent reviewer
            - definition [ref=e406]: Not assigned
        - generic [ref=e407]:
          - heading "Work brief" [level=3] [ref=e408]
          - paragraph [ref=e409]: No description recorded.
        - region "Action details" [ref=e410]:
          - generic [ref=e411]:
            - text: Reason for this action *
            - textbox "Reason for this action *" [active] [ref=e412]:
              - /placeholder: Explain this transition
              - text: Submit the agreed updated work
        - generic [ref=e413]:
          - heading "Internal review history" [level=3] [ref=e414]
          - paragraph [ref=e415]: No submitted review round yet.
        - group [ref=e416]:
          - generic "Other task actions" [ref=e417] [cursor=pointer]
        - group [ref=e418]:
          - generic "Activity history" [ref=e419] [cursor=pointer]
      - contentinfo [ref=e420]:
        - button "Back to list" [ref=e421] [cursor=pointer]
        - button "Start task" [ref=e422] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import path from 'node:path';
  3  | import {pathToFileURL} from 'node:url';
  4  | const url=pathToFileURL(path.resolve('docs/v1-demo/task-creation-completed-demo.html')).href;
  5  | const message='Add at least one file or link before submitting for review.';
  6  | const out=path.resolve('docs/design/application-ux-audit-2026-10-25/prototype-delivery/evidence-rule-2026-10-26/screenshots');
  7  | const form=p=>p.locator('#task-create-refinement');
  8  | async function persona(p,value){await p.locator('.cx-harness summary').click();await p.locator('#role').selectOption(value);await p.locator('.cx-harness summary').click();}
  9  | async function close(p){await p.getByRole('button',{name:'Close task details',exact:true}).click();}
  10 | async function reason(p){await p.locator('#cx-reason').fill('Submit the agreed updated work');}
  11 | async function reviews(p){if(p.viewportSize().width<768){await p.locator('.mobile-nav [data-cx-route="more"]').click();await p.locator('#connected-surface [data-cx-route="/reviews"]').click();}else await p.locator('.sidebar [data-cx-route="/reviews"]').click();}
  12 | async function create(p,mode='INTERNAL'){
> 13 |  await persona(p,'Owner');await p.locator('#cx-new').click();await form(p).locator('#new-title').fill('Mandatory evidence '+mode);await form(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await form(p).locator('#new-owner').selectOption('designer1');await form(p).locator('#new-review').selectOption(mode);if(mode!=='CLIENT')await form(p).locator('#new-reviewer').selectOption('lead');await form(p).locator('#new-target').fill('2026-11-12');await form(p).locator('#new-reason').fill('Prepare evidence review');await form(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Mandatory evidence '+mode);const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await close(p);await persona(p,'Designer');await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator(`.task-row[data-id="${id}"]`).focus();await p.keyboard.press('Enter');await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');return id;
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Start task', exact: true }) resolved to 2 elements:
  14 | }
  15 | async function attach(p,bytes,name='work.pdf'){await p.locator('[data-evidence-kind="FILE"]').click();await p.locator('#cx-evidence-file').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(bytes)});await expect(p.locator('#review-evidence-status')).toContainText(/Attachment ready|Previously submitted evidence alone cannot be reused/);}
  16 | async function submit(p){await reason(p);await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-current-round')).toContainText('Awaiting Meera');}
  17 | async function correction(p,id){
  18 |  await close(p);await persona(p,'Team Lead');await reviews(p);await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.locator('#cx-comment').fill('Provide the corrected dimensions');await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Assign linked correction',exact:true})).toBeVisible();await reason(p);await p.getByRole('button',{name:'Assign linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Open linked correction',exact:true})).toBeVisible();const correctionId=await p.evaluate(id=>window.connectedPrototype.snapshot().rounds.find(([t])=>t===id)[1].at(-1).correctionId,id);await close(p);await persona(p,'Designer');await p.locator('.mobile-nav [data-cx-route="/my-work"],.sidebar [data-cx-route="/my-work"]').filter({visible:true}).first().click();await p.locator(`.task-row[data-id="${correctionId}"]`).focus();await p.keyboard.press('Enter');await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Return to original task');await p.getByRole('button',{name:'Return to original task',exact:true}).click();
  19 | }
  20 | for(const width of [1440,1024,768,390,320])test.describe(`evidence ${width}px`,()=>{
  21 |  test.use({viewport:{width,height:width<768?844:900}});
  22 |  test.beforeEach(async({page:p})=>{p.errors=[];p.requests=[];p.on('pageerror',e=>p.errors.push(e.message));await p.route(/^https?:/,r=>{p.requests.push(r.request().url());return r.abort();});await p.goto(url);});
  23 |  test.afterEach(async({page:p})=>{expect(p.errors).toEqual([]);expect(p.requests).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});
  24 |  test('initial INTERNAL review blocks missing, typed filenames and invalid links',async({page:p})=>{
  25 |   const id=await create(p);await expect(p.locator('#review-evidence-status')).toHaveText(message);await p.locator('[data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(message);for(const invalid of ['drawing.pdf','javascript:alert(1)','http://drive.google.com/work','https://127.0.0.1/work','https://user:pass@drive.google.com/work']){await p.locator('#cx-evidence').fill(invalid);await p.locator('[data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(message);}
  26 |   await p.screenshot({path:path.join(out,`${width}-invalid-evidence.png`)});await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/initial-r1/view');await submit(p);const s=await p.evaluate(()=>window.connectedPrototype.snapshot());const round=s.rounds.find(([t])=>t===id)[1][0];expect(round.evidenceSnapshot).toMatchObject({taskId:id,roundNumber:1,submissionVersion:1,submissionId:round.id,roundId:round.id,evidence:{kind:'LINK',url:'https://drive.google.com/file/d/initial-r1/view'}});
  27 |  });
  28 |  test('file attachment BOTH review preserves independent approval and exact carry-forward',async({page:p})=>{
  29 |   const id=await create(p,'BOTH');await attach(p,'initial approved content');await submit(p);let state=await p.evaluate(()=>window.connectedPrototype.snapshot());let carry=state.clientCarryForward.find(t=>t.taskId===id);expect(carry.internalApproved).toBe(false);expect(carry.clientEvidenceId).toBeNull();const snapshot=state.rounds.find(([t])=>t===id)[1][0].evidenceSnapshot;expect(snapshot.evidence.sha256).toMatch(/^[a-f0-9]{64}$/);await expect(p.locator('#approved-evidence-carry-forward')).toContainText('blocked until independent internal approval');await close(p);await persona(p,'Team Lead');await reviews(p);await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.getByRole('button',{name:'Approve internal round',exact:true}).click();await expect(p.locator('#approved-evidence-carry-forward')).toContainText('without another upload');state=await p.evaluate(()=>window.connectedPrototype.snapshot());carry=state.clientCarryForward.find(t=>t.taskId===id);expect(carry.clientEvidenceId).toBe(snapshot.id);expect(state.rounds.find(([t])=>t===id)[1][0].evidenceSnapshot).toEqual(snapshot);await expect(p.locator('#cx-evidence-file')).toHaveCount(0);await p.screenshot({path:path.join(out,`${width}-approved-carry-forward.png`)});
  30 |  });
  31 |  for(const kind of ['LINK','FILE'])test(`${kind} resubmission requires updated evidence and preserves earlier snapshot`,async({page:p})=>{
  32 |   const id=await create(p);if(kind==='LINK')await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/work-r1/view');else await attach(p,'original file contents','original.pdf');await submit(p);await correction(p,id);const before=await p.evaluate(id=>window.connectedPrototype.snapshot().rounds.find(([t])=>t===id)[1][0],id);await expect(p.locator('#review-evidence-status')).toHaveText(message);
  33 |   if(kind==='LINK')await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/work-r1/view#different-label');else await attach(p,'original file contents','renamed.pdf');await reason(p);await p.locator('[data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(message);await expect(p.locator('#review-evidence-status')).toContainText('Previously submitted evidence alone cannot be reused');
  34 |   if(kind==='LINK')await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/work-r2/view');else await attach(p,'changed corrected file contents','updated.pdf');await submit(p);const rounds=await p.evaluate(id=>window.connectedPrototype.snapshot().rounds.find(([t])=>t===id)[1],id);expect(rounds).toHaveLength(2);expect(rounds[0]).toEqual(before);expect(rounds[1].evidenceSnapshot.identity).not.toBe(before.evidenceSnapshot.identity);expect(rounds[1].evidenceSnapshot).toMatchObject({taskId:id,roundNumber:2,submissionVersion:2});await p.screenshot({path:path.join(out,`${width}-${kind.toLowerCase()}-resubmitted.png`)});
  35 |  });
  36 |  test('CLIENT staff preparation uses the same guard without granting client publication',async({page:p})=>{
  37 |   const id=await create(p,'CLIENT');await p.getByRole('button',{name:'Check client review evidence',exact:true}).click();await expect(p.locator('#cx-feedback')).toHaveText(message);await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/client-r1/view');await p.getByRole('button',{name:'Check client review evidence',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('No client submission was made');await expect(p.locator('#mandatory-evidence-panel')).toContainText('Client/external audits are BLOCKED');expect((await p.evaluate(()=>window.connectedPrototype.snapshot())).rounds.find(([t])=>t===id)[1]).toHaveLength(0);
  38 |  });
  39 | });
  40 | 
```