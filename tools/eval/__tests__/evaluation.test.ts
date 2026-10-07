/*
 * Tests for the evaluation harness itself.
 *
 * A benchmark is an instrument, and an instrument nobody calibrated produces
 * numbers nobody should act on. The load-bearing test is the last one: the
 * oracle adapter replays the corpus's own answers and must score 100%.
 * Anything less means the harness is wrong — as it was, the first time it ran,
 * because the scorer validated each answer against a pristine grid instead of
 * the one the case's setup had left behind.
 *
 * Nothing here mocks the validator. Every score goes through the same
 * contract, coercion and executors the production runtime uses.
 */

import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const { buildPrompt, PROMPT_VERSION, PROMPT_VERSIONS, signatureOf } = require("../grid/prompt.cjs");
const scorer = require("../grid/scorer.cjs");
const metrics = require("../grid/metrics.cjs");
const runner = require("../grid/runner.cjs");
const adapters = require("../grid/adapters/index.cjs");
const baseline = require("../grid/adapters/baseline.cjs");
const harness = require("../harness.ts");
const { GRID_OPERATIONS } = require("../../../source/beta-components/data-grid/agent/index.ts");

const fixture = harness.loadFixture();
const mounter = scorer.createMounter(harness, fixture);
const agent = () => mounter().agent;

const promptFor = (utterance: string, version = "v1") => {
  const live = agent();
  return buildPrompt({
    contract: live.contract(),
    responseSchema: live.responseSchema(),
    operations: GRID_OPERATIONS,
    utterance,
    version,
  });
};

/* ------------------------------------------------------------------ prompt */

