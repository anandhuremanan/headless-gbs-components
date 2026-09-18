export type DialogSlot =
  | "root"
  | "body"
  | "icon"
  | "title"
  | "description"
  | "input"
  | "actions"
  | "confirm"
  | "cancel";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
