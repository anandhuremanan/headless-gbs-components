/*
 * One evaluation run: 230 utterances through one adapter, scored by the real
 * validator, written out so the numbers can be re-derived later.
 *
 * The per-case loop is deliberately strict about one thing. The prompt is
 * built *after* the case's setup has run, so a model answering "undo that"
 * sees a contract that says undo is available, and a model answering "go to
 * page 3" sees the page count the setup produced. Building every prompt from
 * the pristine grid would be easier and would quietly make a third of the
 * corpus unanswerable.
 */

const fs = require("fs");
const path = require("path");

require("../../ts-require.cjs").register();

const harness = require("../harness.ts");

// A key in `.env` beats re-exporting it into every new shell. Real environment
// variables win, so CI secrets are never shadowed by a stale local file.
const loadedFromEnvFile = require("../../env.cjs").load(harness.ROOT);
const { GRID_OPERATIONS } = require("../../../source/beta-components/data-grid/agent/index.ts");
const { buildPrompt, PROMPT_VERSION } = require("./prompt.cjs");
const { createMounter, scoreCase } = require("./scorer.cjs");
const { summarise, checkPolicy, renderMarkdown } = require("./metrics.cjs");
const { resolve: resolveAdapter } = require("./adapters/index.cjs");

const CORPUS_VERSION = "grid-v0";
const RESULTS_DIR = path.join(harness.ROOT, "eval", "results", "grid");

/**
 * Values that identify a single row — the ones a contract must never leak.
 *
 * A column whose string values the contract declines to list is an identifier
 * rather than a category (see the cardinality rule in `contract.ts`), and a
 * restricted column is withheld entirely. Those are exactly the columns whose
 * values must not turn up in a prompt.
 */
function identifyingValues(contract, fixture) {
  const columns = contract.columns.filter(
    (column) =>
      column.type === "string" &&
      // Fixed options come from the column definition, not from the rows.
      !column.options &&
      (column.restricted || !(column.stats && column.stats.kind === "string" && column.stats.values)),
  );
  return columns.flatMap((column) =>
    fixture.rows.map((row) => String(row[column.id])).filter((value) => value.length > 2),
  );
}

/** The no-row guarantee, checked per case rather than asserted in a comment. */
function assertNoRows(prompt, forbidden, caseId) {
  for (const value of forbidden) {
    if (prompt.includes(value)) {
      throw new Error(
        `${caseId}: the prompt contains row data (${JSON.stringify(value)}). ` +
          "The runtime contract must carry counts and bounded summaries only.",
      );
    }
  }
}

/**
 * Spaces requests so a free tier's per-minute cap is respected.
 *
 * Shared across workers: with `--rpm=10` and `--concurrency=4`, the four
 * workers between them issue ten requests a minute, not forty. Returns a
 * no-op when no limit is asked for.
 */
