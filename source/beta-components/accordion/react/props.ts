export type AccordionSlot = "root";

export type AccordionItemSlot =
  | "root"
  | "header"
  | "title"
  | "description"
  | "icon"
  | "content"
  | "body";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
