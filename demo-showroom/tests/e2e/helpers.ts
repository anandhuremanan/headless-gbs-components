import { expect, type Page } from "@playwright/test";

/** The demo app's tabs, by their visible label. */
export const TABS = {
  grid: "Client · 100k rows",
  server: "Server mode",
  select: "Select & MultiSelect",
  dates: "Date pickers",
  toasts: "Toasts",
  uploads: "Uploads",
  overlays: "Modal & Dialog",
  fields: "Inputs",
  controls: "Controls",
  surfaces: "Menus & surfaces",
  formControls: "Switch, radio & number",
  display: "Alerts, badges & more",
} as const;

export async function openTab(page: Page, tab: keyof typeof TABS) {
  await page.goto("/");
  const button = page.getByRole("tab", { name: TABS[tab] });
  await button.click();
  await expect(button).toHaveAttribute("aria-selected", "true");
}

/** The computed value of one CSS property, as the browser resolves it. */
export function computed(page: Page, selector: string, property: string) {
  return page.evaluate(
    ([target, name]) => {
      const element = document.querySelector(target);
      if (!element) throw new Error(`No element matches ${target}`);
      return getComputedStyle(element).getPropertyValue(name).trim();
    },
    [selector, property] as const,
  );
}

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
  }, theme);
}
