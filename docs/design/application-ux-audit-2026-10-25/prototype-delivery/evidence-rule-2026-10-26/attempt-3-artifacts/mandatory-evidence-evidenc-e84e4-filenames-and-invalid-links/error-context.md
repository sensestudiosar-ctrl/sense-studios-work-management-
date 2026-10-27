# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mandatory-evidence.spec.mjs >> evidence 1440px >> initial INTERNAL review blocks missing, typed filenames and invalid links
- Location: docs\v1-demo\mandatory-evidence.spec.mjs:24:2

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Start task', exact: true }) resolved to 2 elements:
    1) <button data-quick="DEMO-1792991434902">Start task</button> aka getByRole('listitem', { name: 'Open Mandatory evidence' }).getByRole('button', { name: 'Start task' })
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
          - button "Show 6 Needs action tasks" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]:
              - generic [aria-hidden] [ref=e68]: ◈
              - text: Needs action
            - generic [aria-hidden] [ref=e69]: "6"
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
              - paragraph [ref=e98]: 9 visible tasks · Sample data · Action shortcuts are not duplicate tasks
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
              - text: 9 tasks ·
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
                    - generic [ref=e152]: "Next: Open linked correction"
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
                - button "Open linked correction" [ref=e169]
            - generic [ref=e170]:
              - button "▾ Needs My Action 5" [expanded] [ref=e171] [cursor=pointer]:
                - generic [ref=e172]: ▾
                - text: Needs My Action
                - generic [ref=e173]: "5"
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
                    - generic [ref=e189]: "Next: Complete correction"
                - generic [ref=e190]:
                  - text: Lakeview Residence
                  - generic [ref=e191]: Working drawings
                - 'button "People on Correct wardrobe clearances from internal review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e193]':
                  - generic "Asha" [ref=e195]: AS
                  - generic [ref=e196]:
                    - strong [ref=e197]: Asha
                    - generic [ref=e198]: By Meera
                - generic [ref=e199]: 1d overdue
                - generic [ref=e200]: In progress
                - generic [ref=e202]: High
                - button "Complete correction" [ref=e205]
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
              - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 28 Oct" [ref=e256] [cursor=pointer]:
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
                - generic [ref=e273]: 28 Oct
                - generic [ref=e274]: To do
                - generic [ref=e276]: Normal
                - button "Open task" [ref=e279]
              - listitem "Open Mandatory evidence INTERNAL; To do; Normal priority; 12 Nov" [ref=e280] [cursor=pointer]:
                - generic [ref=e281]:
                  - button "Pin Mandatory evidence INTERNAL" [ref=e282]: ◇
                  - generic [ref=e283]:
                    - strong [ref=e285]: Mandatory evidence INTERNAL
                    - generic [ref=e286]: DEMO-1792991434902 · Lakeview Residence · No linked plan item
                    - generic [ref=e287]: "Next: Start task"
                - generic [ref=e288]:
                  - text: Lakeview Residence
                  - generic [ref=e289]: No linked plan item
                - 'button "People on Mandatory evidence INTERNAL: responsible Asha, 0 collaborators, assigned by Principal Architect" [ref=e291]':
                  - generic "Asha" [ref=e293]: AS
                  - generic [ref=e294]:
                    - strong [ref=e295]: Asha
                    - generic [ref=e296]: By Principal Architect
                - generic [ref=e297]: 12 Nov
                - generic [ref=e298]: To do
                - generic [ref=e300]: Normal
                - button "Start task" [ref=e303]
            - generic [ref=e304]:
              - button "▾ Next week 1" [expanded] [ref=e305] [cursor=pointer]:
                - generic [ref=e306]: ▾
                - text: Next week
                - generic [ref=e307]: "1"
              - generic [ref=e308]:
                - generic [ref=e309]: Task
                - generic [ref=e310]: Project / stage
                - generic [ref=e311]: People
                - generic [ref=e312]: Due
                - generic [ref=e313]: Status
                - generic [ref=e314]: Priority
                - generic [ref=e315]: Next action
              - listitem "Open Personal learning and SOP review; To do; Low priority; 6 Nov" [ref=e316] [cursor=pointer]:
                - generic [ref=e317]:
                  - button "Pin Personal learning and SOP review" [ref=e318]: ◇
                  - generic [ref=e319]:
                    - strong [ref=e321]: Personal learning and SOP review
                    - generic [ref=e322]: SS-427 · Sense Studios Internal · Training
                    - generic [ref=e323]: "Next: Open task"
                - generic [ref=e324]:
                  - text: Sense Studios Internal
                  - generic [ref=e325]: Training
                - 'button "People on Personal learning and SOP review: responsible Asha, 0 collaborators, assigned by Meera" [ref=e327]':
                  - generic "Asha" [ref=e329]: AS
                  - generic [ref=e330]:
                    - strong [ref=e331]: Asha
                    - generic [ref=e332]: By Meera
                - generic [ref=e333]: 6 Nov
                - generic [ref=e334]: To do
                - generic [ref=e336]: Low
                - button "Open task" [ref=e339]
            - generic [ref=e340]:
              - button "▾ Later 1" [expanded] [ref=e341] [cursor=pointer]:
                - generic [ref=e342]: ▾
                - text: Later
                - generic [ref=e343]: "1"
              - generic [ref=e344]:
                - generic [ref=e345]: Task
                - generic [ref=e346]: Project / stage
                - generic [ref=e347]: People
                - generic [ref=e348]: Due
                - generic [ref=e349]: Status
                - generic [ref=e350]: Priority
                - generic [ref=e351]: Next action
              - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 12 Nov" [ref=e352] [cursor=pointer]:
                - generic [ref=e353]:
                  - button "Pin Coordinate fixture specification samples" [ref=e354]: ◇
                  - generic [ref=e355]:
                    - strong [ref=e357]: Coordinate fixture specification samples
                    - generic [ref=e358]: SS-190 · Palm Courtyard Villa · Material selection
                    - generic [ref=e359]: "Next: Confirm samples"
                - generic [ref=e360]:
                  - text: Palm Courtyard Villa
                  - generic [ref=e361]: Material selection
                - 'button "People on Coordinate fixture specification samples: responsible Asha, 0 collaborators, assigned by Meera" [ref=e363]':
                  - generic "Asha" [ref=e365]: AS
                  - generic [ref=e366]:
                    - strong [ref=e367]: Asha
                    - generic [ref=e368]: By Meera
                - generic [ref=e369]: 12 Nov
                - generic [ref=e370]: To do
                - generic [ref=e372]: Normal
                - button "Confirm samples" [ref=e375]
            - generic [ref=e376]:
              - button "▾ Without a date 1" [expanded] [ref=e377] [cursor=pointer]:
                - generic [ref=e378]: ▾
                - text: Without a date
                - generic [ref=e379]: "1"
              - generic [ref=e380]:
                - generic [ref=e381]: Task
                - generic [ref=e382]: Project / stage
                - generic [ref=e383]: People
                - generic [ref=e384]: Due
                - generic [ref=e385]: Status
                - generic [ref=e386]: Priority
                - generic [ref=e387]: Next action
              - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e388] [cursor=pointer]:
                - generic [ref=e389]:
                  - button "Pin Review archived concept references" [ref=e390]: ◇
                  - generic [ref=e391]:
                    - strong [ref=e393]: Review archived concept references
                    - generic [ref=e394]: SS-192 · Studio Office Fit-out · Planning
                    - generic [ref=e395]: "Next: Open backlog"
                - generic [ref=e396]:
                  - text: Studio Office Fit-out
                  - generic [ref=e397]: Planning
                - 'button "People on Review archived concept references: responsible Asha, 0 collaborators, assigned by Meera" [ref=e399]':
                  - generic "Asha" [ref=e401]: AS
                  - generic [ref=e402]:
                    - strong [ref=e403]: Asha
                    - generic [ref=e404]: By Meera
                - generic [ref=e405]: No date
                - generic [ref=e406]: To do
                - generic [ref=e408]: Low
                - button "Open backlog" [ref=e411]
        - generic [ref=e412]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - status [ref=e413]: Sample task created. Your My Work view was preserved.
  - text: + + +
  - dialog [ref=e414]:
    - generic [ref=e415]:
      - banner [ref=e416]:
        - generic [ref=e417]:
          - generic [ref=e418]: DEMO-1792991434902 · PROJECT
          - heading "Mandatory evidence INTERNAL" [level=2] [ref=e419]
          - generic [ref=e420]: To do
          - generic [ref=e421]: Normal priority
        - button "Close task details" [ref=e422] [cursor=pointer]: ×
      - generic [ref=e423]:
        - button "Lakeview Residence → Project Tasks" [ref=e425] [cursor=pointer]
        - region "Next eligible action" [ref=e426]:
          - heading "Start task" [level=3] [ref=e427]
          - paragraph [ref=e428]: Start your assigned work first. Submission is available after start and independent reviewer assignment.
          - status
        - generic [ref=e430]:
          - generic [ref=e431]:
            - term [ref=e432]: Primary owner & collaborators
            - definition [ref=e433]:
              - generic "Primary owner Asha; 0 collaborators" [ref=e434]:
                - generic "Asha" [ref=e435]: AS
                - generic [ref=e436]: Asha
          - generic [ref=e437]:
            - term [ref=e438]: Target
            - definition [ref=e439]: 2026-11-12
          - generic [ref=e440]:
            - term [ref=e441]: Review requirement
            - definition [ref=e442]: INTERNAL
          - generic [ref=e443]:
            - term [ref=e444]: Independent reviewer
            - definition [ref=e445]: Meera
        - generic [ref=e446]:
          - heading "Work brief" [level=3] [ref=e447]
          - paragraph [ref=e448]: No description recorded.
        - region "Action details" [ref=e449]:
          - generic [ref=e450]:
            - text: Reason for this action *
            - textbox "Reason for this action *" [active] [ref=e451]:
              - /placeholder: Explain this transition
              - text: Submit the agreed updated work
        - generic [ref=e452]:
          - heading "Internal review history" [level=3] [ref=e453]
          - paragraph [ref=e454]: No submitted review round yet.
        - group [ref=e455]:
          - generic "Other task actions" [ref=e456] [cursor=pointer]
        - group [ref=e457]:
          - generic "Activity history" [ref=e458] [cursor=pointer]
      - contentinfo [ref=e459]:
        - button "Back to list" [ref=e460] [cursor=pointer]
        - button "Start task" [ref=e461] [cursor=pointer]
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