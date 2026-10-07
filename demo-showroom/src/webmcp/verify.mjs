/*
 * Phase 3 + 4: drive the registered tool in a real Chrome with WebMCP on.
 *
 * The driver stands in for an agent, but the *dispatch* is the browser's own:
 * `document.modelContext.executeTool` invokes the tool exactly as an agent
 * would, which is the part a unit test with a stubbed `registerTool` cannot
 * prove.
 *
 * Requires: --enable-features=WebMCPTesting
 *           (or chrome://flags/#enable-webmcp-testing)
 *
 * Run: node src/webmcp/verify.mjs
 *
 * Three things about the page cost a wrong run each, and are handled here
 * rather than assumed:
 *
 *   - Chrome passes `inputSchema` and the call arguments as JSON *strings*,
 *     and returns a JSON string.
 *   - The grid virtualizes columns as well as rows, so a cell is found by
 *     `[data-col-index="N"]`, never by array position.
 *   - A filtered column's header gains a marker ("Region" -> "RegionFiltered"),
 *     so the column index is captured once, before filtering.
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const pw = await import(
  pathToFileURL(createRequire(import.meta.url).resolve("@playwright/test")).href
);
const chromium = pw.chromium ?? pw.default?.chromium;

const URL_UNDER_TEST = process.env.WEBMCP_URL ?? "http://127.0.0.1:5191/webmcp.html";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-features=WebMCPTesting", "--no-first-run"],
});

const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" && !/favicon|404/i.test(text)) consoleErrors.push(text.slice(0, 200));
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 200)}`));

await page.goto(URL_UNDER_TEST, { waitUntil: "load", timeout: 60000 });

const report = { url: URL_UNDER_TEST, steps: [] };
const step = (name, detail) => {
  report.steps.push({ name, ...detail });
  console.log(`${detail.pass === undefined ? "  " : detail.pass ? "ok" : "XX"}  ${name}${detail.note ? ` — ${detail.note}` : ""}`);
};

/* --------------------------------------------- WebMCP surface and discovery */

report.surface = await page.evaluate(() => ({
  chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0],
  documentModelContext: "modelContext" in document,
  navigatorModelContext: "modelContext" in navigator,
  methods: document.modelContext
    ? Object.getOwnPropertyNames(Object.getPrototypeOf(document.modelContext)).filter((k) => k !== "constructor")
    : null,
}));
step("WebMCP surface present", {
  pass: report.surface.documentModelContext,
  note: `${report.surface.chrome} · document=${report.surface.documentModelContext}, navigator=${report.surface.navigatorModelContext} (deprecated since 150)`,
});

await page.waitForSelector('[data-testid="registration"][data-registered="true"]', { timeout: 20000 });

report.discovered = await page.evaluate(async () => {
  const tools = await document.modelContext.getTools();
  return [...tools].map((t) => {
    const schema = typeof t.inputSchema === "string" ? JSON.parse(t.inputSchema) : t.inputSchema;
    return {
      name: t.name,
      origin: t.origin,
      descriptionLength: (t.description ?? "").length,
      descriptionHead: (t.description ?? "").slice(0, 100),
      schemaWireType: typeof t.inputSchema,
      required: schema?.required ?? null,
      intentBranches: schema?.properties?.intents?.items?.oneOf?.length ?? null,
    };
  });
});
step("tool discoverable via getTools()", {
  pass: report.discovered.some((t) => t.name === "operate_grid"),
  note: `${report.discovered.length} tool(s): ${report.discovered.map((t) => t.name).join(", ")} @ ${report.discovered[0]?.origin}`,
});
step("schema visible to the agent", {
  pass: (report.discovered[0]?.intentBranches ?? 0) > 20,
  note: `wire type ${report.discovered[0]?.schemaWireType} · required=${JSON.stringify(report.discovered[0]?.required)} · ${report.discovered[0]?.intentBranches} intent branches`,
});

/* ------------------------------------------------------------ reading the grid */

const counter = () => page.textContent('[data-testid="rows-showing"]');

/** The Region column's index, captured before any filter renames the header. */
const regionIndex = await page.evaluate(() => {
  const header = document.querySelector('[data-row-index="-1"]');
  const cell = [...(header?.querySelectorAll("[data-col-index]") ?? [])].find(
    (c) => c.textContent?.trim() === "Region",
  );
  return cell?.getAttribute("data-col-index") ?? null;
});
report.regionColIndex = regionIndex;

const visibleRegions = (index) =>
  page.evaluate((colIndex) => {
    const rows = [...document.querySelectorAll("[data-row-index]")].filter(
      (row) => row.getAttribute("data-row-index") !== "-1",
    );
    const regions = rows
      .map((row) => row.querySelector(`[data-col-index="${colIndex}"]`)?.textContent?.trim())
      .filter(Boolean);
    return { rendered: rows.length, regions: [...new Set(regions)] };
  }, index);

