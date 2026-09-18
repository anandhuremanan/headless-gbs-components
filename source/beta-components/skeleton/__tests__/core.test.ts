import { describe, expect, it } from "vitest";
import { lineWidths, toLength } from "../core/lines";

describe("lineWidths", () => {
  it("draws the last line short, the way a paragraph ends", () => {
    expect(lineWidths(3)).toEqual(["100%", "100%", "60%"]);
  });

  it("leaves a single line full width, so it does not read as a label", () => {
    expect(lineWidths(1)).toEqual(["100%"]);
  });

  it("takes the width of the last line", () => {
    expect(lineWidths(2, 40)).toEqual(["100%", "40%"]);
  });

  it("keeps the last line visible however small it is asked to be", () => {
    expect(lineWidths(2, 0)).toEqual(["100%", "10%"]);
    expect(lineWidths(2, 400)).toEqual(["100%", "100%"]);
  });

  it("is empty for nothing to draw", () => {
    expect(lineWidths(0)).toEqual([]);
    expect(lineWidths(-3)).toEqual([]);
  });
});

describe("toLength", () => {
  it("turns a number into pixels", () => {
    expect(toLength(24)).toBe("24px");
  });

  it("passes a string through, so any CSS length works", () => {
    expect(toLength("50%")).toBe("50%");
    expect(toLength("3rem")).toBe("3rem");
  });

  it("is undefined when unset, leaving the stylesheet's default", () => {
    expect(toLength(undefined)).toBeUndefined();
  });
});
