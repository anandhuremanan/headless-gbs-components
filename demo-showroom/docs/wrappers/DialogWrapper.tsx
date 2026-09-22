"use client";

import { useState, type CSSProperties } from "react";
import {
  createDialogApi,
  createDialogStore,
  DialogHost,
} from "../../../source/beta-components/dialog";

// Its own store, so this example never shows dialogs in a DialogHost the page may
// already mount. In an app you would use the ready-made `dialog` instead.
const store = createDialogStore();
const dialog = createDialogApi(store);

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Live example used in the Dialog documentation. */
export function DialogWrapper() {
  const [result, setResult] = useState("nothing yet");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          style={button}
          onClick={async () => {
            await dialog.alert({
              title: "Export finished",
              description: "orders.xlsx is in your downloads.",
              intent: "success",
            });
            setResult("alert closed");
          }}
        >
          Alert
        </button>
        <button
          type="button"
          style={button}
          onClick={async () => {
            const confirmed = await dialog.confirm({
              title: "Delete 3 invoices?",
              description: "This can't be undone.",
              intent: "danger",
              confirmLabel: "Delete",
              onConfirm: () => wait(1200),
            });
            setResult(`confirm → ${confirmed}`);
          }}
        >
          Confirm (async)
        </button>
        <button
          type="button"
          style={button}
          onClick={async () => {
            const name = await dialog.prompt({
              title: "Rename file",
              inputLabel: "File name",
              defaultValue: "report.pdf",
              required: true,
              validate: (value) =>
                value.endsWith(".pdf") ? null : "Keep the .pdf extension",
            });
            setResult(`prompt → ${JSON.stringify(name)}`);
          }}
        >
          Prompt
        </button>
      </div>
      <code style={{ fontSize: 12, opacity: 0.7 }}>result: {result}</code>
      <DialogHost store={store} />
    </div>
  );
}

export default DialogWrapper;
