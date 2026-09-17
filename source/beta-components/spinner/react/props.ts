export type SpinnerSlot = "root" | "status" | "indicator" | "label" | "content" | "overlay";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
