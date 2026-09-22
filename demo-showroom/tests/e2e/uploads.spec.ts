import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

const file = (name: string, type: string, size = 2048) => ({
  name,
  mimeType: type,
  buffer: Buffer.alloc(size, 7),
});

test("files are listed, validated and uploaded in chunks", async ({ page }) => {
  await openTab(page, "uploads");
  const uploader = page.locator(".fu-root").first();

  await uploader.locator("input[type=file]").setInputFiles([
    file("report.pdf", "application/pdf", 700 * 1024),
    file("photo.png", "image/png"),
  ]);

  await expect(uploader.getByText("report.pdf")).toBeVisible();
  await expect(uploader.getByText("photo.png")).toBeVisible();

  // 700 KB at a 256 KB chunk size is three chunks; the demo's simulated server
  // reports progress, so the row ends as Uploaded.
  await uploader.getByRole("button", { name: /Upload 2 files/ }).click();
  await expect(uploader.getByText("Uploaded").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Last run stored: .+/)).toBeVisible();
});

test("validation rejects the wrong type and says why", async ({ page }) => {
  await openTab(page, "uploads");
  const gallery = page.locator(".fu-root").nth(1);

  await gallery.locator("input[type=file]").setInputFiles([file("notes.txt", "text/plain")]);
  await expect(gallery.getByRole("alert")).toContainText("isn't an allowed file type");
});

test("an upload can be paused and resumed", async ({ page }) => {
  await openTab(page, "uploads");
  const uploader = page.locator(".fu-root").first();
  await uploader.locator("input[type=file]").setInputFiles([file("large.pdf", "application/pdf", 2 * 1024 * 1024)]);
  await uploader.getByRole("button", { name: /Upload 1 file/ }).click();

  const pause = uploader.getByRole("button", { name: /^Pause/ });
  await pause.click();
  await expect(uploader.getByText(/Paused/)).toBeVisible();

  await uploader.getByRole("button", { name: /^Resume/ }).click();
  await expect(uploader.getByText("Uploaded").first()).toBeVisible({ timeout: 30_000 });
});

test("without an endpoint the files post with the form", async ({ page }) => {
  await openTab(page, "uploads");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Submit" }) });

  await form.locator("input[type=file]").first().setInputFiles([file("contract.pdf", "application/pdf", 1234)]);
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form.getByText(/contract\.pdf \(1234 B\)/)).toBeVisible();
});
