import { describe, expect, it } from "vitest";
import { nextTab, tabDomId } from "../core/navigation";

const tabs = [{}, { disabled: true }, {}, {}];

describe("keyboard movement", () => {
  it("moves with the arrows, skipping disabled tabs", () => {
    expect(nextTab(tabs, 0, "ArrowRight")).toBe(2);
    expect(nextTab(tabs, 2, "ArrowLeft")).toBe(0);
  });

  it("wraps around by default, or stops at the ends", () => {
    expect(nextTab(tabs, 3, "ArrowRight")).toBe(0);
    expect(nextTab(tabs, 0, "ArrowLeft")).toBe(3);
    expect(nextTab(tabs, 3, "ArrowRight", { loop: false })).toBeNull();
    expect(nextTab(tabs, 0, "ArrowLeft", { loop: false })).toBeNull();
  });

  it("jumps with Home and End", () => {
    expect(nextTab(tabs, 2, "Home")).toBe(0);
    expect(nextTab(tabs, 0, "End")).toBe(3);
    expect(nextTab([{ disabled: true }, {}, { disabled: true }], 1, "End")).toBe(1);
  });

  it("uses up and down when vertical, and ignores the other axis", () => {
    expect(nextTab(tabs, 0, "ArrowDown", { orientation: "vertical" })).toBe(2);
    expect(nextTab(tabs, 2, "ArrowUp", { orientation: "vertical" })).toBe(0);
    expect(nextTab(tabs, 0, "ArrowRight", { orientation: "vertical" })).toBeNull();
    expect(nextTab(tabs, 0, "ArrowDown")).toBeNull();
  });

  it("swaps left and right in right-to-left layouts", () => {
    expect(nextTab(tabs, 0, "ArrowLeft", { rtl: true })).toBe(2);
    expect(nextTab(tabs, 2, "ArrowRight", { rtl: true })).toBe(0);
  });

  it("returns null when nothing can take focus", () => {
    expect(nextTab([], 0, "ArrowRight")).toBeNull();
    expect(nextTab([{ disabled: true }], 0, "ArrowRight")).toBeNull();
    expect(nextTab(tabs, 0, "Enter")).toBeNull();
  });
});

describe("ids", () => {
  it("makes safe, distinct ids from any value", () => {
    expect(tabDomId("t1", "tab", "overview")).toBe("t1-tab-overview");
    expect(tabDomId("t1", "panel", "billing & plans")).toBe("t1-panel-billing_20_26_20plans");
    expect(tabDomId("t1", "tab", "a b")).not.toBe(tabDomId("t1", "tab", "a_b"));
    expect(tabDomId("t1", "tab", "v1.2")).toMatch(/^[\w-]+$/);
  });
});
