/*
 * Which inherited (library) properties are worth surfacing inline.
 *
 * A component like Button extends `ButtonHTMLAttributes<HTMLButtonElement>`,
 * which resolves to several hundred DOM properties. Enumerating them buries the
 * real API; omitting them entirely hides props people genuinely pass. So the
 * generator keeps the inheritance edge AND inlines a short, per-element list.
 *
 * This file is policy only. It states what is WORTH surfacing; the extractor
 * emits an entry only when the TypeChecker confirms the property actually
 * exists on that component's resolved type. Nothing here is assumed.
 */

/** Surfaced for every element kind, when present. */
const COMMON = ["className", "style", "id", "title", "tabIndex", "role", "hidden"];

/**
 * Keyed by the React attributes interface a component extends. The extractor
 * reads the resolved base type name and looks it up here; an unknown base gets
 * COMMON only.
 */
const BY_BASE = {
  ButtonHTMLAttributes: ["disabled", "type", "form", "name", "value", "autoFocus"],
  InputHTMLAttributes: [
    "disabled", "readOnly", "required", "placeholder", "name", "type", "value",
    "defaultValue", "checked", "defaultChecked", "autoComplete", "autoFocus",
    "maxLength", "minLength", "min", "max", "step", "pattern", "inputMode", "form",
  ],
  TextareaHTMLAttributes: [
    "disabled", "readOnly", "required", "placeholder", "name", "value",
    "defaultValue", "rows", "cols", "maxLength", "autoFocus", "form",
  ],
  SelectHTMLAttributes: ["disabled", "required", "name", "value", "defaultValue", "multiple", "form"],
  FormHTMLAttributes: ["action", "method", "noValidate", "name"],
  AnchorHTMLAttributes: ["href", "target", "rel", "download"],
  ImgHTMLAttributes: ["src", "alt", "loading", "width", "height"],
  DialogHTMLAttributes: ["open"],
  FieldsetHTMLAttributes: ["disabled", "form", "name"],
  LabelHTMLAttributes: ["htmlFor", "form"],
  HTMLAttributes: [],
  // `children` is meaningful on every container; the checker decides.
};

/** ARIA props are never bulk-inlined — too many — but these carry real meaning. */
const ARIA = ["aria-label", "aria-labelledby", "aria-describedby"];

/**
 * The names worth surfacing for a component, given the external base types its
 * Props interface extends. Returns a de-duplicated, stable-ordered list.
 *
 * @param {string[]} baseNames e.g. ["ButtonHTMLAttributes"]
 * @returns {string[]}
 */
function allowlistFor(baseNames) {
  const out = [...COMMON];
  for (const base of baseNames) {
    for (const name of BY_BASE[base] ?? []) {
      if (!out.includes(name)) out.push(name);
    }
  }
  for (const name of ARIA) if (!out.includes(name)) out.push(name);
  return out;
}

module.exports = { COMMON, BY_BASE, ARIA, allowlistFor };
