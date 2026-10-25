from playwright.sync_api import sync_playwright
from pathlib import Path
h=Path('/mnt/data/Sense_Studios_Dashboard_V10_Refined_Shell.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in [1440,1024,390,320]:
  page=b.new_page(viewport={'width':w,'height':844 if w<760 else 900});page.set_default_timeout(3500)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('about:blank');page.set_content(h,wait_until='domcontentloaded');page.wait_for_timeout(400)
  d=page.evaluate('''() => ({overflow:document.documentElement.scrollWidth>innerWidth,core:[...document.querySelectorAll('.nav-core .nav-link')].map(x=>x.textContent.trim()), headerSearchVisible:(()=>{const e=document.querySelector('.v10-header .header-command');return !!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e.parentElement).display!=='none'})(),brand:document.querySelector('.brand-mark')?.complete&&document.querySelector('.brand-mark')?.naturalWidth>0})''')
  print(w,d,'errors',errors,flush=True)
  assert not d['overflow'] and not errors and d['brand'] and d['headerSearchVisible']
  page.screenshot(path=f'/mnt/data/Sense_V10_{w}.png',full_page=w==1440)
  if w==1440:
   page.locator('.side-toggle').click();assert 'is-collapsed' in page.locator('.app-layout').get_attribute('class')
   page.screenshot(path='/mnt/data/Sense_V10_Collapsed_1440.png')
   page.keyboard.press('Control+k'); assert page.locator('.command-panel').is_visible()
   page.locator('#command-input').fill('projects');page.keyboard.press('Enter');assert page.locator('.page-content h1').inner_text()=='Projects'
   page.locator('.side-toggle').click();page.locator('[data-route="/dashboard"]').first.click()
   page.locator('[data-action="start-edit"]').first.click();assert page.locator('#dashboard-flow').count()
   page.locator('[data-action="finish-edit"]').first.click()
  if w==390:
   page.locator('.v10-header .header-command').click();assert page.locator('.command-panel').is_visible()
   page.locator('#command-input').fill('My Work');page.keyboard.press('Enter');assert page.locator('.page-content h1').inner_text()=='My Work'
   assert page.locator('.mobile-nav').is_visible()
  page.close()
 # Check employee allowed nav excludes privileged team/owner management
 page=b.new_page(viewport={'width':1440,'height':900});page.goto('about:blank');page.set_content(h,wait_until='domcontentloaded');page.wait_for_timeout(350);page.locator('#demo-persona').select_option('employee');page.wait_for_timeout(500)
 core=[x.strip() for x in page.locator('.nav-core .nav-link').all_text_contents()];print('Employee navigation:',core,flush=True);assert 'Dashboard' in core
 page.keyboard.press('Control+k');found=page.locator('.command-result').all_text_contents(); assert all('Performance' not in k for k in found)
 b.close()
print('PASS')
