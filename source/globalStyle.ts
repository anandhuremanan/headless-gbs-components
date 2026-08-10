import { getComponentPreset } from "./theme";

const preset = getComponentPreset();

export const primary = {
  "error-border": "border border-rose-500 focus-within:border-rose-500",
  "error-primary": `${preset.text.error} mt-1 pl-1`,
};

export const popUp = {
  "pop-up-style": `${preset.surface.overlay} w-full absolute overflow-y-auto rounded-lg mt-1 scrollbar z-[90] h-44 text-sm text-slate-700 dark:text-slate-100 animate-fade-down animate-once animate-duration-200`,
  "pop-up-style-calender": `${preset.surface.overlay} w-full absolute overflow-y-auto rounded-lg mt-1 scrollbar z-[90] h-[370px] text-slate-700 dark:text-slate-100 animate-fade-down animate-once animate-duration-200`,
};

export const iconClass = {
  "grey-common": "h-4 w-4 stroke-slate-500 fill-none dark:stroke-slate-300",
  "error-icon": "h-4 w-4 stroke-rose-500 fill-none dark:stroke-rose-400",
};

export const inputStyles = {
  default: `${preset.control} ${preset.radius} ${preset.focusRing} px-3 py-2 text-sm shadow-sm`,
  error: "border-rose-500 focus-visible:ring-rose-500",
  otp: `${preset.control} ${preset.radius} ${preset.focusRing} m-1 h-10 w-9 text-center text-sm font-semibold`,
  passwordToggle: "absolute inset-y-0 right-0 flex items-center pr-2",
  otpContainer: "otp-container flex items-center gap-1",
};

export const selectStyle = {
  "select-button": `${preset.control} ${preset.radius} ${preset.focusRing} flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium shadow-sm`,
  "filter-button":
    "mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-black dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white",
  "input-parent":
    "sticky top-0 z-50 flex w-full items-center gap-1 border-b border-zinc-200 bg-white px-1 py-1 text-sm dark:border-zinc-800 dark:bg-zinc-950",
  "selectedDisplay-Button":
    "absolute right-8 top-1/2 z-20 flex -translate-y-1/2 items-center rounded-md p-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
};

export const buttonStyles = {
  base: `${preset.radius} ${preset.focusRing} ${preset.disabled} inline-flex items-center justify-center gap-2 font-medium transition-colors`,
  sizes: {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  },
  variants: {
    primary:
      "bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100",
    secondary:
      "bg-zinc-900 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200",
    outline:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-850 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900",
    ghost:
      "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  },
};

export const cardStyles = {
  base: `${preset.surface.raised} rounded-lg p-4`,
  interactive: "transition-shadow hover:shadow-md hover:shadow-zinc-950/10",
};

export const gridStyles = {
  container: `${preset.surface.raised} flex flex-col rounded-md overflow-hidden dark:text-white`,
  toolbar: `flex bg-white dark:bg-black justify-end space-x-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-900`,
  pagination: `w-full flex flex-wrap justify-between items-center text-xs px-4 py-3 bg-white dark:bg-black gap-2 md:gap-4 border-t border-zinc-200 dark:border-zinc-900`,
  tableHeader: `bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-bold border-b border-zinc-200 dark:border-zinc-900 px-4 py-3 text-left text-xs uppercase tracking-wider`,
  button: `border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded px-3 py-1.5 text-xs font-semibold cursor-pointer transition`,
  rowEven:
    "bg-white dark:bg-black hover:bg-zinc-50/50 dark:hover:bg-zinc-900/60 transition-colors text-black dark:text-white",
  rowOdd:
    "bg-zinc-50/20 dark:bg-zinc-950/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/60 transition-colors",
  rowSelected: "bg-zinc-100 dark:bg-zinc-900 font-semibold",
};
