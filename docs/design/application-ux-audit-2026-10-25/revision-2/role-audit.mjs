import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readPrivate} from '../../../../.env.checkpoint-tools/test-personas/private-state.mjs';

// Audit harness only. Existing enrolled test passkeys, normal server auth, no mocked responses.
// Never enroll, create a session in SQL, change grants, seed, migrate or submit domain commands.
const out=path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(out,'evidence'),{recursive:true});
const origin='http://localhost:59443';
const correctionMode=process.env.UX_AUDIT_MODE==='corrections';
const interactionMode=process.env.UX_AUDIT_MODE==='interactions'||correctionMode;
const result={at:new Date().toISOString(),origin,authMethod:'Existing enrolled test passkeys via hardware emulation; normal backend login and current persisted account/employee roles. No mocked sessions/API responses.',roles:[],blockedWrites:[],release:{}};
const save=()=>fs.writeFileSync(path.join(out,correctionMode?'CORRECTION_WORKFLOW_EVIDENCE.json':interactionMode?'ROLE_INTERACTION_EVIDENCE.json':'REAL_ROLE_EVIDENCE.json'),JSON.stringify(result,null,2));
const state=readPrivate('.env.checkpoint-tools/test-personas/personas.dpapi');assert.equal(state.complete,true);
for(const p of ['/release.json','/api/v1/health/release','/api/v1/health/ready']){const r=await fetch(origin+p);assert.equal(r.status,200);result.release[p]=await r.json();}
assert.equal(result.release['/release.json'].buildId,result.release['/api/v1/health/release'].buildId);
assert.equal(result.release['/release.json'].migrations,120);
const routes=['/dashboard','/my-work','/tasks','/projects','/people','/settings','/decisions','/notifications','/documents','/revisions','/reviews','/client-reviews','/external-access','/turnkey','/time','/workforce','/learning','/learning/skills','/learning/training','/learning/library','/performance','/project-health','/reports','/integrations','/automation','/saved-reports','/assistance','/site','/workspace'];
const browser=await chromium.launch({headless:true});
try{
 for(const key of correctionMode?['designer1','leader1']:['leader1','leader2','designer1','designer2','site']){
  const person=state.people[key];assert.ok(person?.credentials?.length);
  const entry={key,role:person.role,accountId:person.id,employeeId:person.employeeId,auth:'PENDING',pages:[],reads:[],interactions:[],errors:[]};result.roles.push(entry);save();
  const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900},serviceWorkers:'block'});
  await context.route('**/api/**',r=>{const q=r.request(),u=new URL(q.url());if(q.method()==='GET')return r.continue();if(q.method()==='POST'&&['/api/v1/auth/passkey/login/options','/api/v1/auth/passkey/login/verify','/api/v1/auth/logout'].includes(u.pathname))return r.continue();result.blockedWrites.push({key,method:q.method(),path:u.pathname});return r.abort('blockedbyclient');});
  const page=await context.newPage();page.on('pageerror',e=>entry.errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')&&r.request().method()==='GET')entry.reads.push({path:u.pathname,status:r.status()});});
  const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  const counterFile=path.join(out,'TEST_AUTHENTICATOR_COUNTERS.json');const counters=fs.existsSync(counterFile)?JSON.parse(fs.readFileSync(counterFile)).counters:[];
  for(const credential of person.credentials){assert.equal(credential.rpId,'localhost');const counter=counters.find(c=>c.accountId===person.id)?.counter;const restored=counter===undefined?credential:{...credential,signCount:Math.max(credential.signCount??0,Number(counter))};await cdp.send('WebAuthn.addCredential',{authenticatorId,credential:restored});}
  try{
   await page.goto('/staff/sign-in',{waitUntil:'domcontentloaded'});await page.getByLabel('Work email',{exact:true}).fill(person.email);
   const verified=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/v1/auth/passkey/login/verify');
   await page.getByRole('button',{name:'Continue with passkey',exact:true}).click();const verify=await verified;entry.loginStatus=verify.status();assert.equal(verify.status(),201,'Normal passkey login did not succeed');
   const sessionResponse=await page.request.get('/api/v1/auth/session');assert.equal(sessionResponse.status(),200);const session=await sessionResponse.json();assert.equal(session.account.id,person.id);assert.equal(session.account.kind,'STAFF');entry.auth='VERIFIED_REAL_BACKEND_SESSION';
   const setup=await page.request.get('/api/v1/tasks/setup');entry.setupStatus=setup.status();if(setup.ok()){const s=await setup.json();assert.equal(s.actorEmployeeId,person.employeeId);entry.setup={actorEmployeeId:s.actorEmployeeId,canAssign:s.canAssign,creationProfile:s.creationProfile,projects:(s.projects??[]).map(p=>({id:p.id,title:p.title,currentLeadEmployeeId:p.currentLeadEmployeeId}))};}
   const self=await page.request.get('/api/v1/org/self');entry.selfStatus=self.status();if(self.ok())entry.self=await self.json();
   save();
   const capture=async(route,width,label)=>{
    await page.setViewportSize({width,height:width<768?844:900});if(route)await page.goto(route,{waitUntil:'domcontentloaded'});
    await page.locator('main').first().waitFor({state:'visible'});await page.waitForFunction(()=>!document.body.innerText.includes('Checking your session'),{},{timeout:10000});
    await page.waitForFunction(()=>!document.querySelector('main')?.innerText.match(/^\s*(?:Checking|Loading)[^\n]*…\s*$/),{},{timeout:8000}).catch(()=>{});
    if(interactionMode)await page.waitForFunction(()=>!document.querySelector('main')?.innerText.match(/\b(?:Loading|Refreshing|Reading)[^\n]{0,90}…/),{},{timeout:10000}).catch(()=>{});
    const data=await page.evaluate(()=>({url:location.pathname+location.search,text:document.querySelector('main')?.innerText,headings:[...document.querySelectorAll('main h1,main h2,main h3')].map(e=>e.textContent),links:[...document.querySelectorAll('main a[href]')].map(e=>({label:e.innerText,href:e.getAttribute('href')})),controls:[...document.querySelectorAll('main button,main summary')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({label:e.innerText,disabled:e.disabled??false})),overflow:document.documentElement.scrollWidth>innerWidth+1,width:innerWidth,height:document.documentElement.scrollHeight}));
    const name=`${key}-${label??route.slice(1).replaceAll('/','-')}-${width}`;
    const shot=(correctionMode?'correction-':interactionMode?'interaction-':'')+name;await page.screenshot({path:path.join(out,'evidence',shot+'.png'),fullPage:false});entry.pages.push({label:label??route,width,screenshot:'evidence/'+shot+'.png',dialogs:await page.locator('dialog[open]').allTextContents(),...data});save();
   };
   for(const route of correctionMode?['/my-work','/reviews']:interactionMode?['/my-work','/projects','/reviews','/time','/workforce','/site']:routes)for(const width of [1440,783,390]){try{await capture(route,width);}catch(e){entry.pages.push({label:route,width,error:e.message});save();}}
   await page.setViewportSize({width:1440,height:900});await page.goto('/my-work');
   const personal=await page.request.get('/api/v1/tasks?scope=personal&limit=50');if(personal.ok()){const v=await personal.json();entry.personal={total:v.total,taskIds:(v.items??[]).map(t=>t.id),items:(v.items??[]).map(t=>({id:t.id,title:t.title,status:t.status,type:t.type}))};}
   if(correctionMode){const task=entry.personal?.items?.find(t=>t.status==='CORRECTIONS_REQUIRED');assert.ok(task,'No existing correction-required work; do not create one');await capture('/tasks?taskId='+task.id,1440,'correction-required-task');await page.getByRole('article',{name:'Task details'}).waitFor();await capture(null,783,'correction-required-task');await capture(null,390,'correction-required-task');const r=await page.request.get('/api/v1/reviews/tasks/'+task.id);entry.correctionReviewRead=r.status();if(r.ok()){const v=await r.json();entry.correctionReview=v;const round=v.rounds?.find(r=>r.correctionTaskId)||v.rounds?.at(-1);await capture('/reviews?taskId='+task.id+(round?.id?'&roundId='+round.id:''),1440,'review-comments');await capture(null,390,'review-comments');if(round?.correctionTaskId){await capture('/tasks?taskId='+round.correctionTaskId,1440,'linked-correction-task');await page.getByRole('article',{name:'Task details'}).waitFor();await capture(null,390,'linked-correction-task');}}entry.status='READ_ONLY_CORRECTION_PATH_CAPTURED';entry.interactions.push({name:'Read review comments and linked correction task; no work changed or resubmitted',status:'PASS'});continue;}
   await page.getByRole('button',{name:'Create task',exact:true}).click();await page.getByRole('dialog',{name:/Create|Assign/}).waitFor();await capture(null,1440,'create-form');await capture(null,390,'create-form');
   const close=page.getByRole('button',{name:'Close create task',exact:true});if(await close.count())await close.click();entry.interactions.push({name:'Create form opens and closes without submission',status:'PASS'});
   if(interactionMode&&entry.personal?.taskIds?.length){const id=entry.personal.taskIds[0];await page.goto('/tasks?taskId='+encodeURIComponent(id));await page.getByRole('article',{name:'Task details'}).waitFor();await capture(null,1440,'task-detail');await capture(null,783,'task-detail');await capture(null,390,'task-detail');entry.interactions.push({name:'Own accessible task detail',status:'PASS'});}
   if(interactionMode){const r=await page.request.get('/api/v1/reviews/inbox?scope=mine&queue=waiting');entry.reviewInboxStatus=r.status();if(r.ok()){const v=await r.json();entry.assignedReviewSummary={total:v.total,items:v.items};const item=v.items?.[0];if(item?.taskId){await capture('/reviews?taskId='+encodeURIComponent(item.taskId)+(item.roundId?'&roundId='+encodeURIComponent(item.roundId):''),1440,'assigned-review-detail');await capture(null,390,'assigned-review-detail');entry.interactions.push({name:'Assigned review read, no decision submitted',status:'PASS'});}}for(const project of entry.setup?.projects??[]){const r=await page.request.get('/api/v1/projects/'+project.id);if(r.ok()){const p=await r.json();entry.projectAuthority={projectId:project.id,currentLeadEmployeeId:p.project?.currentLeadEmployeeId,isCurrentLead:p.project?.currentLeadEmployeeId===person.employeeId,capabilities:p.capabilities};await capture('/projects?projectId='+project.id,1440,'project-selected');await page.getByRole('navigation',{name:/ sections$/}).getByRole('button',{name:'People',exact:true}).click();await capture(null,390,'project-people');break;}}}
   entry.status='READ_ONLY_AUDIT_CAPTURED';
  }catch(e){entry.status='INCOMPLETE';entry.error=e.message;await page.screenshot({path:path.join(out,'evidence',key+'-failure.png')}).catch(()=>{});}
  finally{try{const s=await page.request.get('/api/v1/auth/session');if(s.ok()){const v=await s.json();const r=await page.request.post('/api/v1/auth/logout',{headers:{Origin:origin,'X-CSRF-Token':v.csrfToken}});entry.ownAuditLogout=r.status();}}catch(e){entry.logoutError=e.message;}await context.close();save();}
  console.log(JSON.stringify({key,auth:entry.auth,status:entry.status,pages:entry.pages.length,error:entry.error}));
 }
}finally{await browser.close();result.finishedAt=new Date().toISOString();save();}
