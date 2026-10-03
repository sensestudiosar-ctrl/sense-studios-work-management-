import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const failures=[], errors=[];
let checks=0;
const assert=(condition,label)=>{checks++;if(!condition)failures.push(label);};
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(new URL('./workflow-fixtures.html',import.meta.url).href);
  const ids=await page.locator('#fixture option').evaluateAll(options=>options.map(option=>option.value));
  assert(ids.length===8,'Eight review fixtures');
  for(const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ids) {
      await page.selectOption('#fixture',id);
      const steps=await page.locator('#sequence button').count();
      for(let index=0;index<steps;index++) {
        await page.locator('#sequence button').nth(index).click();
        assert(await page.locator('#sequence [aria-current="step"]').count()===1,`${id}/${index}/${width}: one current scene`);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${id}/${index}/${width}: no page overflow`);
        assert(!(await page.locator('#answers').getAttribute('open')),`${id}/${index}/${width}: guard starts concealed for human review`);
        await page.locator('#answers summary').focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('#guard').isVisible(),`${id}/${index}/${width}: keyboard disclosure`);
      }
    }
  }
  await page.selectOption('#fixture','extension');
  await page.locator('#sequence button').last().click();
  assert(await page.locator('#date').innerText()==='1 Oct 2026','Rejected extension retains committed date');
  await page.selectOption('#fixture','dependency');
  assert(/Restricted predecessor/.test(await page.locator('#evidence').innerText()),'Hidden predecessor uses safe description');
  await page.selectOption('#fixture','evidence');
  assert(/Retry/.test(await page.locator('#action').innerText()),'Failed evidence exposes retry, not approval');
  await page.locator('#next').click();
  assert(/Round 1.*R1.pdf/.test(await page.locator('#evidence').innerText()),'Evidence retry retains exact Round 1/R1');
  await page.selectOption('#fixture','upload');
  await page.locator('#next').click();
  assert(/not registered/.test(await page.locator('#evidence').innerText()),'Failed finalization is not registered');
  await page.selectOption('#fixture','revisions');
  assert(/R0: Superseded.*R1: Current approved.*R2: Working/.test(await page.locator('#evidence').innerText()),'Distinct revision states');
  await page.locator('#sequence button').last().click();
  assert(!/R[0-9]|Avery|WH-/.test((await page.locator('#evidence').innerText())+(await page.locator('#owner').innerText())),'Access-loss scene clears identifying labels');
  await page.setViewportSize({width:390,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'Reduced-motion preference exercised');
  await page.selectOption('#fixture','review');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'200% text size reflows without page overflow');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  const targets=await page.locator('button:visible,select:visible,summary:visible').evaluateAll(elements=>elements.map(element=>({name:element.textContent,height:element.getBoundingClientRect().height})));
  assert(targets.every(target=>target.height>=44),'Board button/select/disclosure targets at least 44px high');
  const luminance=hex=>{const channels=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
  const colourPairs=[['Ink on cream','24312c','f6f4ef'],['Ink on white','24312c','ffffff'],['Muted on white','56665d','ffffff'],['White on forest','ffffff','245847'],['Forest link on white','245847','ffffff']].map(([label,foreground,background])=>{const a=luminance(foreground),b=luminance(background);return {label,ratio:Number(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2))};});
  for(const pair of colourPairs)assert(pair.ratio>=4.5,`Selected text pairing ${pair.label}: ${pair.ratio}`);
  await mkdir(new URL('./previews/',import.meta.url),{recursive:true});
  for(const [width,name] of [[390,'workflow-board-mobile'],[1440,'workflow-board-desktop']]) {
    await page.setViewportSize({width,height:1000});
    await page.selectOption('#fixture','extension');
    await page.locator('#sequence button').last().click();
    await page.locator('#answers summary').click();
    await page.screenshot({path:fileURLToPath(new URL(`./previews/${name}.png`,import.meta.url)),fullPage:true});
  }
  assert(errors.length===0,'No board browser errors');
  const report={checkedAt:new Date().toISOString(),checks,failures,browserErrors:errors,colourPairs,note:'Fictional storyboard presentation only; no real commands, form validation, permissions, persistence, assistive-technology or human comprehension acceptance.'};
  await writeFile(new URL('./workflow-fixture-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  process.exitCode=failures.length?1:0;
} finally {await browser.close();}
