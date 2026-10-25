const fs = require('fs');
const path = require('path');
const STORE = path.join(__dirname, 'node_modules/.pnpm/jsdom@30.1.1_@noble+hashes@1.8.0/node_modules/jsdom');
const { JSDOM, VirtualConsole } = require(STORE);
const html = fs.readFileSync('docs/design/_build/app.html', 'utf8');

const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('[JSDOM ERROR]', e.message));


const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document;

console.log('--- raw HTML sanity ---');
console.log('script tag count :', (html.match(/<script>/g) || []).length);
console.log('style tag count  :', (html.match(/<style>/g) || []).length);
console.log('app div in HTML  :', html.includes('id="app"'));

console.log('--- after parse ---');
console.log('body innerHTML len :', d.body.innerHTML.length);
console.log('#app in live DOM   :', !!d.getElementById('app'));
console.log('#app outerHTML     :', (d.getElementById('app') || {}).outerHTML);
console.log('window typeof S    :', typeof w.S);
console.log('window typeof boot :', typeof w.boot);
console.log('window typeof render:', typeof w.render);
console.log('window typeof NAV  :', typeof w.NAV);
console.log('window typeof byId :', typeof w.byId);
console.log('window errors       :', !!w.onerror);

console.log('--- forced render ---');
try { w.render(); console.log('render() returned, #app children:', d.getElementById('app').children.length); }
catch (e) { console.log('render() THREW:', e.message, '\n', (e.stack||'').split('\n').slice(0,4).join('\n')); }
try { w.boot(); console.log('boot() returned, #app children:', d.getElementById('app').children.length); }
catch (e) { console.log('boot() THREW:', e.message); }