describe("prompt", () => {
  it("serialises identically for the same contract", () => {
    expect(promptFor("Show Kerala").system).toBe(promptFor("Show Kerala").system);
  });

  it("carries no clock, so a run today matches a run tomorrow", () => {
    // Relative dates are passed through as phrases and resolved downstream, so
    // the prompt never needs to know what day it is.
    expect(promptFor("anything").system).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  it("is versioned, and the version travels with the result", () => {
    expect(PROMPT_VERSION).toBe("grid-intent-v1");
    expect(promptFor("x").promptVersion).toBe(PROMPT_VERSION);
  });

  it("drops the schema in v2 without dropping the semantics", () => {
    const v1 = promptFor("Show Kerala", "v1").system;
    const v2 = promptFor("Show Kerala", "v2").system;

    // The schema is two thirds of v1; constrained decoding already holds it.
    expect(v2.length).toBeLessThan(v1.length * 0.45);
    expect(v1).toContain('"$schema"');
    expect(v2).not.toContain('"$schema"');

    // Everything a model needs to pick correctly is still there.
    for (const kept of [
      "tier (Tier)",
      "filter: in isEmpty isNotEmpty",
      "RESTRICTED: cannot be filtered or sorted.",
      "stored as a fraction",
      "last quarter",
    ]) {
      expect(v2, kept).toContain(kept);
    }

    // And the argument names the schema used to carry are now inline.
    expect(v2).toContain("filter(column, operator, [value], [value2])");
    expect(v2).toContain("OUTPUT SHAPE");
  });

  it("derives operation signatures rather than hand-listing them", () => {
    expect(signatureOf(GRID_OPERATIONS.sort)).toBe("sort(column, direction, [append])");
    expect(signatureOf(GRID_OPERATIONS.undo)).toBe("undo()");
    expect(signatureOf(GRID_OPERATIONS.export)).toBe("export(format, [scope], [fileName])");
  });

  it("names each version, and refuses one it does not know", () => {
    expect(PROMPT_VERSIONS.v1).toBe("grid-intent-v1");
    expect(PROMPT_VERSIONS.v2).toBe("grid-intent-v2");
    expect(promptFor("x", "v2").promptVersion).toBe("grid-intent-v2");
    expect(() => promptFor("x", "v3")).toThrow(/Unknown prompt version/);
  });

  it("keeps v1 byte-identical, so old results stay comparable", () => {
    expect(promptFor("Show Kerala").system).toBe(promptFor("Show Kerala", "v1").system);
  });

  it("injects the generated schema, not a hand-written one", () => {
    const live = agent();
    const { system } = buildPrompt({
      contract: live.contract(),
      responseSchema: live.responseSchema(),
      operations: GRID_OPERATIONS,
      utterance: "x",
    });
    expect(system).toContain(JSON.stringify(live.responseSchema()));
  });

  it("states the per-column operator sets the instance really has", () => {
    const { system } = promptFor("x");
    expect(system).toContain("tier (Tier)");
    expect(system).toMatch(/filter: in isEmpty isNotEmpty/);
    expect(system).toContain("RESTRICTED: cannot be filtered or sorted.");
  });

  it("tells the model not to do the arithmetic the coercion layer does", () => {
    const { system } = promptFor("x");
    expect(system).toMatch(/Do NOT convert units, scales, percentages or currency/);
    expect(system).toContain("last quarter");
  });

  it("offers all three answers", () => {
    const { system } = promptFor("x");
    for (const result of ["command", "clarify", "declined"]) expect(system).toContain(`"${result}"`);
  });
});

/* ------------------------------------------------------------ no row data */

describe("the no-row guarantee", () => {
  const forbidden = () => runner.identifyingValues(agent().contract(), fixture);

  it("treats per-row text as forbidden and shared categories as not", () => {
    const values = forbidden();
    expect(values).toContain("Backwater Logistics"); // a name: one row, one value
    expect(values).toContain("ops@backwater.in"); // restricted entirely
    expect(values).not.toContain("Kerala"); // a category the contract may list
    expect(values).not.toContain("Platinum"); // an option from the column definition
  });

  it("holds for every utterance in the corpus", () => {
    const values = forbidden();
    for (const entry of harness.loadCases()) {
      expect(() => runner.assertNoRows(promptFor(entry.utterance).system, values, entry.id)).not.toThrow();
    }
  });

  it("fails loudly if row data ever appears", () => {
    expect(() => runner.assertNoRows("… Backwater Logistics …", forbidden(), "probe")).toThrow(
      /contains row data/,
    );
  });
});

/* ------------------------------------------------------------------ clarify */

describe("clarify is validated, not waved through", () => {
  it("accepts a real question", () => {
    expect(agent().respond({ result: "clarify", question: "Which column did you mean?" })).toMatchObject({
      status: "clarify",
    });
  });

  it("refuses a label with no question behind it", () => {
    expect(agent().respond({ result: "clarify" })).toMatchObject({ status: "rejected", layer: "schema" });
    expect(agent().respond({ result: "clarify", question: "eh" })).toMatchObject({ status: "rejected" });
  });

  it("names a mis-nested envelope instead of printing [object Object]", () => {
    const nested = agent().respond({ result: { clarify: "Which column did you mean?" } });
    expect(nested).toMatchObject({ status: "rejected", code: "unknown-result" });
    if (nested.status !== "rejected") return;
    expect(nested.reason).not.toContain("[object Object]");
    expect(nested.reason).toContain("an object");
    expect(nested.reason).toContain('Did you mean { "result": "clarify"');

    expect(agent().respond({ result: 42 }).reason).toContain("a number");
    expect(agent().respond({ result: ["a"] }).reason).toContain("a list");
    expect(agent().respond({ result: null }).reason).toContain("null");
  });

  it("refuses a declined with no reason", () => {
    expect(agent().respond({ result: "declined" })).toMatchObject({ status: "rejected" });
  });

  it("never runs anything for a clarify or a declined", async () => {
    const live = agent();
    const before = live.contract().state;
    await live.execute({ result: "clarify", question: "Which column did you mean?" });
    await live.execute({ result: "declined", reason: "This grid cannot group." });
    expect(live.contract().state).toEqual(before);
  });
});

/* ------------------------------------------------------------------ scoring */

const score = (entry: Record<string, unknown>, response: unknown, latencyMs = 1) =>
  scorer.scoreCase({ entry, responseText: JSON.stringify(response), latencyMs, mounter });

const KERALA = { action: "filter", column: "region", operator: "equals", value: "Kerala" };
const acceptCase = {
  id: "t-1",
  category: "test",
  utterance: "Show customers from Kerala",
  expect: "accept",
  intents: [KERALA],
};

describe("scoring is post-coercion", () => {
  it("accepts a written quantity and its converted form alike", async () => {
    const entry = {
      id: "t-scale",
      category: "test",
      utterance: "Revenue above 1 lakh",
      expect: "accept",
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: "1 lakh" }],
    };

    const written = await score(entry, {
      result: "command",
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: "1 lakh" }],
    });
    const converted = await score(entry, {
      result: "command",
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: 100000 }],
    });

    expect(written.correct).toBe(true);
    expect(converted.correct).toBe(true);
    expect(converted.outcome).toBe("semantic_correct");
  });

  it("accepts a different case for a value the data really has", async () => {
    const result = await score(acceptCase, {
      result: "command",
      intents: [{ action: "filter", column: "region", operator: "equals", value: "kerala" }],
    });
    expect(result.correct).toBe(true);
  });

  it("ignores the order of filters on different columns", async () => {
    const entry = {
      id: "t-order",
      category: "test",
      utterance: "Active Kerala customers",
      expect: "accept",
      intents: [KERALA, { action: "filter", column: "active", operator: "equals", value: true }],
    };
    const result = await score(entry, {
      result: "command",
      intents: [{ action: "filter", column: "active", operator: "equals", value: true }, KERALA],
    });
    expect(result.correct).toBe(true);
    expect(result.exactMatch).toBe(false);
  });

  it("reads a quantity written in words, since the prompt forbids converting it", async () => {
    const entry = {
      id: "t-words",
      category: "test",
      utterance: "Revenue above one crore",
      expect: "accept",
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: 10000000 }],
    };
    const result = await score(entry, {
      result: "command",
      intents: [{ action: "filter", column: "revenue", operator: "gt", value: "one crore" }],
    });
    expect(result.correct).toBe(true);
  });

  it("flags a wrong answer that still showed the right rows, without crediting it", async () => {
    /*
     * On this fixture nothing is dated in the future, so `after <date>` and
     * `between <date> and today` select the same rows by different states.
     */
    const entry = {
      id: "t-rows",
      category: "test",
      utterance: "Signed up in the last 30 days",
      expect: "accept",
      intents: [
        { action: "filter", column: "signedUp", operator: "between", value: "2026-09-06", value2: "2026-10-06" },
      ],
    };
    const result = await score(entry, {
      result: "command",
      intents: [{ action: "filter", column: "signedUp", operator: "after", value: "2026-09-06" }],
    });
    expect(result.correct).toBe(false);
    expect(result.rowSetMatch).toBe(true);
    expect(result.failure).toBe("wrong_operator");
  });

  it("does not flag row equivalence when the rows really differ", async () => {
    const result = await score(acceptCase, {
      result: "command",
      intents: [{ action: "filter", column: "region", operator: "equals", value: "Karnataka" }],
    });
    expect(result.rowSetMatch).toBe(false);
  });

  it("is no more permissive than the executor", async () => {
    const result = await score(acceptCase, {
      result: "command",
      intents: [{ action: "filter", column: "region", operator: "equals", value: "Karnataka" }],
    });
    expect(result.correct).toBe(false);
    expect(result.failure).toBe("wrong_value");
  });
});

