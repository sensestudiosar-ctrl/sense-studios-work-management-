const fs=require('node:fs'),path=require('node:path');const f=n=>path.join(__dirname,n);
let s=fs.readFileSync(f('UX_INSIGHTS_PERFORMANCE_HEALTH_2026-10-08.js'),'utf8');
s=s.replace(/if\(insightsState.performanceTab==='setup'&&!ihOwner\(\)\)[\s\S]*?(?=else if\(insightsState.performanceTab==='history'\))/,"if(insightsState.performanceTab==='setup')body=ihPolicyRender(false);\n ");
s=s.replace(/if\(insightsState.healthTab==='setup'&&!ihOwner\(\)\)[\s\S]*?(?=else if\(insightsState.healthTab==='history'\))/,"if(insightsState.healthTab==='setup')body=ihPolicyRender(true);\n ");
fs.writeFileSync(f('UX_INSIGHTS_PERFORMANCE_HEALTH_2026-10-08.js'),s);
s=fs.readFileSync(f('UX_INSIGHTS_REPORTS_SAVED_2026-10-08.js'),'utf8');
s=s.replace("if(action==='preview'){", "if(action==='clear-filters'){state.form.filters=[];state.notice='Secondary filters cleared; source, columns, group and saved version retained.';render();return true}if(action==='preview'){");
s=s.replace("${filters}${f.filters.length<2?", "<p>${f.filters.filter(x=>x.value).length} active scalar filters</p><button data-ir=\"clear-filters\">Clear filters</button>${filters}${f.filters.length<2?");
s=s.replace('Only one or two scalar equals/contains filters are supported.', 'This bounded walkthrough supports up to two scalar equals/contains filters.');
// Charts express row-count grouping with neutral geometric evidence, not a visual direction.
s=s.replace("Object.entries(rows.reduce((a,r)=>(a[irSourceValue(r,f.group)]=(a[irSourceValue(r,f.group)]||0)+1,a),{})).map(([k,n])=>`<p>${irEsc(k)} · ${n} report rows</p>`).join('')", "irCountChart(rows,f.group,f.chart)");
s+=`\nfunction irCountChart(rows,field,kind){const counts=Object.entries(rows.reduce((a,r)=>(a[irSourceValue(r,field)]=(a[irSourceValue(r,field)]||0)+1,a),{}));const total=rows.length;if(!total)return '';let graphic='';
 if(kind==='bar'){const max=Math.max(...counts.map(([,n])=>n));graphic='<svg role="img" aria-label="Bar chart of report row counts" viewBox="0 0 400 '+(counts.length*30)+'" style="max-width:400px;width:100%">'+counts.map(([label,n],i)=>'<text x="0" y="'+(i*30+18)+'">'+irEsc(label)+'</text><rect x="130" y="'+(i*30+4)+'" width="'+(n/max*220)+'" height="20" fill="#aaa" stroke="#000"/><text x="360" y="'+(i*30+18)+'">'+n+'</text>').join('')+'</svg>'}
 if(kind==='pie'){let angle=0;const slices=counts.map(([label,n],i)=>{const start=angle;angle+=n/total*2*Math.PI;const point=a=>[90+70*Math.cos(a),90+70*Math.sin(a)];const [x1,y1]=point(start),[x2,y2]=point(angle);return n===total?'<circle cx="90" cy="90" r="70" fill="#aaa" stroke="#000"/>':'<path d="M90 90 L'+x1+' '+y1+' A70 70 0 '+(n/total>0.5?1:0)+' 1 '+x2+' '+y2+' Z" fill="'+(i%2?'#ddd':'#aaa')+'" stroke="#000"/>'});graphic='<svg role="img" aria-label="Pie chart of report row counts" viewBox="0 0 180 180" width="180">'+slices.join('')+'</svg>'}
 return '<figure><figcaption>'+kind.toUpperCase()+' · grouped '+irEsc(field)+' · '+total+' report rows</figcaption>'+graphic+counts.map(([label,n])=>'<p>'+irEsc(label)+' · '+n+' report rows</p>').join('')+'</figure>'}
`;
fs.writeFileSync(f('UX_INSIGHTS_REPORTS_SAVED_2026-10-08.js'),s);
