"use client";

import type { CSSProperties } from "react";
import {
  createToastApi,
  createToastStore,
  Toaster,
} from "../../../source/beta-components";

// Its own store, so this example never shows toasts in a Toaster the page may
// already mount. In an app you would use the ready-made `toast` instead.
const store = createToastStore();
const toast = createToastApi(store);

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Live example used in the Toaster documentation. */
export function ToasterWrapper() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" style={button} onClick={() => toast("Event created", { description: "Monday at 10:00" })}>
        Default
      </button>
      <button type="button" style={button} onClick={() => toast.success("Settings saved")}>
        Success
      </button>
      <button
        type="button"
        style={button}
        onClick={() =>
          toast.error("Upload failed", {
            description: "report.pdf could not be sent.",
            action: { label: "Retry", onClick: () => toast.success("Upload restarted") },
          })
        }
      >
        Error with action
      </button>
      <button type="button" style={button} onClick={() => toast.warning("Storage almost full")}>
        Warning
      </button>
      <button
        type="button"
        style={button}
        onClick={() =>
          toast.promise(wait(1500), {
            loading: "Saving changes…",
            success: "Changes saved",
            error: "Could not save",
          })
        }
      >
        Promise
      </button>
      <button type="button" style={button} onClick={() => toast.dismiss()}>
        Dismiss all
      </button>
      <Toaster store={store} position="bottom-right" />
    </div>
  );
}

export default ToasterWrapper;