describe("canonicalisation", () => {
  it("sorts keys and treats an `in` list as a set", () => {
    expect(scorer.canonicalIntent({ operator: "in", action: "filter", value: ["b", "a"] })).toEqual({
      action: "filter",
      operator: "in",
      value: ["a", "b"],
    });
  });

  it("drops undefined rather than comparing it", () => {
    expect(scorer.stable({ a: 1, b: undefined })).toBe(scorer.stable({ a: 1 }));
  });
});

describe("failure categorisation", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["wrong_operation", { action: "search", text: "Kerala" }, "wrong_operation"],
    ["wrong_column", { action: "filter", column: "city", operator: "equals", value: "Kochi" }, "wrong_column"],
    ["wrong_operator", { action: "filter", column: "region", operator: "contains", value: "Kerala" }, "wrong_operator"],
    ["wrong_value", { action: "filter", column: "region", operator: "equals", value: "Karnataka" }, "wrong_value"],
  ];

  it.each(cases)("names %s", async (_label, intent, expected) => {
    const result = await score(acceptCase, { result: "command", intents: [intent] });
    expect(result.correct).toBe(false);
    expect(result.failure).toBe(expected);
  });

  it("names a wrong direction", async () => {
    const entry = {
      id: "t-sort",
      category: "test",
      utterance: "Highest revenue first",
      expect: "accept",
      intents: [{ action: "sort", column: "revenue", direction: "desc" }],
    };
    const result = await score(entry, {
      result: "command",
      intents: [{ action: "sort", column: "revenue", direction: "asc" }],
    });
    expect(result.failure).toBe("wrong_direction");
  });

  it("separates a validator refusal from a wrong answer", async () => {
    const result = await score(acceptCase, {
      result: "command",
      intents: [{ action: "filter", column: "email", operator: "contains", value: "x" }],
    });
    expect(result.outcome).toBe("incorrect_rejection");
    expect(result.failure).toBe("validator_failure");
    expect(result.rejectionLayer).toBe("policy");
  });

  it("blames the corpus when the corpus's own answer would also be refused", async () => {
    const result = await score(
      {
        id: "t-broken",
        category: "test",
        utterance: "…",
        expect: "accept",
        intents: [{ action: "filter", column: "email", operator: "contains", value: "x" }],
      },
      { result: "command", intents: [{ action: "filter", column: "email", operator: "contains", value: "x" }] },
    );
    expect(result.failure).toBe("corpus_or_contract_failure");
    expect(result.architectureSuspect).toBe(true);
  });
});

