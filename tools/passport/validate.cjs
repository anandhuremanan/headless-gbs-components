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

module.exports = { validateStructure, validateReferences, coverageIssues, issue };
