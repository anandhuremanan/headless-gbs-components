import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

/*
 * One anchored popover serves the combobox list, the grid's menus and the
 * calendar. These cover what each of them asks of it, so a change made for one
 * cannot quietly break the others.
 */

test("the grid's column menu closes on Escape, leaving focus on its header button", async ({ page }) => {
  await openTab(page, "grid");
  const trigger = page.getByRole("button", { name: /column options$/ }).first();
  await trigger.click();

  const menu = page.getByRole("dialog", { name: /column options$/ });
  await expect(menu).toBeVisible();
  // The top layer is what keeps it out of the grid's scroll containers.
  expect(await menu.evaluate((element) => element.matches(":popover-open"))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("choosing from the column menu also leaves focus on the header button", async ({ page }) => {
  // A fresh page rather than reopening the menu above: the grid ignores a
  // reopen on the same anchor for 300ms, so the click that light-dismisses a
  // popover cannot immediately reopen it.
  await openTab(page, "grid");
  const trigger = page.getByRole("button", { name: /column options$/ }).first();
  await trigger.click();

  const menu = page.getByRole("dialog", { name: /column options$/ });
  await menu.getByRole("button", { name: /Sort ascending/ }).click();
  await expect(menu).toBeHidden();
  // Otherwise keyboard work would restart at the top of the page.
  await expect(trigger).toBeFocused();
});

test("the combobox list is at least as wide as its control", async ({ page }) => {
  await openTab(page, "select");
  const control = page.getByRole("combobox", { name: "Country" }).first();
  await control.click();

  const list = page.locator(".cb-popover");
  await expect(list).toBeVisible();
  const [controlBox, listBox] = [await control.boundingBox(), await list.boundingBox()];
  expect(listBox!.width).toBeGreaterThanOrEqual(controlBox!.width - 1);
});

test("a list with no room below opens above its control and still fits on screen", async ({ page }) => {
  await openTab(page, "select");
  // A short viewport puts the control near the bottom edge.
  await page.setViewportSize({ width: 1280, height: 420 });
  const control = page.getByRole("combobox", { name: "Country" }).first();
  await control.scrollIntoViewIfNeeded();
  await control.click();

  const list = page.locator(".cb-popover");
  await expect(list).toBeVisible();
  const controlBox = (await control.boundingBox())!;
  const listBox = (await list.boundingBox())!;

  const roomBelow = 420 - (controlBox.y + controlBox.height);
  if (listBox.height > roomBelow) {
    expect(listBox.y + listBox.height).toBeLessThanOrEqual(controlBox.y + 1);
  }
  expect(listBox.y).toBeGreaterThanOrEqual(0);
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(420);
});

test("the calendar panel opens in the top layer and closes on Escape", async ({ page }) => {
  await openTab(page, "dates");
  await page.getByRole("button", { name: /calendar/i }).first().click();

  const panel = page.getByRole("dialog").first();
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((element) => element.matches(":popover-open"))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});
