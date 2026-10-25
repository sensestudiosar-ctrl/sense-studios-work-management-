/* Render every view and report per-view DOM + errors. */
const fs = require('fs');
const path = require('path');
const STORE = path.join(__dirname, 'node_modules/.pnpm/jsdom@30.1.1_@noble+hashes@1.8.0/node_modules/jsdom');
const { JSDOM, VirtualConsole } = require(STORE);
const html = fs.readFileSync('docs/design/_build/app.html', 'utf8');

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push(e.message || String(e)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;

const stat = () => {
  const e = d.getElementById('app');
  return {
    html: e.innerHTML.length,
    cards: d.querySelectorAll('.card').length,
    rows: d.querySelectorAll('tbody tr').length,
    btns: d.querySelectorAll('button').length,
    title: (d.querySelector('.tb-t') || {}).textContent,
  };
};

const VIEWS = ['dashboard','tasks','projects','people','calendar','reports','approvals','settings','search'];

VIEWS.forEach(v => {
  try {
    w.S.view = v;
    if (v === 'search') w.S.search = 'API';
    w.render();
    const s = stat();
    const row = [
      v.padEnd(11),
      String(s.html).padStart(6),
      String(s.cards).padStart(5),
      String(s.rows).padStart(4),
      String(s.btns).padStart(4),
      String(s.title || '').slice(0, 28)
    ];
    console.log(row.join(' | '));
  } catch (e) {
    console.log(v.padEnd(11), '| THREW:', e.message);
  }
});

console.log('\nerrors:', errs.length);
errs.slice(0, 10).forEach(e => console.log('  [err]', String(e).split('\n')[0].slice(0, 200)));

console.log('\n--- detail + create paths ---');
const tries = [
  ['S.task=NW-237', () => { w.S.task = 'NW-237'; w.S.view = 'tasks'; }],
  ['S.task=new',    () => { w.S.task = 'new';     w.S.view = 'tasks'; }],
  ['S.proj=NW-APP', () => { w.S.proj = 'NW-APP';  w.S.view = 'projects'; }],
  ['S.person=u1',   () => { w.S.person = 'u1';    w.S.view = 'people'; }],
];
tries.forEach(([label, fn]) => {
  try {
    fn(); w.render();
    const e = d.getElementById('app');
    console.log(label.padEnd(15), 'html=' + String(e.innerHTML.length).padStart(6),
      ' rows=' + d.querySelectorAll('tbody tr').length,
      ' fields=' + d.querySelectorAll('input,select,textarea').length,
      ' cards=' + d.querySelectorAll('.card').length);
  } catch (e2) {
    console.log(label.padEnd(15), 'THREW:', e2.message);
  }
});
try {
  w.S.view = 'tasks'; w.S.task = null; w.render();
  console.log('reset to list  ', 'rows=' + d.querySelectorAll('tbody tr').length,
              ' html=' + d.getElementById('app').innerHTML.length);
} catch (e3) {
  console.log('reset THREW:', e3.message);
}
process.exit(errs.length ? 1 : 0);
