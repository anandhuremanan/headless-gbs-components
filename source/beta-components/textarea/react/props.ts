export type TextareaSlot = "root" | "label" | "textarea" | "description" | "error" | "count";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
