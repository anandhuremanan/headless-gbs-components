/**
 * Reading numbers the way the person in front of the screen writes them.
 *
 * This is the reason the component exists. `<input type="number">` understands
 * one notation, roughly the C locale's, so a German typing `1.234,56` or an
 * Egyptian typing `١٢٣٤` hands it something it calls invalid — and an invalid
 * number input reports its value as the empty string, which loses what was
 * typed as well as the meaning.
 *
 * Every part of a locale's notation is discovered from `Intl` rather than
 * listed here: format a known number, look at the pieces that come back, and
 * you have that locale's group separator, decimal separator, minus sign and
 * digits, for any locale the runtime supports.
 */

export interface NumberLocaleParts {
  group: string;
  decimal: string;
  minus: string;
  /** The locale's digits, ASCII 0-9 in order. Latin digits for most locales. */
  digits: readonly string[];
}

const partsCache = new Map<string, NumberLocaleParts>();

function partValue(parts: Intl.NumberFormatPart[], type: Intl.NumberFormatPartTypes, fallback: string) {
  return parts.find((part) => part.type === type)?.value ?? fallback;
}

/** The notation one locale uses, read out of `Intl` once and kept. */
export function localeParts(locale?: string): NumberLocaleParts {
  const key = locale ?? "";
  const cached = partsCache.get(key);
  if (cached) return cached;

  const format = new Intl.NumberFormat(locale);
  const sample = format.formatToParts(-12345.6);
  const digits = Array.from({ length: 10 }, (_, index) =>
    format.format(index).replace(/\s/g, ""),
  );

  const parts: NumberLocaleParts = {
    group: partValue(sample, "group", ","),
    decimal: partValue(sample, "decimal", "."),
    minus: partValue(sample, "minusSign", "-"),
    digits,
  };
  partsCache.set(key, parts);
  return parts;
}

/** Turns a locale's digits into 0-9, leaving everything else alone. */
function toAsciiDigits(text: string, digits: readonly string[]): string {
  if (digits[0] === "0") return text;
  let result = "";
  for (const character of text) {
    const index = digits.indexOf(character);
    result += index === -1 ? character : String(index);
  }
  return result;
}

/**
 * Reads what was typed, in the notation of `locale`.
 *
 * Returns `null` for anything that is not a number, including an empty field —
 * the component keeps those apart by looking at the text, so an unreadable
 * entry never silently becomes "nothing".
 *
 * Currency symbols, percent signs and stray spaces are ignored, so a pasted
 * `"$1,234.56"` or `"45 %"` is read rather than rejected. Only one sign and one
 * decimal separator are accepted: `"1.2.3"` is not a number in any locale.
 */
export function parseNumber(text: string, locale?: string): number | null {
  const parts = localeParts(locale);
  let value = toAsciiDigits(text.trim(), parts.digits);
  if (value === "") return null;

  // Every kind of space, including the narrow no-break space French and German
  // use as a group separator, and the ordinary one people type by hand.
  value = value.replace(/\s/gu, "");

  const negative =
    value.startsWith(parts.minus) || value.startsWith("-") || value.startsWith("−");
  if (negative) value = value.replace(/^(-|−|-)/u, "").replace(parts.minus, "");

  // Group separators go; the locale's decimal separator becomes a point. Doing
  // it in this order matters where one locale's group is another's decimal.
  if (parts.group !== "") value = value.split(parts.group).join("");
  if (parts.decimal !== ".") value = value.split(parts.decimal).join(".");

  // Whatever is left that is not a digit or the one point — currency symbols,
  // percent signs, stray letters — is dropped, but a second point is not a
  // typo to guess at.
  const cleaned = value.replace(/[^0-9.]/gu, "");
  if (cleaned === "" || cleaned === ".") return null;
  if (cleaned.indexOf(".") !== cleaned.lastIndexOf(".")) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

/**
 * The text a number is edited as: the locale's decimal separator, no grouping
 * and no currency symbol.
 *
 * Editing text and reading text are different jobs. Separators inserted while
 * someone is typing move the caret out from under their fingers, so the field
 * shows the plain form while it has focus and the formatted one the rest of
 * the time.
 */
export function toEditText(value: number | null, locale?: string): string {
  if (value === null || Number.isNaN(value)) return "";
  const parts = localeParts(locale);
  const text = String(value);
  return parts.decimal === "." ? text : text.replace(".", parts.decimal);
}
