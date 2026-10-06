/*
 * Passport merge: derived <- manual <- local.
 *
 *   derived   generator output; regenerated from source every run
 *   manual    passport.manual.json, authored by the library, never overwritten
 *   local     passport.local.json, owned by the consuming developer, never
 *             written by the CLI
 *
 * Precedence is explicit per field rather than "deep merge everything", because
 * some fields must always come from source. A manual file that could redefine a
 * prop's type would make the passport lie about the code.
 */

/** Fields that are ALWAYS regenerated. Manual/local may annotate, never replace. */
const SOURCE_OWNED = new Set(["passportVersion", "source", "inherits", "events", "slots", "states"]);

/** Fields that only manual/local provide. The generator emits empty shells. */
const AUTHORED = new Set([
  "accessibility",
  "composition",
  "operations",
  "intentDomains",
  "safeMutations",
  "examples",
  "purpose",
]);

/*
 * Keys that mean something to JavaScript's object model rather than to a
 * passport. `JSON.parse` hands `__proto__` back as an ordinary own property,
 * but `out[k] = v` would run Object.prototype's setter and reparent the
 * merged object. No passport field needs these names, so an overlay carrying
 * one has it dropped here and flagged as an error by `validateReferences` —
 * dropped silently would be the worse half of that pair.
 */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function deepMerge(base, overlay) {
  if (!isObject(base) || !isObject(overlay)) return overlay === undefined ? base : overlay;
  const out = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (UNSAFE_KEYS.has(k)) continue;
    out[k] = isObject(v) && isObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/**
 * Overlay prop annotations by name. An overlay entry may add `description`,
 * `note` or `deprecated` to a derived prop, and may introduce a wholly new prop
 * (a locally added one) — which is marked with the overlay's origin.
 */
function mergeProps(derived, overlayProps, origin) {
  if (!Array.isArray(overlayProps) || overlayProps.length === 0) return derived;
  const byName = new Map(derived.map((p) => [p.name, { ...p }]));

  for (const entry of overlayProps) {
    if (!entry || typeof entry.name !== "string") continue;
    if (UNSAFE_KEYS.has(entry.name)) continue;
    const existing = byName.get(entry.name);
    if (existing) {
      // Annotate only. Type/required/origin stay source-derived.
      const { name, type, values, signature, typeText, required, origin: _o, ...annotations } = entry;
      Object.assign(existing, annotations);
      if (annotations.description) existing.descriptionOrigin = origin;
    } else {
      byName.set(entry.name, { ...entry, origin });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Produce the effective passport written to passport.json.
 *
 * @param {object} derived   generator output
 * @param {object} manual    passport.manual.json contents, or {}
 * @param {object} local     passport.local.json contents, or {} (consumer side)
 */
function mergePassport(derived, manual = {}, local = {}) {
  let out = { ...derived };

  for (const [overlay, origin] of [
    [manual, "manual"],
    [local, "local"],
  ]) {
    if (!overlay || Object.keys(overlay).length === 0) continue;

    for (const [key, value] of Object.entries(overlay)) {
      if (key.startsWith("$") || key === "component") continue;
      if (UNSAFE_KEYS.has(key)) continue; // validator reports it
      if (SOURCE_OWNED.has(key)) continue; // silently ignored; validator reports it

      if (key === "props") {
        out.props = mergeProps(out.props, value, origin);
        continue;
      }
      if (key === "propNotes" && isObject(value)) {
        out.props = out.props.map((p) =>
          value[p.name] ? { ...p, note: value[p.name] } : p,
        );
        continue;
      }
      if (AUTHORED.has(key)) {
        out[key] = isObject(out[key]) && isObject(value) ? deepMerge(out[key], value) : value;
        continue;
      }
      out[key] = isObject(out[key]) && isObject(value) ? deepMerge(out[key], value) : value;
    }
  }

  // Coverage is recomputed after overlays, since manual descriptions count.
  const described = out.props.filter((p) => p.description).length;
  const authoredSections = [...AUTHORED].filter((k) => {
    const v = out[k];
    return Array.isArray(v) ? v.length > 0 : isObject(v) ? Object.keys(v).length > 0 : Boolean(v);
  }).sort();

  out.coverage = {
    propsTotal: out.props.length,
    propsDescribed: described,
    describedPct: out.props.length ? Math.round((described / out.props.length) * 100) : 0,
    authoredSections,
  };

  return out;
}

module.exports = { mergePassport, deepMerge, mergeProps, SOURCE_OWNED, AUTHORED, UNSAFE_KEYS };
