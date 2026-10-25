const fs = require('fs');
const path = require('path');
const STORE = path.join(__dirname, 'node_modules/.pnpm/jsdom@30.1.1_@noble+hashes@1.8.0/node_modules/jsdom');
const { JSDOM } = require(STORE);
const html = fs.readFileSync('docs/design/_build/app.html', 'utf8');

const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: new (require(STORE).VirtualConsole)()
    .on('jsdomError', e => errs.push(e.message || String(e))) });
const w = dom.window, d = w.document;

console.log('before boot: #app children =', d.getElementById('app').children.length);
try { w.boot(); console.log('boot() called: OK'); }
catch (e) { console.log('boot() THREW:', e.message); }
const a = d.getElementById('app');
console.log('after  boot: #app children =', a.children.length);
console.log('app div class   =', a.getAttribute('class'));
console.log('.sb   =', !!d.querySelector('.sb'));
console.log('.tb   =', !!d.querySelector('.tb'));
console.log('.nav-b=', d.querySelectorAll('.nav-b').length);
console.log('.card =', d.querySelectorAll('.card').length);
console.log('tbody tr =', d.querySelectorAll('tbody tr').length);
console.log('errs =', errs.length);
errs.slice(0,6).forEach(e => console.log('  [err]', String(e).split('\n')[0].slice(0,200)));
fs.writeFileSync('docs/design/_build/_domdump.html', d.body.innerHTML);
console.log('dumped _domdump.html:', fs.statSync('docs/design/_build/_domdump.html').size, 'bytes');
