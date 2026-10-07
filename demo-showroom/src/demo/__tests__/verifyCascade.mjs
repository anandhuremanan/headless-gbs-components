/*
 * Does the candidate arrangement actually behave, in a browser?
 *
 * Two questions, and both have to be yes:
 *   1. component rules survive the framework's reset  (preflight must not win)
 *   2. a utility passed through className beats them  (utilities must win)
 *
 * Measured from computed styles on injected elements, because reading the
 * stylesheet only tells you what was emitted, not what the cascade settled on.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const req = createRequire(import.meta.url);
const pw = await import(pathToFileURL(req.resolve("@playwright/test")).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const url = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://127.0.0.1:5191/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-first-run"] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
// A grid has to be on screen before its scroll area can be measured.
await page.waitForSelector(".dg-viewport", { timeout: 30000 });

const probe = await page.evaluate(() => {
  const make = (className) => {
    const el = document.createElement("button");
    el.className = className;
    el.textContent = "x";
    document.body.appendChild(el);
    const s = getComputedStyle(el);
    const out = {
      paddingLeft: s.paddingLeft,
      borderTopWidth: s.borderTopWidth,
      borderRadius: s.borderTopLeftRadius,
    };
    el.remove();
    return out;
  };
  return {
    // The component on its own: did the reset flatten it?
    component: make("bt-root"),
    /*
     * The component with utilities on top. `rounded-md` (6px) and `px-3`
     * (12px) are used by the showroom already and differ from the component's
     * own 8px / 14px, so they prove the override without the app having to
     * carry classes that exist only for this probe.
     */
    overridden: make("bt-root rounded-md px-3"),
    // A bare utility-styled element, the AgentDemo case.
    utilityOnly: make("border border-zinc-300 rounded-md px-3"),
    scrollbars: (() => {
      /*
       * Scrollbars only compute on an actual scroll container, so each probe
       * is given overflow and something to overflow. The `plain` one is the
       * important case: the kit must not restyle scrollbars it was not asked
       * to.
       */
      const probe = (className) => {
        const el = document.createElement("div");
        el.className = className;
        el.style.cssText = "width:80px;height:40px;overflow:auto";
        el.innerHTML = "<div style='height:400px'></div>";
        document.body.appendChild(el);
        const s = getComputedStyle(el);
        const out = { width: s.scrollbarWidth, color: s.scrollbarColor };
        el.remove();
        return out;
      };
      const viewport = document.querySelector(".dg-viewport");
      return {
        component: viewport ? getComputedStyle(viewport).scrollbarWidth : "no grid on screen",
        utility: probe("gbs-scroll").width,
        plain: probe("").width,
      };
    })(),
  };
});

console.log(JSON.stringify(probe, null, 2));

const px = (v) => Number.parseFloat(v);
const checks = [
  ["component rule survives the reset (has padding)", px(probe.component.paddingLeft) > 0],
  ["component rule survives the reset (has a border)", px(probe.component.borderTopWidth) === 1],
  ["component rule survives the reset (has a radius)", px(probe.component.borderRadius) > 0],
  ["utility beats the component rule (rounded-md: 8px -> 6px)", px(probe.overridden.borderRadius) === 6],
  ["utility beats the component rule (px-3: 14px -> 12px)", px(probe.overridden.paddingLeft) === 12],
  ["bare utilities still apply (border)", px(probe.utilityOnly.borderTopWidth) === 1],
  ["bare utilities still apply (padding)", px(probe.utilityOnly.paddingLeft) === 12],
  ["a component scroll area is thin", probe.scrollbars.component === "thin"],
  ["the gbs-scroll utility is thin", probe.scrollbars.utility === "thin"],
  ["an unrelated scroll area is left alone", probe.scrollbars.plain === "auto"],
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
