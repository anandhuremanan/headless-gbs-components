// Design tokens, copied from the components' styles.css files. The components
// resolve every value through the shared --gbs-* palette (set it on :root to
// theme the whole kit), which falls back to the grid's --dg-* and then to these
// built-in defaults. Keep these in step with the CSS: the Figma variables are
// generated from this file.

type Hex = string;

interface ColorToken {
  /** Variable name; slashes become groups in Figma. */
  name: string;
  light: Hex;
  dark: Hex;
  description: string;
}

const COLOR_TOKENS: ColorToken[] = [
  { name: "surface/bg", light: "#ffffff", dark: "#0b0b0e", description: "Page, cards, menus, popovers, modals (--gbs-bg)" },
  { name: "surface/header", light: "#fafafa", dark: "#111114", description: "Grid header, modal and dialog footers (--gbs-header-bg)" },
  { name: "surface/input", light: "#ffffff", dark: "#121216", description: "Fields, drop zones, OTP cells (--gbs-input-bg)" },
  { name: "surface/readonly", light: "#fafafa", dark: "#0e0e12", description: "Read-only fields (--gbs-readonly-bg)" },
  { name: "surface/subtle", light: "#f4f4f5", dark: "#1c1c20", description: "Secondary button, segmented tab track (--gbs-subtle)" },
  { name: "surface/hover", light: "#f4f4f5", dark: "#1f1f23", description: "Hover backgrounds, menu and card hover (--gbs-hover)" },
  { name: "surface/skeleton", light: "#ececee", dark: "#232329", description: "Skeleton placeholder bars (--gbs-skeleton)" },
  { name: "surface/tooltip", light: "#18181b", dark: "#f4f4f5", description: "Tooltip bubble, inverted against the page (--gbs-tooltip-bg)" },
  { name: "surface/row-alt", light: "#fcfcfd", dark: "#0e0e12", description: "Striped grid rows (--gbs-row-alt)" },
  { name: "surface/row-selected", light: "#eef4ff", dark: "#14213d", description: "Selected grid rows (--gbs-row-selected)" },
  { name: "surface/backdrop", light: "#09090b73", dark: "#000000a6", description: "Behind modals and dialogs (--gbs-backdrop)" },

  { name: "text/primary", light: "#18181b", dark: "#f4f4f5", description: "Body text (--gbs-fg)" },
  { name: "text/muted", light: "#71717a", dark: "#a1a1aa", description: "Hints, placeholders, icons, stat labels (--gbs-muted)" },
  { name: "text/header", light: "#3f3f46", dark: "#d4d4d8", description: "Grid header text (--gbs-header-fg)" },
  { name: "text/tab", light: "#5b5b64", dark: "#a1a1aa", description: "Unselected tab labels: darker than muted, since a tab is a control (--gbs-tab-fg)" },
  { name: "text/on-tooltip", light: "#fafafa", dark: "#18181b", description: "Tooltip text (--gbs-tooltip-fg)" },

  { name: "border/default", light: "#e4e4e7", dark: "#27272a", description: "Borders, dividers, menu separators (--gbs-border)" },
  { name: "border/subtle", light: "#f0f0f2", dark: "#1c1c20", description: "Grid cell lines (--gbs-border-subtle)" },
  { name: "border/control", light: "#a1a1aa", dark: "#52525b", description: "Unchecked checkbox (--gbs-border-control)" },

  { name: "accent/default", light: "#2563eb", dark: "#60a5fa", description: "Primary actions, selection, links (--gbs-accent)" },
  { name: "accent/on-accent", light: "#ffffff", dark: "#0b1220", description: "Text on accent (--gbs-accent-fg)" },
  { name: "accent/soft", light: "#eff6ff", dark: "#172554", description: "Tags, pills, range bands (--gbs-accent-soft)" },
  { name: "accent/strong", light: "#1d4ed8", dark: "#bfdbfe", description: "Text on soft accent (--gbs-accent-strong)" },
  { name: "accent/focus", light: "#2563eb", dark: "#60a5fa", description: "Focus rings (--gbs-focus)" },

  { name: "status/danger", light: "#dc2626", dark: "#f87171", description: "Errors, destructive actions and menu items (--gbs-danger)" },
  { name: "status/on-danger", light: "#ffffff", dark: "#1c0606", description: "Text on danger (--gbs-danger-fg)" },
  { name: "status/success", light: "#15803d", dark: "#4ade80", description: "Success, upward stat trends (--gbs-success)" },
  { name: "status/warning", light: "#d97706", dark: "#fbbf24", description: "Warnings (--gbs-warning)" },
  { name: "status/info", light: "#2563eb", dark: "#60a5fa", description: "Information (--gbs-info)" },

  { name: "file/image", light: "#2563eb", dark: "#60a5fa", description: "Uploader thumbnail: image" },
  { name: "file/video", light: "#9333ea", dark: "#c084fc", description: "Uploader thumbnail: video" },
  { name: "file/audio", light: "#d97706", dark: "#fbbf24", description: "Uploader thumbnail: audio" },
  { name: "file/pdf", light: "#dc2626", dark: "#f87171", description: "Uploader thumbnail: PDF" },
  { name: "file/spreadsheet", light: "#16a34a", dark: "#4ade80", description: "Uploader thumbnail: spreadsheet" },
  { name: "file/document", light: "#0891b2", dark: "#22d3ee", description: "Uploader thumbnail: document" },
];

