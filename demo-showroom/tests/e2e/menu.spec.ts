import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

/*
 * Menu, Tooltip and Popover all sit on the shared anchored popover, so these
 * cover what each of them adds on top: the WAI-ARIA menu keyboard, the tooltip's
 * describe-don't-name wiring, and a popover that takes focus.
 */

test("the menu follows the keyboard pattern: arrows, wrap, typeahead, Escape", async ({ page }) => {
  await openTab(page, "surfaces");
  const trigger = page.getByRole("button", { name: "Actions" });

  // ArrowDown on the trigger opens it and starts at the first item.
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "Row actions" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();

  // Down moves on, and skips the disabled "Archive".
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Export" })).toBeFocused();

  // Up from the first item wraps to the last.
  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeFocused();

  // Typing jumps to the item starting with that letter.
  await page.keyboard.press("d");
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("choosing an item runs it and closes the menu", async ({ page }) => {
  await openTab(page, "surfaces");
  await page.getByRole("button", { name: "Actions" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  await expect(page.getByRole("menu", { name: "Row actions" })).toBeHidden();
  await expect(page.getByText("Last action: Edit")).toBeVisible();
});

test("checkbox and radio items report their state and keep the menu open", async ({ page }) => {
  await openTab(page, "surfaces");
  await page.getByRole("button", { name: "Actions" }).click();

  const compact = page.getByRole("menuitemcheckbox", { name: "Compact rows" });
  await expect(compact).toHaveAttribute("aria-checked", "false");
  await compact.click();
  await expect(compact).toHaveAttribute("aria-checked", "true");
  // Still open: several options are usually toggled in a row.
  await expect(page.getByRole("menu", { name: "Row actions" })).toBeVisible();

  const byName = page.getByRole("menuitemradio", { name: "Name" });
  await byName.click();
  await expect(byName).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("menuitemradio", { name: "Most recent" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("a submenu opens with ArrowRight and goes back with ArrowLeft", async ({ page }) => {
  await openTab(page, "surfaces");
  await page.getByRole("button", { name: "Actions" }).focus();
  await page.keyboard.press("ArrowDown");

  const exportItem = page.getByRole("menuitem", { name: "Export" });
  await page.keyboard.press("e");
  await expect(exportItem).toBeFocused();
  await expect(exportItem).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("ArrowRight");
  await expect(exportItem).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem", { name: "CSV" })).toBeFocused();

  // Back to the parent, which keeps focus where it was.
  await page.keyboard.press("ArrowLeft");
  await expect(exportItem).toHaveAttribute("aria-expanded", "false");
  await expect(exportItem).toBeFocused();
  // The parent menu is still open, which is the whole reason a submenu is
  // a manual popover rather than an auto one.
  await expect(page.getByRole("menu", { name: "Row actions" })).toBeVisible();
});

test("the tooltip describes its control without naming it", async ({ page }) => {
  await openTab(page, "surfaces");
  const button = page.getByRole("button", { name: "Hover or focus me" });

  await button.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Export as CSV");

  // Described, not named: the button keeps its own accessible name.
  const describedBy = await button.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toHaveText("Export as CSV");

  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
});

test("the tooltip appears on keyboard focus without waiting", async ({ page }) => {
  await openTab(page, "surfaces");
  // Tab rather than .focus(): only a real keyboard move matches :focus-visible,
  // which is what tells the tooltip this was not a click.
  await page.getByRole("button", { name: "Hover or focus me" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Right side" })).toBeFocused();
  // No delay for the keyboard, so the short timeout is the point of the test.
  await expect(page.getByRole("tooltip")).toBeVisible({ timeout: 250 });
});

test("the popover takes focus, traps nothing, and returns focus on Escape", async ({ page }) => {
  await openTab(page, "surfaces");
  const trigger = page.getByRole("button", { name: "Filters" });
  await trigger.click();

  const panel = page.getByRole("dialog", { name: "Filters" });
  await expect(panel).toBeVisible();
  // data-autofocus wins over the panel itself.
  await expect(page.getByRole("button", { name: "Apply" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});
