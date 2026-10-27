# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connected-refinement.spec.mjs >> refinement 1024px >> unfinished subtask replaces ineligible parent completion with responsible-actor guidance
- Location: docs\v1-demo\connected-refinement.spec.mjs:39:2

# Error details

```
TimeoutError: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Create subtask', exact: true })
    - locator resolved to <button disabled class="cx-btn " data-cx-action="subtask">Create subtask</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

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
        - generic [ref=e37]: Workspace / Dashboard
        - generic [ref=e38]:
          - generic [ref=e39]: ◦ Sample data / no backend
          - button "New task" [ref=e40] [cursor=pointer]
      - text: ⌕
      - generic [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]: Daily / Dashboard
            - heading "Dashboard" [level=1] [ref=e46]
            - paragraph [ref=e47]: Your work, project context and next actions.
          - button "Open My Work" [ref=e49] [cursor=pointer]
        - region "Today at a glance" [ref=e50]:
          - button "Overdue 0 Past their Target" [ref=e51] [cursor=pointer]:
            - generic [ref=e52]: Overdue
            - strong [ref=e53]: "0"
            - generic [ref=e54]: Past their Target
          - button "Due today 2 Target date today" [ref=e55] [cursor=pointer]:
            - generic [ref=e56]: Due today
            - strong [ref=e57]: "2"
            - generic [ref=e58]: Target date today
          - button "High priority 3 High or critical priority" [ref=e59] [cursor=pointer]:
            - generic [ref=e60]: High priority
            - strong [ref=e61]: "3"
            - generic [ref=e62]: High or critical priority
          - button "Waiting / blocked 0 A next actor is needed" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: Waiting / blocked
            - strong [ref=e65]: "0"
            - generic [ref=e66]: A next actor is needed
          - button "Review / corrections 1 Review or linked work required" [ref=e67] [cursor=pointer]:
            - generic [ref=e68]: Review / corrections
            - strong [ref=e69]: "1"
            - generic [ref=e70]: Review or linked work required
        - generic [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e75]:
                - heading "Next action" [level=2] [ref=e76]
                - paragraph [ref=e77]: Continue from the exact task context
              - generic [ref=e78]:
                - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators" [ref=e79] [cursor=pointer]:
                  - strong [ref=e80]: Revise bedroom wardrobe working drawing
                  - generic [ref=e81]: SS-142 · Lakeview Residence
                  - generic "Primary owner Asha; 1 collaborators" [ref=e82]:
                    - generic "Asha" [ref=e83]: AS
                    - generic "Neha" [ref=e84]: NE
                    - generic [ref=e85]: Asha +1 helping
                - generic [ref=e86]: Correction
                - generic [ref=e87]: High priority
              - generic [ref=e88]:
                - button "Read review comments" [ref=e89] [cursor=pointer]
                - paragraph [ref=e90]: "Blocked: Asha must complete correction SS-143 before the original task can be resubmitted."
            - generic [ref=e91]:
              - generic [ref=e93]:
                - heading "Time tracking" [level=2] [ref=e94]
                - paragraph [ref=e95]: Existing Time workflow
              - generic [ref=e96]:
                - paragraph [ref=e97]: No timer is running in this sample.
                - button "Open Time context" [ref=e98] [cursor=pointer]
          - generic [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e102]:
                - heading "Projects" [level=2] [ref=e103]
                - paragraph [ref=e104]: Your authorized sample project context
              - button "Lakeview Residence Open project → Tasks" [ref=e106] [cursor=pointer]:
                - text: Lakeview Residence
                - generic [ref=e107]: Open project → Tasks
              - button "Palm Courtyard Villa Open project → Tasks" [ref=e109] [cursor=pointer]:
                - text: Palm Courtyard Villa
                - generic [ref=e110]: Open project → Tasks
              - button "Swagath Delight Open project → Tasks" [ref=e112] [cursor=pointer]:
                - text: Swagath Delight
                - generic [ref=e113]: Open project → Tasks
            - generic [ref=e114]:
              - generic [ref=e116]:
                - heading "Assigned internal reviews" [level=2] [ref=e117]
                - paragraph [ref=e118]: Named reviewer and exact evidence
              - generic [ref=e119]:
                - paragraph [ref=e120]: Independent review stays with the named reviewer.
                - button "Open internal reviews" [ref=e121] [cursor=pointer]
        - generic [ref=e122]:
          - generic [ref=e124]:
            - heading "Attention queue" [level=2] [ref=e125]
            - paragraph [ref=e126]: Two starting rows · statuses may overlap summary counts
          - generic [ref=e127]:
            - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators" [ref=e128] [cursor=pointer]:
              - strong [ref=e129]: Revise bedroom wardrobe working drawing
              - generic [ref=e130]: SS-142 · Lakeview Residence
              - generic "Primary owner Asha; 1 collaborators" [ref=e131]:
                - generic "Asha" [ref=e132]: AS
                - generic "Neha" [ref=e133]: NE
                - generic [ref=e134]: Asha +1 helping
            - generic [ref=e135]: Correction
            - generic [ref=e136]: High priority
          - generic [ref=e137]:
            - button "Correct wardrobe clearances from internal review SS-143 · Lakeview Residence Primary owner Asha; 0 collaborators" [ref=e138] [cursor=pointer]:
              - strong [ref=e139]: Correct wardrobe clearances from internal review
              - generic [ref=e140]: SS-143 · Lakeview Residence
              - generic "Primary owner Asha; 0 collaborators" [ref=e141]:
                - generic "Asha" [ref=e142]: AS
                - generic [ref=e143]: Asha
            - generic [ref=e144]: In progress
            - generic [ref=e145]: High priority
  - status [ref=e146]: Sample task created. Your My Work view was preserved.
  - text: + + +
  - dialog [ref=e147]:
    - generic [ref=e148]:
      - banner [ref=e149]:
        - generic [ref=e150]:
          - generic [ref=e151]: DEMO-1792929631051 · PROJECT
          - heading "Parent task with child" [active] [level=2] [ref=e152]
          - generic [ref=e153]: In progress
          - generic [ref=e154]: Normal priority
        - button "Close task details" [ref=e155] [cursor=pointer]: ×
      - generic [ref=e156]:
        - button "Lakeview Residence → Project Tasks" [ref=e158] [cursor=pointer]
        - region "Next eligible action" [ref=e159]:
          - heading "Complete task" [level=3] [ref=e160]
          - paragraph [ref=e161]: Finish the assigned work and record a reason. A checklist or optional work reference does not create an additional completion gate.
          - status [ref=e162]: Internal decision recorded in this sample session.
        - generic [ref=e164]:
          - generic [ref=e165]:
            - term [ref=e166]: Primary owner & collaborators
            - definition [ref=e167]:
              - generic "Primary owner Asha; 0 collaborators" [ref=e168]:
                - generic "Asha" [ref=e169]: AS
                - generic [ref=e170]: Asha
          - generic [ref=e171]:
            - term [ref=e172]: Target
            - definition [ref=e173]: 2026-11-09
          - generic [ref=e174]:
            - term [ref=e175]: Review requirement
            - definition [ref=e176]: NONE
          - generic [ref=e177]:
            - term [ref=e178]: Independent reviewer
            - definition [ref=e179]: Not assigned
        - generic [ref=e180]:
          - heading "Work brief" [level=3] [ref=e181]
          - paragraph [ref=e182]: No description recorded.
        - region "Action details" [ref=e183]:
          - generic [ref=e184]:
            - text: Work reference · optional
            - textbox "Work reference · optional" [ref=e185]:
              - /placeholder: e.g. Wardrobe_R2.pdf or https://…
          - paragraph [ref=e186]: Sample reference only. No file is uploaded or external URL opened.
          - generic [ref=e187]:
            - text: Reason for this action *
            - textbox "Reason for this action *" [ref=e188]:
              - /placeholder: Explain this transition
        - generic [ref=e189]:
          - heading "Internal review history" [level=3] [ref=e190]
          - paragraph [ref=e191]: No submitted review round yet.
        - group [ref=e192]:
          - generic "Other task actions" [ref=e193] [cursor=pointer]
        - group [ref=e194]:
          - generic "Activity history" [ref=e195] [cursor=pointer]
      - contentinfo [ref=e196]:
        - button "Back to list" [ref=e197] [cursor=pointer]
        - button "Complete task" [ref=e198] [cursor=pointer]
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
  26 |   await p.locator('.task-row[data-id="SS-142"]').scrollIntoViewIfNeeded();const scroll=await p.evaluate(()=>scrollY);await p.locator('.task-row[data-id="SS-142"]').focus();await p.keyboard.press('Enter');await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('[data-project-task="SS-142"]')).toHaveAttribute('aria-current','true');await expect(p.locator('[data-project-task="SS-142"]')).toContainText('Opened from your task');await p.locator('[data-cx-task="SS-142"]').first().click();await close(p);await p.locator('[data-ref-return]').click();await expect(p.locator('#search')).toHaveValue('wardrobe');await expect(p.locator('#groupBy')).toHaveValue('project');await expect(p.locator('.task-row[data-id="SS-142"]')).toBeFocused();const snapshot=await p.evaluate(()=>window.connectedPrototype.snapshot());expect(snapshot.origin.filters.project).toBe('Lakeview Residence');expect(snapshot.origin.filters.priority).toBe('High');expect(Math.abs((await p.evaluate(()=>scrollY))-scroll)).toBeLessThan(3);
  27 |  });
  28 |  test('all eight project sections remain reachable with current selection and overflow cues',async({page:p})=>{
  29 |   await p.locator('[data-cx-action="seed"]').click();await p.locator('#cx-detail [data-cx-project]').click();await expect(p.locator('[data-cx-section]')).toHaveCount(8);await expect(p.locator('[data-cx-section="Tasks"]')).toHaveAttribute('aria-current','page');await p.locator('[data-cx-section="Tasks"]').focus();await p.keyboard.press('End');await expect(p.locator('[data-cx-section="Activity"]')).toBeFocused();await expect(p.locator('[data-cx-section="Activity"]')).toHaveAttribute('aria-current','page');await expect(p.locator('.cx-tabs-hint')).toContainText('Scroll for more');
  30 |   for(const section of ['Overview','Plan','Tasks','People','Documents','Reviews','Delivery','Activity']){await p.locator(`[data-cx-section="${section}"]`).click();await expect(p.locator(`[data-cx-section="${section}"]`)).toHaveAttribute('aria-current','page');expect(await p.locator(`[data-cx-section="${section}"]`).evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);}
  31 |   if(width<768)expect(await p.locator('.cx-tabs').evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);await p.locator('[data-cx-section="Tasks"]').click();await p.screenshot({path:path.join(dest,`${width}-project-tabs.png`)});
  32 |  });
  33 |  test('correction return, updated evidence, current round and dashboard guidance change',async({page:p})=>{
  34 |   await p.locator('[data-cx-action="seed"]').click();await expect(p.locator('#cx-detail .primary')).toHaveText('Open linked correction');await p.getByRole('button',{name:'Open linked correction',exact:true}).click();await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Return to original task');await p.getByRole('button',{name:'Return to original task',exact:true}).click();await expect(p.locator('#cx-next-guidance')).toContainText('Add the updated file or link evidence');await expect(p.locator('#cx-detail .primary')).toHaveText('Resubmit for internal review');await reason(p);await p.locator('#cx-evidence').fill('Wardrobe_Updated_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();await expect(p.locator('#cx-current-round')).toHaveText('Round 2 · Awaiting Meera');await expect(p.locator('#cx-detail .primary')).toHaveCount(0);await expect(p.locator('#cx-next-guidance')).not.toContainText('must complete correction');await p.screenshot({path:path.join(dest,`${width}-resubmitted.png`)});await close(p);await expect(p.locator('#cx-dashboard-guidance')).toContainText('Round 2 is awaiting Meera');await expect(p.locator('#cx-dashboard-guidance')).not.toContainText('Complete the linked correction');
  35 |  });
  36 |  test('My Work row guidance follows the submitted review round',async({page:p})=>{
  37 |   await p.locator('[data-cx-action="seed"]').click();await p.getByRole('button',{name:'Open linked correction',exact:true}).click();await reason(p);await p.getByRole('button',{name:'Complete correction',exact:true}).click();await p.getByRole('button',{name:'Return to original task',exact:true}).click();await reason(p);await p.locator('#cx-evidence').fill('Updated_work_R2.pdf');await p.getByRole('button',{name:'Resubmit for internal review',exact:true}).click();await expect(p.locator('#cx-current-round')).toHaveText('Round 2 · Awaiting Meera');await close(p);await p.getByRole('button',{name:'Open My Work',exact:true}).click();const row=p.locator('.task-row[data-id="SS-142"]');await expect(row).toContainText('Awaiting Meera');await expect(row).not.toContainText('Open correction');
  38 |  });
  39 |  test('unfinished subtask replaces ineligible parent completion with responsible-actor guidance',async({page:p})=>{
> 40 |   await form(p,'Parent task with child');await creation(p).locator('#new-review').selectOption('NONE');await creation(p).locator('#new-submit').click();const parent=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await reason(p);await p.getByRole('button',{name:'Start task',exact:true}).click();await p.locator('summary').filter({hasText:'Other task actions'}).click();await p.getByRole('button',{name:'Create subtask',exact:true}).click();await creation(p).locator('#new-title').fill('Required child work');await creation(p).locator('#new-target').fill('2026-11-10');await creation(p).locator('#new-reason').fill('Finish required child detail');await creation(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Required child work');await p.locator(`#cx-detail [data-cx-task="${parent}"]`).click();await expect(p.locator('#cx-detail .primary')).toHaveText('Open required subtask');await expect(p.locator('#cx-next-guidance')).toContainText('Asha must complete subtask');await expect(p.getByRole('button',{name:'Complete task',exact:true})).toHaveCount(0);
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ^ TimeoutError: locator.click: Timeout 8000ms exceeded.
  41 |  });
  42 |  test('unsaved details, keyboard focus return and mobile control geometry',async({page:p})=>{
  43 |   await p.getByRole('button',{name:'Open My Work',exact:true}).click();if(width<768){const s=await p.locator('#search').boundingBox(),f=await p.locator('#filterBtn').boundingBox(),v=await p.locator('#mobileQueueMore').boundingBox();expect(s.width).toBeGreaterThan(width-100);expect(f.y).toBeGreaterThan(s.y+s.height-1);expect(Math.abs(f.y-v.y)).toBeLessThan(2);for(const loc of ['#filterBtn','#mobileQueueMore'])expect((await p.locator(loc).boundingBox()).height).toBeGreaterThanOrEqual(44);for(const metric of await p.locator('#summary .metric').all())expect(await metric.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);}
  44 |   await p.locator('.task-row[data-id="SS-143"]').focus();await p.keyboard.press('Enter');await p.locator('#cx-reason').fill('Unsent change');p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).toBeVisible();await expect(p.locator('#cx-reason')).toHaveValue('Unsent change');p.once('dialog',d=>d.accept());await p.keyboard.press('Escape');await expect(p.locator('#cx-detail')).not.toBeVisible();await expect(p.locator('.task-row[data-id="SS-143"]')).toBeFocused();
  45 |   await p.locator('#cx-new').focus();await p.keyboard.press('Enter');await expect(creation(p).locator('#new-title')).toBeFocused();await creation(p).locator('#new-title').fill('Unsaved creation');await p.keyboard.press('Escape');await expect(creation(p).locator('#new-discard')).toBeVisible();await creation(p).locator('#new-keep').click();await expect(creation(p).locator('#new-title')).toHaveValue('Unsaved creation');await p.keyboard.press('Escape');await creation(p).locator('#new-discard-confirm').click();await expect(p.locator('#cx-new')).toBeFocused();
  46 |  });
  47 | });
  48 | 
```