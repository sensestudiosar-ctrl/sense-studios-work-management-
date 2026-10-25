// Playwright library-mode comparison: /dashboard vs /my-work on the overlay server.
// Usage:
//   node mywork-compare.mjs                       # one-time: sign in manually, saves state
//   node mywork-compare.mjs compare                # automated feature scan + 90% score
import { chromium } from "@playwright/test";

const mode = process.argv[2] === "compare" ? "compare" : "signin";
const baseUrl = "http://localhost:59743";
const stateFile = new URL("./mywork-state.json", import.meta.url).pathname;

const features = [
  ["scope-tabs", 'div[role="group"][aria-label="My Work viewing scope"]'],
  ["scope-org-btn", '.my-work-scope-select button:has-text("Organization")'],
  ["scope-personal-btn", '.my-work-scope-select button:has-text("My own work")'],
  ["phase-summary", ".my-work-phase-summary__grid"],
  ["phase-active", '.my-work-phase.my-work-phase-active'],
  ["queue", ".task-list"],
  ["my-work-heading", 'h2:has-text("My work")'],
];

if (mode === "signin") {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl + "/my-work");
  console.log(`Opened ${baseUrl}/my-work in a visible browser — sign in as the Owner, then press Enter here to continue.`);
  await new Promise(resolve => process.stdin.once("data", resolve));
  if (page.url().includes("my-work") || page.url().includes("dashboard") || page.url().includes("workspace")) {
    await context.storageState({ path: stateFile });
    console.log(`Session state saved to ${stateFile}.\nRe-run with: node ${process.argv[1]} compare`);
  } else {
    console.log(`Landed on ${page.url()} — did not look signed in; state NOT saved.`);
  }
  await browser.close();
} else {
  import("node:fs").then(fs => { if (!fs.existsSync(stateFile)) { console.error("No saved session state — run the sign-in step first: node mywork-compare.mjs"); process.exit(1); } });
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: stateFile, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = { myWork: {}, dashboard: {} };

  async function scan(route, tag) {
    await page.goto(baseUrl + route);
    await page.waitForLoadState("networkidle");
    for (const [key, selector] of features) results[tag][key] = await page.locator(selector).first().isVisible().catch(() => false);
    await page.screenshot({ path: new URL(`./shot-${tag}.png`, import.meta.url).pathname, fullPage: true });
    console.log(`[${route}]`, JSON.stringify(results[tag]));
  }
  await scan("/dashboard", "dashboard");
  await scan("/my-work", "myWork");

  // My Work scope switcher walkthrough (owner only): personal → organization.
  const my = results.myWork;
  let scopeFlipOk = false, orgCountsLoaded = null;
  if (my["scope-tabs"]) {
    await page.goto(baseUrl + "/my-work");
    await page.locator('.my-work-scope-select button:has-text("Organization")').click();
    await page.waitForLoadState("networkidle");
    const grid = page.locator(".my-work-phase-summary__grid strong").allTextContents();
    orgCountsLoaded = grid;
    scopeFlipOk = grid.some(t => /Loading|Unavailab|\d/i.test(t));
    console.log("[my-work | Organization scope]", JSON.stringify(orgCountsLoaded));
    await page.screenshot({ path: new URL("./shot-mywork-org.png", import.meta.url).pathname, fullPage: true });
  }

  const keys = Object.keys(features).map(([k]) => k);
  const myHits = keys.filter(k => results.myWork[k]);
  const matchPct = (myHits.length / keys.length) * 100;
  console.log("---");
  console.log(`my-work features present: ${myHits.length}/${keys.length} = ${matchPct.toFixed(0)}% (${matchPct >= 90 ? "PASS >= 90%" : "BELOW 90%"})`);
  console.log("scope flip personal→organization:", scopeFlipOk ? "works" : (my["scope-tabs"] ? "counts did not render" : "switcher not present"));
  await browser.close();
}
