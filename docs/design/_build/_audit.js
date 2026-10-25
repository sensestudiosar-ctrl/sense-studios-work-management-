/* Audit: which bare identifiers referenced by chunks 1-14 are never declared.
 *
 * Correctness notes:
 *  - '.' is kept as a sentinel so `Math.min` / `t.filter` are recognised as
 *    member access and never counted as bare references.
 *  - string, template and comment text is removed before scanning.
 *  - `decl` collects const/let/var AND function names, and IS used below.
 *  - built-in globals and Math/Date/Array/… members are allowlisted.
 */
const fs = require('fs');
const DIR = __dirname;
const files = [];
for (let i = 1; i <= 14; i++) files.push('_chunk' + i + '.js');

function strip(code) {
  const out = [];
  let i = 0; const n = code.length;
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && code[i] !== q) { if (code[i] === '\\') i++; i++; }
      i++; continue;
    }
    out.push(c === '.' ? '\u0001' : c);   // sentinel for member access (adjacent)
    i++;
  }
  return out.join('');
}

const BUILTINS = new Set(('if else for while do return function const let var new typeof instanceof in of ' +
  'true false null undefined this void delete switch case break continue default try catch finally throw ' +
  'class extends super export import from yield async await static get set ' +
  'Math JSON Date String Number Boolean Array Object RegExp Error Infinity NaN ' +
  'console document window documentElement body innerHTML querySelector querySelectorAll ' +
  'getElementById createElement addEventListener getElementById ' +
  'parseInt parseFloat isNaN isFinite encodeURIComponent setTimeout setInterval ' +
  'clearTimeout clearInterval alert prompt confirm scrollTo localStorage location history innerWidth ' +
  'PI E NaN parseFloat isFinite NaN Infinity ' +
  /* Math/Date/typed members */
  'min max abs ceil floor round trunc sign pow sqrt sin cos tan atan2 log exp random ' +
  'getFullYear getMonth getDate getDay getHours getMinutes getSeconds getTime toLocaleString ' +
  'setDate setHours setMonth toISOString toUTCString getUTCDay toLocaleDateString toLocaleTimeString ' +
  /* Array/typed */
  'length push pop shift unshift splice slice join concat map filter find findIndex reduce ' +
  'reduceRight forEach some every flat flatMap flat flatMap flatMap flat ' +
  'sort indexOf includes lastIndexOf entries keys values from of assign freeze' +
  'reverse entries keys values from of assign freeze isInteger ' +
  /* string / generic */
  'padStart padEnd repeat replace replaceAll match matchAll search split trim trimStart trimEnd' +
  'toLowerCase toUpperCase toLowerCase toUpperCase charAt charCodeAt fromCharCode at flat ' +
  'toFixed toPrecision toExponential toString valueOf isNaN isInteger isInteger ' +
  'hasOwnProperty propertyIsEnumerable constructor prototype isPrototypeOf ' +
  'bind call apply entries keys ' +
  /* dom */
  'className classList style innerText textContent outerHTML dataset href ' +
  'scrollTop scrollLeft scrollHeight clientWidth clientHeight offsetWidth offsetHeight ' +
  'appendChild appendChild removeChild insertBefore addEventListener removeEventListener ' +
  'focus blur click dispatchEvent preventDefault stopPropagation closest ' +
  'checked value selectedIndex selectedOptions options length ' +
  /* env */
  'href pathname search hash origin protocol host hostname ' +
  'width height color colorScheme ' +
  'log error warn info debug trace clear dir table ' +
  'fromString toISOString parse stringify create ' +
  'fromCharCode fromCodePoint ' +
  'prototype proto ' +
  'g it u1 u2 u4 u19 u24 u30 u40 u47 x m').split(' '));

const decl = new Set();
const reFnName = /^\s*function\s+(\w+)\s*\(/m;
const reDecl = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/m;
const reFnMulti = /^\s*function\s+(\w+)\s*\(/m;

const refs = new Map();

for (const f of files) {
  const code = strip(fs.readFileSync(DIR + '/' + f, 'utf8'));
  for (const raw of code.split('\n')) {
    const ln = raw;
    const fm = reFnMulti.exec(ln); if (fm) decl.add(fm[1]);
    const dm = reDecl.exec(ln); if (dm) decl.add(dm[1]);
    /* scan tokens; a token is "member" if preceded by the sentinel */
    const r = /([A-Za-z_$][\w$]*)/g;
    let mm;
    while ((mm = r.exec(ln))) {
      const isMember = ln[mm.index - 1] === '\u0001';
      refs.set(mm[1], (refs.get(mm[1]) || 0) + 1);
      if (isMember) { /* still counted, but recorded as member too */ }
    }
  }
}

/* which refs are ONLY ever member access? */
const memberOnly = new Set();
for (const f of files) {
  const code = strip(fs.readFileSync(DIR + '/' + f, 'utf8'));
  const re2 = /([A-Za-z_$][\w$]*)/g;
  const lineRefs = new Map();
  for (const raw of code.split('\n')) {
    const l2 = raw;
    const m2 = {};
    const r = /([A-Za-z_$][\w$]*)/g;
    let mm;
    while ((mm = r.exec(l2))) {
      const k = mm[1];
      const wasMember = l2[mm.index - 1] === '\u0001';
      if (!m2[k]) m2[k] = { bare: false, member: false };
      if (wasMember) m2[k].member = true; else m2[k].bare = true;
    }
    for (const k in m2) {
      if (!lineRefs.has(k)) lineRefs.set(k, { bare: false, member: false });
      const t = lineRefs.get(k);
      t.bare = t.bare || m2[k].bare;
      t.member = t.member || m2[k].member;
    }
  }
  for (const [k, v] of lineRefs) {
    if (v.member && !v.bare) memberOnly.add(k);
  }
}

/* Names that appear only as object-literal properties or shorthand.
 * `n.name` is member access; `{name:'x'}` and `{name}` are literal keys.
 * Neither is a bare reference. */
const literalKey = new Set();
for (const f of files) {
  const code = strip(fs.readFileSync(DIR + '/' + f, 'utf8'));
  const r = /([A-Za-z_$][\w$]*)\s*:/g;   let m1;
  while ((m1 = r.exec(code))) literalKey.add(m1[1]);
  const r2 = /[{,]\s*([A-Za-z_$][\w$]*)\s*[,\n}]/g;   let m2;
  while ((m2 = r2.exec(code))) literalKey.add(m2[1]);
}

const missing = [...refs.keys()]
  .filter(k => !decl.has(k) && !BUILTINS.has(k) && !memberOnly.has(k) && !literalKey.has(k))
  .sort((a, b) => refs.get(b) - refs.get(a));

console.log('declared: ' + decl.size);
console.log('referenced (bare, not builtin, not member-only): ' + missing.length);
console.log('\nMISSING:');
for (const k of missing) console.log('  ' + k + '  x' + refs.get(k));
fs.writeFileSync(DIR + '/_missing.txt', missing.join('\n'));

console.log('\nDUPLICATES across chunk files:');
const perFile = new Map();
for (const f of files) {
  const s = fs.readFileSync(DIR + '/' + f, 'utf8');
  const re3 = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m3;
  while ((m3 = re3.exec(s))) {
    if (!perFile.has(m3[1])) perFile.set(m3[1], []);
    perFile.get(m3[1]).push(f);
  }
}
for (const [k, v] of [...perFile].sort()) {
  if (v.length > 1) console.log('  ' + k + '  ->  ' + v.join(', '));
}
