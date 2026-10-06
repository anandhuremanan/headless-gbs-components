/*
 * Passport orchestration: generate, check, regen.
 *
 * `generate` and `regen` write passport.json. `check` writes nothing and exits
 * non-zero on drift — that is the CI gate.
 */

const fs = require("fs");
const path = require("path");

const {
  PASSPORT_VERSION, loadTypeScript, createProgram, extractComponent, posix,
} = require("./extract.cjs");
const { mergePassport } = require("./merge.cjs");
const { validateStructure, validateReferences, coverageIssues } = require("./validate.cjs");

const MANUAL_FILE = "passport.manual.json";
const LOCAL_FILE = "passport.local.json";
const PASSPORT_FILE = "passport.json";

const readJson = (file) => {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const e = new Error(`${file} is not valid JSON: ${error.message}`);
    e.code = "EBADJSON";
    throw e;
  }
};

/** Stable key order + trailing newline, so writes are byte-identical run to run. */
function serialise(passport) {
  const ORDER = [
    "passportVersion", "identity", "source", "purpose", "props", "inherits", "events",
    "slots", "states", "accessibility", "composition", "operations", "intentDomains",
    "safeMutations", "examples", "coverage",
  ];
  const ordered = {};
  for (const key of ORDER) if (passport[key] !== undefined) ordered[key] = passport[key];
  for (const key of Object.keys(passport)) if (!(key in ordered)) ordered[key] = passport[key];
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** Components in a beta-components root, excluding `shared`. */
function listComponents(libRoot) {
  return fs
    .readdirSync(libRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "shared")
    .map((e) => e.name)
    .sort();
}

/** Best-effort locate React's types so the checker can resolve DOM attributes. */
function findReactTypes(startDir) {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "node_modules", "@types", "react");
    if (fs.existsSync(candidate)) return posix(candidate);
    const nested = path.join(dir, "demo-showroom", "node_modules", "@types", "react");
    if (fs.existsSync(nested)) return posix(nested);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Build the effective passport for every component.
 *
 * @param {object} opts
 * @param {string} opts.libRoot  directory holding the component folders
 * @param {string} opts.repoRoot for stable relative paths in the hash
 * @param {string} opts.libraryVersion
 * @param {boolean} [opts.includeLocal] read passport.local.json (consumer side)
 * @param {number} [opts.coverageThreshold]
 */
function buildAll(opts) {
  const { libRoot, repoRoot, libraryVersion, includeLocal = false, coverageThreshold } = opts;
  const ts = loadTypeScript([repoRoot, path.join(repoRoot, "demo-showroom")]);
  const components = listComponents(libRoot);
  const reactTypes = findReactTypes(repoRoot) || findReactTypes(__dirname);
  const program = createProgram(ts, libRoot, components, reactTypes);
  const checker = program.getTypeChecker();

  const results = [];
  for (const name of components) {
    const dir = path.join(libRoot, name);
    const { passport: derived, api, stats } = extractComponent(ts, program, checker, {
      name, dir, libRoot, libraryVersion, repoRoot,
    });

    const manual = readJson(path.join(dir, MANUAL_FILE));
    const local = includeLocal ? readJson(path.join(dir, LOCAL_FILE)) : {};
    const effective = mergePassport(derived, manual, local);

    /*
     * Without React's type definitions the checker cannot resolve
     * ButtonHTMLAttributes and friends, so every inherited prop silently
     * disappears — and the reference check then blames the manual file for
     * naming props that "no longer exist". Say what actually happened.
     */
    const unresolvedInherits =
      !reactTypes && Array.isArray(effective.inherits) && effective.inherits.length > 0;

    const issues = [
      ...validateStructure(effective, name),
      ...(unresolvedInherits
        ? [{
            level: "warn",
            code: "react-types-unresolved",
            component: name,
            message:
              "React type definitions were not found, so inherited props could not be " +
              "resolved. Install @types/react to get the full prop surface.",
          }]
        : validateReferences(effective, { manual, local, component: name, api })),
      ...coverageIssues(effective, name, coverageThreshold),
    ];

    results.push({ name, dir, derived, manual, local, effective, issues, stats, api });
  }
  return { results, reactTypes, components };
}

/** Write passport.json for each component. Returns the paths written. */
function generate(opts) {
  const { results } = buildAll(opts);
  const written = [];
  for (const r of results) {
    const file = path.join(r.dir, PASSPORT_FILE);
    const next = serialise(r.effective);
    const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (prev !== next) {
      fs.writeFileSync(file, next);
      written.push(posix(path.relative(opts.repoRoot, file)));
    }
  }
  return { results, written };
}

/**
 * CI gate. Regenerates in memory and compares with what is committed.
 * Never writes.
 */
function check(opts) {
  const { results } = buildAll(opts);
  const report = [];
  let errors = 0;
  let warnings = 0;

  for (const r of results) {
    const file = path.join(r.dir, PASSPORT_FILE);
    const expected = serialise(r.effective);
    const actual = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;

    const problems = [...r.issues];
    if (actual === null) {
      problems.unshift({ level: "error", code: "missing-passport", component: r.name,
        message: "no passport.json committed; run `npm run passport`" });
    } else if (actual !== expected) {
      const reason =
        JSON.parse(actual).source?.sourceHash !== r.effective.source.sourceHash
          ? "source changed since the passport was generated"
          : "committed passport differs from generated output";
      problems.unshift({ level: "error", code: "stale-passport", component: r.name,
        message: `passport stale — ${reason}; run \`npm run passport\`` });
    }

    errors += problems.filter((p) => p.level === "error").length;
    warnings += problems.filter((p) => p.level === "warn").length;
    report.push({ component: r.name, ok: problems.every((p) => p.level !== "error"), problems, stats: r.stats });
  }

  return { report, errors, warnings, results };
}

module.exports = {
  PASSPORT_VERSION, MANUAL_FILE, LOCAL_FILE, PASSPORT_FILE,
  buildAll, generate, check, serialise, listComponents, readJson, findReactTypes,
};
