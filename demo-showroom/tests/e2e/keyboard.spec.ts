import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

test("tabs follow the WAI-ARIA pattern", async ({ page }) => {
  await openTab(page, "controls");
  const tablist = page.getByRole("tablist", { name: "Project" });
  const overview = tablist.getByRole("tab", { name: "Overview" });
  await overview.click();
  await expect(overview).toHaveAttribute("aria-selected", "true");

  // Arrow keys move and select; the disabled tab is skipped.
  await page.keyboard.press("ArrowRight");
  await expect(tablist.getByRole("tab", { name: /Activity/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tablist.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tablist.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
});

test("the combobox opens, filters and selects with the keyboard", async ({ page }) => {
  await openTab(page, "select");
  // The demo has a client-side and a form example; use the first.
  const country = page.getByRole("combobox", { name: "Country" }).first();
  await country.focus();
  await page.keyboard.press("Enter");

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await page.keyboard.type("spa");
  await expect(listbox.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");

  await expect(listbox).toBeHidden();
  await expect(country).toContainText("Spain");
  await expect(country).toBeFocused();
});

test("a modal traps focus, closes on Escape and returns focus", async ({ page }) => {
  await openTab(page, "overlays");
  const trigger = page.getByRole("button", { name: "Open", exact: true }).first();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Terms of service" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Accept" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("a confirm dialog resolves from the keyboard", async ({ page }) => {
  await openTab(page, "overlays");
  await page.getByRole("button", { name: "Confirm", exact: true }).first().click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("confirm → true")).toBeVisible();
});

test("the OTP field takes typing and pasted codes", async ({ page }) => {
  await openTab(page, "fields");
  const code = page.getByLabel("SMS code");
  await code.click();
  await page.keyboard.type("123456");
  await expect(page.getByText("Verified ✓")).toBeVisible();

  // Paste noise: only the digits are kept.
  await code.fill("");
  await code.evaluate((element: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, "Your code is 123-456");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(code).toHaveValue("123456");
});

test("checkboxes toggle with Space, including the group's select all", async ({ page }) => {
  await openTab(page, "controls");
  const terms = page.getByRole("checkbox", { name: "I agree to the terms" });
  await terms.focus();
  await page.keyboard.press("Space");
  await expect(terms).toBeChecked();

  const selectAll = page.getByRole("checkbox", { name: "Select all" });
  await selectAll.click();
  for (const label of ["Email", "SMS", "Push"]) {
    await expect(page.getByRole("checkbox", { name: new RegExp(`^${label}`) })).toBeChecked();
  }
});

test("a date can be typed into the date picker", async ({ page }) => {
  await openTab(page, "dates");
  const field = page.getByLabel("Delivery date");
  await field.fill("12 Mar 2026");
  await field.blur();
  await expect(page.getByText("Value: 2026-03-12")).toBeVisible();
});

test("Escape abandons a column resize and leaves the width alone", async ({ page }) => {
  await openTab(page, "grid");
  const header = page.getByRole("columnheader").nth(1);
  const handle = header.locator(".dg-resize-handle");

  const startWidth = (await header.boundingBox())!.width;
  const grip = (await handle.boundingBox())!;

  // Drag 120px to the right, check it followed, then abandon with Escape.
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 120, grip.y + grip.height / 2, { steps: 6 });
  await expect
    .poll(async () => (await header.boundingBox())!.width)
    .toBeGreaterThan(startWidth + 60);

  await page.keyboard.press("Escape");
  await page.mouse.up();

  await expect.poll(async () => (await header.boundingBox())!.width).toBe(startWidth);
});

test("a completed column resize keeps the new width", async ({ page }) => {
  await openTab(page, "grid");
  const header = page.getByRole("columnheader").nth(1);
  const handle = header.locator(".dg-resize-handle");

  const startWidth = (await header.boundingBox())!.width;
  const grip = (await handle.boundingBox())!;

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 120, grip.y + grip.height / 2, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => (await header.boundingBox())!.width).toBeGreaterThan(startWidth + 60);
});
