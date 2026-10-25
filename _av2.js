/* Render every view via global eval (const bindings are not on window). */
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

const R = js => w.eval(js);   // global eval sees lexical globals

console.log('typeof S (via eval)   :', R("typeof S"));
console.log('typeof render         :', R("typeof render"));
console.log('Object.keys(S)        :', R("JSON.stringify(Object.keys(S))"));
console.log('NAV count             :', R("NAV.length"));
console.log('TASKS/PROJ/TEAM       :', R("TASKS.length+' / '+PROJ_ORDER.length+' / '+TEAM.length"));
console.log('ME                    :', R("ME.name+' ('+ME.role+') @'+ME.util+'/'+ME.cap+'h caps='+ME.skills.length"));
console.log('boot() on its own     :', R("boot(); document.getElementById('app').children.length"));

const VIEWS = ['dashboard','tasks','projects','people','calendar','reports','approvals','settings'];
console.log('\nview         |  html | cards | rows | btns | title');
VIEWS.forEach(v => {
  try {
    R("S.view = '" + v + "'; render();");
    const e = d.getElementById('app');
    console.log(
      v.padEnd(13), '|', String(e.innerHTML.length).padStart(5), '|',
      String(d.querySelectorAll('.card').length).padStart(5), '|',
      String(d.querySelectorAll('tbody tr').length).padStart(4), '|',
      String(d.querySelectorAll('button').length).padStart(4), '|',
      String((d.querySelector('.tb-t') || {}).textContent || '').slice(0, 26)
    );
  } catch (err) {
    console.log(v.padEnd(13), '| THREW:', err.message);
  }
});

console.log('\n--- detail / create routes ---');
[
  ['S.task=new',     "S.task='new'; S.view='tasks'; render()"],
  ['S.task=NW-237',  "S.task='NW-237'; S.view='tasks'; render()"],
  ['S.proj=NW-APP',  "S.proj='NW-APP'; S.view='projects'; render()"],
  ['S.person=u1',    "S.person='u1'; S.view='people'; render()"],
  ['list reset',     "S.view='tasks'; S.task=null; render()"],
].forEach(([label, js]) => {
  try {
    R(js);
    const e = d.getElementById('app');
    console.log(label.padEnd(15), 'html=' + String(e.innerHTML.length).padStart(6),
      ' rows=' + String(d.querySelectorAll('tbody tr').length).padStart(4),
      ' fields=' + String(d.querySelectorAll('input,select,textarea').length).padStart(4),
      ' cards=' + d.querySelectorAll('.card').length);
  } catch (e2) {
    console.log(label.padEnd(15), 'THREW:', e2.message);
  }
});
console.log('\nerrors:', errs.length);
errs.slice(0, 10).forEach(e => console.log('  [err]', String(e).split('\n')[0].slice(0, 200)));
process.exit(errs.length ? 1 : 0);
