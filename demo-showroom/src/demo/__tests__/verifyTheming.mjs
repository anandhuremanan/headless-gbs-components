/*
 * Does :root token theming reach the components?
 *
 * The documented way to theme GramproKit is to set --gbs-* on :root. The
 * components never declare those tokens, only read them with inline
 * fallbacks, so nothing of ours can shadow a host's value — but "custom
 * properties should still inherit" is exactly the sort of reasoning that has
 * been wrong twice in this area, so it is measured instead.
 *
 * Measures a real button before and after injecting the host's token block,
 * because "custom properties should still inherit" is exactly the kind of
 * reasoning that has been wrong twice in this file's history.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const req = createRequire(import.meta.url);
const pw = await import(pathToFileURL(req.resolve("@playwright/test")).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const THEME = `:root {
  --gbs-accent: #7c3aed;
  --gbs-accent-soft: #f3e8ff;
  --gbs-radius: 10px;
  --gbs-font-size: 14px;
}`;

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-first-run"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5191/", { waitUntil: "load", timeout: 60000 });

const measure = () =>
  page.evaluate(() => {
    const el = document.createElement("button");
    // The default button already fills with the accent, so the token reaches a
    // property rather than only a custom property.
    el.className = "bt-root";
    el.textContent = "x";
    document.body.appendChild(el);
    const s = getComputedStyle(el);
    const out = {
      radius: s.borderTopLeftRadius,
      fontSize: s.fontSize,
      background: s.backgroundColor,
      accentToken: s.getPropertyValue("--bt-accent").trim(),
    };
    el.remove();
    return out;
  });

const before = await measure();
await page.addStyleTag({ content: THEME });
const after = await measure();

console.log("before theme :", JSON.stringify(before));
console.log("after  theme :", JSON.stringify(after));

const checks = [
  ["--gbs-radius reaches the component", after.radius === "10px" && before.radius !== "10px"],
  ["--gbs-font-size reaches the component", after.fontSize === "14px" && before.fontSize !== "14px"],
  ["--gbs-accent reaches a painted property", after.background !== before.background],
  ["the accent is the one that was set", /124,\s*58,\s*237/.test(after.background)],
];

console.log();
let bad = 0;
for (const [name, pass] of checks) {
  if (!pass) bad += 1;
  console.log(`${pass ? "ok" : "XX"}  ${name}`);
}
console.log(`\nVERDICT: ${bad === 0 ? "pass" : `fail (${bad}/${checks.length})`}`);

await browser.close();
process.exitCode = bad === 0 ? 0 : 1;
