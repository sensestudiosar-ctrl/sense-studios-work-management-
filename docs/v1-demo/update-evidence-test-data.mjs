// One-time migration of review-only test fixtures: filenames are no longer attachments.
import fs from 'node:fs';
for(const file of ['connected-prototype.spec.mjs','connected-refinement.spec.mjs']){
 const p='docs/v1-demo/'+file;let s=fs.readFileSync(p,'utf8');
 for(const [oldValue,newValue] of Object.entries({'Wardrobe_R2.pdf':'https://drive.google.com/file/d/wardrobe-r2/view','Sample lighting R1.pdf':'https://drive.google.com/file/d/lighting-r1/view','Wardrobe_Updated_R2.pdf':'https://drive.google.com/file/d/wardrobe-updated-r2/view','Updated_work_R2.pdf':'https://drive.google.com/file/d/updated-work-r2/view'}))s=s.replaceAll("'"+oldValue+"'","'"+newValue+"'");
 s=s.replace("toContainText('Add a file or link')","toHaveText('Add at least one file or link before submitting for review.')");fs.writeFileSync(p,s);
}
const evidenceSpec='docs/v1-demo/mandatory-evidence.spec.mjs';let source=fs.readFileSync(evidenceSpec,'utf8');
for(const label of ['Start task','Complete correction','Return to original task','Request linked correction','Assign linked correction','Open linked correction','Approve internal round','Check client review evidence'])source=source.replaceAll("p.getByRole('button',{name:'"+label+"'","p.locator('#cx-detail').getByRole('button',{name:'"+label+"'");
fs.writeFileSync(evidenceSpec,source);
