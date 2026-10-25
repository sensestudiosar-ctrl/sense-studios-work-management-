/* Build script.
 *
 * Chunk 15 is JS: `const CSS = \`...\`;`  -> extract the template-literal body.
 * Chunk 20 is raw CSS (no wrapper) -> concat as-is.
 * Everything else is raw JS.
 *
 * Chunk 6 is superseded by 17-18 (it had a dead vSettings, a duplicate shell(),
 * and referenced the non-existent `me` global). _fix.js is unused.
 */
const fs = require('fs');

const JS  = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21];
const CSS_JS  = 15;   // wrapped in a JS template literal
const CSS_RAW = [20]; // plain CSS

const app = JS.map(n => fs.readFileSync(`_chunk${n}.js`, 'utf8')).join('\n\n');

/* chunk15: take the text between the first ` and the last `\`; */
const c15 = fs.readFileSync(`_chunk${CSS_JS}.js`, 'utf8');
const start = c15.indexOf('`');
const end = c15.lastIndexOf('`');
if (start < 0 || end <= start) throw new Error('chunk15: no template literal found');
let css = c15.slice(start + 1, end).trim() + '\n\n';
CSS_RAW.forEach(n => { css += fs.readFileSync(`_chunk${n}.js`, 'utf8').trim() + '\n'; });

const tpl = fs.readFileSync('_template.html', 'utf8');
const out = tpl.split('__APP__').join(app).split('__CSS__').join(css);

fs.writeFileSync('app.html', out);
fs.writeFileSync('../app.html', out);

console.log(`app.html: ${out.length} chars  (js ${app.length} + css ${css.length})`);
console.log(`chunks   : js ${JS.join(',')}`);
console.log(`           css ${CSS_JS}(literal) + ${CSS_RAW.join(',')}`);
