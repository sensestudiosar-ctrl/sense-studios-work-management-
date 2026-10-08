const fs=require('node:fs'),path=require('node:path');const f=path.join(__dirname,'UX_INSIGHTS_PERFORMANCE_HEALTH_2026-10-08.js');let s=fs.readFileSync(f,'utf8');
s=s.replace("function ihSource(id,label){return", "function ihSource(id,label){if(id==='review'&&!canonicalReviews('accessible').some(r=>r.project===insightsState.project))return 'No project review fixture';return");
s=s.replace("b.textContent.includes('exact review')", "b.textContent.toLowerCase().includes('review')");
s=s.replace("['Ananya Rao','Kabir Shah','Meera Iyer','Rohan Das'].map(x=>", "[...new Set(Object.values(tasks).filter(t=>t.project===projectId&&!t.nonproject&&taskAccessible(t)).map(t=>t.owner))].map(x=>");
s=s.replace('<h2>Scope</h2><div class="grid">', '<h2>Scope</h2><div class="insights-scope">').replace('<h2>Project and period</h2><div class="grid">','<h2>Project and period</h2><div class="insights-scope">');
fs.writeFileSync(f,s);
const a=path.join(__dirname,'UX_INSIGHTS_ASSEMBLE_2026-10-08.cjs');s=fs.readFileSync(a,'utf8');s=s.replace('@media(max-width:760px){.ir-saved-layout', '@media(max-width:760px){.insights-scope{display:block}.ir-saved-layout');
// CSS is reinjected from the stable marker rather than stale copies on subsequent assembly.
s=s.replace("if(!h.includes('/* Insights structure 2026-10-08 */'))", "if(h.includes('/* Insights structure 2026-10-08 */')){const start=h.indexOf('/* Insights structure 2026-10-08 */');h=h.slice(0,start)+h.slice(h.indexOf('</style>',start))}\nif(!h.includes('/* Insights structure 2026-10-08 */'))");fs.writeFileSync(a,s);
