export type ModalSlot = "root" | "header" | "title" | "description" | "close" | "body" | "footer";

export interface ModalHandle {
  open(): void;
  /** Asks to close; `onBeforeClose` still gets a say. */
  close(): void;
  getElement(): HTMLDialogElement | null;
}

/** Passed to `children` and `footer` when they are functions. */
export interface ModalRenderProps {
  /** Closes through `onBeforeClose`, like the close button. */
  close(): void;
}

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