report.before = { counter: await counter(), ...(await visibleRegions(regionIndex)) };
step("grid starts unfiltered", {
  pass: report.before.counter === "40",
  // The fixture is ordered by region, so the first viewport is Kerala either
  // way. Only the counter distinguishes filtered from unfiltered here.
  note: `counter ${report.before.counter}; ${report.before.rendered} rows rendered (virtualized)`,
});

/* ------------------------------------------------------- invoking the tool */

const invoke = (payload) =>
  page.evaluate(async (input) => {
    const tools = await document.modelContext.getTools();
    const tool = [...tools].find((t) => t.name === "operate_grid");
    const raw = await document.modelContext.executeTool(tool, JSON.stringify(input));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }, payload);

const filterRegion = (value) => ({
  intents: [{ action: "filter", column: "region", operator: "equals", value }],
});

/* Phase 3: the Kerala case — corpus grid-001. */
report.kerala = await invoke(filterRegion("Kerala"));
report.afterKerala = { counter: await counter(), ...(await visibleRegions(regionIndex)) };
step("valid call accepted by the existing validator", {
  pass: report.kerala?.structuredContent?.ok === true,
  note: report.kerala?.structuredContent?.message,
});
step("DataGrid visibly filtered to Kerala", {
  pass:
    report.afterKerala.counter === "18" &&
    report.afterKerala.regions.length === 1 &&
    report.afterKerala.regions[0] === "Kerala",
  note: `counter 40 -> ${report.afterKerala.counter}; visible regions: ${report.afterKerala.regions.join(", ")}`,
});

/*
 * A second filter that *changes what is on screen*. Kerala alone is weak
 * evidence because the fixture's first page is already Kerala; Maharashtra is
 * five rows and nowhere near the top.
 */
report.maharashtra = await invoke(filterRegion("Maharashtra"));
report.afterMaharashtra = { counter: await counter(), ...(await visibleRegions(regionIndex)) };
step("a different filter visibly changes the rows", {
  pass:
    report.afterMaharashtra.counter === "6" &&
    report.afterMaharashtra.regions.length === 1 &&
    report.afterMaharashtra.regions[0] === "Maharashtra",
  note: `counter ${report.afterMaharashtra.counter}; visible regions: ${report.afterMaharashtra.regions.join(", ")}`,
});

/* ---------------------------------------------------------- invalid calls */

const frozen = async () => ({ counter: await counter(), ...(await visibleRegions(regionIndex)) });
const beforeInvalid = await frozen();

report.unknownColumn = await invoke({
  intents: [{ action: "filter", column: "state", operator: "equals", value: "Kerala" }],
});
step("unknown column refused by the same validator", {
  pass:
    report.unknownColumn?.structuredContent?.ok === false &&
    report.unknownColumn?.structuredContent?.code === "unknown-column",
  note: `${report.unknownColumn?.structuredContent?.code}: ${report.unknownColumn?.structuredContent?.message} (${report.unknownColumn?.structuredContent?.suggestion ?? "no suggestion"})`,
});

report.badOperator = await invoke({
  intents: [{ action: "filter", column: "revenue", operator: "startsWith", value: "1" }],
});
step("unsupported operator refused", {
  pass: report.badOperator?.structuredContent?.ok === false,
  note: `layer=${report.badOperator?.structuredContent?.layer} code=${report.badOperator?.structuredContent?.code}`,
});

report.malformed = await invoke({ intents: [] });
step("malformed payload refused", {
  pass: report.malformed?.structuredContent?.code === "missing-intents",
  note: report.malformed?.structuredContent?.message,
});

report.restricted = await invoke({
  intents: [{ action: "filter", column: "email", operator: "contains", value: "@" }],
});
step("policy-restricted column refused", {
  pass: report.restricted?.structuredContent?.code === "not-filterable",
  note: `layer=${report.restricted?.structuredContent?.layer}: ${report.restricted?.structuredContent?.message}`,
});

report.afterInvalid = await frozen();
step("no refused call mutated the grid", {
  pass: JSON.stringify(report.afterInvalid) === JSON.stringify(beforeInvalid),
  note: `still counter ${report.afterInvalid.counter}, regions ${report.afterInvalid.regions.join(", ")}`,
});

report.consoleErrors = consoleErrors;
if (consoleErrors.length) step("console clean", { pass: false, note: consoleErrors[0] });

const failed = report.steps.filter((s) => s.pass === false);
report.verdict = failed.length === 0 ? "pass" : `fail (${failed.map((s) => s.name).join("; ")})`;

console.log(`\nVERDICT: ${report.verdict}`);
console.log(JSON.stringify(report, null, 2));

await page.close();
await browser.close();
process.exitCode = failed.length === 0 ? 0 : 1;
