import { describe, expect, it } from "vitest";
import { normalizeOpen, toggleOpen } from "../core/open";

describe("toggleOpen", () => {
  describe("one at a time", () => {
    it("opens a panel and closes whatever was open", () => {
      expect(toggleOpen(["a"], "b")).toEqual(["b"]);
    });

    it("closes the open panel when pressed again", () => {
      expect(toggleOpen(["a"], "a")).toEqual([]);
    });

    it("keeps it open when the accordion cannot be empty", () => {
      // Panels that are the whole page: closing the last leaves a dead end.
      expect(toggleOpen(["a"], "a", { collapsible: false })).toEqual(["a"]);
    });
  });

  describe("several at a time", () => {
    it("adds and removes without touching the others", () => {
      expect(toggleOpen(["a"], "b", { multiple: true })).toEqual(["a", "b"]);
      expect(toggleOpen(["a", "b"], "a", { multiple: true })).toEqual(["b"]);
    });

    it("keeps the order panels were opened in", () => {
      expect(toggleOpen(["b"], "a", { multiple: true })).toEqual(["b", "a"]);
    });

    it("refuses to close the last one when the accordion cannot be empty", () => {
      expect(toggleOpen(["a"], "a", { multiple: true, collapsible: false })).toEqual(["a"]);
      // Any other panel is still free to close, because one stays open.
      expect(toggleOpen(["a", "b"], "a", { multiple: true, collapsible: false })).toEqual(["b"]);
    });
  });
});

describe("normalizeOpen", () => {
  const values = ["a", "b", "c"];

  it("drops values the accordion does not have", () => {
    expect(normalizeOpen(["a", "z"], values, { multiple: true })).toEqual(["a"]);
  });

  it("keeps only the first for a single accordion", () => {
    // Otherwise it starts showing two panels and can never show two again.
    expect(normalizeOpen(["a", "b"], values)).toEqual(["a"]);
  });

  it("opens the first panel when the accordion cannot be empty", () => {
    expect(normalizeOpen([], values, { collapsible: false })).toEqual(["a"]);
    expect(normalizeOpen([], values)).toEqual([]);
  });

  it("has nothing to open when there are no panels", () => {
    expect(normalizeOpen([], [], { collapsible: false })).toEqual([]);
  });
});
