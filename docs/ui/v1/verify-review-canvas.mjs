import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const failures=[],errors=[];
let checks=0;
const assert=(condition,label)=>{checks++;if(!condition)failures.push(label);};
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(new URL('./review-canvas.html',import.meta.url).href);
  const options=await page.locator('#evidence option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,label:node.textContent})));
  const roles=await page.locator('#role option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,label:node.textContent})));
  const rounds=await page.locator('#round option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,label:node.textContent})));
  const choose=async(id,items,pattern)=>{const found=items.find(item=>pattern.test(item.value+' '+item.label));if(!found)throw new Error(`Missing ${id} option ${pattern}`);await page.selectOption(id,found.value);};
  for(const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:1000});
    await choose('#role',roles,/noah/i);
    await choose('#round',rounds,/2/);
    for(const option of options) {
      await page.selectOption('#evidence',option.value);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${width}/${option.value}: no page overflow`);
      if(/loading|error|fail|readonly|read-only|lost|denied/i.test(option.value+' '+option.label)) {
        assert(await page.locator('#approve').isDisabled(),`${width}/${option.value}: approval unavailable`);
        assert(await page.locator('#request-corrections').isDisabled(),`${width}/${option.value}: correction decision unavailable`);
      }
    }
    await choose('#evidence',options,/ready/i);
    assert(!(await page.locator('#send-feedback').isDisabled()) || !(await page.locator('#feedback-text').isDisabled()),`${width}: reviewer composer available`);
    await choose('#role',roles,/avery/i);
    assert(await page.locator('#send-feedback').isDisabled(),`${width}: submitter cannot post reviewer feedback`);
    assert(await page.locator('#approve').isDisabled(),`${width}: submitter cannot decide`);
    await choose('#role',roles,/noah/i);
    await choose('#round',rounds,/1/);
    assert(await page.locator('#send-feedback').isDisabled() && await page.locator('#approve').isDisabled(),`${width}: historical round read-only`);
  }
  await choose('#round',rounds,/2/);
  await choose('#evidence',options,/ready/i);
  await page.locator('#feedback-text').fill('Move the light away from the joinery centreline.');
  if(await page.locator('#feedback-reason').count())await page.locator('#feedback-reason').fill('Coordinate lighting and joinery.');
  await page.locator('.location-box summary').click();
  await page.locator('#point-x').fill('0.45');
  await page.locator('#point-y').fill('0.35');
  await page.locator('#set-point').click();
  const before=await page.locator('#feedback-list').innerText();
  await page.locator('#send-feedback').click();
  assert((await page.locator('#feedback-list').innerText())!==before && /Move the light/.test(await page.locator('#feedback-list').innerText()),'Local feedback appears');
  assert(!(await page.locator('#approve').isDisabled()),'Posting feedback does not approve or close round');
  const pins=page.locator('[data-pin]');
  assert(await pins.count()>0,'Numbered annotation pins present');
  if(await pins.count()) {await pins.first().click();assert(await page.locator('#inline-comment').isVisible() && await page.locator('#inline-text').getAttribute('readonly')!==null,'Pin opens its existing feedback on canvas');await page.locator('#inline-cancel').click();}
  await page.locator('#request-corrections').click();
  assert(await page.locator('#decision-dialog').isVisible(),'Formal correction uses separate dialog');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#decision-dialog').isVisible()),'Decision dialog dismisses by keyboard');
  await page.locator('#feedback-text').fill('Draft belongs to Round 2 only.');
  await choose('#round',rounds,/1/);
  assert(!/Draft belongs/.test(await page.locator('#feedback-text').inputValue()),'Historical round does not inherit current draft');
  assert(!/WH-215_R2.pdf/.test(await page.locator('main').innerText()),'Historical visible identity does not retain R2 filename');
  await choose('#round',rounds,/2/);
  assert(await page.locator('#feedback-text').inputValue()==='Draft belongs to Round 2 only.','Returning to round restores its draft');
  await page.locator('#approve').click();
  assert(await page.locator('#decision-reason').isVisible() && await page.locator('#decision-reason').getAttribute('required')!==null,'Approval requires visible reason');
  assert(/R2/.test(await page.locator('#decision-dialog').innerText()),'Decision dialog names exact R2 target');
  await page.keyboard.press('Escape');
  await page.locator('#request-corrections').click();
  assert(await page.locator('#category').getAttribute('required')!==null && await page.locator('#severity').getAttribute('required')!==null,'Corrections require category and severity');
  await page.keyboard.press('Escape');
  await page.locator('#approve').click();
  await page.locator('#decision-reason').fill('   ');
  await page.locator('#preview-decision').click();
  assert(await page.locator('#decision-dialog').isVisible(),'Whitespace reason does not preview approval');
  await page.keyboard.press('Escape');
  await page.locator('#point-x').fill('0.4');await page.locator('#point-y').fill('0.4');await page.locator('#set-point').click();
  await page.selectOption('#page','2');
  assert(/No location selected/.test(await page.locator('#selection-note').innerText()),'Page switch clears selected point');
  await page.selectOption('#page','1');
  const pinId=await page.locator('[data-pin]').first().getAttribute('data-pin');
  await page.locator('#zoom').click();
  assert(await page.locator(`[data-pin="${pinId}"]`).count()===1,'Zoom preserves annotation identity');
  await page.locator('#zoom').click();
  assert(/IST/.test(await page.locator('#feedback-list').innerText()),'Feedback has timestamp context');
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'200% text does not overflow page');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await choose('#evidence',options,/lost|denied/i);
  assert(await page.locator('#feedback-text').inputValue()==='', 'Detected access loss clears draft');
  assert(!(await page.locator('[data-pin]').count()),'Detected access loss clears pins');
  await choose('#evidence',options,/ready/i);
  await page.reload();
  await mkdir(new URL('./previews/',import.meta.url),{recursive:true});
  for(const [width,name] of [[1440,'review-canvas-desktop'],[390,'review-canvas-mobile']]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:fileURLToPath(new URL(`./previews/${name}.png`,import.meta.url)),fullPage:true});
  }
  assert(errors.length===0,'No canvas browser script errors');
  const report={checkedAt:new Date().toISOString(),checks,failures,browserErrors:errors,note:'Standalone fictional review canvas presentation only; no actual PDF renderer, backend permission, persistence, audit, human comprehension or screen-reader acceptance.'};
  await writeFile(new URL('./review-canvas-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));process.exitCode=failures.length?1:0;
} finally {await browser.close();}
