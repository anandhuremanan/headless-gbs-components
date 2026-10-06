#!/usr/bin/env node
/*
 * Passport CLI used inside this repository.
 *
 *   node tools/passport/cli.cjs            generate / refresh passport.json
 *   node tools/passport/cli.cjs --check    CI gate; writes nothing, exits 1 on drift
 *
 * The consumer-facing entry point is `gbs-add-block --passport`, which calls the
 * same functions against the copied component-lib folder.
 */

const path = require("path");
const fs = require("fs");
const { generate, check } = require("./index.cjs");

const REPO = path.resolve(__dirname, "..", "..");
const LIB = path.join(REPO, "source", "beta-components");
const COVERAGE_THRESHOLD = 40; // ratchet upward over time

const args = process.argv.slice(2);
const wantCheck = args.includes("--check");
const quiet = args.includes("--quiet");
const libraryVersion = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).version;

const opts = {
  libRoot: LIB,
  repoRoot: REPO,
  libraryVersion,
  includeLocal: false,
  coverageThreshold: COVERAGE_THRESHOLD,
};

function main() {
  if (wantCheck) {
    const { report, errors, warnings } = check(opts);
    for (const row of report) {
      if (row.ok && row.problems.length === 0) {
        if (!quiet) console.log(`  ${row.component}: OK`);
        continue;
      }
      for (const p of row.problems) {
        const mark = p.level === "error" ? "✗" : "!";
        console.log(`  ${mark} ${p.component}: ${p.message}`);
      }
    }
    console.log(
      `\n${report.length} components · ${errors} error(s) · ${warnings} warning(s)`,
    );
    if (errors > 0) {
      console.error("\nPassports are out of date. Run `npm run passport` and commit the result.");
      process.exit(1);
    }
    return;
  }

  const { results, written } = generate(opts);
  const errors = results.flatMap((r) => r.issues.filter((i) => i.level === "error"));
  const warns = results.flatMap((r) => r.issues.filter((i) => i.level === "warn"));

  for (const e of errors) console.error(`  ✗ ${e.component}: ${e.message}`);
  if (!quiet) for (const w of warns) console.log(`  ! ${w.component}: ${w.message}`);

  console.log(
    `\n${results.length} passports generated · ${written.length} file(s) changed · ` +
      `${errors.length} error(s) · ${warns.length} warning(s)`,
  );
  if (written.length && !quiet) for (const f of written) console.log(`    ${f}`);
  if (errors.length > 0) process.exit(1);
}

try {
  main();
} catch (error) {
  if (error.code === "ETYPESCRIPT_MISSING" || error.code === "EBADJSON") {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
