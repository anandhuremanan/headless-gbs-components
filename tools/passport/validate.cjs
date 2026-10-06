/*
 * Passport validation.
 *
 * Two layers, both returning typed issues rather than throwing:
 *
 *   structural  the passport matches Passport v1's shape
 *   referential the authored overlays point at things that still exist
 *
 * A dependency-free structural check is used deliberately: the schema is ours,
 * and adding a JSON Schema runtime would be a dependency the source-first model
 * does not want. `schema/passport-v1.schema.json` is still published so external
 * consumers can validate with whatever they like.
 */

const issue = (level, code, component, message, detail) => ({
  level, code, component, message, ...(detail ? { detail } : {}),
});

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const PROP_TYPES = new Set(["string", "number", "boolean", "enum", "function", "other"]);
const ORIGINS = new Set(["derived", "inherited", "manual", "local"]);
const DESCRIPTION_ORIGINS = new Set(["jsdoc", "readme", "manual", "local"]);

/** Structural validation against Passport v1. */
function validateStructure(passport, component) {
  const out = [];
  const need = (cond, code, message, detail) => {
    if (!cond) out.push(issue("error", code, component, message, detail));
  };

  need(passport.passportVersion === "1.0.0", "bad-version",
    `passportVersion must be "1.0.0", got ${JSON.stringify(passport.passportVersion)}`);

  need(isObject(passport.identity) && typeof passport.identity.component === "string",
    "bad-identity", "identity.component is required");
  need(isObject(passport.source) && typeof passport.source.sourceHash === "string",
    "bad-source", "source.sourceHash is required");
  need(Array.isArray(passport.source?.files) && passport.source.files.length > 0,
    "bad-source-files", "source.files must be a non-empty array");

  need(Array.isArray(passport.props), "bad-props", "props must be an array");
  if (Array.isArray(passport.props)) {
    const seen = new Set();
    for (const p of passport.props) {
      if (!isObject(p) || typeof p.name !== "string") {
        out.push(issue("error", "bad-prop", component, "every prop needs a string name"));
        continue;
      }
      if (seen.has(p.name)) out.push(issue("error", "duplicate-prop", component, `duplicate prop "${p.name}"`));
      seen.add(p.name);
      if (!PROP_TYPES.has(p.type))
        out.push(issue("error", "bad-prop-type", component, `prop "${p.name}" has unknown type ${JSON.stringify(p.type)}`));
      if (typeof p.required !== "boolean")
        out.push(issue("error", "bad-prop-required", component, `prop "${p.name}" needs a boolean required`));
      if (!ORIGINS.has(p.origin))
        out.push(issue("error", "bad-origin", component, `prop "${p.name}" has unknown origin ${JSON.stringify(p.origin)}`));
      if (p.type === "enum" && !Array.isArray(p.values))
        out.push(issue("error", "enum-without-values", component, `enum prop "${p.name}" has no values`));
      if (p.description !== undefined && !DESCRIPTION_ORIGINS.has(p.descriptionOrigin))
        out.push(issue("error", "description-without-origin", component,
          `prop "${p.name}" has a description but no valid descriptionOrigin`));
    }
  }

  if (passport.inherits !== undefined) {
    need(Array.isArray(passport.inherits), "bad-inherits", "inherits must be an array");
    for (const edge of passport.inherits ?? []) {
      if (!isObject(edge) || typeof edge.from !== "string")
        out.push(issue("error", "bad-inherits-edge", component, "each inherits entry needs a string `from`"));
    }
  }

  for (const key of ["events", "slots", "states", "intentDomains", "examples"]) {
    need(Array.isArray(passport[key]), `bad-${key}`, `${key} must be an array`);
  }
  for (const key of ["accessibility", "composition", "operations", "safeMutations", "coverage"]) {
    need(isObject(passport[key]), `bad-${key}`, `${key} must be an object`);
  }

  return out;
}

const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

