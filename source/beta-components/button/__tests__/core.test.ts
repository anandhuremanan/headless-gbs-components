import { describe, expect, it } from "vitest";
import { buttonState, isPromiseLike } from "../core/state";

describe("button state", () => {
  it("is active by default", () => {
    expect(buttonState({})).toEqual({ busy: false, inactive: false, nativeDisabled: false });
  });

  it("stays focusable while busy", () => {
    expect(buttonState({ loading: true })).toEqual({ busy: true, inactive: true, nativeDisabled: false });
    expect(buttonState({ pending: true })).toEqual({ busy: true, inactive: true, nativeDisabled: false });
  });

  it("uses native disabled, and shows no spinner, when disabled", () => {
    expect(buttonState({ disabled: true, loading: true })).toEqual({
      busy: false,
      inactive: true,
      nativeDisabled: true,
    });
  });
});

describe("promise detection", () => {
  it("recognizes promises and thenables only", () => {
    expect(isPromiseLike(Promise.resolve())).toBe(true);
    expect(isPromiseLike({ then: () => {} })).toBe(true);
    expect(isPromiseLike(undefined)).toBe(false);
    expect(isPromiseLike({ then: 1 })).toBe(false);
    expect(isPromiseLike(() => {})).toBe(false);
  });
});
