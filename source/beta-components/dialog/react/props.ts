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

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
