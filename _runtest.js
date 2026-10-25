/* Executes the generated app.html in jsdom and reports real errors.
   Usage: node _runtest.js [file.js]
*/
const fs = require('fs');
const path = require('path');

const STORE = path.join(__dirname, 'node_modules/.pnpm/jsdom@30.1.1_@noble+hashes@1.8.0/node_modules/jsdom');
if (!fs.existsSync(STORE)) { console.log('ABORT: jsdom store missing at ' + STORE); process.exit(2); }

const { JSDOM } = require(STORE);

const html = fs.readFileSync(path.join(__dirname, 'docs/design/_build/app.html'), 'utf8');
const errors = [];
const warns = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: new (require(STORE).VirtualConsole)()
    .on('error', (msg, extra) => errors.push(typeof msg === 'string' ? msg : (extra && extra.stack) || String(msg)))
    .on('jsdomError', e => errors.push(e.stack || String(e)))
    .on('warn', (...a) => warns.push(a.join(' ')))
    .on('log', (...a) => {}),
});

const { document } = dom.window;
const out = [];
const root = document.getElementById('app');

out.push('===== RENDER STATE =====');
out.push('#app exists:            ' + !!root);
out.push('#app children:          ' + (root ? root.children.length : 0));
out.push('document.body length:   ' + (document.body ? document.body.innerHTML.length : 'no body'));
out.push('sidebar .sb:            ' + (document.querySelector('.sb') ? 'yes' : 'NO'));
out.push('header .tb:             ' + (document.querySelector('.tb') ? 'yes' : 'NO'));
out.push('nav buttons:            ' + document.querySelectorAll('.nav-b').length);
out.push('table rows (tbody):     ' + document.querySelectorAll('tbody tr').length);
out.push('cards .card:            ' + document.querySelectorAll('.card').length);

const navs = Array.from(document.querySelectorAll('.nav-b')).map(b => (b.querySelector('.nl') || {}).textContent);
out.push('nav labels:             ' + JSON.stringify(navs));

const tbT = document.querySelector('.tb-t');
out.push('header title:           ' + (tbT ? tbT.textContent.trim() : '(none)'));
out.push('app div classes:        ' + (document.querySelector('.app') ? document.querySelector('.app').className : '(none)'));

out.push('\n===== ERRORS (' + errors.length + ') =====');
errors.slice(0, 12).forEach((e, i) => out.push('[E' + (i + 1) + '] ' + String(e).split('\n').slice(0, 3).join(' | ')));
out.push('\n===== WARNINGS (' + warns.length + ') =====');
warns.slice(0, 8).forEach((w, i) => out.push('[W' + (i + 1) + '] ' + w.split('\n')[0].slice(0, 220)));

console.log(out.join('\n'));
process.exit(errors.length ? 1 : 0);
