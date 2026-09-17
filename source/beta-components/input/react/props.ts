export type InputSlot = "root" | "label" | "control" | "input" | "description" | "error" | "count";

export type OtpSlot = "root" | "label" | "cells" | "cell" | "separator" | "description" | "error";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
