import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pwPath = "D:/app/sensestudios work management app/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.js";
const { chromium } = require(pwPath);

const base = "http://localhost:59553/v15-preview";
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-1024", width: 1024, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 740 },
];
const outDir = "C:/Users/HI/Desktop/v15-captures";

const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/v15-composer-${vp.name}.png`, fullPage: true });
  if (errors.length) console.log("errors:", vp.name, errors.slice(0, 2));
  console.log("captured", vp.name);
  await ctx.close();
}
await browser.close();
console.log("done");
