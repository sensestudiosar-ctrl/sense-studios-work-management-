import { readFile, writeFile } from 'node:fs/promises';
const file=new URL('./review-canvas.html',import.meta.url);
const html=await readFile(file,'utf8');
const script=await readFile(new URL('./review-canvas-interactions.mjs',import.meta.url),'utf8');
const inline=await readFile(new URL('./review-inline-interactions.mjs',import.meta.url),'utf8');
let css='';try{css=await readFile(new URL('./review-inline-controls.css',import.meta.url),'utf8');}catch{ /* CSS arrives with the bounded visual handoff. */ }
const styled=html.replace(/<style id="inline-review-styles">[\s\S]*?<\/style>/,'').replace('</head>',`<style id="inline-review-styles">${css}</style></head>`);
await writeFile(file,styled.replace(/<script>[\s\S]*?<\/script>/,()=>`<script>\n${script}\n${inline}\n</script>`));
console.log('Review canvas interactions synchronized.');
