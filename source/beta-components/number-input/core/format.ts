import type { NumberFormatOptions } from "./types";

const formats = new Map<string, Intl.NumberFormat>();

/**
 * Cached `Intl.NumberFormat`. Building one costs about as much as formatting a
 * hundred numbers, and a grid of amounts formats thousands.
 */
export function numberFormat(options: NumberFormatOptions = {}): Intl.NumberFormat {
  const { locale, style = "decimal", currency, decimals, useGrouping = true } = options;
  const key = [locale ?? "", style, currency ?? "", decimals ?? "", useGrouping].join("|");
  const cached = formats.get(key);
  if (cached) return cached;

  const format = new Intl.NumberFormat(locale, {
    style: style === "currency" && !currency ? "decimal" : style,
    currency: style === "currency" ? currency : undefined,
    useGrouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  formats.set(key, format);
  return format;
}

/**
 * The number as it is read rather than edited: grouped, with its currency
 * symbol or percent sign.
 *
 * `style="percent"` follows `Intl` and multiplies by 100, so a field showing
 * 45% holds 0.45. That is the convention every chart and CSS property already
 * uses, and having one component disagree is worse than the surprise.
 */
export function formatNumber(value: number | null, options: NumberFormatOptions = {}): string {
  if (value === null || !Number.isFinite(value)) return "";
  return numberFormat(options).format(value);
}
