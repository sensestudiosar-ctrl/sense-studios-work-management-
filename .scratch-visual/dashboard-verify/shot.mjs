/* Navigate the full-app harness and capture the key pages at 1440 and 390. */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "shots");
mkdirSync(OUT, { recursive: true });
const repo = path.resolve(here, "..", "..");

const pwEntry = readdirSync(path.join(repo, "node_modules", ".pnpm")).find(d => d.startsWith("playwright@"));
const pwDir = path.join(repo, "node_modules", ".pnpm", pwEntry, "node_modules", "playwright");
const { chromium } = createRequire(path.join(pwDir, "index.js"))("playwright");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 150)); });
page.on("requestfailed", r => { if (!String(r.url()).includes("localhost")) errors.push("reqfail: " + r.url()); });

async function go(route, { width = 1440, height = 900, wait = 3500, full = false } = {}) {
  await page.setViewportSize({ width, height });
  await page.goto(`http://localhost:5188${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(wait);
  return page;
}

async function shot(route, name, opts = {}) {
  await go(route, opts);
  const bodyText = (await page.evaluate(() => document.body.innerText.slice(0, 300)));
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: !!opts.full });
  console.log("shot:", name, route, bodyText.length ? "(text: " + bodyText.replace(/\n/g, " | ").slice(0, 60) + "…)" : "(EMPTY BODY)");
}

try {
  /* Full app pages, 1440 desktop */
  await shot("/my-work", "mywork-1440");
  await shot("/projects", "projects-1440");
  await shot("/tasks", "tasks-1440");
  await shot("/settings", "settings-1440");
  await shot("/people", "people-1440");
  await shot("/workforce", "workforce-1440");
  await shot("/decisions", "decisions-1440");
  await shot("/dashboard", "dashboard-1440");
  /* Projects: open one project to show the detail shell */
  await go("/projects", { width: 1440 });
  await sleep(1000);
  const firstProject = page.locator("a[href^='#/projects/'], a[href^='/projects/']").first();
  if (await firstProject.count()) {
    await firstProject.click().catch(() => {});
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT, "project-detail-1440.png"), fullPage: true });
    console.log("shot: project-detail-1440");
  }
  /* Mobile 390 for the critical pages */
  await shot("/my-work", "mywork-390", { width: 390, height: 844, full: true });
  await shot("/projects", "projects-390", { width: 390, height: 844, full: true });
  await shot("/settings", "settings-390", { width: 390, height: 844, full: true });
  await shot("/people", "people-390", { width: 390, height: 844, full: true });
  /* Sign-in page to show the auth surface */
  await shot("/sign-in", "signin-1440");
} catch (cause) {
  console.log("SCRIPT ERROR:", cause.message.slice(0, 300));
} finally {
  await browser.close();
}
console.log("\n=== page errors ===");
console.log(errors.length ? [...new Set(errors)].slice(0, 20).join("\n") : "none");
