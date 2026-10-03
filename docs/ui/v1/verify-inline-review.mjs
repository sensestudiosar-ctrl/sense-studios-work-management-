import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const failures=[],errors=[];let checks=0;
const assert=(condition,label)=>{checks++;if(!condition)failures.push(label);};page.on('pageerror',error=>errors.push(error.message));
try{
for(const width of [320,390,768,1024,1440]){
 await page.setViewportSize({width,height:1000});await page.goto(new URL('./review-canvas.html',import.meta.url).href);
 const source=await page.locator('.sheet').innerHTML();
 await page.locator('#sheet-wrap').click({position:{x:50,y:50}});
 assert(await page.locator('#inline-comment').isVisible(),`${width}: point opens inline composer`);
 const popup=await page.locator('#inline-comment').boundingBox();assert(popup.x>=0&&popup.y>=0&&popup.x+popup.width<=width+1&&popup.y+popup.height<=1001,`${width}: inline editor inside viewport`);
 await page.locator('#inline-text').fill(`Point feedback ${width}`);await page.locator('#inline-post').click();
 assert((await page.locator('#feedback-list').innerText()).includes(`Point feedback ${width}`),`${width}: point feedback posts locally`);
 await page.locator('#tool-rectangle').click();await page.locator('#sheet-wrap').scrollIntoViewIfNeeded();
 const box=await page.locator('#sheet-wrap').boundingBox();
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3,{steps:8});await page.mouse.up();
 assert(await page.locator('#inline-comment').isVisible(),`${width}: reverse rectangle drag opens composer`);
 const rect=await page.locator('.region-draft').evaluate(node=>({left:parseFloat(node.style.left),top:parseFloat(node.style.top),width:parseFloat(node.style.width),height:parseFloat(node.style.height)}));assert(rect.left<31&&rect.top<31&&rect.width>39&&rect.height>39,`${width}: bounds normalized in reverse drag`);
 await page.locator('#inline-text').fill(`Rectangle change ${width}`);await page.locator('#inline-post').click();
 assert(await page.locator('[data-region]:not(.region-draft)').count()===1,`${width}: posted rectangle remains`);
 assert((await page.locator('#feedback-list').innerText()).includes(`Rectangle change ${width}`),`${width}: area feedback retained`);
 const tinyBox=await page.locator('#sheet-wrap').boundingBox();await page.mouse.move(tinyBox.x+tinyBox.width*.5,tinyBox.y+tinyBox.height*.5);await page.mouse.down();await page.mouse.move(tinyBox.x+tinyBox.width*.505,tinyBox.y+tinyBox.height*.505);await page.mouse.up();assert(!(await page.locator('#inline-comment').isVisible())&&await page.locator('.region-draft').count()===0,`${width}: tiny rectangle cannot retain a stale selection`);
 await page.locator('#zoom').click();assert(await page.locator('[data-region]:not(.region-draft)').count()===1,`${width}: zoom retains rectangle`);await page.locator('#zoom').click();
 await page.selectOption('#page','2');assert(await page.locator('[data-region]').count()===0,`${width}: area stays on original page`);await page.selectOption('#page','1');assert(await page.locator('[data-region]').count()===1,`${width}: returning page restores area`);
 assert(await page.locator('.sheet').innerHTML()===source,`${width}: drawing SVG unchanged`);
 await page.selectOption('#role','avery');assert(await page.locator('#tool-rectangle').isDisabled(),`${width}: submitter cannot draw feedback area`);assert(!(await page.locator('#inline-comment').isVisible()),`${width}: role change closes editor`);
 await page.selectOption('#role','noah');await page.selectOption('#round','r1');assert(await page.locator('#tool-point').isDisabled(),`${width}: history has no annotation writes`);
 await page.selectOption('#round','r2');await page.selectOption('#evidence','lost');assert(await page.locator('[data-region]').count()===0,`${width}: access loss clears area`);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: no page overflow`);
}
await page.goto(new URL('./review-canvas.html',import.meta.url).href);await page.setViewportSize({width:1440,height:1000});await page.locator('#tool-rectangle').click();await page.locator('.location-box summary').click();await page.locator('#point-x').fill('.2');await page.locator('#point-y').fill('.2');await page.locator('#rect-x2').fill('.6');await page.locator('#rect-y2').fill('.6');await page.locator('#set-point').click();assert(await page.locator('#inline-comment').isVisible(),'Numeric rectangle alternative opens editor');
await page.locator('#inline-text').fill('Make this marked area clearer.');
await page.screenshot({path:fileURLToPath(new URL('./previews/inline-review-desktop.png',import.meta.url)),fullPage:false});
await page.setViewportSize({width:390,height:1000});await page.screenshot({path:fileURLToPath(new URL('./previews/inline-review-mobile.png',import.meta.url)),fullPage:false});
assert(errors.length===0,'No browser errors');const report={checkedAt:new Date().toISOString(),checks,failures,browserErrors:errors,note:'Fictional inline/rectangle interaction only; no application storage, rectangle DTO, PDF renderer, authorization or full accessibility acceptance.'};await writeFile(new URL('./inline-review-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=failures.length?1:0;
}finally{await browser.close();}
