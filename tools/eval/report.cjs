#!/usr/bin/env node
/*
 * `npm run eval:grid` — what the corpus covers, and what it does not.
 *
 * Deliberately not a pass/fail gate: that is
 * `tools/eval/__tests__/corpus.test.ts`, which runs every case through the
 * real validator. This prints the shape of the corpus so a gap is visible
 * before someone trips over it — an operation nobody wrote an utterance for
 * is an operation nobody has thought about.
 *
 * The operation list comes from the DataGrid passport rather than a copy kept
 * here, so it cannot drift.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const CASES = path.join(ROOT, "eval", "grid", "v0", "cases.jsonl");
const PASSPORT = path.join(ROOT, "source", "beta-components", "data-grid", "passport.json");

const pad = (text, width) => String(text).padEnd(width);
const bar = (n, max, width = 24) =>
  "#".repeat(Math.max(n > 0 ? 1 : 0, Math.round((n / max) * width)));

function main() {
  const cases = fs
    .readFileSync(CASES, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"))
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error(`cases.jsonl line ${i + 1}: ${error.message}`);
        process.exit(1);
      }
    });

  const operations = Object.keys(JSON.parse(fs.readFileSync(PASSPORT, "utf8")).operations);

  const byCategory = new Map();
  const byExpect = new Map();
  const byCode = new Map();
  const used = new Map();

  for (const entry of cases) {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
    byExpect.set(entry.expect, (byExpect.get(entry.expect) ?? 0) + 1);
    if (entry.code) byCode.set(entry.code, (byCode.get(entry.code) ?? 0) + 1);

    const intents = [
      ...(entry.intents ?? []),
      ...(entry.alternatives ?? []).flat(),
      ...(entry.setup ?? []),
    ];
    for (const intent of intents) {
      const action = intent && intent.action;
      if (operations.includes(action)) used.set(action, (used.get(action) ?? 0) + 1);
    }
  }

  const max = Math.max(...byCategory.values());
  console.log(`\ngrid utterance corpus v0 — ${cases.length} cases\n`);

  console.log("by category");
  for (const [category, count] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pad(category, 18)} ${pad(count, 4)} ${bar(count, max)}`);
  }

  console.log("\nby outcome");
  for (const [outcome, count] of [...byExpect].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pad(outcome, 18)} ${count}`);
  }

  console.log("\nrejection codes exercised");
  for (const [code, count] of [...byCode].sort()) {
    console.log(`  ${pad(code, 26)} ${count}`);
  }

  const uncovered = operations.filter((name) => !used.has(name));
  console.log(`\noperations covered: ${operations.length - uncovered.length}/${operations.length}`);
  if (uncovered.length > 0) console.log(`  no utterance for: ${uncovered.join(", ")}`);

  const notes = cases.filter((entry) => entry.note).length;
  console.log(`\n${notes} case(s) carry a note about a limitation or a judgement call.\n`);
}

main();