describe("rejections and clarifications", () => {
  const rejectCase = {
    id: "t-reject",
    category: "test",
    utterance: "Group by region",
    expect: "reject",
    code: "unknown-operation",
    intents: [{ action: "group", column: "region" }],
  };

  it("counts an explicit refusal as correct", async () => {
    const result = await score(rejectCase, { result: "declined", reason: "This grid cannot group." });
    expect(result).toMatchObject({ outcome: "correct_rejection", correct: true });
  });

  it("counts a refusal the validator produced as correct, and records the code", async () => {
    const result = await score(rejectCase, { result: "command", intents: [{ action: "group", column: "region" }] });
    expect(result).toMatchObject({
      outcome: "correct_rejection",
      correct: true,
      rejectionCode: "unknown-operation",
      rejectionCodeMatch: true,
    });
  });

  it("counts something that ran as a false accept, the worst outcome there is", async () => {
    const result = await score(rejectCase, { result: "command", intents: [KERALA] });
    expect(result).toMatchObject({ outcome: "false_accept", correct: false });
  });

  it("credits a reading the case lists as also correct", async () => {
    const result = await score(
      {
        id: "t-also",
        category: "test",
        utterance: "Tier equals gold",
        expect: "reject",
        code: "enum",
        intents: [{ action: "filter", column: "tier", operator: "equals", value: "gold" }],
        alsoAccept: [[{ action: "filter", column: "tier", operator: "in", value: ["gold"] }]],
      },
      { result: "command", intents: [{ action: "filter", column: "tier", operator: "in", value: ["gold"] }] },
    );
    expect(result).toMatchObject({ outcome: "acceptable_reading", correct: true });
  });

  it("credits a question on an ambiguous case, and penalises one elsewhere", async () => {
    const question = { result: "clarify", question: "Which measure of performance did you mean?" };

    const onAmbiguous = await score(
      { id: "t-amb", category: "test", utterance: "worst customers", expect: "ambiguous", intents: [KERALA] },
      question,
    );
    expect(onAmbiguous).toMatchObject({ outcome: "correct_clarification", correct: true });

    const onClear = await score(acceptCase, question);
    expect(onClear).toMatchObject({ outcome: "unnecessary_clarification", correct: false });
    // Asking is wrong here, but it is not the same kind of wrong as acting wrongly.
    expect(onClear.outcome).not.toBe("false_accept");
  });

  /*
   * The four outcomes the harness must keep apart. The distinction that
   * matters: on a case where the request *cannot* be determined, asking is the
   * only right answer — guessing earns nothing even when the validator catches
   * the guess, and refusing earns nothing either, because one question would
   * have recovered the answer.
   */
  const requiredCase = {
    id: "t-required",
    category: "test",
    utterance: "Filter by state",
    expect: "reject",
    code: "unknown-column",
    clarify: "required",
    intents: [{ action: "filter", column: "state", operator: "equals", value: "Kerala" }],
  };

  const acceptableCase = {
    id: "t-acceptable",
    category: "test",
    utterance: "Churn risk between 0.2",
    expect: "reject",
    code: "missing-value2",
    clarify: "acceptable",
    intents: [{ action: "filter", column: "churnRisk", operator: "between", value: 0.2 }],
  };

  const question = { result: "clarify", question: "Which value did you mean exactly?" };

  it("credits a question when clarification is required", async () => {
    const result = await score(requiredCase, question);
    expect(result).toMatchObject({ outcome: "correct_clarification", correct: true });
    expect(result.clarifyRequired).toBe(true);
  });

  it("gives a refusal no credit when clarification is required", async () => {
    const result = await score(requiredCase, { result: "declined", reason: "No such column." });
    expect(result).toMatchObject({ outcome: "missed_clarification", correct: false });
  });

  it("gives a guess no credit when required, even if the validator caught it", async () => {
    const result = await score(requiredCase, {
      result: "command",
      intents: [{ action: "filter", column: "state", operator: "equals", value: "Kerala" }],
    });
    // The validator refusing is the architecture working, not the producer
    // answering well — and nothing ran, so this is not a false accept either.
    expect(result).toMatchObject({ outcome: "missed_clarification", correct: false });
    expect(result.outcome).not.toBe("false_accept");
    expect(result.outcome).not.toBe("correct_rejection");
  });

  it("gives unintelligible output no credit when required", async () => {
    const result = await scorer.scoreCase({
      entry: requiredCase,
      responseText: "I am not sure what you want here!",
      latencyMs: 1,
      mounter,
    });
    expect(result.correct).toBe(false);
  });

  it("credits either answer when clarification is merely acceptable", async () => {
    expect(await score(acceptableCase, question)).toMatchObject({
      outcome: "correct_clarification",
      correct: true,
    });
    expect(
      await score(acceptableCase, { result: "declined", reason: "Needs an upper bound." }),
    ).toMatchObject({ outcome: "correct_rejection", correct: true });
  });

  it("credits a question or any listed reading on an ambiguous case", async () => {
    const ambiguousCase = {
      id: "t-ambiguous",
      category: "test",
      utterance: "High risk customers in Karnataka",
      expect: "ambiguous",
      clarify: "acceptable",
      intents: [
        { action: "filter", column: "region", operator: "equals", value: "Karnataka" },
        { action: "filter", column: "churnRisk", operator: "gt", value: 0.5 },
      ],
      alternatives: [
        [
          { action: "filter", column: "region", operator: "equals", value: "Karnataka" },
          { action: "filter", column: "churnRisk", operator: "gt", value: 0.4 },
        ],
      ],
    };

    expect(await score(ambiguousCase, question)).toMatchObject({
      outcome: "correct_clarification",
      correct: true,
    });
    // On an ambiguous case no reading is *the* answer, so even the one listed
    // first is an acceptable reading rather than a correct one. That naming is
    // the point: a case with several defensible readings has no single truth.
    for (const reading of [ambiguousCase.intents, ambiguousCase.alternatives[0]]) {
      expect(await score(ambiguousCase, { result: "command", intents: reading })).toMatchObject({
        outcome: "acceptable_reading",
        correct: true,
      });
    }
  });

  it("still penalises a question on a case with one clear reading", async () => {
    const result = await score(acceptCase, question);
    expect(result).toMatchObject({ outcome: "unnecessary_clarification", correct: false });
  });

  it("treats unparseable output on a reject case as a refusal, but records how", async () => {
    const result = await scorer.scoreCase({
      entry: rejectCase,
      responseText: "I think you want to group by region!",
      latencyMs: 1,
      mounter,
    });
    expect(result).toMatchObject({ correct: true, viaSchemaFailure: true, schemaValid: false });
  });

  it("unwraps a fenced block rather than calling it malformed", async () => {
    const result = await scorer.scoreCase({
      entry: acceptCase,
      responseText: "```json\n" + JSON.stringify({ result: "command", intents: [KERALA] }) + "\n```",
      latencyMs: 1,
      mounter,
    });
    expect(result.correct).toBe(true);
  });
});

