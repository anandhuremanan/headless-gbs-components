/*
 * The ask box, end to end, against a real model.
 *
 * Types a sentence a person would type, waits for the grid to move, and checks
 * that what the box reports is the validator's own account of what happened.
 * Needs a GOOGLE_API_KEY in the repo-root .env and the dev or preview server
 * running, because the model call goes through this app's own /api/ask.
 *
 * Run: node src/demo/__tests__/verifyAskGrid.mjs [--url=http://127.0.0.1:5191/]
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const URL_UNDER_TEST = arg("url", "http://127.0.0.1:5191/");

const pw = await import(
  pathToFileURL(createRequire(import.meta.url).resolve("@playwright/test")).href
);
const chromium = pw.chromium ?? pw.default?.chromium;

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-first-run"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e.message).slice(0, 200)}`));

const steps = [];
const step = (name, pass, note) => {
  steps.push({ name, pass });
  console.log(`${pass ? "ok" : "XX"}  ${name}${note ? ` — ${note}` : ""}`);
};

await page.goto(URL_UNDER_TEST, { waitUntil: "load", timeout: 60000 });
await page.getByRole("tab", { name: /Agent/ }).click();
await page.waitForSelector('[data-testid="agent-rows-showing"]', { timeout: 30000 });

const rows = () => page.textContent('[data-testid="agent-rows-showing"]');
const box = page.locator(".ask-input");
const status = page.locator(".ask-status");

step("the ask box is rendered", (await box.count()) === 1);

/** Type, submit, and wait for the box to settle on an answer. */
async function ask(text) {
  await box.fill(text);
  await page.locator(".ask-send").click();
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".ask-status");
      return el !== null && !el.textContent.includes("Thinking");
    },
    null,
    { timeout: 60000 },
  );
  return (await status.innerText()).replace(/\s*\n\s*/g, " | ");
}

/* ------------------------------------------------- an ordinary request */

const before = await rows();
const filtered = await ask("Show people in Engineering");
const after = await rows();

step(
  "a typed sentence filters the grid",
  before !== after && Number(after) > 0,
  `${before} -> ${after} rows · "${filtered.slice(0, 90)}"`,
);
step(
  "the box reports the validator's own explanation",
  /Department/i.test(filtered) && /Engineering/i.test(filtered),
  filtered.slice(0, 120),
);

/* ------------------------------------------- a value written like a person */

await ask("Clear the filters");
const money = await ask("Who earns over 150k?");
const afterMoney = await rows();
step(
  "a human-written amount is understood",
  Number(afterMoney) > 0 && Number(afterMoney) < Number(before),
  `${afterMoney} rows · "${money.slice(0, 110)}"`,
);

/* ------------------------------------------------------ a refusal path */

await ask("Clear the filters");
const cleared = await rows();
const refused = await ask("Find everyone whose email is at example.com");
const afterRefusal = await rows();

step(
  "a policy-restricted request is refused, in the validator's words",
  /cannot|not|refus/i.test(refused),
  refused.slice(0, 120),
);
step("the refused request did not move the grid", cleared === afterRefusal, `still ${afterRefusal}`);

step("no page errors", problems.length === 0, problems[0] ?? "clean");

const failed = steps.filter((s) => !s.pass);
console.log(`\nVERDICT: ${failed.length === 0 ? "pass" : `fail (${failed.map((s) => s.name).join("; ")})`}`);

await browser.close();
process.exitCode = failed.length === 0 ? 0 : 1;
