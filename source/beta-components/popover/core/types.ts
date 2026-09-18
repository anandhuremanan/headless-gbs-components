export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "end";

/** What closed the popover, so callers can tell a choice from a dismissal. */
export type PopoverCloseReason = "escape" | "outside" | "trigger" | "api";

export type PopoverSlot = "root" | "panel" | "header" | "title" | "description" | "body" | "arrow";

export interface PopoverLocaleText {
  /** Fallback name for a panel with no title. */
  label: string;
}