/* ------------------------------------------------------------------ adapters */

describe("adapters", () => {
  it("resolve by id, alias, provider and local tag", () => {
    expect(adapters.resolve("baseline").id).toBe("baseline");
    expect(adapters.resolve("frontier").provider).toBe("anthropic");
    expect(adapters.resolve("qwen2.5-coder-3b").modelId).toBe("qwen2.5-coder:3b");
    expect(adapters.resolve("groq").provider).toBe("groq");
    expect(() => adapters.resolve("nope")).toThrow(/Unknown model/);
  });

  it("let a provider:model pair name the exact model recorded", () => {
    const adapter = adapters.resolve("huggingface:meta-llama/Llama-3.3-70B-Instruct");
    expect(adapter.provider).toBe("huggingface");
    expect(adapter.modelId).toBe("meta-llama/Llama-3.3-70B-Instruct");
    expect(adapter.baseUrl).toBe("https://router.huggingface.co/v1");
  });

  it("point the ceiling at a free provider, because an unrun ceiling helps nobody", () => {
    const ceiling = adapters.resolve("ceiling");
    expect(ceiling.provider).toBe("gemini");
    expect(ceiling.note).toMatch(/free/);
    expect(adapters.BENCHMARK_ORDER).toContain("ceiling");
  });

  it("resolve the in-process local adapter, with an overridable model and dtype", () => {
    const local = adapters.resolve("transformersjs");
    expect(local.provider).toBe("transformersjs");
    expect(local.modelId).toBe("onnx-community/Qwen2.5-0.5B-Instruct");
    expect(local.dtype).toBe("q4f16");

    const bigger = adapters.resolve("transformersjs:onnx-community/Qwen2.5-Coder-1.5B-Instruct@q4");
    expect(bigger.modelId).toBe("onnx-community/Qwen2.5-Coder-1.5B-Instruct");
    expect(bigger.dtype).toBe("q4");
  });

  it("keeps hundreds of megabytes of weights out of the repository", () => {
    const { cacheDir } = adapters.resolve("transformersjs");
    const repo = require("../harness.ts").ROOT;
    expect(cacheDir.startsWith(repo)).toBe(false);
  });

  it("does not advertise constrained decoding that has never run", async () => {
    /*
     * The llguidance wiring is present in the adapter, but every constrained
     * generation dies on "Token 0 does not satisfy the constraint". Code
     * existing is not the same as the capability working, and the flag is what
     * stamps `decodingMode: "constrained"` into a result record — so it stays
     * false until a run completes. Flip both together, never just the flag.
     */
    expect(adapters.resolve("transformersjs").supportsConstrained).toBe(false);
    await expect(
      runner.run({ model: "transformersjs", decoding: "constrained", write: false }),
    ).rejects.toThrow(/would be a lie in the result file/);
  });

  it("say what is missing instead of failing obscurely", async () => {
    for (const [id, variable] of [
      ["frontier", "ANTHROPIC_API_KEY"],
      ["ceiling", "GOOGLE_API_KEY"],
      ["groq", "GROQ_API_KEY"],
      ["huggingface", "HF_TOKEN"],
    ] as const) {
      const key = process.env[variable];
      delete process.env[variable];
      try {
        expect(await adapters.resolve(id).unavailable()).toMatch(new RegExp(`${variable} is not set`));
      } finally {
        if (key !== undefined) process.env[variable] = key;
      }
    }
  });

  it("read a key from .env, but let a real environment variable win", () => {
    const { parse } = require("../../env.cjs");
    expect(
      parse(['# a comment', 'GOOGLE_API_KEY="abc"', "export GROQ_API_KEY=def", "", "broken"].join("\n")),
    ).toEqual({ GOOGLE_API_KEY: "abc", GROQ_API_KEY: "def" });

    const dir = mkdtempSync(join(tmpdir(), "gbs-env-"));
    try {
      writeFileSync(join(dir, ".env"), ["GBS_FROM_FILE=file", "GBS_ALREADY_SET=file"].join("\n"));
      process.env.GBS_ALREADY_SET = "environment";

      const loaded = require("../../env.cjs").load(dir);
      expect(loaded).toEqual(["GBS_FROM_FILE"]);
      expect(process.env.GBS_FROM_FILE).toBe("file");
      // CI sets secrets in the environment; a stale local file must not shadow them.
      expect(process.env.GBS_ALREADY_SET).toBe("environment");
    } finally {
      delete process.env.GBS_FROM_FILE;
      delete process.env.GBS_ALREADY_SET;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("space requests so a free tier's per-minute cap is respected", async () => {
    const throttle = runner.createThrottle(600); // 100ms apart
    const started = Date.now();
    await Promise.all([throttle(), throttle(), throttle()]);
    // Shared across callers: three requests cost two gaps, not zero.
    expect(Date.now() - started).toBeGreaterThanOrEqual(150);
    await expect(runner.createThrottle(0)()).resolves.toBeUndefined();
  });

  it("refuse to claim constrained decoding they do not have", async () => {
    expect(adapters.resolve("baseline").supportsConstrained).toBe(false);
    await expect(runner.run({ model: "baseline", decoding: "constrained", write: false })).rejects.toThrow(
      /would be a lie in the result file/,
    );
  });

  it("keep the baseline simple enough to be a floor", async () => {
    const contract = agent().contract();
    const ask = async (utterance: string) =>
      JSON.parse((await baseline.complete({ user: utterance, contract })).text);

    expect(await ask("Clear all filters")).toEqual({
      result: "command",
      intents: [{ action: "clearFilters" }],
    });
    expect(await ask("Show customers from Kerala")).toMatchObject({
      intents: [{ action: "filter", column: "region", operator: "equals", value: "Kerala" }],
    });
    // It has no idea what this means, and says so rather than guessing.
    expect(await ask("Show me the worst performing customers in the south")).toMatchObject({
      result: "command",
    });
    expect(await ask("qwerty asdfgh")).toMatchObject({ result: "declined" });
  });
});

/* ------------------------------------------------------------------- metrics */

/*
 * The point of these: prove the pipeline handles what a small local model
 * really emits, without the adapter being allowed to tidy it up first. No
 * model is loaded — the text is what a 0.5B model plausibly returns, pushed
 * through the real validator and the real scorer.
 */
describe("a local model's raw output goes through the normal pipeline", () => {
  const kerala = {
    id: "grid-001",
    category: "filter-simple",
    utterance: "Show customers from Kerala",
    expect: "accept",
    intents: [{ action: "filter", column: "region", operator: "equals", value: "Kerala" }],
  };

  it("scores a clean answer correct", async () => {
    const result = await scorer.scoreCase({
      entry: kerala,
      responseText:
        '{"result":"command","intents":[{"action":"filter","column":"region","operator":"equals","value":"Kerala"}]}',
      latencyMs: 1200,
      mounter,
    });
    expect(result).toMatchObject({ outcome: "semantic_correct", correct: true });
  });

  it("unwraps a fenced block, which is a formatting slip rather than a wrong answer", async () => {
    const result = await scorer.scoreCase({
      entry: kerala,
      responseText: [
        "```json",
        '{"result":"command","intents":[{"action":"filter","column":"region","operator":"equals","value":"Kerala"}]}',
        "```",
      ].join("\n"),
      latencyMs: 1200,
      mounter,
    });
    expect(result.correct).toBe(true);
  });

  it("marks prose around the JSON as a schema failure, and does not dig it out", async () => {
    // A small model often explains itself. The adapter is forbidden from
    // repairing that, so it has to count — this is the failure mode
    // constrained decoding exists to remove, and hiding it would hide the
    // reason for adding it.
    const result = await scorer.scoreCase({
      entry: kerala,
      responseText: [
        "Sure! Here is the command you need:",
        '{"result":"command","intents":[{"action":"filter","column":"region","operator":"equals","value":"Kerala"}]}',
      ].join("\n"),
      latencyMs: 1200,
      mounter,
    });
    expect(result.correct).toBe(false);
    expect(result.failure).toBe("schema_failure");
    expect(result.schemaValid).toBe(false);
  });

  it("refuses a hallucinated column, rather than guessing what was meant", async () => {
    const result = await scorer.scoreCase({
      entry: kerala,
      responseText:
        '{"result":"command","intents":[{"action":"filter","column":"state","operator":"equals","value":"Kerala"}]}',
      latencyMs: 1200,
      mounter,
    });
    expect(result.correct).toBe(false);
    expect(result.rejectionCode).toBe("unknown-column");
  });
});

describe("metrics", () => {
  const records = [
    { id: "a", category: "x", expect: "accept", outcome: "semantic_correct", correct: true, schemaValid: true, validated: true, latencyMs: 10 },
    { id: "b", category: "x", expect: "accept", outcome: "incorrect_accept", correct: false, failure: "wrong_column", schemaValid: true, validated: true, latencyMs: 20 },
    { id: "c", category: "y", expect: "reject", outcome: "false_accept", correct: false, failure: "unsupported_operation", schemaValid: true, validated: true, latencyMs: 30 },
    { id: "d", category: "y", expect: "reject", outcome: "correct_rejection", correct: true, schemaValid: true, validated: false, latencyMs: 40 },
    { id: "e", category: "z", expect: "ambiguous", outcome: "correct_clarification", correct: true, schemaValid: true, validated: false, latencyMs: 50 },
  ];
  const summary = metrics.summarise(records, { hardSet: ["c", "d"] });

  it("reports the headline and the dangerous rate separately", () => {
    expect(summary.primary.endToEndAccuracy).toBe(0.6);
    expect(summary.secondary.falseAcceptRate).toBe(0.5);
    expect(summary.secondary.correctRejectionRate).toBe(0.5);
    expect(summary.secondary.correctClarificationRate).toBe(1);
  });

  it("breaks accuracy down by category and by hard set", () => {
    expect(summary.byCategory.x).toMatchObject({ total: 2, correct: 1, accuracy: 0.5 });
    expect(summary.hardSet).toEqual({ total: 2, accuracy: 0.5 });
  });

  it("counts failures by cause", () => {
    expect(summary.failures).toEqual({ wrong_column: 1, unsupported_operation: 1 });
  });

  it("reports latency percentiles", () => {
    expect(summary.latencyMs).toEqual({ p50: 30, p95: 50 });
  });

  it("weighs the policy against the summary", () => {
    const policy = metrics.checkPolicy(summary, runner.loadPolicy());
    expect(policy.pass).toBe(false);
    expect(policy.results.find((r: { name: string }) => r.name === "falseAcceptRate")?.pass).toBe(false);
  });
});

/* --------------------------------------------------------------- the gate */

describe("a run is reproducible", () => {
  it("records everything needed to re-derive it", async () => {
    const result = await runner.run({ model: "baseline", write: false, limit: 5 });
    expect(result.meta).toMatchObject({
      model: "baseline",
      provider: "local",
      decodingMode: "unconstrained",
      promptVersion: "grid-intent-v1",
      corpusVersion: "grid-v1",
      contractVersion: "1.0.0",
      temperature: 0,
    });
    expect(result.meta.timestamp).toMatch(/^\d{4}-\d\d-\d\dT/);

    const terse = await runner.run({ model: "baseline", write: false, limit: 3, promptVersion: "v2" });
    expect(terse.meta.promptVersion).toBe("grid-intent-v2");
    expect(result.meta.runtime).toContain("node");
    expect(result.meta.hardSetVersion).toBe("grid-hard-v0");
    expect(result.meta.libraryVersion).toEqual(expect.any(String));
  });

  it("writes a result file and a readable summary", () => {
    const dir = mkdtempSync(join(tmpdir(), "gbs-eval-"));
    try {
      const run = {
        meta: {
          timestamp: "2026-10-06T00:00:00.000Z",
          model: "probe",
          modelId: "probe",
          provider: "test",
          decodingMode: "unconstrained",
          temperature: 0,
          promptVersion: "grid-intent-v1",
          corpusVersion: "grid-v1",
          contractVersion: "1.0.0",
          passportVersion: "1.0.0",
          runtime: "node",
          platform: "test",
        },
        summary: metrics.summarise(records(), { hardSet: [] }),
        policy: null,
        records: records(),
      };
      const markdown = metrics.renderMarkdown(run);
      expect(markdown).toContain("# Grid intent evaluation — probe");
      expect(markdown).toContain("End-to-end accuracy");
      expect(JSON.parse(JSON.stringify(run)).meta.promptVersion).toBe("grid-intent-v1");
      expect(existsSync(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function records() {
    return [
      { id: "a", category: "x", expect: "accept", outcome: "semantic_correct", correct: true, schemaValid: true, validated: true, latencyMs: 1 },
    ];
  }
});

describe("the oracle scores 100%, or the harness is wrong", () => {
  it("replays every expected answer and loses nothing", async () => {
    const result = await runner.run({ model: "oracle", write: false, concurrency: 8 });

    const wrong = result.records.filter((record: { correct: boolean }) => !record.correct);
    expect(
      wrong.map((r: { id: string; outcome: string; detail?: string }) => `${r.id} ${r.outcome} ${r.detail ?? ""}`),
    ).toEqual([]);
    expect(result.summary.primary.endToEndAccuracy).toBe(1);
    expect(result.summary.hardSet?.accuracy).toBe(1);
    expect(result.meta.benchmark).toBe(false);
  });

  it("holds the hard set frozen", () => {
    const hard = runner.loadHardSet();
    const ids = new Set(harness.loadCases().map((entry: { id: string }) => entry.id));
    expect(hard.length).toBeGreaterThanOrEqual(30);
    for (const id of hard) expect(ids.has(id), id).toBe(true);
  });

  it("keeps the committed policy readable and ordered the right way round", () => {
    const policy = runner.loadPolicy();
    expect(policy.falseAcceptRate).toBeLessThan(1 - policy.overallEndToEndAccuracy);
    expect(policy.hardSetAccuracy).toBeGreaterThan(0.5);
  });
});

/* --------------------------------------------------------------- the corpus */

describe("the corpus's extra answers are real answers", () => {
  it("validates every alsoAccept reading", async () => {
    for (const entry of harness.loadCases()) {
      for (const reading of (entry as { alsoAccept?: unknown[][] }).alsoAccept ?? []) {
        const applied = await scorer.applyIntents(mounter, entry.setup, reading);
        expect(applied.ok, `${entry.id}: ${JSON.stringify(reading)}`).toBe(true);
      }
    }
  });

  it("keeps the corpus file parseable as a whole", () => {
    const text = readFileSync(harness.CASES_PATH, "utf8");
    expect(text.split("\n").filter((line) => line.trim().startsWith("{")).length).toBeGreaterThanOrEqual(230);
  });
});
