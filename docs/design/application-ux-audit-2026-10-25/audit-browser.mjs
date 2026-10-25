import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Audit evidence only. No application imports, server startup, login, or domain writes.
const root=process.cwd(), out=path.resolve('docs/design/application-ux-audit-2026-10-25');
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const origin='http://localhost:59443';
const internal=['/dashboard','/my-work','/tasks','/projects','/people','/settings','/decisions','/notifications','/documents','/revisions','/reviews','/client-reviews','/external-access','/turnkey','/time','/workforce','/learning','/learning/skills','/learning/training','/learning/library','/performance','/project-health','/reports','/integrations','/automation','/saved-reports','/assistance','/site'];
const publicPaths=['/','/workspace','/sign-in','/staff/sign-in','/owner/sign-in','/staff/recovery','/bootstrap','/enroll','/owner-recovery','/install','/client-portal','/external-portal','/portfolio','/audit-nonexistent-route'];
const report={at:new Date().toISOString(),origin,mode:'Public live pages; synthetic Owner/Staff shell with all domain reads denied. NOT authenticated role or populated workflow acceptance.',release:{},pages:[],interactions:[],blockedWrites:[],errors:[]};
for(const p of ['/release.json','/api/v1/health/release','/api/v1/health/ready']){try{const r=await fetch(origin+p,{signal:AbortSignal.timeout(6000)});report.release[p]={status:r.status,body:await r.json()};}catch(e){report.release[p]={error:e.message};}}
const appFiles=['apps/web/src/main.tsx','apps/web/src/app.tsx','apps/web/src/workspace-navigation.tsx'];
report.source=Object.fromEntries(appFiles.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
report.checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true});
const save=()=>fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify(report,null,2));
const inspect=async(page,mode,route,width)=>{
 const data=await page.evaluate(()=>({title:document.title,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()),text:document.body.innerText.slice(0,16000),links:[...document.querySelectorAll('a[href]')].map(e=>({label:e.innerText||e.getAttribute('aria-label'),href:e.getAttribute('href')})),fields:[...document.querySelectorAll('input,select,textarea')].map(e=>({tag:e.tagName,type:e.type,name:e.name,label:e.labels?.[0]?.textContent.trim()||e.getAttribute('aria-label')||'',required:e.required})),overflow:document.documentElement.scrollWidth>innerWidth+1,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,smallControls:[...document.querySelectorAll('button,a,input,select')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&(r.width<24||r.height<24);}).map(e=>({label:(e.innerText||e.getAttribute('aria-label')||e.name||e.tagName).slice(0,90),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}))}));
 const name=`${mode}-${route.replaceAll('/','_')||'root'}-${width}.png`;
 await page.screenshot({path:path.join(out,'screenshots',name),fullPage:true});
 report.pages.push({mode,route,width,screenshot:'screenshots/'+name,...data});save();
};
try{
 for(const mode of ['live-anonymous','synthetic-owner','synthetic-staff']){
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  await context.route('**/api/**',async r=>{
   const req=r.request(),p=new URL(req.url()).pathname;
   if(req.method()!=='GET'){report.blockedWrites.push({mode,path:p,method:req.method()});return r.abort('blockedbyclient');}
   if(mode==='live-anonymous')return r.continue();
   if(p==='/api/v1/auth/session')return r.fulfill({json:{account:{id:'ux-audit-synthetic-'+mode,email:mode+'@example.test',kind:mode==='synthetic-owner'?'OWNER':'STAFF'},csrfToken:'synthetic-no-command-authority'}});
   if(p==='/api/v1/site/projects')return r.fulfill({json:{items:[]}});
   if(p==='/api/v1/notifications/unread')return r.fulfill({json:{unread:3}});
   return r.fulfill({status:403,json:{message:'AUDIT FIXTURE: domain source unavailable; not a real permission result'}});
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push({mode,url:page.url(),message:e.message}));
  const routes=mode==='live-anonymous'?[...publicPaths,...internal]:internal;
  for(const route of routes){
   await page.setViewportSize({width:1440,height:900});
   try{await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>document.querySelector('h1,h2')&&!document.body.innerText.includes('Checking your session'),{},{timeout:8000}).catch(()=>{});
    for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await inspect(page,mode,route,width);}
   }catch(e){report.pages.push({mode,route,error:e.message});save();}
  }
  if(mode==='synthetic-owner'){
   const run=async(name,fn)=>{try{await fn();report.interactions.push({name,status:'PASS',mode});}catch(e){report.interactions.push({name,status:'FAIL',mode,error:e.message});}save();};
   await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/tasks');
   await run('Page finder opens, filters Time, keyboard navigates',async()=>{await page.keyboard.press('Control+k');await page.getByRole('dialog',{name:'Page finder'}).waitFor();await page.getByRole('searchbox',{name:'Search pages'}).fill('Time');await page.screenshot({path:path.join(out,'screenshots/finder-desktop.png')});await page.keyboard.press('Enter');await page.waitForURL('**/time');});
   await run('Collapse sidebar persists through route change',async()=>{await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await page.getByRole('navigation',{name:'Workspace navigation',exact:true}).getByRole('link',{name:'Projects',exact:true}).click();await page.getByRole('button',{name:'Expand sidebar',exact:true}).waitFor();});
   await page.setViewportSize({width:390,height:844});
   await run('Mobile More opens and Escape restores focus',async()=>{await page.getByRole('button',{name:/^More/}).click();await page.getByRole('dialog',{name:'More destinations'}).waitFor();await page.screenshot({path:path.join(out,'screenshots/more-mobile.png'),fullPage:true});await page.keyboard.press('Escape');if(!await page.getByRole('button',{name:/^More/}).evaluate(e=>e===document.activeElement))throw Error('Focus not restored');});
   await run('Mobile account settings link',async()=>{await page.getByRole('link',{name:/Account settings for/}).click();await page.waitForURL('**/settings');});
   await run('Skip link moves focus to main',async()=>{await page.getByRole('link',{name:'Skip to main content',exact:true}).focus();await page.keyboard.press('Enter');if(!await page.locator('.workspace-page > main').evaluate(e=>e===document.activeElement))throw Error('Main not focused');});
  }
  await context.close();
 }
}finally{await browser.close();report.finishedAt=new Date().toISOString();save();}
console.log(JSON.stringify({pages:report.pages.length,errors:report.errors.length,blockedWrites:report.blockedWrites.length,interactions:report.interactions,overflow:report.pages.filter(x=>x.overflow).map(x=>({mode:x.mode,route:x.route,width:x.width})),release:report.release}));
