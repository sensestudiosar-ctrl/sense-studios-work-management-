import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Synthetic fixture only. The fixture blocks non-GET fetches; this script never
// submits forms or invokes project actions.
const origin = process.env.PROJECT_INNER_VISUAL_ORIGIN ?? 'http://127.0.0.1:59765';
const output = path.resolve('.env.project-inner-visual');
fs.mkdirSync(output, { recursive: true });
const sections = ['Overview', 'Plan', 'Tasks', 'People', 'Documents', 'Reviews', 'Delivery', 'Activity'];
const params = new URLSearchParams({ projectSection: 'overview' });
const report = { mode: 'synthetic read-only project fixture', origin, widths: [1440, 783, 390, 320], sections: [], screenshots: [], errors: [], writes: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) report.writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  await page.goto(`${origin}/agent1-project.html?${params}`, { waitUntil: 'domcontentloaded' });
  await page.locator('.project-detail-heading h3').waitFor({ state: 'visible', timeout: 15000 });
  for (const width of report.widths) {
    await page.setViewportSize({ width, height: 980 });
    for (const section of sections) {
      const tab = page.locator('.project-section-nav button').filter({ hasText: new RegExp(`^${section}$`) });
      await tab.click();
      await tab.waitFor({ state: 'visible' });
      await page.waitForTimeout(section === 'documents' || section === 'reviews' ? 250 : 50);
      const state = await page.evaluate(() => {
        const active = document.querySelector('.project-section-nav button[aria-current="page"]');
        const heading = document.querySelector('.project-section-intro h4, .project-active-section');
        const detail = document.querySelector('.project-detail');
        return {
          viewportWidth: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          detailWidth: detail?.clientWidth ?? null,
          detailScrollWidth: detail?.scrollWidth ?? null,
          detailOverflow: !!detail && detail.scrollWidth > detail.clientWidth + 1,
          activeNav: active?.textContent?.trim() ?? null,
          sectionHeading: heading?.textContent?.trim() ?? null,
          visibleSectionCount: [...document.querySelectorAll('.project-section-panel')].filter(el => !el.hasAttribute('hidden')).length,
          bodyText: document.body.innerText
        };
      });
      assert.equal(state.activeNav, section, `${width}px active navigation`);
      assert.equal(state.sectionHeading, section, `${width}px section heading`);
      assert.equal(state.visibleSectionCount, section === 'Overview' ? 2 : 1, `${width}px visible section count`);
      assert.equal(state.pageOverflow, false, `${width}px page horizontal overflow at ${section}`);
      assert.equal(state.detailOverflow, false, `${width}px project detail overflow at ${section}`);
      if (section === 'Documents') { assert.match(state.bodyText, /Project specification 2\.pdf/); assert.match(state.bodyText, /Approved interior layout\.pdf/); }
      if (section === 'Plan') assert.match(state.bodyText, /Coordinated drawing package/);
      if (section === 'Activity') assert.match(state.bodyText, /Project scope and lead confirmed/);
      if (section === 'Reviews') assert.match(state.bodyText, /Internal review package 2/);
      const name = `${String(width).padStart(4, '0')}-${section.toLowerCase()}`;
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
      report.sections.push({ width, section, activeNav: state.activeNav, heading: state.sectionHeading, visibleSectionCount: state.visibleSectionCount, pageOverflow: state.pageOverflow, detailOverflow: state.detailOverflow });
      report.screenshots.push(`${name}.png`);
    }
  }
  assert.deepEqual(report.errors, [], 'Browser errors');
  assert.deepEqual(report.writes, [], 'No synthetic write requests');
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ output, sections: report.sections.length, screenshots: report.screenshots.length, errors: report.errors.length, writes: report.writes.length }, null, 2));