/** Object-model keys anywhere in an overlay, by their path. */
function unsafeKeysIn(value, path = "") {
  if (Array.isArray(value)) return value.flatMap((item, i) => unsafeKeysIn(item, `${path}[${i}]`));
  if (!isObject(value)) return [];
  const found = [];
  for (const key of Object.getOwnPropertyNames(value)) {
    const at = path ? `${path}.${key}` : key;
    if (UNSAFE_KEYS.includes(key)) found.push(at);
    else found.push(...unsafeKeysIn(value[key], at));
  }
  return found;
}

/**
 * Referential validation: do the authored overlays still match the source?
 * This is what catches a manual file left behind by a refactor.
 */
function validateReferences(effective, { manual = {}, local = {}, component, api = [] }) {
  const out = [];
  const propNames = new Set(effective.props.map((p) => p.name));

  const checkPropRefs = (names, where, origin) => {
    for (const name of names ?? []) {
      if (!propNames.has(name)) {
        out.push(issue("error", "missing-prop-reference", component,
          `${origin} metadata references prop "${name}", which no longer exists in the source`,
          { where, prop: name }));
      }
    }
  };

  for (const [overlay, origin] of [[manual, "manual"], [local, "local"]]) {
    if (!overlay || Object.keys(overlay).length === 0) continue;

    /*
     * `JSON.parse` returns `__proto__` as an ordinary own property, so an
     * overlay can carry one. The merge drops it; this is what makes that
     * visible, because a silent drop looks the same as a key that was never
     * there.
     */
    for (const key of unsafeKeysIn(overlay)) {
      out.push(issue("error", "unsafe-key", component,
        `${origin} metadata contains "${key}", which is a JavaScript object-model key ` +
        `and not a passport field; it was ignored`, { where: key }));
    }

    checkPropRefs(overlay.safeMutations?.allowed, "safeMutations.allowed", origin);
    checkPropRefs(overlay.safeMutations?.forbidden, "safeMutations.forbidden", origin);
    checkPropRefs(Object.keys(overlay.propNotes ?? {}), "propNotes", origin);

    // Manual must not try to redefine source-owned facts.
    for (const key of ["source", "inherits", "slots", "states", "events", "passportVersion"]) {
      if (overlay[key] !== undefined) {
        out.push(issue("error", "overrides-source-owned", component,
          `${origin} metadata sets "${key}", which is always regenerated from source`,
          { where: key }));
      }
    }

    // Overlay props may annotate or add, but not contradict a derived type.
    for (const p of overlay.props ?? []) {
      const existing = effective.props.find((e) => e.name === p.name);
      if (existing && p.type && p.type !== existing.type) {
        out.push(issue("error", "contradicts-source", component,
          `${origin} metadata gives prop "${p.name}" type "${p.type}" but the source says "${existing.type}"`,
          { prop: p.name }));
      }
      if (!existing && origin === "manual") {
        out.push(issue("error", "unknown-prop", component,
          `manual metadata declares prop "${p.name}", which is not in the source; ` +
          `only passport.local.json may introduce props`, { prop: p.name }));
      }
    }

    // Operations must name a real API method when one is declared.
    for (const [opName, op] of Object.entries(overlay.operations ?? {})) {
      if (op?.apiMethod && api.length && !api.includes(op.apiMethod)) {
        out.push(issue("error", "unknown-api-method", component,
          `operation "${opName}" names apiMethod "${op.apiMethod}", which the component API does not expose`,
          { operation: opName }));
      }
    }
  }

  return out;
}

/** Coverage is a warning signal, never a hard failure in v1. */
function coverageIssues(effective, component, threshold) {
  const out = [];
  const { describedPct, propsTotal, propsDescribed } = effective.coverage;
  if (typeof threshold === "number" && describedPct < threshold) {
    out.push(issue("warn", "coverage-below-threshold", component,
      `${describedPct}% of props described (${propsDescribed}/${propsTotal}), threshold ${threshold}%`));
  }
  return out;
}