function createThrottle(rpm) {
  if (!rpm || rpm <= 0) return async () => {};
  const spacing = 60_000 / rpm;
  let next = 0;
  return async () => {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + spacing;
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Prepare one case: mount, run setup, build the prompt from the state it left. */
async function prepareCase(entry, mounter, fixture, forbidden) {
  const { agent } = mounter();
  for (const step of entry.setup ?? []) {
    const result = await agent.execute(step, { confirm: true });
    if (result.status !== "done") {
      throw new Error(`${entry.id}: setup was refused — ${result.reason ?? result.status}`);
    }
  }

  const contract = agent.contract();
  const responseSchema = agent.responseSchema();
  const prompt = buildPrompt({
    contract,
    responseSchema,
    operations: GRID_OPERATIONS,
    utterance: entry.utterance,
  });
  assertNoRows(prompt.system, forbidden, entry.id);
  return { prompt, contract, responseSchema };
}

async function run({
  model,
  decoding = "unconstrained",
  temperature = 0,
  maxTokens = 1024,
  concurrency = 4,
  rpm = 0,
  limit,
  only,
  write = true,
  onProgress,
} = {}) {
  const adapter = resolveAdapter(model);
  const reason = await adapter.unavailable();
  if (reason) {
    const error = new Error(reason);
    error.code = "ADAPTER_UNAVAILABLE";
    throw error;
  }
  if (decoding === "constrained" && !adapter.supportsConstrained) {
    throw new Error(
      `${adapter.id} has no constrained decoding, so --constrained would be a lie in the result file. ` +
        "Run it unconstrained, or pick an adapter that supports it.",
    );
  }

  const fixture = harness.loadFixture();
  const mounter = createMounter(harness, fixture);
  const hardSet = loadHardSet();

  let cases = harness.loadCases();
  if (only) cases = cases.filter((entry) => only.includes(entry.id) || only.includes(entry.category));
  if (only && only.includes("hard")) cases = harness.loadCases().filter((entry) => hardSet.includes(entry.id));
  if (limit) cases = cases.slice(0, limit);

  const forbidden = identifyingValues(mounter().agent.contract(), fixture);
  const passport = JSON.parse(
    fs.readFileSync(
      path.join(harness.ROOT, "source", "beta-components", "data-grid", "passport.json"),
      "utf8",
    ),
  );

  /*
   * Spend one request finding out whether this works, before spending 230.
   *
   * A wrong model id used to burn the whole corpus discovering itself, which
   * on a free tier can mean a day's quota gone for a typo.
   */
  if (cases.length > 1 && adapter.provider !== "harness" && adapter.provider !== "local") {
    const first = await prepareCase(cases[0], mounter, fixture, forbidden);
    try {
      await adapter.complete({
        system: first.prompt.system,
        user: first.prompt.user,
        schema: first.responseSchema,
        contract: first.contract,
        decoding,
        temperature,
        maxTokens,
      });
    } catch (error) {
      const failure = new Error(
        `the first request failed, so the remaining ${cases.length - 1} were not sent.

` +
          `  ${String(error.message).slice(0, 600)}`,
      );
      failure.code = "PREFLIGHT_FAILED";
      throw failure;
    }
  }

  const throttle = createThrottle(rpm);
  let done = 0;
  const records = await mapWithConcurrency(cases, concurrency, async (entry) => {
    const { prompt, contract, responseSchema } = await prepareCase(entry, mounter, fixture, forbidden);

    let completion;
    try {
      await throttle();
      completion = await adapter.complete({
        system: prompt.system,
        user: prompt.user,
        schema: responseSchema,
        contract,
        decoding,
        temperature,
        maxTokens,
        ...(adapter.needsOracle
          ? { oracle: { intents: entry.intents, expect: entry.expect } }
          : {}),
      });
    } catch (error) {
      done += 1;
      onProgress?.(done, cases.length, entry.id);
      return {
        id: entry.id,
        category: entry.category,
        expect: entry.expect,
        latencyMs: 0,
        responseKind: "error",
        schemaValid: false,
        validated: false,
        outcome: "harness_error",
        correct: false,
        failure: "adapter_error",
        detail: String(error.message).slice(0, 300),
      };
    }

    const record = await scoreCase({
      entry,
      responseText: completion.text,
      latencyMs: completion.latencyMs,
      usage: completion.usage,
      mounter,
    });

    done += 1;
    onProgress?.(done, cases.length, entry.id);
    return { ...record, raw: completion.text.slice(0, 600) };
  });

  const summary = summarise(records, { hardSet });
  const policy = checkPolicy(summary, loadPolicy());

  const meta = {
    timestamp: new Date().toISOString(),
    model,
    modelId: adapter.modelId,
    provider: adapter.provider,
    decodingMode: decoding,
    temperature,
    maxTokens,
    concurrency,
    rpm,
    promptVersion: PROMPT_VERSION,
    corpusVersion: CORPUS_VERSION,
    contractVersion: mounter().agent.contract().contractVersion,
    passportVersion: passport.passportVersion,
    libraryVersion: passport.source.libraryVersion,
    hardSetVersion: loadHardSetVersion(),
    runtime: `node ${process.version}`,
    platform: `${process.platform}-${process.arch}`,
    benchmark: adapter.benchmark !== false,
  };

  const result = { meta, summary, policy, records };
  if (write) writeResult(result);
  return result;
}

function loadPolicy() {
  return JSON.parse(fs.readFileSync(path.join(harness.ROOT, "eval", "policy.json"), "utf8"));
}

const hardSetFile = () =>
  JSON.parse(
    fs.readFileSync(path.join(harness.ROOT, "eval", "grid", "v0", "hard-set.json"), "utf8"),
  );

function loadHardSet() {
  const groups = Object.values(hardSetFile().groups);
  return [...new Set(groups.flatMap((group) => group.ids))];
}

const loadHardSetVersion = () => hardSetFile().version;

function writeResult(result) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = result.meta.timestamp.replace(/[:.]/g, "-");
  // A model id like `gemini:gemini-3.5-flash-lite` is a legal argument and an
  // illegal Windows filename — the colon silently truncates the name and loses
  // the extension, so the run writes a file nothing can find.
  const slug = result.meta.model.replace(/[^A-Za-z0-9._-]+/g, "-");
  const file = path.join(RESULTS_DIR, `${stamp}-${slug}.json`);
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(RESULTS_DIR, "latest.md"), `${renderMarkdown(result)}\n`);
  return file;
}

module.exports = {
  run,
  createThrottle,
  loadedFromEnvFile,
  loadHardSet,
  loadPolicy,
  identifyingValues,
  assertNoRows,
  prepareCase,
  writeResult,
  CORPUS_VERSION,
  RESULTS_DIR,
};
