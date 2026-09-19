import { describe, expect, it } from "vitest";
import { formatNumber } from "../core/format";
import { localeParts, parseNumber, toEditText } from "../core/parse";
import { clamp, decimalsOf, round, snapToStep, stepBy } from "../core/step";

describe("localeParts", () => {
  it("reads each locale's notation out of Intl", () => {
    expect(localeParts("en-US")).toMatchObject({ group: ",", decimal: "." });
    expect(localeParts("de-DE")).toMatchObject({ group: ".", decimal: "," });
    expect(localeParts("fr-FR")).toMatchObject({ decimal: "," });
    expect(localeParts("ar-EG").digits[0]).toBe("٠");
  });
});

describe("parseNumber", () => {
  it("reads the locale's own notation", () => {
    expect(parseNumber("1,234.56", "en-US")).toBe(1234.56);
    expect(parseNumber("1.234,56", "de-DE")).toBe(1234.56);
    // The separator here is a narrow no-break space, not one anybody types.
    expect(parseNumber("1 234,56", "fr-FR")).toBe(1234.56);
  });

  it("reads the locale's digits", () => {
    expect(parseNumber("١٢٣", "ar-EG")).toBe(123);
  });

  it("ignores currency symbols, percent signs and spare spaces", () => {
    expect(parseNumber("$1,234.56", "en-US")).toBe(1234.56);
    expect(parseNumber("45 %", "en-US")).toBe(45);
    expect(parseNumber("  12  ", "en-US")).toBe(12);
  });

  it("reads negatives, including the typographic minus", () => {
    expect(parseNumber("-42", "en-US")).toBe(-42);
    expect(parseNumber("−42", "en-US")).toBe(-42);
    expect(parseNumber("-1.234,5", "de-DE")).toBe(-1234.5);
  });

  it("refuses what is not a number, and keeps that apart from empty", () => {
    expect(parseNumber("", "en-US")).toBeNull();
    expect(parseNumber("abc", "en-US")).toBeNull();
    expect(parseNumber("1.2.3", "en-US")).toBeNull();
    expect(parseNumber(".", "en-US")).toBeNull();
    expect(parseNumber("-", "en-US")).toBeNull();
  });

  it("does not mistake one locale's group separator for another's decimal", () => {
    // The whole point: the same five characters, two different numbers.
    expect(parseNumber("1.234", "en-US")).toBe(1.234);
    expect(parseNumber("1.234", "de-DE")).toBe(1234);
  });
});

describe("toEditText", () => {
  it("gives the plain form, in the locale's decimal separator", () => {
    expect(toEditText(1234.5, "en-US")).toBe("1234.5");
    expect(toEditText(1234.5, "de-DE")).toBe("1234,5");
    expect(toEditText(null, "en-US")).toBe("");
  });

  it("round-trips through parseNumber", () => {
    for (const locale of ["en-US", "de-DE", "fr-FR"]) {
      expect(parseNumber(toEditText(-1234.56, locale), locale)).toBe(-1234.56);
    }
  });
});

describe("formatNumber", () => {
  it("groups, and respects a fixed number of decimals", () => {
    expect(formatNumber(1234.5, { locale: "en-US", decimals: 2 })).toBe("1,234.50");
    expect(formatNumber(1234.5, { locale: "en-US", useGrouping: false })).toBe("1234.5");
  });

  it("formats money and percentages", () => {
    expect(formatNumber(1234.5, { locale: "en-US", style: "currency", currency: "USD" })).toBe("$1,234.50");
    expect(formatNumber(0.45, { locale: "en-US", style: "percent" })).toBe("45%");
  });

  it("falls back to a plain number when a currency is asked for without a code", () => {
    // Intl throws on style:"currency" with no currency; a field mid-configuration
    // should not take the page down with it.
    expect(formatNumber(12, { locale: "en-US", style: "currency" })).toBe("12");
  });

  it("has nothing to show for no value", () => {
    expect(formatNumber(null, { locale: "en-US" })).toBe("");
  });
});

describe("decimalsOf and round", () => {
  it("counts fraction digits, including exponent notation", () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(1e-7)).toBe(7);
  });

  it("rounds the way the number reads, not the way the float sits", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(-1.005, 2)).toBe(-1.01);
  });
});

describe("stepBy", () => {
  it("adds a step without floating-point drift", () => {
    expect(stepBy(0.1, 1, { step: 0.2 })).toBe(0.3);
    expect(stepBy(0.3, -1, { step: 0.1 })).toBe(0.2);
    expect(stepBy(1.1, 1, { step: 0.1 })).toBe(1.2);
  });

  it("starts an empty field at min, or one step from zero", () => {
    expect(stepBy(null, 1, { step: 1 })).toBe(1);
    expect(stepBy(null, -1, { step: 1 })).toBe(-1);
    expect(stepBy(null, 1, { step: 1, min: 5 })).toBe(5);
    expect(stepBy(null, -1, { step: 1, min: 5 })).toBe(5);
  });

  it("stops at the limits", () => {
    expect(stepBy(9, 1, { step: 5, max: 10 })).toBe(10);
    expect(stepBy(1, -1, { step: 5, min: 0 })).toBe(0);
  });

  it("treats a step of zero as one, rather than freezing", () => {
    expect(stepBy(3, 1, { step: 0 })).toBe(4);
  });
});

describe("snapToStep", () => {
  it("counts the grid from min", () => {
    expect(snapToStep(7, { step: 5, min: 0 })).toBe(5);
    expect(snapToStep(8, { step: 5, min: 0 })).toBe(10);
    expect(snapToStep(7, { step: 5, min: 1 })).toBe(6);
  });

  it("works in fractions", () => {
    expect(snapToStep(0.27, { step: 0.05, min: 0 })).toBe(0.25);
  });

  it("stays inside the limits", () => {
    expect(snapToStep(99, { step: 10, min: 0, max: 95 })).toBe(95);
  });
});

describe("clamp", () => {
  it("pulls a value inside whichever limits exist", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(11, undefined, undefined)).toBe(11);
  });
});
