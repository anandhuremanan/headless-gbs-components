"use client";

import type { CSSProperties } from "react";
import { Tooltip } from "@/components/tooltip";

const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const iconButton: CSSProperties = { ...button, padding: 6 };

const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
  </svg>
);

/** Live example used in the Tooltip documentation. */
export function TooltipWrapper() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 460,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Tooltip content="Export the current view as CSV">
          <button type="button" style={button}>
            Above (default)
          </button>
        </Tooltip>
        <Tooltip content="Shown below" side="bottom">
          <button type="button" style={button}>
            Below
          </button>
        </Tooltip>
        <Tooltip content="Shown to the right" side="right">
          <button type="button" style={button}>
            Right
          </button>
        </Tooltip>
        <Tooltip content="No waiting" delay={0}>
          <button type="button" style={button}>
            No delay
          </button>
        </Tooltip>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Tooltip content="Download">
          {/* The icon button still needs its own name: the tooltip describes,
              it does not name. */}
          <button type="button" style={iconButton} aria-label="Download">
            <DownloadIcon />
          </button>
        </Tooltip>
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          Tab to a button to see it without waiting, then press Escape.
        </span>
      </div>
    </div>
  );
}

export default TooltipWrapper;
