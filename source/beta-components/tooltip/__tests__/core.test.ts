import { describe, expect, it } from "vitest";
import { isHoverPointer, nextVisibility } from "../core/visibility";

const delays = { open: 400, close: 120 };

describe("nextVisibility", () => {
  it("waits before showing on hover, so a swept toolbar stays quiet", () => {
    expect(nextVisibility({ hovered: true, focused: false }, delays)).toEqual({
      open: true,
      delay: 400,
    });
  });

  it("shows immediately on keyboard focus", () => {
    expect(nextVisibility({ hovered: false, focused: true }, delays)).toEqual({
      open: true,
      delay: 0,
    });
  });

  it("stays open while focused, even after the pointer leaves", () => {
    expect(nextVisibility({ hovered: false, focused: true }, delays).open).toBe(true);
  });

  it("waits a moment before hiding, so crossing a gap does not flicker", () => {
    expect(nextVisibility({ hovered: false, focused: false }, delays)).toEqual({
      open: false,
      delay: 120,
    });
  });
});

describe("isHoverPointer", () => {
  it("counts a mouse", () => {
    expect(isHoverPointer("mouse")).toBe(true);
  });

  it("ignores touch and pen, where a tooltip would cover what was tapped", () => {
    expect(isHoverPointer("touch")).toBe(false);
    expect(isHoverPointer("pen")).toBe(false);
  });
});
