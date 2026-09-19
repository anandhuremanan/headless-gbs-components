import { describe, expect, it } from "vitest";
import { describeProgress, stepFraction } from "../core/progress";

describe("describeProgress", () => {
  it("measures a value against its max", () => {
    expect(describeProgress(25)).toMatchObject({ fraction: 0.25, percent: 25, value: 25 });
    expect(describeProgress(3, 8)).toMatchObject({ fraction: 0.375, percent: 38 });
  });

  it("treats no value as unknown, not as zero", () => {
    // The difference decides whether a screen reader says "busy" or "0 percent".
    for (const value of [null, undefined, Number.NaN]) {
      expect(describeProgress(value)).toEqual({
        indeterminate: true,
        value: null,
        fraction: 0,
        percent: 0,
      });
    }
  });

  it("clamps into range rather than drawing past the end", () => {
    expect(describeProgress(140).percent).toBe(100);
    expect(describeProgress(-20).percent).toBe(0);
  });

  it("survives a task with nothing in it", () => {
    // 0 of 0 files: without the guard this is NaN% and an empty bar drawn at
    // Infinity.
    const state = describeProgress(0, 0);
    expect(state.fraction).toBe(0);
    expect(Number.isNaN(state.percent)).toBe(false);
  });

  it("keeps the drawn fraction unrounded", () => {
    // 99.6% must not snap the bar to full while bytes are still moving.
    const state = describeProgress(99.6);
    expect(state.percent).toBe(100);
    expect(state.fraction).toBeCloseTo(0.996);
  });
});

describe("stepFraction", () => {
  it("counts a step as done, not as started", () => {
    // "Step 2 of 5" is two fifths finished.
    expect(stepFraction(2, 5)).toBe(0.4);
    expect(stepFraction(0, 5)).toBe(0);
    expect(stepFraction(5, 5)).toBe(1);
  });

  it("stays inside the wizard", () => {
    expect(stepFraction(9, 5)).toBe(1);
    expect(stepFraction(-1, 5)).toBe(0);
    expect(stepFraction(1, 0)).toBe(0);
  });
});
