export type NumberInputSlot =
  | "root"
  | "label"
  | "control"
  | "input"
  | "stepper"
  | "description"
  | "error";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
