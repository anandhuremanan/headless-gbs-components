import { describe, expect, it } from "vitest";
import { colorIndex, initials, splitGroup } from "../core/identity";

describe("initials", () => {
  it("takes the first and last part of a name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Ada Byron King Lovelace")).toBe("AL");
  });

  it("takes one letter from a single name, not two", () => {
    // "MA" out of "Madonna" reads as a mistake.
    expect(initials("Madonna")).toBe("M");
  });

  it("splits on the punctuation that joins parts of a name", () => {
    expect(initials("jean-luc picard")).toBe("JP");
    expect(initials("ada.lovelace")).toBe("AL");
    expect(initials("ada_lovelace")).toBe("AL");
    expect(initials("Ada Lovelace")).toBe("AL");
  });

  it("reads an email as the part before the at sign", () => {
    // Nothing in "example.com" is this person's name.
    expect(initials("ada@example.com")).toBe("A");
    expect(initials("ada.lovelace@example.com")).toBe("AL");
  });

  it("keeps a whole character, not half a surrogate pair", () => {
    expect(initials("\u{1F680} Launch")).toBe("\u{1F680}L");
    expect(Array.from(initials("\u{1F680}")).length).toBe(1);
  });

  it("leaves scripts without letter case alone", () => {
    // Uppercasing means nothing here, and can change the character.
    expect(initials("山田 太郎")).toBe("山太");
  });

  it("does not turn one letter into two", () => {
    // Uppercase ß is SS, which would be two letters in a one-letter slot.
    expect(initials("ßrian")).toBe("ß");
  });

  it("has nothing for nothing", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
    expect(initials("@example.com")).toBe("");
  });
});

describe("colorIndex", () => {
  it("gives the same person the same colour every time", () => {
    expect(colorIndex("Ada Lovelace", 8)).toBe(colorIndex("Ada Lovelace", 8));
  });

  it("stays inside the palette", () => {
    for (const name of ["", "a", "Ada Lovelace", "\u{1F680}", "x".repeat(500)]) {
      const index = colorIndex(name, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
    expect(colorIndex("Ada", 0)).toBe(0);
  });

  it("spreads names across the palette rather than piling them up", () => {
    const names = ["Ada", "Grace", "Alan", "Katherine", "Edsger", "Barbara", "Tim", "Linus"];
    const used = new Set(names.map((name) => colorIndex(name, 8)));
    expect(used.size).toBeGreaterThanOrEqual(5);
  });
});

describe("splitGroup", () => {
  const people = ["a", "b", "c", "d", "e"];

  it("shows everyone when they fit", () => {
    expect(splitGroup(people, 5)).toEqual({ shown: people, overflow: 0 });
    expect(splitGroup(people, 9).overflow).toBe(0);
  });

  it("counts the overflow bubble as one of the slots", () => {
    // Four slots: three faces and a "+2", so the group stays four wide.
    expect(splitGroup(people, 4)).toEqual({ shown: ["a", "b", "c"], overflow: 2 });
  });

  it("handles a group with no room for faces", () => {
    expect(splitGroup(people, 1)).toEqual({ shown: [], overflow: 5 });
    expect(splitGroup(people, 0)).toEqual({ shown: [], overflow: 5 });
  });
});
