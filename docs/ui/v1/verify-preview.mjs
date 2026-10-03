import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const failures = [];
let checks = 0;
page.on('pageerror', (error) => errors.push(error.message));
const url = new URL('./mockups.html', import.meta.url).href;
const screens = ['work', 'overview', 'tasks', 'reviews', 'documents', 'task', 'review'];
const assert = (condition, description) => { checks++; if (!condition) failures.push(description); };
async function layout(label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, html: document.documentElement.scrollWidth }));
  assert(Math.max(sizes.body, sizes.html) <= sizes.width + 1, `Page overflow: ${label} (${JSON.stringify(sizes)})`);
  assert(await page.locator('#screenContent').innerText().then((text) => text.trim().length > 0), `Blank screen: ${label}`);
  const bounds = await page.locator('#screenContent h1, #screenContent h2, #screenContent h3, #screenContent button, #screenContent a, #screenContent input, #screenContent select, #screenContent .tag, #screenContent .task-title, #screenContent .task-project, #screenContent .row-meta, #screenContent .summary-cell, #screenContent .notice, #screenContent .timeline-item, #screenContent .history-entry, #screenContent .filter-chip').evaluateAll((elements) => {
    const right = document.querySelector('#preview').getBoundingClientRect().right;
    return elements.filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden').map((element) => ({label: element.innerText || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName, right: element.getBoundingClientRect().right, previewRight: right}));
  });
  assert(bounds.every((item) => item.right <= item.previewRight + 1), `Core content clipped at preview edge: ${label} (${JSON.stringify(bounds.filter((item) => item.right > item.previewRight + 1))})`);
}
try {
  await page.goto(url);
  const styles = await page.evaluate(() => ({
    topbar: getComputedStyle(document.querySelector('.topbar')).display,
    panel: getComputedStyle(document.querySelector('.panel')).borderTopStyle,
    contentPadding: parseFloat(getComputedStyle(document.querySelector('.content')).paddingTop),
    taskRow: getComputedStyle(document.querySelector('.task-row')).display,
  }));
  assert(styles.topbar === 'flex' && styles.panel === 'solid' && styles.contentPadding >= 16 && ['grid','flex'].includes(styles.taskRow), `Core design styles preserved (${JSON.stringify(styles)})`);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const screen of screens) {
      await page.selectOption('#screenSelect', screen);
      await page.selectOption('#stateSelect', 'ready');
      await layout(`${screen} at ${width}`);
    }
  }
  // UI-V01 shell/My Work: graphics must preserve visible names and exact data.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.selectOption('#screenSelect', 'work');
    for (const role of ['avery', 'noah', 'maya']) {
      await page.selectOption('#roleSelect', role);
      await layout(`visual My Work/${role} at ${width}`);
      assert(await page.locator('#attentionSection .attention-symbol').count() > 0, `Attention visual present: ${role}/${width}`);
      assert(await page.locator('#attentionSection button').evaluateAll(elements => elements.every(element => element.innerText.trim().length > 0)), `Attention actions retain visible labels: ${role}/${width}`);
      assert(await page.locator('.visual-icon').evaluateAll(elements => elements.every(element => element.getAttribute('aria-hidden') === 'true')), `Decorative symbols have text alternatives: ${role}/${width}`);
      const navLabels = await page.locator('.sidebar .nav-item, .bottom-nav button').evaluateAll(elements => elements.filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden').map(element => ({ text: element.innerText.trim(), size: parseFloat(getComputedStyle(element).fontSize), label: element.getAttribute('aria-label') })));
      assert(navLabels.length > 0 && navLabels.every(item => item.text.length > 0 && item.size >= 11), `Visible navigation retains readable labels: ${role}/${width}`);
      const attention = await page.locator('#attentionSection').innerText();
      if (role === 'noah') assert(/Round 2/.test(attention) && /R2/.test(attention), `Reviewer graphic retains exact submission: ${width}`);
      if (role === 'maya') {
        assert(/Pending extension decision/.test(attention) && /Manager reassignment/.test(attention), `Manager graphics preserve separate decisions: ${width}`);
        assert(/No personal tasks assigned/.test(await page.locator('#workRows').innerText()), `Manager graphics do not invent personal tasks: ${width}`);
      } else if (role === 'avery') {
        assert(await page.locator('#workRows .status-symbol').count() > 0, `Task visual status present: ${role}/${width}`);
        const rows = await page.locator('#workRows .task-row').evaluateAll(elements => elements.map(element => element.innerText));
        assert(rows.every(text => /Owner/i.test(text) && /Target/i.test(text) && /Committed/i.test(text)), `Graphics retain owner and date bases: ${role}/${width}`);
      }
    }
  }
  await page.selectOption('#roleSelect', 'avery');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.sidebar [data-go="projects"]').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('.sidebar [data-go="projects"]').getAttribute('aria-current') === 'page', 'Labelled graphic navigation supports keyboard activation/current state');
  await page.locator('.sidebar [data-go="work"]').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#screenContent h1').innerText() === 'My Work', 'Keyboard navigation returns to My Work');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const screen of screens) {
      await page.selectOption('#screenSelect', screen);
      for (const state of ['loading', 'empty', 'error', 'readonly']) {
        await page.selectOption('#stateSelect', state);
        await layout(`${screen}/${state} at ${width}`);
        if (state === 'readonly') {
          const enabledWrites = await page.locator('#screenContent button[data-action^="confirm:"]:enabled, #screenContent button[data-action^="decision:"]:enabled, #screenContent button[data-action^="review:"]:enabled').count();
          assert(enabledWrites === 0, `Read-only write enabled: ${screen} at ${width}`);
        }
      }
    }
  }
  await page.selectOption('#stateSelect', 'ready');
  await page.selectOption('#screenSelect', 'work');
  await page.locator('#taskSearch').fill('zzzz-no-match');
  assert(/no .*match/i.test(await page.locator('#screenContent').innerText()), 'My Work search must show no match');
  await page.locator('#screenContent button[data-action="reset"]').first().click();
  assert(await page.locator('#taskSearch').inputValue() === '', 'Reset clears search');
  await page.locator('[data-filter="completed"]').click();
  assert((await page.locator('#workRows').innerText()).includes('Completed'), 'Completed filter renders completed fixture');
  await page.locator('[data-filter="approaching"]').click();
  await page.locator('#dateFrom').fill('2026-10-02');
  await page.locator('#dateTo').fill('2026-10-02');
  assert((await page.locator('#workRows').innerText()).includes('WH-215'), 'Committed date basis includes WH-215 on 2 Oct');
  await page.locator('#dateBasis').selectOption('target');
  assert((await page.locator('#workRows').innerText()).includes('No tasks match'), 'Target date basis excludes WH-215 on 2 Oct');
  await page.locator('#dateBasis').selectOption('committed');
  await page.locator('#dateFrom').fill('2026-10-01');
  await page.locator('#dateTo').fill('2026-10-07');
  await page.locator('#screenContent button[data-action="reset"]').first().click();
  await page.selectOption('#screenSelect', 'tasks');
  const projectRows = await page.locator('#screenContent').innerText();
  assert(!/Cedar Lane|Juniper Caf/.test(projectRows), 'Project Tasks excludes other projects');
  await page.locator('[data-taskview="board"]').click();
  assert(await page.locator('.board').count() === 1, 'Board comparison renders');
  assert(await page.locator('.board-card').count() === 6, 'Board retains all six shared fixture tasks');
  await page.locator('[data-taskview="list"]').click();
  await page.selectOption('#widthSelect', 'mobile');
  assert(await page.locator('#preview').evaluate((element) => element.getBoundingClientRect().width) <= 391, 'Forced mobile width ≤390px');
  assert(await page.locator('.bottom-nav').isVisible(), 'Forced mobile displays bottom navigation');
  await page.selectOption('#widthSelect', 'responsive');
  await page.selectOption('#screenSelect', 'overview');
  assert(!/64%|On track/.test(await page.locator('#screenContent').innerText()), 'Overview has no invented health/progress');
  await page.selectOption('#screenSelect', 'reviews');
  assert(!/Client review|CR1|Primary Client|Cedar Lane/.test(await page.locator('#screenContent').innerText()), 'Internal project reviews exclude client/other-project scope');
  await page.selectOption('#screenSelect', 'review');
  assert(await page.locator('#screenContent button[data-action^="decision:"]:enabled').count() === 0, 'Submitter cannot decide own review');
  assert(await page.locator('#screenContent button[data-action^="review:"]:enabled').count() === 0, 'Submitter cannot request corrections through alternate action');
  await page.selectOption('#roleSelect', 'noah');
  assert(await page.locator('[data-action="decision:approve"]').isEnabled(), 'Named independent reviewer can inspect eligible approval action');
  await page.locator('[data-action="decision:correction"]').click();
  assert(await page.locator('#decisionDialog').isVisible(), 'Reviewer opens correction decision form');
  assert(await page.locator('#reason').count() === 1 && await page.locator('#severity').count() === 1 && await page.locator('#category').count() === 1, 'Correction form exposes reason, severity and category');
  await page.keyboard.press('Escape');
  assert(!await page.locator('#decisionDialog').isVisible(), 'Escape dismisses local decision dialog');
  await page.selectOption('#stateSelect', 'readonly');
  assert(await page.locator('#screenContent button[data-action^="decision:"]:enabled, #screenContent button[data-action^="review:"]:enabled').count() === 0, 'Read-only also disables named reviewer decisions');
  await page.selectOption('#stateSelect', 'ready');
  await page.selectOption('#roleSelect', 'avery');
  await page.selectOption('#screenSelect', 'work');
  await page.selectOption('#sectionSelect', 'attention');
  await page.selectOption('#stateSelect', 'error');
  assert(await page.locator('#taskSearch').isVisible(), 'Attention error preserves healthy task section');
  await page.selectOption('#sectionSelect', 'tasks');
  assert((await page.locator('#screenContent').innerText()).includes('Needs your attention'), 'Task error preserves attention section');
  await page.selectOption('#sectionSelect', 'whole');
  await page.selectOption('#stateSelect', 'ready');
  await page.selectOption('#screenSelect', 'documents');
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator('.revision-register summary').click();
  assert(!await page.locator('.table-wrap').isVisible() && await page.locator('.doc-mobile-cards').isVisible(), 'Mobile documents show cards without duplicate desktop table');
  await page.locator('[data-docsearch]').fill('WH-214');
  await page.selectOption('[data-docstatus]', 'superseded');
  await page.locator('.revision-register').evaluate(element => { element.open = true; });
  assert((await page.locator('.doc-mobile-cards').innerText()).includes('Superseded') && !/Working|Current · approved/.test(await page.locator('.doc-mobile-cards').innerText()), 'Document status filter isolates superseded record');
  await page.selectOption('[data-docstatus]', 'all');
  await page.locator('[data-docsearch]').fill('');
  await page.selectOption('#screenSelect', 'work');
  await page.locator('#mobileMore').click();
  assert(await page.locator('#moreDialog').isVisible(), 'Mobile More opens navigation dialog');
  await page.locator('#moreDialog button').filter({ hasText: 'Documents' }).click();
  assert((await page.locator('#screenContent h1').innerText()) === 'Documents', 'More Documents opens global Documents register');
  await page.locator('.revision-register summary').click();
  assert((await page.locator('.doc-mobile-cards').innerText()).includes('Studio Annex'), 'Global document register includes Studio Annex');
  await page.selectOption('#screenSelect', 'work');
  await page.selectOption('#roleSelect', 'maya');
  assert(/No personal tasks assigned/i.test(await page.locator('#workRows').innerText()), 'Maya personal task area remains empty');
  assert(await page.locator('#attentionSection .attention-card').count() === 2 && /Pending extension decision/.test(await page.locator('#attentionSection').innerText()) && /Manager reassignment/.test(await page.locator('#attentionSection').innerText()), 'Maya sees extension and reassignment management attention');
  await page.selectOption('#roleSelect', 'avery');
  await page.selectOption('#screenSelect', 'review');
  await page.locator('[data-task="t2"]').click();
  assert((await page.locator('#screenContent h1').innerText()).includes('downlights'), 'Retained correction link opens correction task identity');
  // UI-V01 remaining core screens: recorded gates/evidence must stay distinct.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.selectOption('#screenSelect', 'overview');
    assert(await page.locator('.stage-map').count() === 1, `Applied-stage graphic present: ${width}`);
    const stages = await page.locator('.stage-map').innerText();
    assert(/Concept design/.test(stages) && /Design development/.test(stages) && /Technical documentation/.test(stages), `Stage map preserves applied plan: ${width}`);
    assert(!/\d+\s*%|On track/i.test(stages), `Stage map does not infer project delivery: ${width}`);
    await page.selectOption('#screenSelect', 'tasks');
    await page.locator('[data-task="t4"]').first().click();
    assert(await page.locator('.task-state-strip').count() === 1, `Task current-state graphic present: ${width}`);
    const detail = await page.locator('#screenContent').innerText();
    assert(/Committed.*1 Oct 2026/s.test(detail) && /5 Oct/.test(detail) && /Pending/i.test(detail), `Pending extension keeps original commitment: ${width}`);
    await page.selectOption('#screenSelect', 'review');
    assert(await page.locator('.review-round-map').count() === 1, `Retained round graphic present: ${width}`);
    const rounds = await page.locator('.review-round-map').innerText();
    assert(/Round 1/.test(rounds) && /Round 2/.test(rounds) && /R1/.test(rounds) && /R2/.test(rounds), `Round graphic retains exact evidence identities: ${width}`);
    assert(await page.locator('[data-action="decision:approve"]').isDisabled(), `Graphics cannot restore submitter decision: ${width}`);
    await page.selectOption('#roleSelect', 'noah');
    await page.locator('[data-round-select="R1"]').click();
    assert(await page.locator('.historical-round-summary').isVisible() && /R1/.test(await page.locator('.historical-round-summary').innerText()) && /read-only/i.test(await page.locator('.historical-round-summary').innerText()), `Historical round selection is explicit: ${width}`);
    assert((await page.locator('.revision-chain').innerText()).includes('WH-215_R2.pdf'), `Historical summary cannot replace current evidence: ${width}`);
    assert(await page.locator('.review-round[data-round="R2"]').getAttribute('aria-current') === 'step', `Current review target stays R2 while inspecting history: ${width}`);
    await page.locator('[data-round-select="R2"]').click();
    await page.selectOption('#roleSelect', 'avery');
    await page.selectOption('#screenSelect', 'documents');
    assert(!await page.locator('.revision-register').evaluate(element => element.open), `Document details collapsed to avoid duplicate primary content: ${width}`);
    assert(await page.locator('.revision-stack').count() > 0, `Revision stack present: ${width}`);
    const revisions = await page.locator('.revision-stack').allInnerTexts();
    assert(revisions.some(text => /R0/.test(text) && /R1/.test(text) && /R2/.test(text) && /Do Not Use/.test(text) && /approved/i.test(text) && /Working/i.test(text)), `Revision graphic separates superseded/approved/working: ${width}`);
    assert(!revisions.some(text => /Issued/.test(text) && !/not issued|no issue/i.test(text)), `Revision graphic invents no issued fixture: ${width}`);
    for (const revision of ['R0','R1','R2']) {
      const opener = page.locator(`.revision-stack button[data-file-revision="${revision}"]`).first();
      await opener.click();
      assert((await page.locator('#toast').innerText()).includes(revision), `Revision stack opens selected ${revision}: ${width}`);
    }
    await layout(`revision graphic at ${width}`);
  }
  await mkdir(new URL('./previews/', import.meta.url), { recursive: true });
  // Research candidates 07/08/09: inspect without losing source or granting writes.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.selectOption('#screenSelect', 'work');
    await page.locator('#taskSearch').fill('wardrobe');
    const opener=page.locator('[data-preview-task="t4"]');
    await opener.focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#taskPreviewDialog').isVisible(), `Keyboard opens read-only preview: ${width}`);
    const previewText=await page.locator('#taskPreviewDialog').innerText();
    assert(/WH-208/.test(previewText) && /Avery Morgan/.test(previewText) && /Committed.*1 Oct 2026/s.test(previewText) && /5 Oct 2026.*Pending/s.test(previewText), `Preview preserves identity and pending deadline: ${width}`);
    assert(await page.locator('#taskPreviewDialog [data-action], #taskPreviewDialog input, #taskPreviewDialog textarea').count() === 0, `Preview exposes no mutation controls: ${width}`);
    const bounds=await page.locator('#taskPreviewDialog').boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.x+bounds.width <= width+1 && bounds.y >= 0 && bounds.height <= 1000, `Preview fits viewport: ${width}`);
    await page.keyboard.press('Escape');
    assert(!await page.locator('#taskPreviewDialog').isVisible() && await opener.evaluate(element=>document.activeElement===element), `Escape closes preview and returns focus: ${width}`);
    assert(await page.locator('#taskSearch').inputValue() === 'wardrobe', `Preview close preserves filter: ${width}`);
    await opener.click();
    await page.locator('[data-preview-open-full="t4"]').click();
    assert((await page.locator('#screenContent h1').innerText()).includes('wardrobe') && !await page.locator('#taskPreviewDialog').isVisible(), `Preview opens exact full task: ${width}`);
    await page.locator('[data-preview-return]').click();
    assert(await page.locator('#taskSearch').inputValue() === 'wardrobe' && await page.locator('#screenContent h1').innerText() === 'My Work', `Full-detail return preserves source filter: ${width}`);
    await page.locator('[data-work-display] summary').click();
    await page.locator('[data-work-display] [data-density="compact"]').click();
    const workText=await page.locator('#workRows').innerText();
    assert(/TARGET/i.test(workText) && /COMMITTED/i.test(workText) && /OWNER/i.test(workText), `Compact display keeps essential facts: ${width}`);
    await page.locator('[data-work-display] summary').click();
    await page.locator('[data-work-display] [data-density="comfortable"]').click();
    await page.selectOption('#stateSelect', 'readonly');
    await page.locator('[data-preview-task="t4"]').click();
    assert(await page.locator('#taskPreviewDialog').isVisible(), `Read-only records permit read-only inspection: ${width}`);
    await page.evaluate(()=>{ const control=document.querySelector('#stateSelect'); control.value='error'; control.dispatchEvent(new Event('change',{bubbles:true})); });
    assert(!await page.locator('#taskPreviewDialog').isVisible() && await page.locator('#taskPreviewDialog').innerText() === '', `State change clears protected preview: ${width}`);
    await page.selectOption('#stateSelect', 'ready');
    await page.selectOption('#screenSelect', 'tasks');
    await page.locator('[data-preview-task="t3"]').click();
    assert(/Eli Brooks.*exited/s.test(await page.locator('#taskPreviewDialog').innerText()) && /reassignment/.test(await page.locator('#taskPreviewDialog').innerText()), `Exit waiting preview retains current owner: ${width}`);
    await page.locator('[data-preview-close]').click();
    await layout(`research task preview return at ${width}`);
  }
  await page.selectOption('#screenSelect', 'work');
  await page.locator('#screenContent button[data-action="reset"]').first().click();
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(() => { document.querySelector('#toast').hidden = true; window.scrollTo(0, 0); });
  await page.locator('[data-preview-task="t4"]').click();
  await page.screenshot({path:fileURLToPath(new URL('./previews/task-preview-mobile.png',import.meta.url)),fullPage:false});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1100});
  await page.evaluate(() => { document.querySelector('#toast').hidden = true; window.scrollTo(0, 0); });
  await page.locator('[data-preview-task="t1"]').click();
  await page.screenshot({path:fileURLToPath(new URL('./previews/task-preview-desktop.png',import.meta.url)),fullPage:false});
  await page.keyboard.press('Escape');
  for (const [screen, width, name] of [
    ['work', 1440, 'my-work-desktop'], ['work', 390, 'my-work-mobile'],
    ['overview', 1440, 'project-overview-desktop'], ['documents', 390, 'documents-mobile'],
    ['task', 1440, 'task-detail-desktop'], ['review', 1440, 'review-correction-desktop'],
  ]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.selectOption('#screenSelect', screen);
    await page.selectOption('#stateSelect', 'ready');
    if (screen === 'work') await page.locator('#screenContent button[data-action="reset"]').first().click();
    await page.evaluate(() => { document.querySelector('#toast').hidden = true; window.scrollTo(0, 0); });
    await page.screenshot({ path: fileURLToPath(new URL(`./previews/${name}.png`, import.meta.url)), fullPage: true });
  }
  assert(errors.length === 0, `Browser script errors: ${errors.join('; ')}`);
  const report = { checkedAt: new Date().toISOString(), checks, failures, browserErrors: errors, note: 'Standalone fictional mockup verification only. No real API, permissions, persistence, audit or production quality gates tested.' };
  await writeFile(new URL('./preview-verification.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
}
