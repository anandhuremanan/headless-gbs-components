export type SwitchSlot =
  | "root"
  | "control"
  | "input"
  | "track"
  | "thumb"
  | "label"
  | "description"
  | "error";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
