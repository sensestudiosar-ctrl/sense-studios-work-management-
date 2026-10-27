import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
const directory = resolve(process.cwd(), 'apps/web/dist');
const mime = { '.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2' };
const server = createServer(async (req,res)=>{ const pathname=new URL(req.url,'http://localhost').pathname; let p=resolve(directory,'.'+pathname); if(!(await stat(p).catch(()=>undefined))?.isFile()) p=resolve(directory,'index.html'); res.writeHead(200,{'Content-Type':mime[extname(p)]??'application/octet-stream'}); res.end(await readFile(p)); });
await new Promise(d=>server.listen(0,'127.0.0.1',d));
const base='http://127.0.0.1:'+(server.address().port);
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
await page.goto(base+'/install');
await page.getByRole('heading',{name:'Your work, on your phone'}).waitFor();
for(const width of [320,390,1024,1440]){
  await page.setViewportSize({width,height:1000});
  const r=await page.getByRole('link',{name:'Open Sense Studios'}).evaluate(el=>{const cs=getComputedStyle(el);return{height:el.getBoundingClientRect().height,display:cs.display,minHeight:cs.minHeight,fontFamily:cs.fontFamily,fontSize:cs.fontSize,lineHeight:cs.lineHeight,padding:cs.padding};});
  console.log(String(width),JSON.stringify(r));
}
await browser.close();server.close();
