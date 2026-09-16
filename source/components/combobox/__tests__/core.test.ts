import { describe, expect, it } from "vitest";
import {
  buildListItems,
  filterOptions,
  findByPrefix,
  firstEnabledIndex,
  lastEnabledIndex,
  matchRanges,
  nextEnabledIndex,
  toggleValue,
} from "../core/filter";
import type { ComboboxOption } from "../core/types";
import { getVisibleRange, measureItems, scrollToItem } from "../core/virtual";

const options: ComboboxOption[] = [
  { value: "in", label: "India", group: "Asia", keywords: ["bharat"] },
  { value: "jp", label: "Japan", group: "Asia" },
  { value: "kr", label: "South Korea", group: "Asia", disabled: true },
  { value: "de", label: "Germany", group: "Europe", description: "Berlin" },
  { value: "fr", label: "France", group: "Europe" },
];

const labels = (list: { option: ComboboxOption }[]) => list.map((entry) => entry.option.label);

describe("matching", () => {
  it("returns merged, case-insensitive ranges for every term", () => {
    expect(matchRanges("South Korea", ["korea"])).toEqual([[6, 11]]);
    expect(matchRanges("Germany", ["ger", "man"])).toEqual([[0, 6]]);
    expect(matchRanges("Germany", ["ger", "xyz"])).toBeNull();
    expect(matchRanges("Germany", [])).toEqual([]);
  });

  it("filters on label, description and keywords", () => {
    expect(labels(filterOptions(options, ""))).toHaveLength(5);
    expect(labels(filterOptions(options, "an"))).toEqual(["Japan", "Germany", "France"]);
    expect(labels(filterOptions(options, "berlin"))).toEqual(["Germany"]);
    expect(labels(filterOptions(options, "bharat"))).toEqual(["India"]);
    expect(labels(filterOptions(options, "nothing"))).toEqual([]);
  });

  it("highlights the label only", () => {
    const [india] = filterOptions(options, "ind");
    expect(india.matches).toEqual([[0, 3]]);
    const [germany] = filterOptions(options, "berlin");
    expect(germany.matches).toEqual([]);
  });

  it("uses a custom filter when given", () => {
    const entries = filterOptions(options, "x", (option) => option.value === "jp");
    expect(labels(entries)).toEqual(["Japan"]);
  });
});

describe("list building", () => {
  it("adds group headings and numbers options across groups", () => {
    const items = buildListItems(filterOptions(options, ""));
    expect(items.map((item) => (item.kind === "group" ? `# ${item.label}` : item.entry.option.label))).toEqual([
      "# Asia",
      "India",
      "Japan",
      "South Korea",
      "# Europe",
      "Germany",
      "France",
    ]);
    const optionItems = items.filter((item) => item.kind === "option");
    expect(optionItems.map((item) => (item.kind === "option" ? item.index : -1))).toEqual([0, 1, 2, 3, 4]);
  });

  it("skips headings when no option has a group", () => {
    const flat = buildListItems(filterOptions([{ value: "a", label: "A" }], ""));
    expect(flat).toHaveLength(1);
    expect(flat[0].kind).toBe("option");
  });
});

describe("keyboard helpers", () => {
  const entries = filterOptions(options, "");

  it("moves over enabled options and wraps", () => {
    expect(nextEnabledIndex(entries, 0, 1)).toBe(1);
    expect(nextEnabledIndex(entries, 1, 1)).toBe(3); // skips the disabled option
    expect(nextEnabledIndex(entries, 4, 1)).toBe(0);
    expect(nextEnabledIndex(entries, 0, -1)).toBe(4);
    expect(nextEnabledIndex([], 0, 1)).toBe(-1);
  });

  it("finds the first and last enabled option", () => {
    expect(firstEnabledIndex(entries)).toBe(0);
    expect(firstEnabledIndex(entries, 2)).toBe(3);
    expect(lastEnabledIndex(entries)).toBe(4);
    expect(lastEnabledIndex([{ option: options[2], matches: [] }])).toBe(-1);
  });

  it("jumps to a typed prefix", () => {
    expect(findByPrefix(entries, "ja", -1)).toBe(1);
    expect(findByPrefix(entries, "s", -1)).toBe(-1); // South Korea is disabled
    expect(findByPrefix(entries, "zz", -1)).toBe(-1);
  });
});

describe("selection", () => {
  it("adds, removes and respects max", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleValue(["a", "b"], "c", 2)).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "b", 2)).toEqual(["a"]);
  });
});

describe("virtualization", () => {
  const items = buildListItems(filterOptions(options, ""));
  const metrics = measureItems(items, { option: 34, group: 26 });

  it("measures group and option rows", () => {
    expect(metrics.total).toBe(2 * 26 + 5 * 34);
    expect(metrics.offsets[0]).toBe(0);
    expect(metrics.offsets[1]).toBe(26);
  });

  it("returns the visible window with overscan", () => {
    expect(getVisibleRange(metrics, 0, 60, 0)).toEqual({ start: 0, end: 3 });
    expect(getVisibleRange(metrics, 0, 0, 0)).toEqual({ start: 0, end: 7 });
    const range = getVisibleRange(metrics, 100, 60, 1);
    expect(range.start).toBeLessThanOrEqual(3);
    expect(range.end).toBeGreaterThanOrEqual(5);
  });

  it("scrolls an item into view only when needed", () => {
    expect(scrollToItem(metrics, 0, 0, 100)).toBeNull();
    expect(scrollToItem(metrics, 6, 0, 100)).toBe(metrics.offsets[7] - 100);
    expect(scrollToItem(metrics, 1, 40, 100)).toBe(26);
  });
});
