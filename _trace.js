const fs = require('fs');
const path = require('path');
const STORE = path.join(__dirname, 'node_modules/.pnpm/jsdom@30.1.1_@noble+hashes@1.8.0/node_modules/jsdom');
const { JSDOM, VirtualConsole } = require(STORE);
const html = fs.readFileSync('docs/design/_build/app.html', 'utf8');

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push(e));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;

const R = js => w.eval(js);

console.log('peopleDrawer state :', R("S.personDrawer"));
console.log('peopleDrawer typeof:', R("typeof vPeopleDrawer"));
console.log('peopleDrawer defined in renderView? checking TITLE keys:', R("Object.keys(TITLE).join(',')"));
console.log('S.peopleTab/Role/Project/Q:', R("S.peopleTab+'/'+S.peopleRole+'/'+S.peopleProject+'/'+JSON.stringify(S.peopleQ)"));

try {
  R("S.view='people'; render();");
  console.log('people OK  html=' + w.document.getElementById('app').innerHTML.length);
} catch (e) {
  console.log('THREW:', e.message);
  console.log(String(e.stack || '').split('\n').slice(0, 10).join('\n'));
}
errs.slice(0, 3).forEach(e => {
  console.log('--- jsdomError ---');
  console.log(String(e.stack || e.message).split('\n').slice(0, 10).join('\n'));
});
