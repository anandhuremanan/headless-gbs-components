export type NumberSize = "sm" | "md" | "lg";

/** Plain number, an amount of money, or a percentage. */
export type NumberStyle = "decimal" | "currency" | "percent";

/** When a value outside `min`/`max` is pulled back into range. */
export type ClampBehavior = "blur" | "strict" | "none";

export interface NumberFormatOptions {
  /** BCP 47 tag. Left out, the runtime's own locale is used. */
  locale?: string;
  /** Default `decimal`. */
  style?: NumberStyle;
  /** ISO 4217 code, required by `style="currency"`. */
  currency?: string;
  /** Exact number of fraction digits to show, and to round to when committing. */
  decimals?: number;
  /** Thousands separators. Default true. */
  useGrouping?: boolean;
}

export interface StepOptions {
  step: number;
  min?: number;
  max?: number;
}

export interface NumberInputLocaleText {
  increment: string;
  decrement: string;
  clear: string;
}
