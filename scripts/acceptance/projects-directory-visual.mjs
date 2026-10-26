import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Existing application, synthetic reads only. No retained session or domain writes.
const output = path.resolve('docs/design/projects-programa-evidence-2026-10-26');
fs.mkdirSync(output, { recursive: true });
const branch = { id: 'visual-branch', name: 'Mumbai Studio' };
const projects = [
  ['Courtyard House', 'ACTIVE', 'DESIGN', 'Ananya Rao', ['Architecture', 'Interior design']],
  ['Bandra Studio', 'DRAFT', 'TURNKEY', null, ['Interiors']],
  ['The Grove Residence', 'ON_HOLD', 'DESIGN', 'Rohan Mehta', ['Architecture', 'Landscape']],
  ['Riverside Workspace', 'COMPLETED', 'TURNKEY', 'Priya Shah', ['Interiors', 'Furniture']],
  ['A very long project name for an interconnected multi-generational residential interior', 'ACTIVE', 'DESIGN', 'Ananya Rao', ['Architecture and residential interior design', 'Landscape and external works']],
  ['Hill House', 'ARCHIVED', 'DESIGN', null, ['Architecture']]
].map(([title, status, deliveryType, currentLeadName, scopes], index) => ({
  id: `visual-project-${index}`, title, status, deliveryType, currentLeadName, branch, version: 1,
  scopes: scopes.map((name, i) => ({ id: `scope-${i}`, name, normalizedName: name.toLowerCase(), baseline: true })),
  createdAt: '2026-10-01T09:00:00Z', appliedStageKeys: index % 2 ? [] : ['concept', 'detailed-design'],
  nextMilestone: index % 2 ? null : { key: 'concept-review', label: 'Concept review', targetAt: '2026-11-06T12:00:00Z' }
}));
const report = { mode: 'Synthetic read-only browser acceptance, not real authentication/persistence', screenshots: [], checks: [], errors: [], writes: [] };
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  let kind = 'OWNER', fail = false, empty = false;
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    if (request.method() !== 'GET') { report.writes.push(p); return route.abort('blockedbyclient'); }
    if (p === '/api/v1/auth/session') return route.fulfill({ json: { account: { id: 'projects-visual-' + kind, kind, email: 'synthetic@example.test' }, csrfToken: 'synthetic-no-command-authority' } });
    if (p === '/api/v1/projects/setup') return route.fulfill({ json: { owner: kind === 'OWNER', branches: [branch], employees: [] } });
    if (p === '/api/v1/projects') {
      if (fail) return route.fulfill({ status: 503, json: {} });
      const items = empty ? [] : projects.filter(item => !url.searchParams.get('q') || item.title.toLowerCase().includes(url.searchParams.get('q').toLowerCase()));
      return route.fulfill({ json: { total: items.length, stageKeys: ['concept', 'detailed-design'], items } });
    }
    const item = projects.find(item => p === '/api/v1/projects/' + item.id);
    if (item) return route.fulfill({ json: { project: item, capabilities: {}, assignments: [] } });
    if (p.endsWith('/plan')) return route.fulfill({ json: { plan: null, items: [], history: [], capabilities: {} } });
    if (p === '/api/v1/project-templates') return route.fulfill({ json: { templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } } });
    if (p === '/api/v1/notifications/unread') return route.fulfill({ json: { unread: 0 } });
    if (p === '/api/v1/branches') return route.fulfill({ json: { items: [branch] } });
    return route.fulfill({ status: 403, json: { message: 'Synthetic fixture: unrelated source unavailable' } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const snapshot = async name => {
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    report.screenshots.push({ name, ...geometry });
    expect(geometry.overflow, name + ' page overflow').toBe(false);
  };
  await page.goto((process.env.PROJECTS_VISUAL_ORIGIN ?? 'http://127.0.0.1:59765') + '/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Courtyard House/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cards view' })).toHaveAttribute('aria-pressed', 'true');
  for (const width of [1440, 783, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('button', { name: 'Cards view' }).click();
    await snapshot('cards-' + width);
    await page.getByRole('button', { name: 'List view' }).click();
    await snapshot('list-' + width);
  }
  report.checks.push('Cards/List at four widths without page overflow');
  await page.getByRole('button', { name: 'Cards view' }).click();
  await page.getByRole('button', { name: /Courtyard House/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Courtyard House', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('projectId')).toBe(projects[0].id);
  await page.getByRole('button', { name: '← Back to projects' }).click();
  await expect(page.getByRole('button', { name: 'Cards view' })).toHaveAttribute('aria-pressed', 'true');
  report.checks.push('Keyboard project open uses canonical ID; Back restores directory view');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Draft project' })).toBeFocused();
  const focusGeometry = await page.evaluate(() => ({ headingTop: document.querySelector('#create-project-heading').getBoundingClientRect().top, headerBottom: document.querySelector('.workspace-header').getBoundingClientRect().bottom }));
  expect(focusGeometry.headingTop).toBeGreaterThanOrEqual(focusGeometry.headerBottom);
  report.checks.push('Focused creation heading remains below sticky workspace header');
  await page.getByRole('textbox', { name: 'Project title', exact: true }).fill('Preserved draft');
  await page.locator('.project-create-summary').click();
  await page.getByRole('button', { name: 'List view' }).click();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project title', exact: true })).toHaveValue('Preserved draft');
  await snapshot('create-1440');
  report.checks.push('New project focuses existing form and collapsing preserves draft');
  await page.locator('.project-create-summary').click();
  await page.getByRole('textbox', { name: 'Search projects' }).fill('Courtyard');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.project-directory-entry')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('.project-directory-entry')).toHaveCount(6);
  report.checks.push('Search and Clear use server query without resetting view');
  empty = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('No projects match these filters.')).toBeVisible(); await snapshot('empty-1440');
  empty = false; fail = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Projects could not be loaded.');
  await expect(page.getByText('Count unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('0 available', { exact: true })).toHaveCount(0);
  await snapshot('error-1440');
  fail = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.project-directory-entry')).toHaveCount(6);
  report.checks.push('Empty and failed list recover through existing actions');
  kind = 'STAFF'; await page.reload();
  await expect(page.getByRole('button', { name: /Courtyard House/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New project', exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 }); await snapshot('staff-reduced-motion-390');
  report.checks.push('Staff has no creation control; reduced-motion/mobile rendering');
  expect(report.errors).toEqual([]); expect(report.writes).toEqual([]);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
