import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openTab(page, "display");
});

test("problems interrupt and good news waits its turn", async ({ page }) => {
  // The role is what decides whether a screen reader cuts in.
  await expect(page.getByRole("alert").filter({ hasText: "Your trial ends" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "could not save" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "240 rows imported" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Read-only workspace" })).toBeVisible();
});

test("an alert is dismissed by its own button", async ({ page }) => {
  const alert = page.getByRole("alert").filter({ hasText: "could not save" });
  await alert.getByRole("button", { name: "Dismiss" }).click();
  await expect(alert).toHaveCount(0);
});

test("a capped count says aloud what it means", async ({ page }) => {
  const badges = page.locator(".bd-root[data-count]");
  await expect(badges.filter({ hasText: "3" }).first()).toBeVisible();

  // "99+" is shorthand a screen reader would otherwise guess at.
  const capped = badges.filter({ hasText: "99+" }).first();
  await expect(capped).toContainText("99+");
  await expect(capped.locator(".bd-sr-only")).toHaveText("more than 99");
});

test("a count of zero is only on the page when it is asked for", async ({ page }) => {
  // One showZero badge is rendered; the plain zero is not in the DOM at all.
  const zeros = page.locator(".bd-root[data-count]").filter({ hasText: /^0$/ });
  await expect(zeros).toHaveCount(1);
});

test("a tag is removed by a button that names it", async ({ page }) => {
  const remove = page.getByRole("button", { name: "Remove Berlin" });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.getByRole("button", { name: "Remove Berlin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove Paris" })).toBeVisible();
});

test("an avatar is named, and a broken image falls back to initials", async ({ page }) => {
  await expect(page.getByRole("img", { name: "Ada Lovelace" }).first()).toBeVisible();

  // The one with a dead src: the <img> is dropped and the letters take over.
  const broken = page.locator(".av-root").filter({ hasText: "AL" }).first();
  await expect(broken.locator("img")).toHaveCount(0);
  await expect(broken).toContainText("AL");
});

test("a presence dot is named, not just coloured", async ({ page }) => {
  await expect(page.getByRole("img", { name: "Online" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Busy" })).toBeVisible();
});

test("an avatar group counts the people it could not show", async ({ page }) => {
  const group = page.getByRole("group", { name: "Assigned to" });
  // Five people, four slots: three faces and a "+2".
  await expect(group.locator(".av-root")).toHaveCount(3);
  await expect(group.getByRole("img", { name: "2 more" })).toHaveText("+2");
});

test("a progress bar reports its value, and an unknown one reports none", async ({ page }) => {
  const storage = page.getByRole("progressbar", { name: "Storage" });
  await expect(storage).toHaveAttribute("aria-valuenow", "92");
  await expect(storage).toHaveAttribute("aria-valuetext", "9.2 GB of 10 GB");

  // The absence of aria-valuenow is what makes a screen reader say "busy".
  const unknown = page.getByRole("progressbar", { name: "Preparing export" });
  expect(await unknown.getAttribute("aria-valuenow")).toBeNull();
  await expect(page.locator(".pr-root[data-indeterminate]")).toHaveCount(1);
});

test("the accordion opens one panel at a time and closes the others", async ({ page }) => {
  const shipping = page.getByRole("button", { name: /Shipping/ });
  const returns = page.getByRole("button", { name: /Returns/ });

  await expect(shipping).toHaveAttribute("aria-expanded", "true");
  await returns.click();
  await expect(returns).toHaveAttribute("aria-expanded", "true");
  await expect(shipping).toHaveAttribute("aria-expanded", "false");

  // And the open one closes again, since this accordion is collapsible.
  await returns.click();
  await expect(returns).toHaveAttribute("aria-expanded", "false");
});

test("the accordion opens from the keyboard", async ({ page }) => {
  const shipping = page.getByRole("button", { name: /Shipping/ });
  await shipping.focus();
  await page.keyboard.press("Enter");
  await expect(shipping).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(shipping).toHaveAttribute("aria-expanded", "true");
});

test("a disabled section stays reachable but will not open", async ({ page }) => {
  const support = page.getByRole("button", { name: /Support/ });
  await expect(support).toHaveAttribute("aria-disabled", "true");
  await support.click({ force: true });
  await expect(support).toHaveAttribute("aria-expanded", "false");
});

test("a multiple accordion keeps several open at once", async ({ page }) => {
  const filters = page.getByRole("button", { name: /Filters/ });
  const columns = page.getByRole("button", { name: /Columns/ });

  await filters.click();
  await columns.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await expect(columns).toHaveAttribute("aria-expanded", "true");
});
