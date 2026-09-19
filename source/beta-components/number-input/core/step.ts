import type { StepOptions } from "./types";

/** How many fraction digits a number is written with. */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(value);
  const exponent = text.indexOf("e-");
  if (exponent !== -1) {
    const digits = text.slice(0, exponent).split(".")[1]?.length ?? 0;
    return digits + Number(text.slice(exponent + 2));
  }
  return text.split(".")[1]?.length ?? 0;
}

/**
 * Rounds to `decimals` places without the drift of `toFixed` on binary
 * fractions: 1.005 rounds up, as anyone reading the number expects.
 */
export function round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  // The epsilon nudge is what keeps 1.005 * 100 = 100.49999999999999 from
  // rounding down to 1.00.
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

export function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

/**
 * The value one press of an arrow or a stepper button produces.
 *
 * Arithmetic runs on integers scaled by the number of decimals involved, so
 * `0.1 + 0.2` gives `0.3` rather than `0.30000000000000004` — a field that
 * shows that after two presses looks broken, and rounding afterwards would
 * only hide it one place further down.
 *
 * An empty field follows `<input type="number">`: the first press lands on
 * `min` if there is one, and otherwise one step away from zero.
 */
export function stepBy(
  value: number | null,
  direction: 1 | -1,
  { step, min, max }: StepOptions,
): number {
  const size = Math.abs(step) || 1;
  if (value === null) return clamp(min ?? size * direction, min, max);

  const scale = 10 ** Math.max(decimalsOf(value), decimalsOf(size));
  const next = (Math.round(value * scale) + Math.round(size * scale) * direction) / scale;
  return clamp(round(next, decimalsOf(1 / scale)), min, max);
}

/**
 * Moves a value onto the step grid, counting from `min` where there is one.
 *
 * Only used when a field is asked to enforce its step (`snapToStep`). Typing is
 * left alone until then: correcting 7 to 5 while someone is still typing 75
 * would be unusable.
 */
export function snapToStep(value: number, { step, min, max }: StepOptions): number {
  const size = Math.abs(step);
  if (!Number.isFinite(size) || size === 0) return clamp(value, min, max);
  const base = min ?? 0;
  const scale = 10 ** Math.max(decimalsOf(size), decimalsOf(base), decimalsOf(value));
  const steps = Math.round((Math.round(value * scale) - Math.round(base * scale)) / Math.round(size * scale));
  const snapped = (Math.round(base * scale) + steps * Math.round(size * scale)) / scale;
  return clamp(round(snapped, decimalsOf(size)), min, max);
}
