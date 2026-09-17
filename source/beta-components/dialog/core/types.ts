import type { ReactNode } from "react";

export type DialogKind = "alert" | "confirm" | "prompt";
export type DialogIntent = "default" | "info" | "success" | "warning" | "danger";
export type DialogSize = "sm" | "md";

export interface DialogBaseOptions {
  title: ReactNode;
  description?: ReactNode;
  /** Sets the icon and the confirm button's color. `danger` also focuses Cancel first. */
  intent?: DialogIntent;
  /** Replaces the intent's icon; `null` hides it. */
  icon?: ReactNode;
  confirmLabel?: ReactNode;
  /** Escape and a backdrop click count as Cancel. Default true. */
  dismissible?: boolean;
  size?: DialogSize;
}

export interface AlertOptions extends DialogBaseOptions {
  /** Runs on OK. The dialog waits while it runs and shows its error if it throws. */
  onConfirm?(): void | Promise<void>;
}

export interface ConfirmOptions extends DialogBaseOptions {
  cancelLabel?: ReactNode;
  /** Runs on Confirm. The dialog waits while it runs and shows its error if it throws. */
  onConfirm?(): void | Promise<void>;
}

export interface PromptOptions extends DialogBaseOptions {
  cancelLabel?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  inputLabel?: ReactNode;
  inputType?: "text" | "email" | "password" | "number" | "url" | "tel";
  required?: boolean;
  /** Return a message to block confirming. */
  validate?(value: string): string | null | undefined;
  /** Runs with the value on Confirm. The dialog waits while it runs and shows its error if it throws. */
  onConfirm?(value: string): void | Promise<void>;
}

export type DialogRequest =
  | { id: string; kind: "alert"; options: AlertOptions }
  | { id: string; kind: "confirm"; options: ConfirmOptions }
  | { id: string; kind: "prompt"; options: PromptOptions };

export interface DialogSnapshot {
  /** The first request is on screen; the rest wait their turn. */
  queue: readonly DialogRequest[];
}

export interface DialogLocaleText {
  ok: string;
  confirm: string;
  cancel: string;
  required: string;
}
