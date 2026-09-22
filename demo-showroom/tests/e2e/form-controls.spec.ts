import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openTab(page, "formControls");
});

test("the switch is a switch to assistive technology, and takes Space and the arrows", async ({ page }) => {
  const notifications = page.getByRole("switch", { name: "Email notifications" });
  await expect(notifications).toBeChecked();

  await notifications.focus();
  await page.keyboard.press("Space");
  await expect(notifications).not.toBeChecked();

  // The ARIA switch pattern: the arrows set a side rather than toggling.
  await page.keyboard.press("ArrowRight");
  await expect(notifications).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(notifications).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(notifications).not.toBeChecked();
});

test("a switch that fails to save puts itself back", async ({ page }) => {
  const sync = page.getByRole("switch", { name: "Sync with the billing system" });
  await expect(sync).not.toBeChecked();

  await sync.click();
  // Optimistic: it shows the new setting, and says it is busy, before the answer.
  await expect(sync).toBeChecked();
  await expect(sync).toHaveAttribute("aria-busy", "true");

  await expect(sync).not.toBeChecked({ timeout: 3000 });
  await expect(sync).not.toHaveAttribute("aria-busy", "true");
});

test("a read-only switch does not move", async ({ page }) => {
  const readOnly = page.getByRole("switch", { name: "Read-only, on" });
  await expect(readOnly).toBeChecked();
  await readOnly.click();
  await expect(readOnly).toBeChecked();
});

test("the radio group is one tab stop and moves with the arrows", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Send the report" });
  const weekly = group.getByRole("radio", { name: "Weekly" });
  const monthly = group.getByRole("radio", { name: "Monthly" });
  await expect(weekly).toBeChecked();

  await weekly.focus();
  await page.keyboard.press("ArrowDown");
  await expect(monthly).toBeChecked();
  await expect(monthly).toBeFocused();

  // Wrapping around is the browser's own behaviour, not ours.
  await page.keyboard.press("ArrowDown");
  await expect(group.getByRole("radio", { name: "Daily" })).toBeChecked();
});

test("clearing empties a group that cannot be emptied by clicking", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Send the report" });
  await group.getByRole("radio", { name: "Daily" }).check();
  await group.getByRole("button", { name: "Clear" }).click();

  for (const name of ["Daily", "Weekly", "Monthly"]) {
    await expect(group.getByRole("radio", { name })).not.toBeChecked();
  }
});

test("a disabled choice is skipped by the arrows but still announced", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "Delivery" });
  const courier = group.getByRole("radio", { name: "Courier" });
  await expect(courier).toBeDisabled();

  await group.getByRole("radio", { name: "Standard" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Express" })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Standard" })).toBeChecked();
});

test("the number field reads the notation of its own locale", async ({ page }) => {
  const german = page.getByRole("spinbutton", { name: "Betrag (de-DE)" });
  const american = page.getByRole("spinbutton", { name: "Amount (en-US)" });

  await german.click();
  await german.fill("1.234,56");
  await german.blur();

  // One number, two notations, and the American field agrees.
  // A no-break space sits before the euro sign, so match rather than compare.
  await expect(german).toHaveValue(/^1\.234,56\s€$/);
  await expect(american).toHaveValue("$1,234.56");
});

test("the number field keeps a half-typed entry and falls back rather than losing it", async ({ page }) => {
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("7");
  await quantity.blur();
  await expect(quantity).toHaveValue("7");

  await quantity.click();
  await quantity.fill("abc");
  // What was typed stays put while the field has focus.
  await expect(quantity).toHaveValue("abc");
  await quantity.blur();
  await expect(quantity).toHaveValue("7");
});

test("the wheel does not edit a focused number field", async ({ page }) => {
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("7");
  await quantity.focus();
  await quantity.hover();
  await page.mouse.wheel(0, 200);
  await expect(quantity).toHaveValue("7");
});

test("arrows step, and stop at the limits", async ({ page }) => {
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("1");
  await quantity.focus();
  await page.keyboard.press("ArrowUp");
  await expect(quantity).toHaveValue("2");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  // min is 1, so it holds there rather than going to 0.
  await expect(quantity).toHaveValue("1");

  await page.keyboard.press("End");
  await expect(quantity).toHaveValue("99");
  await page.keyboard.press("Home");
  await expect(quantity).toHaveValue("1");
});

test("stepping decimals does not drift", async ({ page }) => {
  const weight = page.getByRole("spinbutton", { name: "Weight" });
  await weight.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  // 0.1 + 0.1 + 0.1 the naive way is 0.30000000000000004.
  await expect(weight).toHaveValue("0.3");
});

test("holding a stepper button repeats", async ({ page }) => {
  const quantity = page.getByRole("spinbutton", { name: "Quantity" });
  await quantity.fill("1");
  const up = page.getByRole("button", { name: "Increase" }).first();

  const box = (await up.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => Number(await quantity.inputValue())).toBeGreaterThan(4);
  await page.mouse.up();

  const held = Number(await quantity.inputValue());
  // And it stops the moment the button is released.
  await page.waitForTimeout(300);
  expect(Number(await quantity.inputValue())).toBe(held);
});

test("the value snaps onto the step grid when asked to", async ({ page }) => {
  const snapped = page.getByRole("spinbutton", { name: "Rounded to fives" });
  await snapped.click();
  await snapped.fill("13");
  await snapped.blur();
  await expect(snapped).toHaveValue("15");
});
