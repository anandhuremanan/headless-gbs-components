import { describe, expect, it } from "vitest";
import {
  edgeIndex,
  isTypeaheadKey,
  nextIndex,
  typeaheadBuffer,
  typeaheadIndex,
} from "../core/navigation";

const items = (...text: string[]) => text.map((label) => ({ text: label }));

const withDisabled = [
  { text: "Cut" },
  { text: "Copy", disabled: true },
  { text: "Paste" },
  { text: "Paste special", disabled: true },
];

describe("nextIndex", () => {
  it("steps forwards and backwards", () => {
    const list = items("a", "b", "c");
    expect(nextIndex(list, 0, 1)).toBe(1);
    expect(nextIndex(list, 2, -1)).toBe(1);
  });

  it("wraps around, which is what a menu does", () => {
    const list = items("a", "b", "c");
    expect(nextIndex(list, 2, 1)).toBe(0);
    expect(nextIndex(list, 0, -1)).toBe(2);
  });

  it("skips disabled items in both directions", () => {
    expect(nextIndex(withDisabled, 0, 1)).toBe(2);
    expect(nextIndex(withDisabled, 2, -1)).toBe(0);
  });

  it("starts at the near end when nothing is focused", () => {
    const list = items("a", "b", "c");
    expect(nextIndex(list, -1, 1)).toBe(0);
    expect(nextIndex(list, -1, -1)).toBe(2);
  });

  it("gives up rather than landing on a disabled item", () => {
    expect(nextIndex([{ text: "only", disabled: true }], 0, 1)).toBe(-1);
    expect(nextIndex([], 0, 1)).toBe(-1);
  });
});

describe("edgeIndex", () => {
  it("finds the first and last item that can be focused", () => {
    expect(edgeIndex(withDisabled, "first")).toBe(0);
    expect(edgeIndex(withDisabled, "last")).toBe(2);
  });

  it("is -1 when nothing can be focused", () => {
    expect(edgeIndex([{ text: "x", disabled: true }], "first")).toBe(-1);
  });
});

describe("typeaheadIndex", () => {
  const list = items("Save", "Save as", "Send", "Print");

  it("jumps to the first item starting with the letter", () => {
    expect(typeaheadIndex(list, "p", 0)).toBe(3);
  });

  it("ignores case and leading space", () => {
    expect(typeaheadIndex(list, "  SE", 0)).toBe(2);
  });

  it("cycles through items sharing a letter when it is repeated", () => {
    expect(typeaheadIndex(list, "s", -1)).toBe(0);
    expect(typeaheadIndex(list, "ss", 0)).toBe(1);
    expect(typeaheadIndex(list, "sss", 1)).toBe(2);
    // …and back round to the first.
    expect(typeaheadIndex(list, "ssss", 2)).toBe(0);
  });

  it("treats a longer string as a prefix, refining from where it is", () => {
    expect(typeaheadIndex(list, "save a", 0)).toBe(1);
  });

  it("stays put when nothing matches", () => {
    expect(typeaheadIndex(list, "z", 0)).toBe(-1);
    expect(typeaheadIndex(list, "", 0)).toBe(-1);
  });

  it("never lands on a disabled item", () => {
    // Only the disabled "Copy" starts with "co", so focus stays where it is.
    expect(typeaheadIndex(withDisabled, "co", 0)).toBe(-1);
    // "c" also matches the enabled "Cut", which it wraps round to find.
    expect(typeaheadIndex(withDisabled, "c", 0)).toBe(0);
  });
});

describe("typeaheadBuffer", () => {
  it("builds a word from keys typed in quick succession", () => {
    expect(typeaheadBuffer("s", "a", 120)).toBe("sa");
  });

  it("starts again after a pause", () => {
    expect(typeaheadBuffer("sa", "p", 900)).toBe("p");
  });
});

describe("isTypeaheadKey", () => {
  it("takes printable characters", () => {
    expect(isTypeaheadKey("a", false)).toBe(true);
    expect(isTypeaheadKey("7", false)).toBe(true);
  });

  it("leaves Space alone, since it chooses an item", () => {
    expect(isTypeaheadKey(" ", false)).toBe(false);
  });

  it("ignores named keys and anything with a modifier", () => {
    expect(isTypeaheadKey("ArrowDown", false)).toBe(false);
    expect(isTypeaheadKey("a", true)).toBe(false);
  });
});
