"use client";

import { useState, type CSSProperties } from "react";
import { Popover } from "../../../source/beta-components/popover";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
};

/** Live example used in the Popover documentation. */
export function PopoverWrapper() {
  const [filters, setFilters] = useState({ active: true, attachments: false });
  const [applied, setApplied] = useState("none");

  const apply = () => {
    const chosen = Object.entries(filters)
      .filter(([, on]) => on)
      .map(([name]) => name);
    setApplied(chosen.length > 0 ? chosen.join(", ") : "none");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Popover
          trigger={
            <button type="button" style={button}>
              Filters
            </button>
          }
          title="Filters"
          description="Narrow down what the table shows."
        >
          {({ close }) => (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 200,
              }}
            >
              <label style={row}>
                <input
                  type="checkbox"
                  checked={filters.active}
                  onChange={(event) =>
                    setFilters((f) => ({ ...f, active: event.target.checked }))
                  }
                />
                Only active
              </label>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={filters.attachments}
                  onChange={(event) =>
                    setFilters((f) => ({
                      ...f,
                      attachments: event.target.checked,
                    }))
                  }
                />
                Has attachments
              </label>
              <button
                type="button"
                style={button}
                data-autofocus
                onClick={() => {
                  apply();
                  close();
                }}
              >
                Apply
              </button>
            </div>
          )}
        </Popover>

        <Popover
          trigger={
            <button type="button" style={button}>
              To the right
            </button>
          }
          side="right"
          aria-label="An example panel"
        >
          <p style={{ margin: 0, maxWidth: 220, fontSize: 13 }}>
            Anchored to the right, and flipped to the left when there is no
            room.
          </p>
        </Popover>
      </div>

      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Applied filters: <strong>{applied}</strong>
      </p>
    </div>
  );
}

export default PopoverWrapper;
