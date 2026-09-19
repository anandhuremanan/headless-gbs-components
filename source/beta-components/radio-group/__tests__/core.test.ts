import { describe, expect, it } from "vitest";
import { hasEnabledOption, normalizeOptions, resolveValue } from "../core/group";

describe("normalizeOptions", () => {
  it("turns plain strings into options labelled with themselves", () => {
    expect(normalizeOptions(["daily", "weekly"])).toEqual([
      { value: "daily", label: "daily" },
      { value: "weekly", label: "weekly" },
    ]);
  });

  it("leaves full options as they are, mixed in with strings", () => {
    const options = normalizeOptions([
      "daily",
      { value: "weekly", label: "Every week", description: "On Mondays", disabled: true },
    ]);
    expect(options[1]).toEqual({
      value: "weekly",
      label: "Every week",
      description: "On Mondays",
      disabled: true,
    });
  });
});

describe("resolveValue", () => {
  const options = normalizeOptions([
    "email",
    { value: "sms", label: "SMS", disabled: true },
  ]);

  it("selects the matching option", () => {
    expect(resolveValue(options, "email")).toBe("email");
  });

  it("selects a disabled option, because a locked-in choice still has to show", () => {
    expect(resolveValue(options, "sms")).toBe("sms");
  });

  it("selects nothing for a value the group does not offer", () => {
    // A stale value from a record: picking some other option instead would
    // claim a choice that was never made.
    expect(resolveValue(options, "pigeon")).toBeNull();
  });

  it("selects nothing for no value at all", () => {
    expect(resolveValue(options, null)).toBeNull();
    expect(resolveValue(options, undefined)).toBeNull();
  });
});

describe("hasEnabledOption", () => {
  const options = normalizeOptions(["email", { value: "sms", label: "SMS", disabled: true }]);

  it("is true while something can still be chosen", () => {
    expect(hasEnabledOption(options, false)).toBe(true);
  });

  it("is false when the group is disabled or has nothing to offer", () => {
    expect(hasEnabledOption(options, true)).toBe(false);
    expect(hasEnabledOption(normalizeOptions([{ value: "sms", label: "SMS", disabled: true }]), false)).toBe(false);
    expect(hasEnabledOption([], false)).toBe(false);
  });
});
