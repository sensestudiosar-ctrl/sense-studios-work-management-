# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mandatory-evidence.spec.mjs >> evidence 390px >> FILE resubmission requires updated evidence and preserves earlier snapshot
- Location: docs\v1-demo\mandatory-evidence.spec.mjs:31:36

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#review-evidence-status')
Expected substring: "Attachment ready"
Received string:    "Add at least one file or link before submitting for review. Provide updated evidence for this new round. Previously submitted evidence alone cannot be reused."
Timeout: 7000ms

Call log:
  - Expect "toContainText" locator('#review-evidence-status') with timeout 7000ms
  - waiting for locator('#review-evidence-status')
    17 × locator resolved to <p role="status" aria-live="polite" class="cx-notice cx-error" id="review-evidence-status">Add at least one file or link before submitting f…</p>
       - unexpected value "Add at least one file or link before submitting for review. Provide updated evidence for this new round. Previously submitted evidence alone cannot be reused."

```

```yaml
- status: Add at least one file or link before submitting for review. Provide updated evidence for this new round. Previously submitted evidence alone cannot be reused.
```

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "submitReviewDemo is not defined",
+ ]
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