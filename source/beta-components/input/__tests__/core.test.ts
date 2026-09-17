import { describe, expect, it } from "vitest";
import { countCharacters } from "../core/count";
import {
  activeCell,
  cellAt,
  otpInputMode,
  otpPattern,
  sanitizeOtp,
  separatorsAfter,
} from "../core/otp";

describe("character count", () => {
  it("counts what a person sees, not UTF-16 units", () => {
    expect(countCharacters("")).toBe(0);
    expect(countCharacters("hello")).toBe(5);
    expect("👍🏽".length).toBe(4);
    expect(countCharacters("👍🏽")).toBe(1);
    expect(countCharacters("é")).toBe(1);
    expect(countCharacters("👨‍👩‍👧 ok")).toBe(4);
  });
});

describe("otp sanitizing", () => {
  it("keeps digits only, up to the length", () => {
    expect(sanitizeOtp("12a3", 6)).toBe("123");
    expect(sanitizeOtp("Your code: 123-456", 6)).toBe("123456");
    expect(sanitizeOtp("1234567890", 6)).toBe("123456");
  });

  it("supports letters, with optional uppercasing", () => {
    expect(sanitizeOtp("ab-12 cd", 6, "alphanumeric")).toBe("ab12cd");
    expect(sanitizeOtp("ab-12 cd", 6, "alphanumeric", true)).toBe("AB12CD");
    expect(sanitizeOtp("a1b2c3", 6, "alphabetic")).toBe("abc");
    expect(sanitizeOtp("é1", 6, "alphanumeric")).toBe("1");
  });

  it("describes the field for keyboards and native validation", () => {
    expect(otpInputMode("numeric")).toBe("numeric");
    expect(otpInputMode("alphanumeric")).toBe("text");
    expect(otpPattern("numeric", 6)).toBe("\\d{6}");
    expect(new RegExp(`^${otpPattern("alphanumeric", 4)}$`).test("aZ09")).toBe(true);
    expect(new RegExp(`^${otpPattern("alphabetic", 4)}$`).test("ab1c")).toBe(false);
  });
});

describe("otp layout", () => {
  it("places separators between groups", () => {
    expect([...separatorsAfter([3, 3], 6)]).toEqual([2]);
    expect([...separatorsAfter([2, 2, 2], 6)]).toEqual([1, 3]);
    expect([...separatorsAfter(undefined, 6)]).toEqual([]);
    expect([...separatorsAfter([6], 6)]).toEqual([]);
  });

  it("puts the caret where the next character goes, or on the last cell when full", () => {
    expect(activeCell(0, 6, 0)).toBe(0);
    expect(activeCell(3, 6, 3)).toBe(3);
    expect(activeCell(3, 6, 1)).toBe(1);
    expect(activeCell(3, 6, 5)).toBe(3);
    expect(activeCell(6, 6, 6)).toBe(5);
    expect(activeCell(6, 6, 2)).toBe(2);
  });

  it("finds the cell under the pointer", () => {
    const cells = [
      { left: 0, right: 40 },
      { left: 48, right: 88 },
      { left: 96, right: 136 },
    ];
    expect(cellAt(cells, 10)).toBe(0);
    expect(cellAt(cells, 44)).toBe(1);
    expect(cellAt(cells, 120)).toBe(2);
    expect(cellAt(cells, 500)).toBe(2);
    expect(cellAt([], 10)).toBe(0);
  });
});
