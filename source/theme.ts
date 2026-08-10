export type ComponentPresetId = "gbs-basic";

export type ComponentSize = "sm" | "md" | "lg";

export type ComponentVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export const defaultPresetId: ComponentPresetId = "gbs-basic";

export const componentPresets = {
  "gbs-basic": {
    id: "gbs-basic",
    radius: "rounded-lg",
    focusRing:
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2",
    disabled: "disabled:cursor-not-allowed disabled:opacity-55",
    text: {
      label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
      helper: "text-xs text-zinc-500",
      error: "text-xs font-medium text-rose-600",
    },
    surface: {
      raised:
        "border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5 dark:border-zinc-900 dark:bg-black",
      subtle:
        "border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950",
      overlay:
        "border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10 dark:border-zinc-900 dark:bg-zinc-950",
    },
    control:
      "border border-zinc-300 bg-white text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
  },
} as const;

export const getComponentPreset = (presetId: ComponentPresetId = defaultPresetId) =>
  componentPresets[presetId] || componentPresets[defaultPresetId];
