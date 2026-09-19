import { describe, expect, it } from "vitest";
import { formatCount, showCount } from "../core/count";

describe("formatCount", () => {
  it("prints the number while it fits", () => {
    expect(formatCount(0)).toEqual({ text: "0" });
    expect(formatCount(99)).toEqual({ text: "99" });
  });

  it("caps it, and says aloud what the cap means", () => {
    // "99+" read out as "ninety-nine plus" is a guess at a number.
    expect(formatCount(100)).toEqual({ text: "99+", spoken: "more than 99" });
    expect(formatCount(4821, 999)).toEqual({ text: "999+", spoken: "more than 999" });
  });

  it("takes a formatter, for grouped or localized numbers", () => {
    const format = new Intl.NumberFormat("de-DE").format;
    expect(formatCount(1234, 9999, format).text).toBe("1.234");
    expect(formatCount(20000, 9999, format)).toEqual({
      text: "9.999+",
      spoken: "more than 9.999",
    });
  });

  it("drops the fraction of a number that should not have one", () => {
    expect(formatCount(3.7).text).toBe("3");
  });

  it("has nothing to print for a number that is not one", () => {
    expect(formatCount(Number.NaN).text).toBe("");
    expect(formatCount(Number.POSITIVE_INFINITY).text).toBe("");
  });
});

describe("showCount", () => {
  it("leaves a zero off the page unless it is asked for", () => {
    expect(showCount(0)).toBe(false);
    expect(showCount(0, true)).toBe(true);
    expect(showCount(1)).toBe(true);
  });

  it("never shows a negative or a non-number", () => {
    expect(showCount(-1)).toBe(false);
    expect(showCount(Number.NaN, true)).toBe(false);
  });
});
