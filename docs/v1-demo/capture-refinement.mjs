import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const phase=process.argv[2]||'before';
const repo=process.cwd(), dest=path.join(repo,'docs/design/application-ux-audit-2026-10-25/prototype-delivery/refinement-1');
fs.mkdirSync(path.join(dest,phase),{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(phase==='before'){
 for(const name of ['task-creation-completed-demo.html','connected-internal-prototype.js','task-create-refinement.js','connected-prototype.spec.mjs'])fs.copyFileSync(path.join(repo,'docs/v1-demo',name),path.join(dest,'before',name));
 const files=execFileSync('git',['ls-files','apps','packages','scripts','infra','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','eslint.config.mjs'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 fs.writeFileSync(path.join(dest,'SOURCE_BEFORE.json'),JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:Object.fromEntries(files.map(p=>[p,sha(p)]))},null,2));
}
const b=await chromium.launch();
try{for(const width of [1440,1024,768,390,320]){
 const c=await b.newContext({viewport:{width,height:width<768?844:900}}),p=await c.newPage();await p.route(/^https?:/,r=>r.abort());
 await p.goto(pathToFileURL(path.join(repo,'docs/v1-demo/task-creation-completed-demo.html')).href);
 await p.screenshot({path:path.join(dest,phase,`${width}-dashboard.png`)});
 await p.getByRole('button',{name:'Open My Work',exact:true}).click();await p.screenshot({path:path.join(dest,phase,`${width}-my-work.png`)});
 await p.locator('#cx-new').click();await p.screenshot({path:path.join(dest,phase,`${width}-creation.png`)});
 await p.locator('#task-create-refinement').locator('#new-close').click();
 await p.evaluate(()=>document.querySelector('[data-cx-route="/dashboard"]').click());await p.getByRole('button',{name:'Read review comments',exact:true}).click();
 await p.screenshot({path:path.join(dest,phase,`${width}-review.png`)});
 await p.locator('#cx-detail [data-cx-project]').click();await p.screenshot({path:path.join(dest,phase,`${width}-project-tasks.png`)});await c.close();
}}finally{await b.close();}
if(phase==='after'){
 const before=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_BEFORE.json'),'utf8'));
 const diffs=Object.entries(before.files).filter(([p,h])=>!fs.existsSync(p)||sha(p)!==h).map(([p,expected])=>({path:p,expected,actual:fs.existsSync(p)?sha(p):null}));
 fs.writeFileSync(path.join(dest,'PRESERVATION.json'),JSON.stringify({at:new Date().toISOString(),checked:Object.keys(before.files).length,differences:diffs,prototypeSha256:sha('docs/v1-demo/task-creation-completed-demo.html')},null,2));
}
console.log(`${phase} captures saved`);
