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
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
    disabled: "disabled:cursor-not-allowed disabled:opacity-55",
    text: {
      label: "text-sm font-medium text-slate-700",
      helper: "text-xs text-slate-500",
      error: "text-xs font-medium text-rose-600",
    },
    surface: {
      raised:
        "border border-slate-200 bg-white shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-950",
      subtle:
        "border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
      overlay:
        "border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950",
    },
    control:
      "border border-slate-300 bg-white text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
  },
} as const;

export const getComponentPreset = (presetId: ComponentPresetId = defaultPresetId) =>
  componentPresets[presetId] || componentPresets[defaultPresetId];
