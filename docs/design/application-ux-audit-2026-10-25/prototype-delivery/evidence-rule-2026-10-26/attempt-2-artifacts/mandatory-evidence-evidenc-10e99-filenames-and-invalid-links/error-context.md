# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mandatory-evidence.spec.mjs >> evidence 390px >> initial INTERNAL review blocks missing, typed filenames and invalid links
- Location: docs\v1-demo\mandatory-evidence.spec.mjs:24:2

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "submitReviewDemo is not defined",
+ ]
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
    - generic [ref=e9]:
      - generic [ref=e10]: Workspace / My Work
      - button "New task" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - generic [ref=e15]:
        - generic [ref=e16]: WORKSPACE / TASKS
        - heading "My Work" [level=1] [ref=e17]
      - generic [ref=e18]:
        - button "Show 5 Needs action tasks" [ref=e19] [cursor=pointer]:
          - generic [ref=e20]: Needs action
          - generic [aria-hidden] [ref=e21]: "5"
          - generic [ref=e22]: Tasks needing attention
        - button "Show 2 Overdue tasks" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: Overdue
          - generic [aria-hidden] [ref=e26]: "2"
          - generic [ref=e27]: Past due and incomplete
        - button "Show 2 Reviews / corrections tasks" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: Reviews / corrections
          - generic [aria-hidden] [ref=e31]: "2"
          - generic [ref=e32]: Tasks with review obligations
        - button "Show 0 Waiting / blocked tasks" [ref=e34] [cursor=pointer]:
          - generic [ref=e35]: Waiting / blocked
          - generic [aria-hidden] [ref=e36]: "0"
          - generic [ref=e37]: Waiting for next actor
      - region "My work task list" [ref=e39]:
        - heading "Work queue" [level=2] [ref=e42]
        - generic [ref=e43]:
          - generic [ref=e44]:
            - text: ⌕
            - searchbox "Search tasks" [ref=e45]
          - generic [ref=e46]:
            - button "☷ Filters" [ref=e47] [cursor=pointer]
            - button "Sort and view work queue" [ref=e48] [cursor=pointer]: Sort / View
        - generic "Mobile due date shortcuts" [ref=e50]:
          - button "All 9" [pressed] [ref=e51] [cursor=pointer]:
            - text: All
            - generic [ref=e52]: "9"
          - button "Overdue 2" [ref=e53] [cursor=pointer]:
            - text: Overdue
            - generic [ref=e54]: "2"
          - button "Today 1" [ref=e55] [cursor=pointer]:
            - text: Today
            - generic [ref=e56]: "1"
          - button "This week 2" [ref=e57] [cursor=pointer]:
            - text: This week
            - generic [ref=e58]: "2"
          - button "Next week 1" [ref=e59] [cursor=pointer]:
            - text: Next week
            - generic [ref=e60]: "1"
          - button "This month 0" [ref=e61] [cursor=pointer]:
            - text: This month
            - generic [ref=e62]: "0"
          - button "Later 2" [ref=e63] [cursor=pointer]:
            - text: Later
            - generic [ref=e64]: "2"
          - button "No date 1" [ref=e65] [cursor=pointer]:
            - text: No date
            - generic [ref=e66]: "1"
        - list [ref=e67]:
          - generic [ref=e68]:
            - button "▾ Pinned 1" [expanded] [ref=e69] [cursor=pointer]:
              - generic [ref=e70]: ▾
              - text: Pinned
              - generic [ref=e71]: "1"
            - listitem "Open Revise bedroom wardrobe working drawing; Correction; High priority; 1d overdue" [ref=e72] [cursor=pointer]:
              - generic [ref=e73]:
                - generic [ref=e74]:
                  - generic [ref=e75]: Drawing
                  - button "Unpin Revise bedroom wardrobe working drawing" [ref=e76]: ◆
                - generic [ref=e77]:
                  - generic [ref=e78]: Revise bedroom wardrobe working drawing
                  - generic [ref=e79]: Lakeview Residence · Working drawings
                - generic [ref=e80]:
                  - generic [ref=e81]: Correction
                  - generic [ref=e82]: High
                  - generic [ref=e83]: 1d overdue
                - generic [ref=e84]:
                  - generic "Asha" [ref=e85]: AS
                  - generic [ref=e86]:
                    - strong [ref=e87]: Asha
                    - text: +1 collaborating · by Meera
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - strong [ref=e90]: "Next:"
                    - text: Open linked correction
                  - button "Open task ↗" [ref=e91]
          - generic [ref=e92]:
            - button "▾ Needs My Action 4" [expanded] [ref=e93] [cursor=pointer]:
              - generic [ref=e94]: ▾
              - text: Needs My Action
              - generic [ref=e95]: "4"
            - listitem "Open Correct wardrobe clearances from internal review; In progress; High priority; 1d overdue" [ref=e96] [cursor=pointer]:
              - generic [ref=e97]:
                - generic [ref=e98]:
                  - generic [ref=e99]: Drawing
                  - button "Pin Correct wardrobe clearances from internal review" [ref=e100]: ◇
                - generic [ref=e101]:
                  - generic [ref=e102]: Correct wardrobe clearances from internal review
                  - generic [ref=e103]: Lakeview Residence · Working drawings
                - generic [ref=e104]:
                  - generic [ref=e105]: In progress
                  - generic [ref=e106]: High
                  - generic [ref=e107]: 1d overdue
                - generic [ref=e108]:
                  - generic "Asha" [ref=e109]: AS
                  - generic [ref=e110]:
                    - strong [ref=e111]: Asha
                    - text: · by Meera
                - generic [ref=e112]:
                  - generic [ref=e113]:
                    - strong [ref=e114]: "Next:"
                    - text: Complete correction
                  - button "Open task ↗" [ref=e115]
            - listitem "Open Request revised ceiling working drawing; To do; High priority; Tomorrow" [ref=e116] [cursor=pointer]:
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - generic [ref=e119]: Drawing
                  - button "Pin Request revised ceiling working drawing" [ref=e120]: ◇
                - generic [ref=e121]:
                  - generic [ref=e122]: Request revised ceiling working drawing
                  - generic [ref=e123]: Swagath Delight · Site execution
                - generic [ref=e124]:
                  - generic [ref=e125]: To do
                  - generic [ref=e126]: High
                  - generic [ref=e127]: Tomorrow
                - generic [ref=e128]:
                  - generic "Kiran" [ref=e129]: KI
                  - generic [ref=e130]:
                    - strong [ref=e131]: Kiran
                    - text: +1 collaborating · by Meera
                - generic [ref=e132]:
                  - generic [ref=e133]:
                    - strong [ref=e134]: "Next:"
                    - text: Open task
                  - button "Open task ↗" [ref=e135]
            - listitem "Open Submit kitchen 3D perspective; In progress; Normal priority; Today" [ref=e136] [cursor=pointer]:
              - generic [ref=e137]:
                - generic [ref=e138]:
                  - generic [ref=e139]: Design
                  - button "Pin Submit kitchen 3D perspective" [ref=e140]: ◇
                - generic [ref=e141]:
                  - generic [ref=e142]: Submit kitchen 3D perspective
                  - generic [ref=e143]: Palm Courtyard Villa · 3D design
                - generic [ref=e144]:
                  - generic [ref=e145]: In progress
                  - generic [ref=e146]: Normal
                  - generic [ref=e147]: Today
                - generic [ref=e148]:
                  - generic "Neha" [ref=e149]: NE
                  - generic [ref=e150]:
                    - strong [ref=e151]: Neha
                    - text: +1 collaborating · by Meera
                - generic [ref=e152]:
                  - generic [ref=e153]:
                    - strong [ref=e154]: "Next:"
                    - text: Upload design
                  - button "Open task ↗" [ref=e155]
            - listitem "Open Update lounge false-ceiling plan; To do; Normal priority; 28 Oct" [ref=e156] [cursor=pointer]:
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - generic [ref=e159]: Drawing
                  - button "Pin Update lounge false-ceiling plan" [ref=e160]: ◇
                - generic [ref=e161]:
                  - generic [ref=e162]: Update lounge false-ceiling plan
                  - generic [ref=e163]: Swagath Delight · Working drawings
                - generic [ref=e164]:
                  - generic [ref=e165]: To do
                  - generic [ref=e166]: Normal
                  - generic [ref=e167]: 28 Oct
                - generic [ref=e168]:
                  - generic "Asha" [ref=e169]: AS
                  - generic [ref=e170]:
                    - strong [ref=e171]: Asha
                    - text: · by Meera
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - strong [ref=e174]: "Next:"
                    - text: Open task
                  - button "Open task ↗" [ref=e175]
          - generic [ref=e176]:
            - button "▾ Next week 1" [expanded] [ref=e177] [cursor=pointer]:
              - generic [ref=e178]: ▾
              - text: Next week
              - generic [ref=e179]: "1"
            - listitem "Open Personal learning and SOP review; To do; Low priority; 6 Nov" [ref=e180] [cursor=pointer]:
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - generic [ref=e183]: Design
                  - button "Pin Personal learning and SOP review" [ref=e184]: ◇
                - generic [ref=e185]:
                  - generic [ref=e186]: Personal learning and SOP review
                  - generic [ref=e187]: Sense Studios Internal · Training
                - generic [ref=e188]:
                  - generic [ref=e189]: To do
                  - generic [ref=e190]: Low
                  - generic [ref=e191]: 6 Nov
                - generic [ref=e192]:
                  - generic "Asha" [ref=e193]: AS
                  - generic [ref=e194]:
                    - strong [ref=e195]: Asha
                    - text: · by Meera
                - generic [ref=e196]:
                  - generic [ref=e197]:
                    - strong [ref=e198]: "Next:"
                    - text: Open task
                  - button "Open task ↗" [ref=e199]
          - generic [ref=e200]:
            - button "▾ Later 2" [expanded] [ref=e201] [cursor=pointer]:
              - generic [ref=e202]: ▾
              - text: Later
              - generic [ref=e203]: "2"
            - listitem "Open Coordinate fixture specification samples; To do; Normal priority; 12 Nov" [ref=e204] [cursor=pointer]:
              - generic [ref=e205]:
                - generic [ref=e206]:
                  - generic [ref=e207]: Design
                  - button "Pin Coordinate fixture specification samples" [ref=e208]: ◇
                - generic [ref=e209]:
                  - generic [ref=e210]: Coordinate fixture specification samples
                  - generic [ref=e211]: Palm Courtyard Villa · Material selection
                - generic [ref=e212]:
                  - generic [ref=e213]: To do
                  - generic [ref=e214]: Normal
                  - generic [ref=e215]: 12 Nov
                - generic [ref=e216]:
                  - generic "Asha" [ref=e217]: AS
                  - generic [ref=e218]:
                    - strong [ref=e219]: Asha
                    - text: · by Meera
                - generic [ref=e220]:
                  - generic [ref=e221]:
                    - strong [ref=e222]: "Next:"
                    - text: Confirm samples
                  - button "Open task ↗" [ref=e223]
            - listitem "Open Mandatory evidence INTERNAL; Review needed; Normal priority; 12 Nov" [ref=e224] [cursor=pointer]:
              - generic [ref=e225]:
                - generic [ref=e226]:
                  - generic [ref=e227]: Drawing
                  - button "Pin Mandatory evidence INTERNAL" [ref=e228]: ◇
                - generic [ref=e229]:
                  - generic [ref=e230]: Mandatory evidence INTERNAL
                  - generic [ref=e231]: Lakeview Residence · No linked plan item
                - generic [ref=e232]:
                  - generic [ref=e233]: Review needed
                  - generic [ref=e234]: Normal
                  - generic [ref=e235]: 12 Nov
                - generic [ref=e236]:
                  - generic "Asha" [ref=e237]: AS
                  - generic [ref=e238]:
                    - strong [ref=e239]: Asha
                    - text: · by Principal Architect
                - generic [ref=e240]:
                  - generic [ref=e241]:
                    - strong [ref=e242]: "Next:"
                    - text: Awaiting Meera
                  - button "Open task ↗" [ref=e243]
          - generic [ref=e244]:
            - button "▾ Without a date 1" [expanded] [ref=e245] [cursor=pointer]:
              - generic [ref=e246]: ▾
              - text: Without a date
              - generic [ref=e247]: "1"
            - listitem "Open Review archived concept references; To do; Low priority; No date" [ref=e248] [cursor=pointer]:
              - generic [ref=e249]:
                - generic [ref=e250]:
                  - generic [ref=e251]: Design
                  - button "Pin Review archived concept references" [ref=e252]: ◇
                - generic [ref=e253]:
                  - generic [ref=e254]: Review archived concept references
                  - generic [ref=e255]: Studio Office Fit-out · Planning
                - generic [ref=e256]:
                  - generic [ref=e257]: To do
                  - generic [ref=e258]: Low
                  - generic [ref=e259]: No date
                - generic [ref=e260]:
                  - generic "Asha" [ref=e261]: AS
                  - generic [ref=e262]:
                    - strong [ref=e263]: Asha
                    - text: · by Meera
                - generic [ref=e264]:
                  - generic [ref=e265]:
                    - strong [ref=e266]: "Next:"
                    - text: Open backlog
                  - button "Open task ↗" [ref=e267]
      - generic [ref=e268]: Sense Studios · My Work UX demonstration only. No files are sent and no project records are changed.
  - navigation "Mobile navigation" [ref=e269]:
    - button "Home" [ref=e270] [cursor=pointer]
    - button "My Work" [ref=e271] [cursor=pointer]
    - button "Projects" [ref=e272] [cursor=pointer]
    - button "Decisions" [ref=e273] [cursor=pointer]
    - button "More" [ref=e274] [cursor=pointer]
  - status [ref=e275]: Sample task created. Your My Work view was preserved.
  - text: + + +
  - dialog [ref=e276]:
    - generic [ref=e277]:
      - banner [ref=e278]:
        - generic [ref=e279]:
          - generic [ref=e280]: DEMO-1792991048396 · PROJECT
          - heading "Mandatory evidence INTERNAL" [active] [level=2] [ref=e281]
          - generic [ref=e282]: Review needed
          - generic [ref=e283]: Normal priority
        - button "Close task details" [ref=e284] [cursor=pointer]: ×
      - generic [ref=e285]:
        - button "Lakeview Residence → Project Tasks" [ref=e287] [cursor=pointer]
        - region "Next eligible action" [ref=e288]:
          - heading "Current next step" [level=3] [ref=e289]
          - paragraph [ref=e290]: Round 1 is awaiting Meera, the named independent reviewer. Your submitted evidence is locked.
          - paragraph [ref=e291]: Round 1 · Awaiting Meera
          - status [ref=e292]: Submitted as a new round — Round 1 · Awaiting Meera. Earlier evidence and review history remain unchanged.
        - generic [ref=e294]:
          - generic [ref=e295]:
            - term [ref=e296]: Primary owner & collaborators
            - definition [ref=e297]:
              - generic "Primary owner Asha; 0 collaborators" [ref=e298]:
                - generic "Asha" [ref=e299]: AS
                - generic [ref=e300]: Asha
          - generic [ref=e301]:
            - term [ref=e302]: Target
            - definition [ref=e303]: 2026-11-12
          - generic [ref=e304]:
            - term [ref=e305]: Review requirement
            - definition [ref=e306]: INTERNAL
          - generic [ref=e307]:
            - term [ref=e308]: Independent reviewer
            - definition [ref=e309]: Meera
        - generic [ref=e310]:
          - heading "Work brief" [level=3] [ref=e311]
          - paragraph [ref=e312]: No description recorded.
        - generic [ref=e313]:
          - heading "Internal review history" [level=3] [ref=e314]
          - article [ref=e315]:
            - strong [ref=e316]: Round 1 · Pending review
            - paragraph [ref=e317]: ROUND-DEMO-1792991048396-1 · Submitted by Asha · Reviewer Meera
            - paragraph [ref=e318]: "Submitted evidence: https://drive.google.com/file/d/initial-r1/view"
            - paragraph [ref=e319]: "Exact evidence: EVIDENCE-ROUND-DEMO-1792991048396-1 · Task DEMO-1792991048396 · task version 1 · submission version 1 · round 1"
        - group [ref=e320]:
          - generic "Other task actions" [ref=e321] [cursor=pointer]
        - group [ref=e322]:
          - generic "Activity history" [ref=e323] [cursor=pointer]
      - contentinfo [ref=e324]:
        - button "Back to list" [ref=e325] [cursor=pointer]
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
  13 |  await persona(p,'Owner');await p.locator('#cx-new').click();await form(p).locator('#new-title').fill('Mandatory evidence '+mode);await form(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await form(p).locator('#new-owner').selectOption('designer1');await form(p).locator('#new-review').selectOption(mode);if(mode!=='CLIENT')await form(p).locator('#new-reviewer').selectOption('lead');await form(p).locator('#new-target').fill('2026-11-12');await form(p).locator('#new-reason').fill('Prepare evidence review');await form(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Mandatory evidence '+mode);const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await close(p);await persona(p,'Designer');await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator(`.task-row[data-id="${id}"]`).focus();await p.keyboard.press('Enter');await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');return id;
  14 | }
  15 | async function attach(p,bytes,name='work.pdf'){await p.locator('[data-evidence-kind="FILE"]').click();await p.locator('#cx-evidence-file').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(bytes)});await expect(p.locator('#review-evidence-status')).toContainText('Attachment ready');}
  16 | async function submit(p){await reason(p);await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-current-round')).toContainText('Awaiting Meera');}
  17 | async function correction(p,id){
  18 |  await close(p);await persona(p,'Team Lead');await reviews(p);await p.locator(`#connected-surface [data-cx-task="${id}"]`).click();await reason(p);await p.locator('#cx-comment').fill('Provide the corrected dimensions');await p.getByRole('button',{name:'Request linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Assign linked correction',exact:true})).toBeVisible();await reason(p);await p.getByRole('button',{name:'Assign linked correction',exact:true}).click();await expect(p.getByRole('button',{name:'Open linked correction',exact:true})).toBeVisible();const correctionId=await p.evaluate(id=>window.connectedPrototype.snapshot().rounds.find(([t])=>t===id)[1].at(-1).correctionId,id);await close(p);await persona(p,'Designer');await p.locator('.mobile-nav [data-cx-route="/my-work"],.sidebar [data-cx-route="/my-work"]').filter({visible:true}).first().click();await p.locator(`.task-row[data-id="${correctionId}"]`).focus();await p.keyboard.press('Enter');await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await expect(p.locator('#cx-feedback')).toContainText('recorded');await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Return to original task');await p.getByRole('button',{name:'Return to original task',exact:true}).click();
  19 | }
  20 | for(const width of [1440,1024,768,390,320])test.describe(`evidence ${width}px`,()=>{
  21 |  test.use({viewport:{width,height:width<768?844:900}});
  22 |  test.beforeEach(async({page:p})=>{p.errors=[];p.requests=[];p.on('pageerror',e=>p.errors.push(e.message));await p.route(/^https?:/,r=>{p.requests.push(r.request().url());return r.abort();});await p.goto(url);});
> 23 |  test.afterEach(async({page:p})=>{expect(p.errors).toEqual([]);expect(p.requests).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});
     |                                                    ^ Error: expect(received).toEqual(expected) // deep equality
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