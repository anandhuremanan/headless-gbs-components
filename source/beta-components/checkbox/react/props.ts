export type CheckboxSlot = "root" | "control" | "input" | "label" | "description" | "error";

export type CheckboxGroupSlot = "root" | "legend" | "description" | "items" | "error";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
