"use client";

import { useState, type CSSProperties } from "react";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
} from "../../../source/beta-components/menu";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const note: CSSProperties = { fontSize: 13, opacity: 0.7 };

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

/** Live example used in the Menu documentation. */
export function MenuWrapper() {
  const [chosen, setChosen] = useState("nothing yet");
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState("recent");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
      }}
    >
      <Menu
        trigger={
          <button type="button" style={button}>
            Actions
          </button>
        }
        label="Row actions"
      >
        <MenuItem
          icon={<EditIcon />}
          shortcut="⌘E"
          onSelect={() => setChosen("Edit")}
        >
          Edit
        </MenuItem>
        <MenuItem icon={<CopyIcon />} onSelect={() => setChosen("Duplicate")}>
          Duplicate
        </MenuItem>
        <MenuItem disabled onSelect={() => setChosen("Archive")}>
          Archive
        </MenuItem>

        <MenuSub label="Export">
          <MenuItem onSelect={() => setChosen("Export as CSV")}>CSV</MenuItem>
          <MenuItem onSelect={() => setChosen("Export as PDF")}>PDF</MenuItem>
        </MenuSub>

        <MenuSeparator />

        <MenuCheckboxItem checked={compact} onCheckedChange={setCompact}>
          Compact rows
        </MenuCheckboxItem>

        <MenuRadioGroup value={sort} onValueChange={setSort} label="Sort by">
          <MenuRadioItem value="recent">Most recent</MenuRadioItem>
          <MenuRadioItem value="name">Name</MenuRadioItem>
        </MenuRadioGroup>

        <MenuSeparator />

        <MenuItem destructive onSelect={() => setChosen("Delete")}>
          Delete
        </MenuItem>
      </Menu>

      <p style={note}>
        Chosen: <strong>{chosen}</strong> · compact rows:{" "}
        {compact ? "on" : "off"} · sorted by {sort}
      </p>
      <p style={note}>
        Open it and try the arrow keys, Home, End, typing a letter, and
        ArrowRight on “Export”.
      </p>
    </div>
  );
}

export default MenuWrapper;
