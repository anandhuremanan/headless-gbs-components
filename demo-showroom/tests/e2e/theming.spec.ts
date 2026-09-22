import { expect, test } from "@playwright/test";
import { computed, openTab, setTheme } from "./helpers";

/**
 * The library's promise: setting --gbs-* on :root themes every component,
 * including the DataGrid, which declares its own --dg-* variables.
 */
test.describe("shared theme variables", () => {
  test("a --gbs-* override on :root reaches buttons, fields and the grid", async ({ page }) => {
    await openTab(page, "controls");
    await page.addStyleTag({
      content: `:root {
        --gbs-accent: rgb(220, 0, 120);
        --gbs-accent-fg: rgb(255, 255, 240);
        --gbs-bg: rgb(250, 248, 255);
        --gbs-radius: 2px;
      }`,
    });

    const primary = page.getByRole("button", { name: "Primary", exact: true }).first();
    await expect(primary).toHaveCSS("background-color", "rgb(220, 0, 120)");
    await expect(primary).toHaveCSS("color", "rgb(255, 255, 240)");
    await expect(primary).toHaveCSS("border-radius", "2px");

    // The checkbox uses the same accent for its checked box.
    const checkbox = page.getByRole("checkbox", { name: "I agree to the terms" });
    await checkbox.check();
    await expect(checkbox).toHaveCSS("background-color", "rgb(220, 0, 120)");
  });

  test("the grid follows the shared variables, not only its own --dg-*", async ({ page }) => {
    await openTab(page, "grid");
    await page.addStyleTag({
      content: `:root { --gbs-bg: rgb(250, 248, 255); --gbs-header-bg: rgb(12, 40, 80); --gbs-accent: rgb(220, 0, 120); }`,
    });

    await expect(page.locator(".dg-root")).toHaveCSS("background-color", "rgb(250, 248, 255)");
    // A header cell reads --dg-header-bg, which now falls back to --gbs-header-bg.
    await expect(page.locator(".dg-root").locator("[role='columnheader']").first()).toHaveCSS(
      "background-color",
      "rgb(12, 40, 80)",
    );
  });

  test("components inside the grid inherit the grid's own variables", async ({ page }) => {
    await openTab(page, "grid");
    // Scope a variable to the grid only; a page-level button must not change.
    await page.addStyleTag({ content: `.dg-root { --dg-accent: rgb(0, 160, 90); }` });
    const gridAccent = await computed(page, ".dg-root", "--dg-accent");
    expect(gridAccent).toBe("rgb(0, 160, 90)");
  });

  test("a scoped override themes one section without touching the rest", async ({ page }) => {
    await openTab(page, "controls");
    await page.evaluate(() => {
      const sections = document.querySelectorAll("section");
      (sections[0] as HTMLElement).style.setProperty("--gbs-accent", "rgb(10, 20, 200)");
    });
    const scoped = page.locator("section").first().getByRole("button", { name: "Primary", exact: true });
    await expect(scoped).toHaveCSS("background-color", "rgb(10, 20, 200)");
  });

  test("dark mode swaps the palette", async ({ page }) => {
    await openTab(page, "grid");
    const light = await computed(page, ".dg-root", "background-color");
    await setTheme(page, "dark");
    const dark = await computed(page, ".dg-root", "background-color");
    expect(light).not.toBe(dark);
    // The default dark surface from the palette.
    expect(dark).toBe("rgb(11, 11, 14)");
  });

  test("defaults are identical across components before any override", async ({ page }) => {
    await openTab(page, "fields");
    const input = await computed(page, ".in-control", "border-color");
    const textarea = await computed(page, ".ta-input", "border-color");
    expect(input).toBe(textarea);
  });
});

test("the spinner's overlay still dims content once a palette is set", async ({ page }) => {
  // The overlay is a color-mix of the surface colour. Written carelessly, the
  // percentage ends up inside the var() fallback, so the whole value becomes
  // invalid the moment --gbs-bg is actually set and the cover turns invisible.
  await openTab(page, "controls");
  const background = await page.evaluate(() => {
    document.documentElement.style.setProperty("--gbs-bg", "#fff8f0");
    const root = document.createElement("div");
    root.className = "sp-root";
    const overlay = document.createElement("div");
    overlay.className = "sp-overlay";
    root.append(overlay);
    document.body.append(root);
    return getComputedStyle(overlay).backgroundColor;
  });

  expect(background).not.toBe("rgba(0, 0, 0, 0)");
  expect(background).toMatch(/^(rgb|color|oklab)/);
});
