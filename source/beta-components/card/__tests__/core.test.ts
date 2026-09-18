import { describe, expect, it } from "vitest";
import { isPositive, percentChange, trendDirection } from "../core/trend";

describe("trendDirection", () => {
  it("reads the sign of the change", () => {
    expect(trendDirection(4.2)).toBe("up");
    expect(trendDirection(-0.3)).toBe("down");
    expect(trendDirection(0)).toBe("flat");
  });

  it("treats movement under the threshold as flat", () => {
    expect(trendDirection(0.4, 0.5)).toBe("flat");
    expect(trendDirection(-0.4, 0.5)).toBe("flat");
    expect(trendDirection(0.6, 0.5)).toBe("up");
  });

  it("is flat for a value that is not a number", () => {
    expect(trendDirection(Number.NaN)).toBe("flat");
    expect(trendDirection(Number.POSITIVE_INFINITY)).toBe("flat");
  });
});

describe("isPositive", () => {
  it("treats up as good by default", () => {
    expect(isPositive("up")).toBe(true);
    expect(isPositive("down")).toBe(false);
  });

  it("flips for figures where down is the good outcome, such as churn", () => {
    expect(isPositive("up", true)).toBe(false);
    expect(isPositive("down", true)).toBe(true);
  });

  it("is null when nothing moved, so no colour is applied", () => {
    expect(isPositive("flat")).toBeNull();
    expect(isPositive("flat", true)).toBeNull();
  });
});

describe("percentChange", () => {
  it("is the change as a share of where it started", () => {
    expect(percentChange(200, 250)).toBe(25);
    expect(percentChange(200, 150)).toBe(-25);
  });

  it("measures against the size of a negative start", () => {
    expect(percentChange(-200, -150)).toBe(25);
  });

  it("is null from zero, which has no percentage", () => {
    expect(percentChange(0, 10)).toBeNull();
  });

  it("is null for values that are not numbers", () => {
    expect(percentChange(Number.NaN, 10)).toBeNull();
  });
});
