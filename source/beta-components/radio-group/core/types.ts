import type { ReactNode } from "react";

export type RadioSize = "sm" | "md" | "lg";

/** `card` draws each choice as a bordered tile, for choices that carry detail. */
export type RadioVariant = "default" | "card";

export type RadioOrientation = "vertical" | "horizontal";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupLocaleText {
  /** The button that empties a `clearable` group. */
  clear: string;
}
