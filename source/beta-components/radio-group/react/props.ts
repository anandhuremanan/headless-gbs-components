export type RadioSlot =
  | "root"
  | "control"
  | "input"
  | "label"
  | "description"
  | "error";

export type RadioGroupSlot = "root" | "legend" | "description" | "items" | "clear" | "error";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
