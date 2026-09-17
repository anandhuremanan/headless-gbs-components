import type { DialogStore } from "./store";
import type { AlertOptions, ConfirmOptions, PromptOptions } from "./types";

export interface DialogApi {
  /** Resolves when the user presses OK (or dismisses it). */
  alert(options: AlertOptions | string): Promise<void>;
  /** Resolves `true` on Confirm, `false` on Cancel, Escape or a backdrop click. */
  confirm(options: ConfirmOptions | string): Promise<boolean>;
  /** Resolves with the entered text, or `null` when canceled. */
  prompt(options: PromptOptions | string): Promise<string | null>;
  dismissAll(): void;
}

/**
 * The `dialog` API for a store. `canShow` lets the default instance answer
 * right away where nobody could see a dialog, such as during a server render.
 */
export function createDialogApi(store: DialogStore, canShow: () => boolean = () => true): DialogApi {
  return {
    alert(options) {
      if (!canShow()) return Promise.resolve();
      return store.open("alert", typeof options === "string" ? { title: options } : options);
    },
    confirm(options) {
      if (!canShow()) return Promise.resolve(false);
      return store.open("confirm", typeof options === "string" ? { title: options } : options);
    },
    prompt(options) {
      if (!canShow()) return Promise.resolve(null);
      return store.open("prompt", typeof options === "string" ? { title: options } : options);
    },
    dismissAll: () => store.dismissAll(),
  };
}
