import { describe, expect, it } from "vitest";
import { adopt, idleToggle, request, settle } from "../core/toggle";

describe("switch toggling", () => {
  it("shows the new setting before it has been saved", () => {
    const state = request(idleToggle(false), true);
    expect(state).toEqual({ checked: true, pending: true, fallback: false });
  });

  it("keeps the new setting once the save succeeds", () => {
    const state = settle(request(idleToggle(false), true), true, true);
    expect(state).toEqual({ checked: true, pending: null, fallback: true });
  });

  it("goes back where it was when the save fails", () => {
    const state = settle(request(idleToggle(false), true), true, false);
    expect(state).toEqual({ checked: false, pending: null, fallback: false });
  });

  it("returns to where the run of changes started, not to the opposite", () => {
    // On, then off again while the first save is still running: failing the
    // second must land on the original off, which is also where it looks like
    // it is — flipping the visible value would turn it back on.
    const first = request(idleToggle(false), true);
    const second = request(first, false);
    expect(second.fallback).toBe(false);
    expect(settle(second, false, false).checked).toBe(false);
  });

  it("ignores the outcome of a change that was overtaken", () => {
    const first = request(idleToggle(false), true);
    const second = request(first, false);
    // The first request finally answers, long after the second replaced it.
    expect(settle(second, true, true)).toBe(second);
    expect(settle(second, true, false)).toBe(second);
  });

  it("ignores an outcome when nothing is in flight", () => {
    const idle = idleToggle(true);
    expect(settle(idle, true, false)).toBe(idle);
  });

  it("does nothing when asked for the value it already shows", () => {
    const idle = idleToggle(true);
    expect(request(idle, true)).toBe(idle);
  });

  it("re-requests a value that is showing but not yet saved", () => {
    // Pressed on, pressed off, pressed on again: the last press still needs an
    // outcome of its own, so it cannot be dropped as a no-op.
    const pending = request(request(idleToggle(false), true), false);
    const again = request(pending, true);
    expect(again.pending).toBe(true);
    expect(again.fallback).toBe(false);
  });

  it("lets a controlled value win over anything in flight", () => {
    const pending = request(idleToggle(false), true);
    expect(adopt(pending, false)).toEqual({ checked: false, pending: null, fallback: false });
    // An unchanged, settled value is left as it is, so React skips the render.
    const idle = idleToggle(true);
    expect(adopt(idle, true)).toBe(idle);
  });
});
