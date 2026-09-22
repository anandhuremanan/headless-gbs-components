import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab, setTheme, TABS } from "./helpers";

const RULES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** axe on every demo tab, in both themes for one heavy tab. */
for (const tab of Object.keys(TABS) as (keyof typeof TABS)[]) {
  test(`${TABS[tab]} has no axe violations`, async ({ page }) => {
    await openTab(page, tab);
    const results = await new AxeBuilder({ page }).withTags(RULES).analyze();
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}

test("the grid has no axe violations in dark mode", async ({ page }) => {
  await openTab(page, "grid");
  await setTheme(page, "dark");
  const results = await new AxeBuilder({ page }).withTags(RULES).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("an open modal traps the accessibility tree", async ({ page }) => {
  await openTab(page, "overlays");
  await page.getByRole("button", { name: "Open", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Terms of service" });
  await expect(dialog).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(RULES).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);

  // A native modal dialog makes the rest of the page inert, which is what keeps
  // screen readers and clicks inside it.
  const modal = await dialog.evaluate((element) => element.matches(":modal"));
  expect(modal).toBe(true);
});

test("toasts are announced through a live region", async ({ page }) => {
  await openTab(page, "toasts");
  const region = page.getByRole("region", { name: /Notifications/ });
  await expect(region).toBeAttached();
  await expect(region.locator("ol")).toHaveAttribute("aria-live", "polite");

  await page.getByRole("button", { name: "Success" }).first().click();
  await expect(region.getByText("Settings saved")).toBeVisible();
});
