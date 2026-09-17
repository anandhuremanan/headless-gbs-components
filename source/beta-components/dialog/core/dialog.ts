import { createDialogApi } from "./api";
import { createDialogStore } from "./store";

/** The store behind `dialog`, and behind any `<DialogHost />` without a `store` prop. */
export const dialogStore = createDialogStore();

/**
 * Ask the user something from anywhere and `await` the answer. Where there is
 * no document (a server render), calls settle at once as a cancel.
 */
export const dialog = createDialogApi(dialogStore, () => typeof document !== "undefined");
