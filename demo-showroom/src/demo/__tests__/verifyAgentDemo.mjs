/*
 * Drives the Agent · WebMCP showroom panel in a real Chrome, against whatever
 * is being served at --url (the dev server, or `vite preview` on the built
 * bundle).
 *
 * Run twice on purpose:
 *
 *   --webmcp=on   Chrome has the surface, so the panel dispatches through
 *                 `document.modelContext` — the path a real agent takes.
 *   --webmcp=off  a stock browser, where the panel falls back to its in-page
 *                 registry. This is the one most people presenting the demo
 *                 will actually have, so it has to look right too.
 *
 * Run: node src/demo/__tests__/verifyAgentDemo.mjs [--url=...] [--webmcp=on|off]
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const URL_UNDER_TEST = arg("url", "http://127.0.0.1:5191/");
const WEBMCP = arg("webmcp", "on") === "on";

const pw = await import(
  pathToFileURL(createRequire(import.meta.url).resolve("@playwright/test")).href
);
const chromium = pw.chromium ?? pw.default?.chromium;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--no-first-run", ...(WEBMCP ? ["--enable-features=WebMCPTesting"] : [])],
});

const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e.message).slice(0, 200)}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|404/i.test(m.text())) {
    problems.push(`console: ${m.text().slice(0, 200)}`);
  }
});

const steps = [];
const step = (name, pass, note) => {
  steps.push({ name, pass, note });
  console.log(`${pass ? "ok" : "XX"}  ${name}${note ? ` — ${note}` : ""}`);
};

await page.goto(URL_UNDER_TEST, { waitUntil: "load", timeout: 60000 });

/*
 * The Agent panel is the first tab and the default, but click it anyway: the
 * driver should not fail because somebody changed which tab lands first.
 */
await page.getByRole("tab", { name: /Agent/ }).click();
await page.waitForSelector('[data-testid="agent-rows-showing"]', { timeout: 30000 });

const rows = () => page.textContent('[data-testid="agent-rows-showing"]');
const press = async (label) => {
  await page.getByRole("button", { name: label, exact: true }).click();
  // The tool call is async; wait for the panel to record it.
  await page.waitForTimeout(400);
};
const lastEntry = () =>
  page.evaluate(() => {
    const card = document.querySelector("pre.font-mono")?.closest("div.rounded-md");
    return card?.innerText?.replace(/\s*\n\s*/g, " | ") ?? null;
  });

/* ------------------------------------------------- registration is honest */

const banner = await page.evaluate(() => document.body.innerText.slice(0, 1200));
const claimsRegistered = /registered with the browser/.test(banner);
step(
  `registration banner matches the browser (webmcp=${WEBMCP ? "on" : "off"})`,
  claimsRegistered === WEBMCP,
  claimsRegistered ? "registered with the browser" : "reports no WebMCP, with the reason",
);

if (!WEBMCP) {
  step(
    "explains how to get a real dispatch",
    /enable-features=WebMCPTesting/.test(banner),
    "names the Chrome flag",
  );
}

step("tool name and contract are on screen", /operate_grid/.test(banner) && /intent branches/.test(banner));

/* ------------------------------------------------------- an ordinary call */

const before = await rows();
await press("Filter a list field");
const afterFilter = await rows();
step(
  "an ordinary request filters the grid",
  before !== afterFilter && Number(afterFilter) > 0,
  `${before} -> ${afterFilter} rows`,
);
step("the call is logged as done", /done/.test((await lastEntry()) ?? ""), await lastEntry());

await press("Filter free text");
step(
  "a free-text field filters too",
  /done/.test((await lastEntry()) ?? ""),
  await lastEntry(),
);

await press("Clear it");
await press("Human-written number");
step(
  "a human-written number is coerced, not rejected",
  /done/.test((await lastEntry()) ?? ""),
  await lastEntry(),
);

/* ------------------------------------------------------------- refusals */

await press("Clear it");
const cleared = await rows();

await press("Field the host restricted");
const afterRestricted = await rows();
const restrictedEntry = (await lastEntry()) ?? "";
step(
  "a policy-restricted field is refused",
  /rejected/.test(restrictedEntry) && /policy/.test(restrictedEntry),
  restrictedEntry.slice(0, 160),
);
step("the refused call did not move the grid", cleared === afterRestricted, `still ${afterRestricted}`);

await press("Unknown field");
step(
  "an unknown field is refused with a suggestion",
  /rejected/.test((await lastEntry()) ?? ""),
  ((await lastEntry()) ?? "").slice(0, 160),
);

await press("Irreversible without asking");
const exportEntry = (await lastEntry()) ?? "";
step(
  "an irreversible operation stops and asks",
  /needs-confirmation/.test(exportEntry),
  exportEntry.slice(0, 160),
);

step("no page errors", problems.length === 0, problems[0] ?? "clean");

const failed = steps.filter((s) => !s.pass);
console.log(`\nVERDICT: ${failed.length === 0 ? "pass" : `fail (${failed.map((s) => s.name).join("; ")})`}`);

await browser.close();
process.exitCode = failed.length === 0 ? 0 : 1;
