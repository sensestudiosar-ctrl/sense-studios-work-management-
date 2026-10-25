import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const pwEntry = readdirSync(path.join(repo, "node_modules", ".pnpm")).find(d => d.startsWith("playwright@"));
const pwDir = path.join(repo, "node_modules", ".pnpm", pwEntry, "node_modules", "playwright");
const { chromium } = createRequire(path.join(pwDir, "index.js"))("playwright");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const logs = [];
page.on("console", m => logs.push(m.type() + ": " + m.text().slice(0, 200)));
page.on("pageerror", e => logs.push("PAGEERROR: " + e.message));
page.on("requestfailed", r => logs.push("REQFAIL: " + r.url() + " " + (r.failure()?.errorText ?? "")));
page.on("response", r => { if (r.status() >= 400) logs.push("HTTP " + r.status() + " " + r.url()); });

/* Check every key route of the full app and report errors + body text. */
const routes = ["/my-work", "/dashboard", "/projects", "/tasks", "/settings", "/people", "/workforce", "/decisions"];
for (const route of routes) {
  logs.length = 0;
  await page.goto("http://localhost:5188" + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(4000);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
  const errors = logs.filter(l => l.startsWith("PAGEERROR") || l.startsWith("HTTP"));
  console.log(`${route}: ${errors.length ? "ERR: " + errors.slice(0, 4).join(" | ") : "clean"}  —  ${text.replace(/\n/g, " | ").slice(0, 110)}`);
}

await browser.close();
