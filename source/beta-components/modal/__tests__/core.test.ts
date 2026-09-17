import { describe, expect, it } from "vitest";
import { canDismiss, confirmClose, isOutside } from "../core/dismiss";

describe("dismiss rules", () => {
  it("allows Escape and backdrop by default, and lets each be turned off", () => {
    expect(canDismiss("escape")).toBe(true);
    expect(canDismiss("backdrop")).toBe(true);
    expect(canDismiss("escape", { closeOnEscape: false })).toBe(false);
    expect(canDismiss("backdrop", { closeOnBackdrop: false })).toBe(false);
  });

  it("always allows the close button and code", () => {
    const locked = { closeOnEscape: false, closeOnBackdrop: false };
    expect(canDismiss("close-button", locked)).toBe(true);
    expect(canDismiss("api", locked)).toBe(true);
  });
});

describe("backdrop hit test", () => {
  const rect = { left: 100, top: 50, right: 500, bottom: 350 };

  it("treats points outside the box as the backdrop", () => {
    expect(isOutside(rect, 50, 200)).toBe(true);
    expect(isOutside(rect, 300, 400)).toBe(true);
    expect(isOutside(rect, 300, 200)).toBe(false);
  });

  it("counts the edges as inside", () => {
    expect(isOutside(rect, 100, 50)).toBe(false);
    expect(isOutside(rect, 500, 350)).toBe(false);
  });
});

describe("close guard", () => {
  it("closes without a guard", async () => {
    expect(await confirmClose(undefined, "escape")).toBe(true);
  });

  it("stays open only on an explicit false", async () => {
    expect(await confirmClose(() => true, "escape")).toBe(true);
    expect(await confirmClose(() => false, "escape")).toBe(false);
    expect(await confirmClose(() => Promise.resolve(false), "backdrop")).toBe(false);
    expect(await confirmClose(() => undefined as unknown as boolean, "api")).toBe(true);
  });

  it("passes the reason and stays open when the guard throws", async () => {
    const reasons: string[] = [];
    await confirmClose((reason) => {
      reasons.push(reason);
      return true;
    }, "close-button");
    expect(reasons).toEqual(["close-button"]);
    expect(await confirmClose(() => Promise.reject(new Error("save failed")), "api")).toBe(false);
  });
});
