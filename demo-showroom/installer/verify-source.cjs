#!/usr/bin/env node

/*
 * Checks that source/beta-components is something the installer can actually
 * install. Run it in the CLI repo after syncing components across:
 *
 *   node verify-source.cjs
 *
 * It reads the component list straight out of the installer script, so the two
 * cannot drift. Exits non-zero on anything that would break a user's install.
 *
 * The .cjs extension is deliberate: the CLI package is `"type": "module"`, so a
 * plain .js file there is an ES module and `require` is not defined in it.
 */

const fs = require("fs");
const path = require("path");

const CLI_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;

/** The installer script, whatever it is called here. `bin` points at index.cjs. */
const INDEX = ["index.cjs", "index.js", "index.mjs"]
  .map((name) => path.join(CLI_ROOT, name))
  .find((candidate) => fs.existsSync(candidate));
const BETA = path.join(CLI_ROOT, "source", "beta-components");
const SHARED_DIR = "shared";
const TESTS_DIR = "__tests__";

const ALLOWED_PACKAGES = new Set(["react", "react-dom", "react-dom/client", "vitest"]);
const LEGACY_FILES = ["utils.ts", "globalStyle.ts", "theme.ts", "icon"];

const problems = [];
const warnings = [];
const fail = (message) => problems.push(message);
const warn = (message) => warnings.push(message);

/** Pulls a literal out of index.js, so this script never holds its own copy. */
function configLiteral(source, key) {
  const start = source.indexOf(`${key}: `);
  if (start === -1) return null;
  const open = start + `${key}: `.length;
  const closer = { "[": "]", "{": "}" }[source[open]];
  if (!closer) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === source[open]) depth += 1;
    else if (source[i] === closer) {
      depth -= 1;
      if (depth === 0) {
        return new Function(`return ${source.slice(open, i + 1)}`)();
      }
    }
  }
  return null;
}

/** Source files, skipping __tests__ because the installer does not copy it. */
function sourceFiles(dir, prefix = "") {
  return fs.readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === TESTS_DIR) return [];
    if (entry.isDirectory()) return sourceFiles(dir, relative);
    return /\.tsx?$/.test(entry.name) ? [relative] : [];
  });
}

function specifiers(file) {
  // Comments are stripped first: a doc comment mentioning `from "…"` is not an
  // import, and reporting it as one sends people looking for a bug they do not
  // have.
  const text = fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  return [...text.matchAll(/from\s+"([^"]+)"|import\("([^"]+)"\)/g)].map((m) => m[1] ?? m[2]);
}

/* ------------------------------------------------------------------ checks */

if (!INDEX) {
  console.error(`No index.cjs or index.js in ${CLI_ROOT}. Pass the CLI repo root as an argument.`);
  process.exit(1);
}
if (!fs.existsSync(BETA)) {
  console.error(`No source/beta-components at ${BETA}.`);
  process.exit(1);
}

const indexSource = fs.readFileSync(INDEX, "utf8");
const betaComponents = configLiteral(indexSource, "betaComponents") || [];
const betaFolders = configLiteral(indexSource, "betaFolders") || {};
const folderFor = (component) => betaFolders[component] || component.toLowerCase();

if (betaComponents.length === 0) fail(`Could not read betaComponents out of ${path.basename(INDEX)}.`);

// 1. shared/ is there, and its two version files agree.
const sharedPath = path.join(BETA, SHARED_DIR);
if (!fs.existsSync(sharedPath)) {
  fail(
    `source/beta-components/${SHARED_DIR} is missing. Every beta component imports it; ` +
      "without it each one fails to compile the moment it is installed.",
  );
} else {
  const manifestPath = path.join(sharedPath, "version.json");
  const versionTsPath = path.join(sharedPath, "version.ts");
  if (!fs.existsSync(manifestPath)) {
    fail(`${SHARED_DIR}/version.json is missing; the installer cannot compare versions.`);
  } else if (fs.existsSync(versionTsPath)) {
    const json = JSON.parse(fs.readFileSync(manifestPath, "utf8")).version;
    const ts = (fs.readFileSync(versionTsPath, "utf8").match(/version = "([^"]+)"/) || [])[1];
    if (json !== ts) fail(`shared version.json (${json}) and version.ts (${ts}) disagree.`);
  }
}

// 2. Every listed component has a folder under the name the installer will use.
for (const component of betaComponents) {
  const folder = path.join(BETA, folderFor(component));
  if (!fs.existsSync(folder)) {
    const guess = fs
      .readdirSync(BETA)
      .find((name) => name.replace(/-/g, "") === folderFor(component).replace(/-/g, ""));
    fail(
      `-a ${component} -beta looks for source/beta-components/${folderFor(component)}, which does not exist.` +
        (guess ? ` Found "${guess}" instead: rename it, or fix CONFIG.betaFolders in ${path.basename(INDEX)}.` : ""),
    );
  }
}

// 3. Folders present but not installable, because nothing lists them.
const listed = new Set([...betaComponents.map(folderFor), SHARED_DIR]);
for (const entry of fs.readdirSync(BETA, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    warn(`source/beta-components/${entry.name} is a loose file; only folders are installed.`);
  } else if (!listed.has(entry.name)) {
    warn(`source/beta-components/${entry.name} is not in betaComponents, so nobody can install it.`);
  }
}
for (const legacy of LEGACY_FILES) {
  if (fs.existsSync(path.join(BETA, legacy))) {
    warn(`source/beta-components/${legacy} belongs to the legacy set; no beta component imports it.`);
  }
}

// 4. Imports: nothing crosses between components, nothing comes from npm.
for (const entry of fs.readdirSync(BETA, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkg = entry.name;
  for (const file of sourceFiles(path.join(BETA, pkg))) {
    const full = path.join(BETA, pkg, file);
    for (const specifier of specifiers(full)) {
      if (!specifier.startsWith(".")) {
        if (!ALLOWED_PACKAGES.has(specifier)) {
          fail(`${pkg}/${file} imports "${specifier}", which the user's project may not have.`);
        }
        continue;
      }
      const resolved = path.resolve(path.dirname(full), specifier);
      const relative = path.relative(BETA, resolved);
      if (relative.startsWith("..")) {
        fail(`${pkg}/${file} imports "${specifier}", which points outside beta-components.`);
        continue;
      }
      const target = relative.split(path.sep)[0];
      if (target !== pkg && target !== SHARED_DIR) {
        fail(`${pkg}/${file} imports "${specifier}" from the ${target} component. Install ${pkg} on its own and it breaks.`);
      }
      const exists = [".ts", ".tsx", "/index.ts", "/index.tsx", ""].some((extension) =>
        fs.existsSync(resolved + extension),
      );
      if (!exists) fail(`${pkg}/${file} imports "${specifier}", which does not exist.`);
    }
  }
}

/* ------------------------------------------------------------------ report */

const componentCount = betaComponents.length;
if (warnings.length > 0) {
  console.log("Warnings:");
  warnings.forEach((message) => console.log(`  ! ${message}`));
  console.log("");
}

if (problems.length > 0) {
  console.error(`${problems.length} problem(s) would break an install:`);
  problems.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}

console.log(`✓ ${componentCount} beta components and ${SHARED_DIR}/ check out.`);
