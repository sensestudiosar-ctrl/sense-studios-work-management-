import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='docs/design/application-ux-audit-2026-10-25';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
const result={mode:'synthetic shell; not authenticated role acceptance',checks:[],blockedWrites:[]};
try{
 await page.route('**/api/**',r=>{const q=r.request(),p=new URL(q.url()).pathname;if(q.method()!=='GET'){result.blockedWrites.push(p);return r.abort();}if(p==='/api/v1/auth/session')return r.fulfill({json:{account:{id:'audit-fixture',email:'owner@example.test',kind:'OWNER'},csrfToken:'synthetic'}});if(p==='/api/v1/notifications/unread')return r.fulfill({json:{unread:0}});return r.fulfill({status:403,json:{message:'Synthetic unavailable domain'}});});
 await page.goto('http://localhost:59443/tasks',{waitUntil:'domcontentloaded'});
 const trigger=page.getByRole('button',{name:'Find a page',exact:true});await trigger.waitFor({state:'visible'});
 await trigger.click();await page.getByRole('dialog',{name:'Page finder'}).waitFor();result.checks.push('click opens finder after shell ready');
 await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Page finder'}).waitFor({state:'hidden'});
 await page.keyboard.press('Control+k');await page.getByRole('dialog',{name:'Page finder'}).waitFor();result.checks.push('Control+k opens finder after shell ready');
 await page.getByRole('searchbox',{name:'Search pages'}).fill('Time');await page.screenshot({path:out+'/screenshots/finder-recheck-1440.png'});await page.keyboard.press('Enter');await page.waitForURL('**/time');result.checks.push('Time filtering and Enter navigation');
 assert.deepEqual(result.blockedWrites,[]);result.status='PASS';
}catch(e){result.status='FAIL';result.error=e.message;}finally{await browser.close();fs.writeFileSync(out+'/finder-recheck.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
