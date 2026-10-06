/*
 * Reads `.env` at the repository root, so a key can live in a file instead of
 * being re-exported into every new shell.
 *
 * Written rather than installed for the same reason as everything else here:
 * this is twenty lines, and `dotenv` would be a dependency the published
 * package has to carry for a dev-only tool.
 *
 * A real environment variable always wins. That ordering matters — CI sets
 * secrets in the environment, and a stale `.env` on someone's laptop silently
 * overriding them would be a genuinely confusing afternoon.
 */

const fs = require("fs");
const path = require("path");

/** Parses the `KEY=value` subset: comments, blank lines, optional quotes. */
function parse(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim().replace(/^export\s+/, "");
    let value = trimmed.slice(equals + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Fills in anything the environment does not already define.
 *
 * @returns the names loaded — never the values, which should not be logged.
 */
function load(root = process.cwd()) {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return [];

  const loaded = [];
  for (const [key, value] of Object.entries(parse(fs.readFileSync(file, "utf8")))) {
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
    // A blank line in `.env.example` that nobody filled in is not a key, and
    // reporting it as one implies a credential that is not there.
    if (value !== "") loaded.push(key);
  }
  return loaded;
}

module.exports = { load, parse };
