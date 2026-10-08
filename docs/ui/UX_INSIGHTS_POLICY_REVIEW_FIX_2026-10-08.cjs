const fs=require('node:fs'),path=require('node:path'),f=path.join(__dirname,'UX_INSIGHTS_POLICY_2026-10-08.js');let s=fs.readFileSync(f,'utf8');
s=s.replace("p.state==='DRAFT'?", "p.state==='DRAFT'&&ihPolicies.filter(x=>x.id===p.id).at(-1)===p?");
s=s.replace("if(!components.length||components.some", "if(metrics.filter(m=>d['include_'+m]==='on').some(m=>['weight_','min_','max_'].some(prefix=>!String(d[prefix+m]??'').trim())))error='Complete every selected numeric component field.';\n  if(!components.length||components.some");
s=s.replace("d.effectiveFrom<'2026-10-08')error='Complete label", "!d.effectiveFrom||d.effectiveFrom<'2026-10-08'||['DESIGN','TURNKEY'].includes(family)&&d.groupKey!==family)error='Complete label");
s=s.replace("...Object.fromEntries(limits.map(k=>[k,Number(d[k])]))", "...Object.fromEntries(limits.slice(0,4).map(k=>[k,Number(d[k])])),thresholds:Object.fromEntries(limits.slice(4).map(k=>[k,Number(d[k])]))");
s=s.replace("if(!p||p!==latest||p.state!=='DRAFT'||p.effectiveFrom<'2026-10-08')", "if(!p||p!==latest||p.state!=='DRAFT'||p.effectiveFrom<'2026-10-08'||ihPolicies.some(x=>x.state==='APPROVED'&&x.family===p.family&&x.groupKey===p.groupKey&&x.effectiveFrom>=p.effectiveFrom))");
// Failed validation and navigation preserve an Owner's unsaved policy inputs.
s=s.replace("const ihPolicies=[],ihGroups=[];", "const ihPolicies=[],ihGroups=[],ihPolicyDrafts={};");
s=s.replace("return `<section class=\"box\"><h2>${family} policy versions", "const markup=`<section class=\"box\"><h2>${family} policy versions");
s=s.replace("ihPerformanceActions()}`;\n}", "ihPerformanceActions()}`;return ihPolicyWithDraft(markup,family);\n}");
s=s.replace("if(!error){const id='POL-UX-'", "if(!error){delete ihPolicyDrafts[family];const id='POL-UX-'");
s+=`\nfunction ihPolicyWithDraft(markup,family){const draft=ihPolicyDrafts[family];if(!draft)return markup;const t=document.createElement('template');t.innerHTML=markup;t.content.querySelectorAll('[data-ih-policy-form=create] [name]').forEach(el=>{const value=draft[el.name];if(el.type==='checkbox'){if(value==='on')el.setAttribute('checked','')}else if(el.tagName==='SELECT'){[...el.options].forEach(o=>{if(o.value===value)o.setAttribute('selected','')})}else if(el.tagName==='TEXTAREA')el.textContent=value||'';else if(value!==undefined)el.setAttribute('value',value)});return t.innerHTML}
document.addEventListener('input',e=>{const f=e.target.closest('[data-ih-policy-form=create]');if(f&&ihOwner()){const d=Object.fromEntries(new FormData(f));ihPolicyDrafts[d.family]=d}});
document.addEventListener('change',e=>{const f=e.target.closest('[data-ih-policy-form=create]');if(f&&ihOwner()){const d=Object.fromEntries(new FormData(f));ihPolicyDrafts[d.family]=d}});
`;
fs.writeFileSync(f,s);
