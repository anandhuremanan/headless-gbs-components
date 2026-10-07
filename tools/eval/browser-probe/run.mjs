/*
 * Drives the browser probe twice against one Chrome profile.
 *
 *   visit 1  loads the model (from cache if a previous run left it there)
 *   visit 2  a fresh page load, same profile — this is the cache test
 *
 * Two visits in one driver run because the question "is 249 seconds a
 * one-time cost or every-visit cost" cannot be answered by a single load, and
 * re-downloading 460 MB to find out would be its own waste.
 *
 * Needs Chrome already listening on 9222:
 *   chrome --remote-debugging-port=9222 --user-data-dir=<profile>
 *
 * Run: node tools/eval/browser-probe/run.mjs [--url=http://127.0.0.1:5190/]
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";

/*
 * Playwright lives in demo-showroom's node_modules, and Node resolves bare
 * specifiers from the importing file rather than the working directory — so a
 * plain `import "@playwright/test"` fails from here. Resolved explicitly
 * instead of moving the probe into the showroom, which should not grow a
 * dependency on half a gigabyte of model weights.
 */
const showroom = fileURLToPath(new URL("../../../demo-showroom/package.json", import.meta.url));
const playwright = await import(
  pathToFileURL(createRequire(showroom).resolve("@playwright/test")).href
);
// It is a CommonJS package: dynamically imported, its named exports arrive on
// `default` rather than as top-level bindings.
const chromium = playwright.chromium ?? playwright.default?.chromium;
if (!chromium) throw new Error("could not load playwright's chromium export");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const URL_BASE = arg("url", "http://127.0.0.1:5190/");
const CDP = arg("cdp", "http://127.0.0.1:9222");
const TIMEOUT = Number(arg("timeout", "900000"));
const OUT_DIR = fileURLToPath(new URL("../../../eval/results/browser-probe/", import.meta.url));

const browser = await chromium.connectOverCDP(CDP);
const ctx = browser.contexts()[0] ?? (await browser.newContext());

const warnings = [];

async function visit(n, device = "webgpu") {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const text = m.text();
    // Transformers.js announces a backend fallback on the console; that is
    // evidence about the backend, so it must not be swallowed.
    if (/fallback|unsupported|wasm|webgpu|error|warn/i.test(text)) {
      warnings.push({ visit: n, type: m.type(), text: text.slice(0, 300) });
    }
  });
  page.on("pageerror", (e) => warnings.push({ visit: n, type: "pageerror", text: String(e.message).slice(0, 300) }));

  process.stdout.write(`\n--- visit ${n} ---\n`);
  await page.goto(`${URL_BASE}?visit=${n}&device=${device}`, { waitUntil: "load", timeout: 120000 });

  try {
    await page.waitForFunction(() => window.PROBE_RESULT !== undefined, null, { timeout: TIMEOUT });
  } catch {
    const log = await page.textContent("#log").catch(() => "(no log)");
    console.log(`visit ${n} TIMED OUT. Log:\n${log}`);
    await page.close();
    return null;
  }

  console.log(await page.textContent("#log"));
  const result = await page.evaluate(() => window.PROBE_RESULT);
  await page.close();
  return result;
}

const devices = (arg("devices", "webgpu,wasm")).split(",");
const collected = [];
for (const [index, device] of devices.entries()) {
  const r = await visit(index + 1, device);
  if (r) collected.push(r);
}

await browser.close();

const report = {
  ranAt: new Date().toISOString(),
  cdp: CDP,
  url: URL_BASE,
  visits: collected,
  consoleWarnings: warnings,
};

mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, `${report.ranAt.replace(/[:.]/g, "-")}-webgpu-probe.json`);
writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

console.log("\n===== SUMMARY =====");
for (const v of report.visits) {
  console.log(
    `visit ${v.visit}: status=${v.status} load=${v.modelLoadMs}ms ` +
      `cache=${v.download?.cacheHit ? "HIT" : "MISS"} ` +
      `downloaded=${((v.download?.downloadedBytes ?? 0) / 1048576).toFixed(1)}MB ` +
      `warmP50=${v.warmP50 ?? "n/a"}ms backend=${v.backend?.confirmed ?? "n/a"} ` +
      `conclusion=${v.conclusion ?? "n/a"}`,
  );
  if (v.sanityFailed?.length) console.log(`         sanity FAILED: ${v.sanityFailed.join(", ")}`);
}
if (warnings.length) {
  console.log(`\nconsole (${warnings.length}):`);
  for (const w of warnings.slice(0, 10)) console.log(`  [v${w.visit} ${w.type}] ${w.text}`);
}
console.log(`\nwritten: ${file}`);
