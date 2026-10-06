/*
 * The grid utterance corpus, checked against the real validator.
 *
 * Without a model there is no accuracy to measure, and that is fine — this is
 * not measuring a model. It is measuring the *contract*: whether every reading
 * a person would reasonably expect can be expressed as a command this grid
 * accepts, and whether everything that should be refused is refused with the
 * reason we claim. A case that cannot be expressed is a hole in the operation
 * set, and the time to find those is before the set is frozen.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCases, loadFixture, mount, type EvalCase } from "../harness";
import {
  GRID_OPERATIONS,
  type GridOperationName,
} from "../../../source/beta-components/data-grid/agent";

const cases = loadCases();
const fixture = loadFixture();

/** A fresh grid per case: state must not leak from one utterance to the next. */
async function run(entry: EvalCase) {
  const { agent } = mount(fixture);
  for (const step of entry.setup ?? []) {
    const result = await agent.execute(step, { confirm: true });
    if (result.status === "rejected") {
      throw new Error(`setup for ${entry.id} was rejected: ${result.reason}`);
    }
  }
  return agent;
}

describe("corpus shape", () => {
  it("has at least 200 cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(200);
  });

  it("gives every case a unique id", () => {
    const ids = cases.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every case the fields the runner needs", () => {
    for (const entry of cases) {
      expect(entry, entry.id).toMatchObject({
        id: expect.any(String),
        category: expect.any(String),
        utterance: expect.any(String),
        expect: expect.stringMatching(/^(accept|reject|ambiguous)$/),
      });
      expect(Array.isArray(entry.intents), entry.id).toBe(true);
      expect(entry.intents.length, entry.id).toBeGreaterThan(0);
      if (entry.expect === "reject") expect(entry.code, entry.id).toEqual(expect.any(String));
    }
  });

  it("covers every category the corpus claims", () => {
    const counts = new Map<string, number>();
    for (const entry of cases) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    const required = [
      "filter-simple", "filter-compound", "sort", "search", "selection", "clear",
      "export", "history", "pagination", "columns", "relative", "scale",
      "percent", "case", "ambiguous", "unsupported", "wrong-column", "wrong-operator", "policy",
    ];
    for (const category of required) {
      expect(counts.get(category) ?? 0, `category ${category}`).toBeGreaterThan(0);
    }
  });

  it("does not invent an operation the component lacks", () => {
    const known = new Set(Object.keys(GRID_OPERATIONS));
    for (const entry of cases) {
      if (entry.expect === "reject") continue;
      for (const intent of [...entry.intents, ...(entry.alternatives ?? []).flat()]) {
        const action = (intent as { action?: string }).action;
        expect(known.has(action ?? ""), `${entry.id} uses "${action}"`).toBe(true);
      }
    }
  });
});

describe("accepted cases are expressible", () => {
  const accepted = cases.filter((entry) => entry.expect === "accept");

  it.each(accepted.map((entry) => [entry.id, entry] as const))("%s", async (_id, entry) => {
    const agent = await run(entry);
    const result = agent.validate(entry.intents);
    if (result.status === "rejected") {
      throw new Error(`${entry.id} "${entry.utterance}" → ${result.code}: ${result.reason}`);
    }
    expect(result.commands).toHaveLength(entry.intents.length);
    if (entry.confirm) expect(result.status, entry.id).toBe("needs-confirmation");
  });
});

describe("rejected cases are refused, for the stated reason", () => {
  const rejected = cases.filter((entry) => entry.expect === "reject");

  it.each(rejected.map((entry) => [entry.id, entry] as const))("%s", async (_id, entry) => {
    const agent = await run(entry);
    const result = agent.validate(entry.intents);
    expect(result.status, `${entry.id} "${entry.utterance}"`).toBe("rejected");
    if (result.status !== "rejected") return;
    expect(result.code, `${entry.id}: ${result.reason}`).toBe(entry.code);
  });
});

describe("ambiguous cases have more than one defensible reading", () => {
  const ambiguous = cases.filter((entry) => entry.expect === "ambiguous");

  it.each(ambiguous.map((entry) => [entry.id, entry] as const))("%s", async (_id, entry) => {
    expect(entry.alternatives?.length, `${entry.id} needs alternatives`).toBeGreaterThan(0);
    for (const reading of [entry.intents, ...(entry.alternatives ?? [])]) {
      const agent = await run(entry);
      const result = agent.validate(reading);
      if (result.status === "rejected") {
        throw new Error(`${entry.id} reading ${JSON.stringify(reading)} → ${result.reason}`);
      }
    }
  });
});

describe("the passport and the runtime agree", () => {
  const passport = JSON.parse(
    readFileSync(
      new URL("../../../source/beta-components/data-grid/passport.json", import.meta.url),
      "utf8",
    ),
  ) as { operations: Record<string, { apiMethod?: string; reversible?: boolean; summary?: string }> };

  it("declares the same operation set", () => {
    expect(Object.keys(passport.operations).sort()).toEqual(Object.keys(GRID_OPERATIONS).sort());
  });

  it("names the same API method, or none, for each", () => {
    for (const [name, operation] of Object.entries(passport.operations)) {
      const runtime = GRID_OPERATIONS[name as GridOperationName];
      expect(operation.apiMethod, name).toBe(runtime.apiMethod);
      expect(operation.reversible, name).toBe(runtime.reversible);
      expect(operation.summary, name).toBe(runtime.summary);
    }
  });
});