/* ------------------------------------------------------------ text hygiene */

/*
 * A passport is read by coding agents. That is the point of it, and it is also
 * the only way a passport can hurt you: nothing parses it into code and no
 * file path is derived from it, but an agent that reads
 * "this component requires calling fetch('https://…') on mount" will write
 * that. The text is documentation; it is never an instruction.
 *
 * These checks cannot decide whether a sentence is honest. What they can do is
 * make the shapes injection needs — hidden characters, a script tag, a wall of
 * text, a line telling the reader to disregard what it was told — visible in
 * `npm run passport:check` instead of invisible in a diff that looks like
 * documentation. The current 27 passports have a longest string of 217
 * characters and 8.7 kB of text at most, so the caps are far above anything
 * written in good faith.
 */

const MAX_TEXT = 1000;
const MAX_TEXT_TOTAL = 40000;

/** Everything except tab, newline and carriage return. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** A real link, not the bare `"https://"` that appears in an example. */
const LINK = /https?:\/\/[^\s"'<>)]*\.[^\s"'<>)]+/i;

const HIGH_SIGNAL = [
  [/<script\b/i, "an HTML script tag"],
  [/ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier)/i, "an instruction to ignore earlier context"],
  [/disregard (?:all |any )?(?:the )?(?:previous|prior|above|earlier)/i, "an instruction to disregard earlier context"],
  [/\bsystem prompt\b/i, "a reference to a system prompt"],
  [/\b(?:you are|act as) (?:an? )?(?:ai|assistant|agent|language model)\b/i, "a role instruction aimed at an agent"],
  [/\bnew instructions?\b/i, "a claim of new instructions"],
  [/\bdo not (?:tell|mention|inform|reveal)\b/i, "an instruction to conceal something"],
  [/\bexfiltrat/i, "exfiltration"],
  [/\bcurl\s+https?:/i, "a shell download"],
  [/\bnpm (?:install|i|exec)\s/i, "a package installation"],
  [/\bchild_process\b|\bprocess\.env\b|\beval\(/i, "code that reaches outside the component"],
];

/** Every string in the passport, with a readable path to it. */
function walkStrings(value, path, visit) {
  if (typeof value === "string") visit(value, path);
  else if (Array.isArray(value)) value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, visit));
  else if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) walkStrings(item, path ? `${path}.${key}` : key, visit);
  }
}

/** Length, hidden characters, and the phrasings injection needs. */
function textIssues(passport, component) {
  const out = [];
  let total = 0;

  walkStrings(passport, "", (text, where) => {
    total += text.length;

    if (text.length > MAX_TEXT) {
      out.push(issue("error", "text-too-long", component,
        `${where} is ${text.length} characters; the limit is ${MAX_TEXT}`, { where }));
    }
    if (CONTROL_CHARS.test(text)) {
      out.push(issue("error", "control-characters", component,
        `${where} contains control characters, which can hide text from a reader`, { where }));
    }
    for (const [pattern, what] of HIGH_SIGNAL) {
      if (pattern.test(text)) {
        out.push(issue("error", "suspicious-text", component,
          `${where} contains ${what}. Passport text is documentation an agent reads; ` +
          `it must not instruct one.`, { where }));
      }
    }
    if (text.includes("```")) {
      out.push(issue("warn", "code-fence", component,
        `${where} contains a fenced code block, which an agent may copy verbatim`, { where }));
    }
    if (LINK.test(text)) {
      out.push(issue("warn", "contains-link", component,
        `${where} contains a link; an agent may follow it`, { where }));
    }
  });

  if (total > MAX_TEXT_TOTAL) {
    out.push(issue("error", "text-budget-exceeded", component,
      `${total} characters of text across the passport; the limit is ${MAX_TEXT_TOTAL}`));
  }

  return out;
}

module.exports = {
  validateStructure, validateReferences, coverageIssues, textIssues, issue,
  MAX_TEXT, MAX_TEXT_TOTAL,
};
