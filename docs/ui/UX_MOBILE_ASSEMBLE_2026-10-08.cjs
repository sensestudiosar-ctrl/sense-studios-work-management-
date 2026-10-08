// Assemble standalone UX artifacts only. Run after the Insights assembler.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const target = path.join(__dirname, 'UX_VALIDATION_LOW_FIDELITY_2026-10-07.html');
let html = fs.readFileSync(target, 'utf8');
const jsStart = '// BEGIN MOBILE UX 2026-10-08';
const jsEnd = '// END MOBILE UX 2026-10-08';
const cssStart = '/* BEGIN MOBILE UX 2026-10-08 */';
const cssEnd = '/* END MOBILE UX 2026-10-08 */';
function removeBlock(text, start, end) {
  const at = text.indexOf(start);
  if (at < 0) return text;
  const until = text.indexOf(end, at);
  if (until < 0) throw new Error('Incomplete mobile artifact marker');
  return text.slice(0, at) + text.slice(until + end.length);
}
html = removeBlock(removeBlock(html, jsStart, jsEnd), cssStart, cssEnd);
const css = fs.readFileSync(path.join(__dirname, 'UX_MOBILE_2026-10-08.css'), 'utf8');
html = html.replace('</style>', () => cssStart + '\n' + css + '\n' + cssEnd + '\n</style>');
const scripts = ['UX_MOBILE_SHELL_2026-10-08.js', 'UX_MOBILE_WORKLISTS_2026-10-08.js', 'UX_MOBILE_WORKFLOWS_2026-10-08.js'].map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
const hook = `
const uxMobileViewport = window.matchMedia('(max-width:760px)');
const uxMobileDisclosureState = new Map();
function uxMobileDisclosureKey(el) {
  return [role, actor, current, project, taskId, reviewProject, el.dataset.uxMobileKey].join('|');
}
function uxMobileEnhance() {
  if (!uxMobileViewport.matches) return;
  const root = document.getElementById('content');
  uxMobileShellEnhance(root);
  uxMobileWorklistsEnhance(root);
  uxMobileWorkflowsEnhance(root);
  root.querySelectorAll('[data-ux-mobile-key]').forEach(el => {
    const key = uxMobileDisclosureKey(el);
    if (uxMobileDisclosureState.has(key)) el.open = uxMobileDisclosureState.get(key);
    el.addEventListener('toggle', () => uxMobileDisclosureState.set(key, el.open));
  });
}
const uxMobileCanonicalRender = render;
render = function () { uxMobileCanonicalRender(); uxMobileEnhance(); };
if (uxMobileViewport.matches) {
  mobileVariant = new URLSearchParams(location.search).get('mobile') === 'A' ? 'A' : 'B';
  document.getElementById('mobileVariant').value = mobileVariant;
}
uxMobileViewport.addEventListener('change', () => render());
`;
const anchor = "$('#role').addEventListener('change'";
if (!html.includes(anchor)) throw new Error('Canonical initialization anchor not found');
html = html.replace(anchor, () => jsStart + '\n' + scripts + '\n' + hook + '\n' + jsEnd + '\n' + anchor);
const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
let inlineIndex = 0;
for (const [, attributes, source] of inlineScripts) {
  if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
  inlineIndex += 1;
  try {
    new vm.Script(source, { filename: `${path.basename(target)}#inline-${inlineIndex}` });
  } catch (error) {
    throw new Error(`Inline JavaScript compile failed (${path.basename(target)}#inline-${inlineIndex}): ${error.message}`, { cause: error });
  }
}
fs.writeFileSync(target, html);
