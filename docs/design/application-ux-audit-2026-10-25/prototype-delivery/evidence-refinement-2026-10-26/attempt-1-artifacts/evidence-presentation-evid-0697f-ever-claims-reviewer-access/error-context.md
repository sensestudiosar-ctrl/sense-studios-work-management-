# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evidence-presentation.spec.mjs >> evidence presentation 390px >> Review Evidence immediately follows guidance; Add link preview never claims reviewer access
- Location: docs\v1-demo\evidence-presentation.spec.mjs:17:2

# Error details

```
Error: locator.click: Error: strict mode violation: locator('#cx-detail [data-cx-action="close-detail"]') resolved to 2 elements:
    1) <button class="cx-btn" data-cx-action="close-detail" aria-label="Close task details">×</button> aka getByRole('button', { name: 'Close task details' })
    2) <button class="cx-btn " data-cx-action="close-detail">Back to list</button> aka getByRole('button', { name: 'Back to list' })

Call log:
  - waiting for locator('#cx-detail [data-cx-action="close-detail"]')

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
      - option "Designer"
      - option "Team Leader"
      - option "Owner" [selected]
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
    - text: ⌕
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Daily / Dashboard
          - heading "Dashboard" [level=1] [ref=e18]
          - paragraph [ref=e19]: Your work, project context and next actions.
        - button "Open My Work" [ref=e21] [cursor=pointer]
      - generic [ref=e22]:
        - generic [ref=e24]:
          - heading "Next action" [level=2] [ref=e25]
          - paragraph [ref=e26]: Continue from the exact task context
        - generic [ref=e27]:
          - button "Revise bedroom wardrobe working drawing SS-142 · Lakeview Residence Primary owner Asha; 1 collaborators" [ref=e28] [cursor=pointer]:
            - strong [ref=e29]: Revise bedroom wardrobe working drawing
            - generic [ref=e30]: SS-142 · Lakeview Residence
            - generic "Primary owner Asha; 1 collaborators" [ref=e31]:
              - generic "Asha" [ref=e32]: AS
              - generic "Neha" [ref=e33]: NE
              - generic [ref=e34]: Asha +1 helping
          - generic [ref=e35]: Correction
          - generic [ref=e36]: High priority
        - generic [ref=e37]:
          - button "Read review comments" [ref=e38] [cursor=pointer]
          - paragraph [ref=e39]: "Blocked: Asha must complete correction SS-143 before the original task can be resubmitted."
      - region "Today at a glance" [ref=e40]:
        - button "Overdue 1 Past their Target" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]: Overdue
          - strong [ref=e43]: "1"
          - generic [ref=e44]: Past their Target
        - button "Due today 1 Target date today" [ref=e45] [cursor=pointer]:
          - generic [ref=e46]: Due today
          - strong [ref=e47]: "1"
          - generic [ref=e48]: Target date today
        - button "High priority 3 High or critical priority" [ref=e49] [cursor=pointer]:
          - generic [ref=e50]: High priority
          - strong [ref=e51]: "3"
          - generic [ref=e52]: High or critical priority
        - button "Waiting / blocked 1 A next actor is needed" [ref=e53] [cursor=pointer]:
          - generic [ref=e54]: Waiting / blocked
          - strong [ref=e55]: "1"
          - generic [ref=e56]: A next actor is needed
        - button "Review / corrections 2 Review or linked work required" [ref=e57] [cursor=pointer]:
          - generic [ref=e58]: Review / corrections
          - strong [ref=e59]: "2"
          - generic [ref=e60]: Review or linked work required
      - generic [ref=e61]:
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
          - generic [ref=e116]: In progress
          - generic [ref=e117]: High priority
  - navigation "Mobile navigation" [ref=e118]:
    - button "Home" [ref=e119] [cursor=pointer]
    - button "My Work" [ref=e120] [cursor=pointer]
    - button "Projects" [ref=e121] [cursor=pointer]
    - button "Decisions" [ref=e122] [cursor=pointer]
    - button "More" [ref=e123] [cursor=pointer]
  - status [ref=e124]: Sample task created. Your My Work view was preserved.
  - text: + + +
  - dialog [ref=e125]:
    - generic [ref=e126]:
      - banner [ref=e127]:
        - generic [ref=e128]:
          - generic [ref=e129]: DEMO-1792993909547 · PROJECT
          - heading "Review Evidence presentation" [active] [level=2] [ref=e130]
          - generic [ref=e131]: To do
          - generic [ref=e132]: Normal priority
        - button "Close task details" [ref=e133] [cursor=pointer]: ×
      - generic [ref=e134]:
        - button "Lakeview Residence → Project Tasks" [ref=e136] [cursor=pointer]
        - region "Next eligible action" [ref=e137]:
          - heading "Current next step" [level=3] [ref=e138]
          - paragraph [ref=e139]: "Next actor: Asha, the primary owner. Only current permitted worker actions are available."
          - status
        - generic [ref=e141]:
          - generic [ref=e142]:
            - term [ref=e143]: Primary owner & collaborators
            - definition [ref=e144]:
              - generic "Primary owner Asha; 0 collaborators" [ref=e145]:
                - generic "Asha" [ref=e146]: AS
                - generic [ref=e147]: Asha
          - generic [ref=e148]:
            - term [ref=e149]: Target
            - definition [ref=e150]: 2026-11-15
          - generic [ref=e151]:
            - term [ref=e152]: Review requirement
            - definition [ref=e153]: INTERNAL
          - generic [ref=e154]:
            - term [ref=e155]: Independent reviewer
            - definition [ref=e156]: Meera
        - generic [ref=e157]:
          - heading "Work brief" [level=3] [ref=e158]
          - paragraph [ref=e159]: No description recorded.
        - generic [ref=e160]:
          - heading "Internal review history" [level=3] [ref=e161]
          - paragraph [ref=e162]: No submitted review round yet.
        - group [ref=e163]:
          - generic "Other task actions" [ref=e164] [cursor=pointer]
        - group [ref=e165]:
          - generic "Activity history" [ref=e166] [cursor=pointer]
      - contentinfo [ref=e167]:
        - button "Back to list" [ref=e168] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import path from 'node:path';
  3  | import {pathToFileURL} from 'node:url';
  4  | const url=pathToFileURL(path.resolve('docs/v1-demo/task-creation-completed-demo.html')).href;
  5  | const root=p=>p.locator('#task-create-refinement');
  6  | const output=path.resolve('docs/design/application-ux-audit-2026-10-25/prototype-delivery/evidence-refinement-2026-10-26/screenshots');
  7  | const missing='Add at least one file or link before submitting for review.';
  8  | async function persona(p,value){await p.locator('.cx-harness summary').click();await p.locator('#role').selectOption(value);await p.locator('.cx-harness summary').click();}
  9  | async function reason(p){await p.locator('#cx-reason').fill('Review this exact work version');}
  10 | async function ready(p){
> 11 |  await persona(p,'Owner');await p.locator('#cx-new').click();await root(p).locator('#new-title').fill('Review Evidence presentation');await root(p).locator('#new-project').selectOption({label:'Lakeview Residence'});await root(p).locator('#new-owner').selectOption('designer1');await root(p).locator('#new-review').selectOption('INTERNAL');await root(p).locator('#new-reviewer').selectOption('lead');await root(p).locator('#new-target').fill('2026-11-15');await root(p).locator('#new-reason').fill('Prepare review evidence');await root(p).locator('#new-submit').click();await expect(p.locator('#cx-detail-title')).toHaveText('Review Evidence presentation');const id=await p.evaluate(()=>window.taskCreateRefinement.lastCreated());await p.locator('#cx-detail [data-cx-action="close-detail"]').click();await persona(p,'Designer');await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.locator(`.task-row[data-id="${id}"]`).focus();await p.keyboard.press('Enter');await reason(p);await p.locator('#cx-detail [data-cx-action="start-task"]').click();await expect(p.locator('#cx-feedback')).toContainText('recorded');return id;
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ^ Error: locator.click: Error: strict mode violation: locator('#cx-detail [data-cx-action="close-detail"]') resolved to 2 elements:
  12 | }
  13 | for(const width of [1440,1024,768,390,320])test.describe(`evidence presentation ${width}px`,()=>{
  14 |  test.use({viewport:{width,height:width<768?844:900}});
  15 |  test.beforeEach(async({page:p})=>{p.errors=[];p.requests=[];p.on('pageerror',e=>p.errors.push(e.message));await p.route(/^https?:/,r=>{p.requests.push(r.request().url());return r.abort();});await p.goto(url);});
  16 |  test.afterEach(async({page:p})=>{expect(p.errors).toEqual([]);expect(p.requests).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});
  17 |  test('Review Evidence immediately follows guidance; Add link preview never claims reviewer access',async({page:p})=>{
  18 |   await ready(p);expect(await p.locator('#mandatory-evidence-panel').evaluate(panel=>panel.previousElementSibling.classList.contains('cx-next'))).toBe(true);expect(await p.locator('#mandatory-evidence-panel').evaluate(panel=>Boolean(panel.compareDocumentPosition([...document.querySelectorAll('#cx-detail h3')].find(n=>n.textContent==='Work brief'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);await expect(p.getByRole('button',{name:'Attach file',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Add link',exact:true})).toBeVisible();await expect(p.locator('#review-evidence-status')).toHaveText(missing);await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(missing);await p.locator('#cx-evidence').fill('not a link');await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(missing);
  19 |   await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/presentation-r1/view');await expect(p.locator('#review-evidence-preview')).toHaveText('https://drive.google.com/file/d/presentation-r1/view');await expect(p.locator('#review-evidence-status')).toContainText('Reviewer access has not been verified');await expect(p.locator('#review-link-guidance')).toContainText('never opened or fetched');await p.screenshot({path:path.join(output,`${width}-review-evidence-link.png`)});
  20 |  });
  21 |  test('selected local file is blocked until explicitly simulated confirmation; immutable record says no real upload',async({page:p})=>{
  22 |   const id=await ready(p);await p.getByRole('button',{name:'Attach file',exact:true}).click();await p.locator('#cx-evidence-file').setInputFiles({name:'selected-review.pdf',mimeType:'application/pdf',buffer:Buffer.from('local selection, not a stored upload')});await expect(p.locator('#review-evidence-preview')).toContainText('selected locally; not uploaded or stored');await reason(p);await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-feedback')).toHaveText(missing);expect((await p.evaluate(()=>window.connectedPrototype.snapshot())).rounds.find(([task])=>task===id)[1]).toHaveLength(0);await p.screenshot({path:path.join(output,`${width}-local-file-blocked.png`)});
  23 |   await p.locator('#simulate-storage').click();await expect(p.locator('#review-evidence-status')).toHaveText('Simulated storage confirmation only. No real file upload or retention.');await expect(p.locator('#review-evidence-preview')).toContainText('selected-review.pdf');await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-current-round')).toHaveText('Round 1 · Awaiting Meera');const round=(await p.evaluate(()=>window.connectedPrototype.snapshot())).rounds.find(([task])=>task===id)[1][0];expect(round.evidenceSnapshot.evidence).toMatchObject({kind:'FILE',storageState:'SIMULATED_CONFIRMED',uploaded:false,retained:false});expect(round.evidenceSnapshot.evidence.simulatedReceiptId).toMatch(/^DEMO-RECEIPT-/);
  24 |  });
  25 |  test('phone Dashboard surfaces next action early; submitted round has one status and disclosed history',async({page:p})=>{
  26 |   if(width<768){const next=p.locator('.evidence-mobile-next');await expect(next).toBeVisible();expect(await next.evaluate(n=>Boolean(n.compareDocumentPosition(document.querySelector('.cx-stats'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);const action=await next.locator('[data-cx-action="seed"]').boundingBox();expect(action.y+action.height).toBeLessThan(844-68);}await p.screenshot({path:path.join(output,`${width}-dashboard.png`)});
  27 |   await ready(p);await p.locator('#cx-evidence').fill('https://drive.google.com/file/d/status-r1/view');await reason(p);await p.locator('#cx-detail [data-cx-action="submit"]').click();await expect(p.locator('#cx-current-round')).toHaveText('Round 1 · Awaiting Meera');await expect(p.locator('#cx-next-guidance')).not.toContainText('Round 1');await expect(p.locator('#cx-feedback')).not.toContainText('Awaiting');await expect(p.locator('#cx-feedback')).not.toContainText('Round 1');await expect(p.locator('.cx-history')).not.toBeVisible();await p.locator('#cx-detail summary').filter({hasText:'Review history'}).click();await expect(p.locator('.cx-history')).toBeVisible();await expect(p.locator('.cx-history')).toContainText('status-r1');await p.screenshot({path:path.join(output,`${width}-submitted-status.png`)});
  28 |  });
  29 | });
  30 | 
```