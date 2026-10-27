import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const delivery=path.join(repo,'docs/design/application-ux-audit-2026-10-25/prototype-delivery');
const revision=path.join(delivery,'../revision-2');
fs.mkdirSync(path.join(delivery,'comparison'),{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(revision,'SOURCE_BASELINE.json'),'utf8'));
const sourceChecks=Object.entries(baseline.trackedFiles).map(([p,expected])=>({path:p,expected,actual:fs.existsSync(path.join(repo,p))?sha(path.join(repo,p)):null}));
const capabilities=JSON.parse(fs.readFileSync(path.join(revision,'FEATURE_PARITY_MATRIX.json'),'utf8'));
const exercised=['CAP-082','CAP-091','CAP-097','CAP-098','CAP-099','CAP-101','CAP-102','CAP-103','CAP-109','CAP-112','CAP-113','CAP-122','CAP-159','CAP-160','CAP-162','CAP-166','CAP-167','CAP-168','CAP-169','CAP-170','CAP-171','CAP-175','CAP-345'];
const mapped=capabilities.capabilities.map(c=>({...c,...(c.id==='CAP-100'?{action:'Retain supported task types, including CLOSEOUT (schema-level seventh value)',baselineCorrection:'Prior discovery label said six. Existing schema also contains CLOSEOUT; no enum or current path is changed.'}:{}),prototypeCoverage:exercised.includes(c.id)?'SYNTHETIC_CORE_SCENARIO_EXERCISED; NOT_REAL_ROLE_OR_API_ACCEPTANCE':'RETAINED_IN_CURRENT_APP; NOT_PROTOTYPED_OR_ACCEPTED',productionAcceptance:'UNCHANGED; FUTURE_IMPLEMENTATION_REQUIRES_EXPLICIT_APPROVAL'}));
fs.writeFileSync(path.join(delivery,'SUPPORTED_CAPABILITIES.json'),JSON.stringify({source:capabilities.source,scope:'P1/P2a review artifact only',capabilities:mapped},null,2));
const refs=[['dashboard-v10',path.join(repo,'demos/Sense_Studios_Codex_Dashboard_V10_Handoff/reference/Sense_Studios_Dashboard_V10_Refined_Shell.html')],['my-work-approved','D:/app/reference from codex chat/Sense_Studios_My_Work_UX_Package/Sense_Studios_My_Work/prototype.html'],['creation-approved',path.join(delivery,'baseline/task-creation-completed-demo.html')]];
const browser=await chromium.launch();const browserErrors=[],networkAttempts=[];
try{
 for(const [name,file] of refs){for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:900}});const p=await context.newPage();p.on('pageerror',e=>browserErrors.push({name,width,error:e.message}));await p.route(/^https?:/,r=>{networkAttempts.push({name,url:r.request().url()});return r.abort();});await p.goto(pathToFileURL(file).href);if(name==='dashboard-v10')await p.locator('#demo-persona').selectOption('employee');else if(name==='my-work-approved')await p.locator('#role').selectOption('Designer');else{await p.locator('#role').selectOption('Designer');await p.locator(width<768?'#mobileCreateFab':'#createTaskBtn').click();}
 await p.waitForTimeout(1500);await p.screenshot({path:path.join(delivery,'comparison',`${name}-${width}.png`)});await context.close();}}
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await context.newPage();await p.goto(pathToFileURL(path.join(repo,'docs/v1-demo/task-creation-completed-demo.html')).href);await p.screenshot({path:path.join(delivery,'screenshots','390-dashboard-viewport.png')});await p.getByRole('button',{name:'Read review comments',exact:true}).click();await p.screenshot({path:path.join(delivery,'screenshots','390-review-viewport.png')});await context.close();
}finally{await browser.close();}
const luminance=hex=>{const rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const pairs=[['Body text','#20332e','#fffdf7'],['Secondary text','#50645a','#fffdf7'],['Primary button','#ffffff','#29463d'],['Error text','#84352e','#fae9e5'],['Warning pill','#744317','#faecd6']].map(([name,fg,bg])=>({name,fg,bg,ratio:Math.round(((Math.max(luminance(fg),luminance(bg))+.05)/(Math.min(luminance(fg),luminance(bg))+.05))*100)/100}));
const result={at:new Date().toISOString(),checkedApplicationFiles:sourceChecks.length,unchanged:sourceChecks.filter(x=>x.actual===x.expected).length,changed:sourceChecks.filter(x=>x.actual!==x.expected),references:refs.map(([name,p])=>({name,path:p,sha256:sha(p)})),prototypeSha256:sha(path.join(repo,'docs/v1-demo/task-creation-completed-demo.html')),browserErrors,networkAttempts,contrastSamples:pairs,capabilityRows:mapped.length,coreScenarioMapped:exercised.length,notClaimed:['Real role/auth/API enforcement','Operational usability study','Physical mobile or screen reader certification','All capability runtime parity','Production implementation or deployment']};
result.checkoutCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
result.unrelatedWorktreeChanges=execFileSync('git',['diff','--name-only','--','apps','packages','scripts','infra','package.json','pnpm-lock.yaml','eslint.config.mjs'],{cwd:repo,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
result.sourceBoundary='Earlier discovery baseline drift and concurrent unrelated work remain explicit; this task edits only review artifacts/docs. No reset or whole-checkout acceptance.';
fs.writeFileSync(path.join(delivery,'VERIFICATION.json'),JSON.stringify(result,null,2));
const pngs=fs.readdirSync(path.join(delivery,'screenshots')).filter(n=>n.endsWith('.png'));
fs.writeFileSync(path.join(delivery,'GALLERY.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sense P1/P2a review evidence</title><style>body{font:15px/1.6 system-ui;background:#f4f1e9;color:#20332e;margin:24px}a{color:#244f43}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}figure{margin:0;background:#fffdf7;padding:12px;border:1px solid #d9d8cd;border-radius:12px}img{width:100%;height:360px;object-fit:contain;object-position:top}figcaption{font-size:13px}header{margin-bottom:24px}</style><header><h1>Sense · connected internal UX review</h1><p>Synthetic P1 + P2a prototype. Client/external audits BLOCKED. No production implementation is authorized.</p><a href="../../../v1-demo/task-creation-completed-demo.html">Open the working connected prototype</a> · <a href="playwright-report/index.html">Playwright report</a></header><section>${pngs.map(n=>`<figure><a href="screenshots/${n}"><img loading="lazy" src="screenshots/${n}" alt="${n.replace('.png','')} screenshot"></a><figcaption>${n}</figcaption></figure>`).join('')}</section>`);
console.log(JSON.stringify(result,null,2));
if(result.changed.length||browserErrors.length)process.exitCode=1;
