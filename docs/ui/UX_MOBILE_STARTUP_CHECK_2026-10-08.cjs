// Script/DOM regression checks only; this does not establish rendered browser usability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const requireWeb = createRequire(path.resolve(__dirname, '../../apps/web/package.json'));
const { JSDOM, VirtualConsole } = requireWeb('jsdom');
const html = fs.readFileSync(path.join(__dirname, 'UX_VALIDATION_LOW_FIDELITY_2026-10-07.html'), 'utf8');
for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
let checks = 0;
async function main() {
for (const mobile of [false, true]) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, {
    // Virtual document URL gives jsdom a history origin. No server or network request is used.
    url: 'https://prototype.invalid/virtual.html#dashboard', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: console,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} });
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      // jsdom has no layout-dependent innerText implementation.
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', { get() { return this.textContent; } });
    }
  });
  const w = dom.window;
  const back = async () => {
    const restored = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.document.querySelector('[data-context-back]').click();
    await restored;
  };
  const route = id => { w.eval(`go(${JSON.stringify(id)})`); assert(w.document.querySelector('#content h1'), id + ' renders a page'); checks++; };
  assert.deepEqual(errors, [], 'startup has no script errors'); checks++;
  assert.match(w.document.querySelector('#content').textContent, /Dashboard/); checks++;
  route('tasks');
  if (mobile) {
    const choose = (label, value) => {
      const select = w.document.querySelector(`select[aria-label="${label}"]`);
      assert(select, label + ' exists');
      select.value = value; select.dispatchEvent(new w.Event('change', { bubbles: true })); checks++;
    };
    choose('Task scope', 'created');
    assert.equal(w.document.querySelector('.ux-mobile-choice-row').querySelectorAll('select').length, 2); checks++;
    const options = w.document.querySelector('.ux-mobile-worklist-details');
    assert(options && options.querySelector('#taskSort') && options.querySelector('#taskSecondaryFilters')); checks++;
    for (const view of ['Cards', 'Kanban', 'Timeline', 'List']) { choose('Task view', view); assert.equal(w.eval('taskScope'), 'created'); checks++; }
    w.eval("openTask('rcp')");
    await back();
    assert.equal(w.eval('taskScope'), 'created'); checks++;
    w.eval("openProject('cedar','tasks')");
    choose('Project task view', 'Cards');
    assert.equal(w.eval('taskView'), 'Cards'); checks++;
    choose('Project section', 'documents');
    assert.equal(w.eval('tab'), 'documents'); checks++;
    route('tasks');
    const projectFilter = w.document.querySelector('#taskDirectoryProject');
    projectFilter.value = 'cedar'; projectFilter.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.eval('taskProjectFilter'), 'cedar'); checks++;
    w.eval("openTask('kitchen')"); await back();
    assert.equal(w.eval('taskProjectFilter'), 'cedar'); checks++;
    assert.equal(w.eval('current'), 'tasks', 'Back from filtered task returns to Tasks'); checks++;
    w.document.querySelector('[data-go="createTask"]').click();
    assert.equal(w.eval('current'), 'createTask'); checks++;
    await back();
    assert.equal(w.eval('taskScope'), 'created'); checks++;
    route('mywork');
    assert.equal(w.document.querySelector('.ux-mobile-choice-row').querySelectorAll('select').length, 2); checks++;
    assert(w.document.querySelector('.ux-mobile-worklist-details #workSort')); checks++;
    for (const view of ['Board', 'Timeline', 'List']) { choose('My Work view', view); assert.equal(w.eval('workMode'), view); checks++; }
    choose('My Work scope', 'Waiting');
    assert.equal(w.eval('filter'), 'Waiting'); checks++;
    w.document.querySelector('[data-clear-work-filters]').click();
    assert.equal(w.eval('filter'), 'All'); checks++;
    route('dashboard');
    assert.equal(w.document.querySelector('.dashboard-primary').firstElementChild.id, 'dash-attention'); checks++;
    assert(w.document.querySelector('#dash-attention').open); checks++;
    assert(!w.document.querySelector('#dash-reviews').open); checks++;
    assert(!w.document.querySelector('#dash-decisions').open); checks++;
    assert(w.document.querySelector('.ux-mobile-dashboard-counts [data-dash-route]')); checks++;
    assert(!w.document.querySelector('.dash-toolbar #dashboardScenario')); checks++;
    w.eval("dashboardScenario='partial';render()");
    assert.match(w.document.querySelector('#dash-attention').textContent, /unavailable|partial/i); checks++;
    assert(w.document.querySelector('.ux-mobile-dashboard-source-status [data-source-state="reviews"]')); checks++;
    w.eval("dashboardScenario='normal';render()");
  } else {
    assert.equal(w.document.querySelectorAll('.ux-mobile-control').length, 0); checks++;
  }
  for (const id of ['mywork', 'projects', 'reviewQueue', 'settings', 'time', 'workforce', 'leave', 'attendance', 'learning', 'assistance', 'performance', 'projectHealth', 'reports', 'savedReports', 'more']) route(id);
  if (mobile) {
    assert(w.document.querySelector('#content [data-go="assistance"]')); checks++;
    const search = w.document.querySelector('input[aria-label="Search permitted destinations"]');
    search.value = 'Site'; search.dispatchEvent(new w.Event('input', { bubbles: true }));
    const site = w.document.querySelector('#content button[data-project="palm"]');
    assert(site && !site.hidden && !site.closest('section').hidden); checks++;
  }
  assert.deepEqual(errors, [], 'all routes have no script errors'); checks++;
  dom.window.close();
}
console.log(`${checks} script/DOM checks passed; rendered/touch/keyboard checks not performed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