interface NumberToken {
  name: string;
  value: number;
  description: string;
}

const NUMBER_TOKENS: NumberToken[] = [
  { name: "radius/xs", value: 4, description: "Checkbox, skeleton text bars" },
  { name: "radius/item", value: 5, description: "Menu items (--mn-item-radius)" },
  { name: "radius/sm", value: 6, description: "Icon buttons, tabs" },
  { name: "radius/md", value: 8, description: "Fields, buttons, cards, menus, popovers (--gbs-radius)" },
  { name: "radius/lg", value: 12, description: "Modals and dialogs" },
  { name: "radius/full", value: 999, description: "Tags, badges, avatars" },

  { name: "control/height-sm", value: 30, description: "size=sm fields and buttons" },
  { name: "control/height-md", value: 36, description: "size=md fields and buttons" },
  { name: "control/height-lg", value: 44, description: "size=lg fields and buttons" },

  { name: "space/2xs", value: 2, description: "" },
  { name: "space/xs", value: 4, description: "Label to field, rows inside a stat" },
  { name: "space/sm", value: 6, description: "Menu item padding" },
  { name: "space/md", value: 8, description: "Icon to text, between fields in a row" },
  { name: "space/lg", value: 10, description: "Field padding (md)" },
  { name: "space/xl", value: 12, description: "Popover padding (--pv-px)" },
  { name: "space/2xl", value: 16, description: "Card padding (--cd-px)" },
  { name: "space/3xl", value: 20, description: "Modal padding" },
  { name: "space/4xl", value: 24, description: "Card padding at lg, empty-state sides" },
];

interface TypeToken {
  name: string;
  size: number;
  weight: "Regular" | "Medium" | "Semi Bold";
  lineHeight: number;
  description: string;
}

/** Inter stands in for the components' system-ui stack, which Figma can't reference. */
const TYPE_FAMILY = "Inter";

const TYPE_TOKENS: TypeToken[] = [
  { name: "Body/Default", size: 13, weight: "Regular", lineHeight: 18, description: "--gbs-font-size; fields, cells, menus" },
  { name: "Body/Small", size: 12, weight: "Regular", lineHeight: 16, description: "size=sm controls, hints, errors, tooltips, shortcuts" },
  { name: "Body/Large", size: 14, weight: "Regular", lineHeight: 20, description: "size=lg controls" },
  { name: "Label/Default", size: 13, weight: "Medium", lineHeight: 18, description: "Field labels, buttons, tabs, stat labels" },
  { name: "Label/Small", size: 12, weight: "Medium", lineHeight: 16, description: "Small buttons, tags" },
  { name: "Label/Large", size: 14, weight: "Medium", lineHeight: 20, description: "Large buttons and tabs" },
  { name: "Label/Strong", size: 13, weight: "Semi Bold", lineHeight: 18, description: "Grid headers, selected items" },
  { name: "Label/Group", size: 11, weight: "Semi Bold", lineHeight: 14, description: "Menu group headings (set in capitals, +2% letter spacing)" },
  { name: "Title/Card", size: 14, weight: "Semi Bold", lineHeight: 19, description: "Card and empty-state titles (1.05em)" },
  { name: "Title/Dialog", size: 15, weight: "Semi Bold", lineHeight: 20, description: "Modal and dialog titles" },
  { name: "Title/Section", size: 18, weight: "Semi Bold", lineHeight: 24, description: "Page sections" },
  { name: "Numeric/Stat", size: 25, weight: "Semi Bold", lineHeight: 29, description: "Stat values, 1.9em (tabular figures)" },
  { name: "Numeric/OTP", size: 18, weight: "Semi Bold", lineHeight: 24, description: "OTP cells (tabular figures)" },
];
