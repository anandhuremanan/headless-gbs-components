import { describe, expect, it } from "vitest";
import { groupState, toggleAll, toggleValue } from "../core/group";

const options = [
  { value: "email" },
  { value: "sms" },
  { value: "push", disabled: true },
];

describe("toggling one value", () => {
  it("adds and removes without duplicates", () => {
    expect(toggleValue(["email"], "sms", true)).toEqual(["email", "sms"]);
    expect(toggleValue(["email"], "email", true)).toEqual(["email"]);
    expect(toggleValue(["email", "sms"], "email", false)).toEqual(["sms"]);
    expect(toggleValue([], "email", false)).toEqual([]);
  });
});

describe("select all", () => {
  it("reports none, some or all", () => {
    expect(groupState([], options)).toBe(false);
    expect(groupState(["sms"], options)).toBe("indeterminate");
    expect(groupState(["email", "sms", "push"], options)).toBe(true);
    expect(groupState(["email"], [])).toBe(false);
  });

  it("selects every enabled option, leaving disabled ones alone", () => {
    expect(toggleAll(["sms"], options)).toEqual(["sms", "email"]);
    expect(toggleAll([], options)).toEqual(["email", "sms"]);
  });

  it("clears enabled options once they are all selected", () => {
    expect(toggleAll(["email", "sms"], options)).toEqual([]);
    expect(toggleAll(["push", "email", "sms"], options)).toEqual(["push"]);
  });

  it("keeps values that aren't options", () => {
    expect(toggleAll(["legacy"], options)).toEqual(["legacy", "email", "sms"]);
  });
});
