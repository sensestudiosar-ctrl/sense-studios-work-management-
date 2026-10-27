# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 390px >> correction return, updated evidence, current round and dashboard guidance change
- Location: docs\v1-demo\connected-refinement.spec.mjs:33:2

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Resubmit for internal review', exact: true }) resolved to 2 elements:
    1) <button data-cx-action="seed" class="cx-btn primary">Resubmit for internal review</button> aka locator('#connected-surface').getByRole('button', { name: 'Resubmit for internal review' })
    2) <button class="cx-btn primary" data-cx-action="submit">Resubmit for internal review</button> aka locator('#cx-detail').getByRole('button', { name: 'Resubmit for internal review' })

Call log:
  - waiting for getByRole('button', { name: 'Resubmit for internal review', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to work content" [ref=e2] [cursor=pointer]:
    - /url: "#connected-surface"
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
      - generic [ref=e10]: Workspace / Dashboard
      - button "New task" [ref=e12] [cursor=pointer]
    - text: ⌕
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Daily / Dashboard
          - heading "Dashboard" [level=1] [ref=e18]
          - paragraph [ref=e19]: Your work, project context and next actions.
        - button "Open My Work" [ref=e21] [cursor=pointer]
      - region "Today at a glance" [ref=e22]:
        - button "Overdue 0 Past their Target" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]: Overdue
          - strong [ref=e25]: "0"
          - generic [ref=e26]: Past their Target
        - button "Due today 1 Target date today" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]: Due today
          - strong [ref=e29]: "1"
          - generic [ref=e30]: Target date today
        - button "High priority 2 High or critical priority" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: High priority
          - strong [ref=e33]: "2"
          - generic [ref=e34]: High or critical priority
        - button "Waiting / blocked 0 A next actor is needed" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: Waiting / blocked
          - strong [ref=e37]: "0"
          - generic [ref=e38]: A next actor is needed
        - button "Review / corrections 1 Review or linked work required" [ref=e39] [cursor=pointer]:
          - generic [ref=e40]: Review / corrections
          - strong [ref=e41]: "1"
          - generic [ref=e42]: Review or linked work required
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e47]:
              - heading "Next action" [level=2] [ref=e48]
              - paragraph [ref=e49]: Continue from the exact task context
            - generic [ref=e50]:
              - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators" [ref=e51] [cursor=pointer]:
                - strong [ref=e52]: Revise bedroom wardrobe working drawing
                - generic [ref=e53]: SS-142 · Lakeview Residence
                - generic "Primary owner Asha; 1 collaborators" [ref=e54]:
                  - generic "Asha" [ref=e55]: AS
                  - generic "Neha" [ref=e56]: NE
                  - generic [ref=e57]: Asha +1 helping
              - generic [ref=e58]: Correction
              - generic [ref=e59]: High priority
            - generic [ref=e60]:
              - button "Resubmit for internal review" [ref=e61] [cursor=pointer]
              - paragraph [ref=e62]: Correction complete. Add the updated file or link evidence, then resubmit as a new round. Previous decisions and evidence remain unchanged.
          - generic [ref=e63]:
            - generic [ref=e65]:
              - heading "Time tracking" [level=2] [ref=e66]
              - paragraph [ref=e67]: Existing Time workflow
            - generic [ref=e68]:
              - paragraph [ref=e69]: No timer is running in this sample.
              - button "Open Time context" [ref=e70] [cursor=pointer]
        - generic [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e74]:
              - heading "Projects" [level=2] [ref=e75]
              - paragraph [ref=e76]: Your authorized sample project context
            - button "Lakeview Residence Open project → Tasks" [ref=e78] [cursor=pointer]:
              - text: Lakeview Residence
              - generic [ref=e79]: Open project → Tasks
            - button "Palm Courtyard Villa Open project → Tasks" [ref=e81] [cursor=pointer]:
              - text: Palm Courtyard Villa
              - generic [ref=e82]: Open project → Tasks
            - button "Swagath Delight Open project → Tasks" [ref=e84] [cursor=pointer]:
              - text: Swagath Delight
              - generic [ref=e85]: Open project → Tasks
          - generic [ref=e86]:
            - generic [ref=e88]:
              - heading "Assigned internal reviews" [level=2] [ref=e89]
              - paragraph [ref=e90]: Named reviewer and exact evidence
            - generic [ref=e91]:
              - paragraph [ref=e92]: Independent review stays with the named reviewer.
              - button "Open internal reviews" [ref=e93] [cursor=pointer]
      - generic [ref=e94]:
        - generic [ref=e96]:
          - heading "Attention queue" [level=2] [ref=e97]
          - paragraph [ref=e98]: Two starting rows · statuses may overlap summary counts
        - generic [ref=e99]:
          - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators" [ref=e100] [cursor=pointer]:
            - strong [ref=e101]: Revise bedroom wardrobe working drawing
            - generic [ref=e102]: SS-142 · Lakeview Residence
            - generic "Primary owner Asha; 1 collaborators" [ref=e103]:
              - generic "Asha" [ref=e104]: AS
              - generic "Neha" [ref=e105]: NE
              - generic [ref=e106]: Asha +1 helping
          - generic [ref=e107]: Correction
          - generic [ref=e108]: High priority
        - generic [ref=e109]:
          - button "Correct wardrobe clearances from internal review SS-143 · Lakeview Residence Primary owner Asha; 0 collaborators" [ref=e110] [cursor=pointer]:
            - strong [ref=e111]: Correct wardrobe clearances from internal review
            - generic [ref=e112]: SS-143 · Lakeview Residence
            - generic "Primary owner Asha; 0 collaborators" [ref=e113]:
              - generic "Asha" [ref=e114]: AS
              - generic [ref=e115]: Asha
          - generic [ref=e116]: Completed
          - generic [ref=e117]: High priority
  - navigation "Mobile navigation" [ref=e118]:
    - button "Home" [ref=e119] [cursor=pointer]
    - button "My Work" [ref=e120] [cursor=pointer]
    - button "Projects" [ref=e121] [cursor=pointer]
    - button "Decisions" [ref=e122] [cursor=pointer]
    - button "More" [ref=e123] [cursor=pointer]
  - status [ref=e124]
  - text: + + +
  - dialog [ref=e125]:
    - generic [ref=e126]:
      - banner [ref=e127]:
        - generic [ref=e128]:
          - generic [ref=e129]: SS-142 · PROJECT
          - heading "Revise bedroom wardrobe working drawing" [level=2] [ref=e130]
          - generic [ref=e131]: Correction
          - generic [ref=e132]: High priority
        - button "Close task details" [ref=e133] [cursor=pointer]: ×
      - generic [ref=e134]:
        - button "Lakeview Residence → Project Tasks" [ref=e136] [cursor=pointer]
        - region "Next eligible action" [ref=e137]:
          - heading "Resubmit for internal review" [level=3] [ref=e138]
          - paragraph [ref=e139]: Correction complete. Add the updated file or link evidence, then resubmit as a new round. Previous decisions and evidence remain unchanged.
          - status
        - generic [ref=e140]:
          - heading "Latest review feedback · round 1" [level=3] [ref=e141]
          - paragraph [ref=e142]: Show 50 mm service clearance and dimension the wardrobe depth before resubmitting.
          - paragraph [ref=e143]: Technical accuracy · Major · Meera
        - generic [ref=e145]:
          - generic [ref=e146]:
            - term [ref=e147]: Primary owner & collaborators
            - definition [ref=e148]:
              - generic "Primary owner Asha; 1 collaborators" [ref=e149]:
                - generic "Asha" [ref=e150]: AS
                - generic "Neha" [ref=e151]: NE
                - generic [ref=e152]: Asha +1 helping
          - generic [ref=e153]:
            - term [ref=e154]: Target
            - definition [ref=e155]: 2026-10-24
          - generic [ref=e156]:
            - term [ref=e157]: Review requirement
            - definition [ref=e158]: INTERNAL
          - generic [ref=e159]:
            - term [ref=e160]: Independent reviewer
            - definition [ref=e161]: Meera
        - generic [ref=e162]:
          - heading "Work brief" [level=3] [ref=e163]
          - paragraph [ref=e164]: Coordinate revise bedroom wardrobe working drawing according to the approved scope. Confirm completeness and submit the required evidence or documentation through the established project workflow.
          - generic [ref=e165] [cursor=pointer]:
            - checkbox "Confirm current requirements" [checked] [ref=e166]
            - text: Confirm current requirements
          - generic [ref=e167] [cursor=pointer]:
            - checkbox "Complete assigned work" [ref=e168]
            - text: Complete assigned work
          - generic [ref=e169] [cursor=pointer]:
            - checkbox "Verify dimensions and details" [ref=e170]
            - text: Verify dimensions and details
          - generic [ref=e171] [cursor=pointer]:
            - checkbox "Submit required evidence" [ref=e172]
            - text: Submit required evidence
        - region "Action details" [ref=e173]:
          - generic [ref=e174]:
            - text: Updated evidence for this resubmission *
            - textbox "Updated evidence for this resubmission *" [active] [ref=e175]:
              - /placeholder: e.g. Wardrobe_R2.pdf or https://…
              - text: Wardrobe_Updated_R2.pdf
          - paragraph [ref=e176]: A new round requires the updated work reference. The previous round stays locked.
          - generic [ref=e177]:
            - text: Reason for this action *
            - textbox "Reason for this action *" [ref=e178]:
              - /placeholder: Explain this transition
              - text: Finish the agreed correction
        - generic [ref=e179]:
          - heading "Internal review history" [level=3] [ref=e180]
          - article [ref=e181]:
            - strong [ref=e182]: Round 1 · Changes requested
            - paragraph [ref=e183]: ROUND-142-1 · Submitted by Asha · Reviewer Meera
            - paragraph [ref=e184]: "Submitted evidence: Wardrobe_Drawing_R1.pdf · sample evidence E-142-1"
            - paragraph [ref=e185]: "Review comment: Show 50 mm service clearance and dimension the wardrobe depth before resubmitting."
            - paragraph [ref=e186]: Technical accuracy · Major
            - button "Open linked correction SS-143" [ref=e187] [cursor=pointer]
        - group [ref=e188]:
          - generic "Other task actions" [ref=e189] [cursor=pointer]
        - group [ref=e190]:
          - generic "Activity history" [ref=e191] [cursor=pointer]
      - contentinfo [ref=e192]:
        - button "Back to list" [ref=e193] [cursor=pointer]
        - button "Resubmit for internal review" [ref=e194] [cursor=pointer]
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
> 34 |   await p.locator('[data-cx-action="seed"]').click();await expect(p.locator('#cx-detail .primary')).toHaveText('Open linked correction');await p.getByRole('button',{name:'Open linked correction',exact:true}).click();await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Return to original task');await p.getByRole('button',{name:'Return to original task',exact:true}).click();await expect(p.locator('#cx-next-guidance')).toContainText('Add the updated file or link evidence');await expect(p.locator('#cx-detail .primary')).toHaveText('Resubmit for internal review');await reason(p);await p.locator('#cx-evidence').fill('Wardrobe_Updated_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();await expect(p.locator('#cx-current-round')).toHaveText('Round 2 · Awaiting Meera');await expect(p.locator('#cx-detail .primary')).toHaveCount(0);await expect(p.locator('#cx-next-guidance')).not.toContainText('must complete correction');await p.screenshot({path:path.join(dest,`${width}-resubmitted.png`)});await close(p);await expect(p.locator('#cx-dashboard-guidance')).toContainText('Round 2 is awaiting Meera');await expect(p.locator('#cx-dashboard-guidance')).not.toContainText('Complete the linked correction');
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Resubmit for internal review', exact: true }) resolved to 2 elements:
  35 |  });
  36 |  test('unsaved details, keyboard focus return and mobile control geometry',async({page:p})=>{
  37 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();if(width<768){const s=await p.locator('#search').boundingBox(),f=await p.locator('#filterBtn').boundingBox(),v=await p.locator('#mobileQueueMore').boundingBox();expect(s.width).toBeGreaterThan(width-100);expect(f.y).toBeGreaterThan(s.y+s.height-1);expect(Math.abs(f.y-v.y)).toBeLessThan(2);for(const loc of ['#filterBtn','#mobileQueueMore'])expect((await p.locator(loc).boundingBox()).height).toBeGreaterThanOrEqual(44);for(const metric of await p.locator('#summary .metric').all())expect(await metric.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);}
  38 |   await p.locator('.task-row[data-id="SS-143"]').click();await p.locator('#cx-reason').fill('Unsent change');p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).toBeVisible();await expect(p.locator('#cx-reason')).toHaveValue('Unsent change');p.once('dialog',d=>d.accept());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();await expect(p.locator('.task-row[data-id="SS-143"]')).toBeFocused();
  39 |   await p.locator('#cx-new').focus();await p.keyboard.press('Enter');await expect(creation(p).locator('#new-title')).toBeFocused();await creation(p).locator('#new-title').fill('Unsaved creation');await p.keyboard.press('Escape');await expect(creation(p).locator('#new-discard')).toBeVisible();await creation(p).locator('#new-keep').click();await expect(creation(p).locator('#new-title')).toHaveValue('Unsaved creation');await p.keyboard.press('Escape');await creation(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  40 |  });
  41 | });
  42 | 
```