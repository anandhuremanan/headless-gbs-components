export type ToasterSlot =
  | "region"
  | "list"
  | "toast"
  | "icon"
  | "content"
  | "title"
  | "description"
  | "actions"
  | "action"
  | "cancel"
  | "close";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
