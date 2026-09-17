import { describe, expect, it } from "vitest";
import { spinnerPixels, stepVisibility } from "../core/visibility";

const hidden = { visible: false, loadingSince: null, visibleSince: null };

describe("visibility", () => {
  it("shows at once without a delay", () => {
    expect(stepVisibility(true, { ...hidden, loadingSince: 1000 }, 1000)).toEqual({ visible: true, recheckIn: null });
  });

  it("waits out the delay, then shows", () => {
    const marks = { ...hidden, loadingSince: 1000 };
    expect(stepVisibility(true, marks, 1100, { delay: 300 })).toEqual({ visible: false, recheckIn: 200 });
    expect(stepVisibility(true, marks, 1300, { delay: 300 })).toEqual({ visible: true, recheckIn: null });
  });

  it("never shows for work that ends within the delay", () => {
    expect(stepVisibility(false, hidden, 1200, { delay: 300 })).toEqual({ visible: false, recheckIn: null });
  });

  it("stays for the minimum duration once shown", () => {
    const shown = { visible: true, loadingSince: null, visibleSince: 2000 };
    expect(stepVisibility(false, shown, 2100, { minDuration: 500 })).toEqual({ visible: true, recheckIn: 400 });
    expect(stepVisibility(false, shown, 2500, { minDuration: 500 })).toEqual({ visible: false, recheckIn: null });
  });

  it("keeps showing while loading continues", () => {
    const shown = { visible: true, loadingSince: 1000, visibleSince: 1300 };
    expect(stepVisibility(true, shown, 9000, { delay: 300, minDuration: 500 })).toEqual({
      visible: true,
      recheckIn: null,
    });
  });

  it("treats negative options as zero", () => {
    expect(stepVisibility(true, { ...hidden, loadingSince: 0 }, 0, { delay: -50 }).visible).toBe(true);
  });
});

describe("size", () => {
  it("maps names to pixels and passes numbers through", () => {
    expect(spinnerPixels()).toBe(24);
    expect(spinnerPixels("xs")).toBe(12);
    expect(spinnerPixels("xl")).toBe(48);
    expect(spinnerPixels(20)).toBe(20);
    expect(spinnerPixels(0)).toBe(1);
  });
});
