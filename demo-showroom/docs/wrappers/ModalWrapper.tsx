"use client";

import { useState, type CSSProperties } from "react";
import {
  Modal,
  type ModalPlacement,
} from "../../../source/beta-components/modal";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const field: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
};

/** Live example used in the Modal documentation. */
export function ModalWrapper() {
  const [placement, setPlacement] = useState<ModalPlacement | null>(null);
  const [name, setName] = useState("Ada Lovelace");
  const [saved, setSaved] = useState("Ada Lovelace");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          style={button}
          onClick={() => setPlacement("center")}
        >
          Open modal
        </button>
        <button
          type="button"
          style={button}
          onClick={() => setPlacement("right")}
        >
          Open drawer
        </button>
      </div>
      <code style={{ fontSize: 12, opacity: 0.7 }}>saved name: {saved}</code>

      <Modal
        open={placement !== null}
        onOpenChange={(open) => {
          if (!open) setPlacement(null);
        }}
        placement={placement ?? "center"}
        title="Edit profile"
        description="Changes are saved when you press Save."
        footer={({ close }) => (
          <>
            <button type="button" style={button} onClick={close}>
              Cancel
            </button>
            <button type="submit" form="docs-profile" style={button}>
              Save
            </button>
          </>
        )}
      >
        <form
          id="docs-profile"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(name);
            setPlacement(null);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <label htmlFor="docs-profile-name">Display name</label>
          <input
            id="docs-profile-name"
            data-autofocus
            style={field}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

export default ModalWrapper;
