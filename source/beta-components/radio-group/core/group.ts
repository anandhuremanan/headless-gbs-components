import type { RadioOption } from "./types";

/**
 * Accepts `["daily", "weekly"]` as well as the full option objects, because a
 * list of plain values is the common case and writing `{ value: x, label: x }`
 * for each one adds nothing.
 */
export function normalizeOptions(
  options: readonly (string | RadioOption)[],
): RadioOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
}

/**
 * The value the group should actually show as selected.
 *
 * A value that matches no option selects nothing, which is what native radios
 * do and the right answer for a stale value from a server: showing an arbitrary
 * option instead would claim a choice the record never made. A *disabled*
 * option still counts — a locked-in choice has to be visible, or the group
 * would look empty while refusing to let anything be chosen.
 */
export function resolveValue(
  options: readonly RadioOption[],
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return options.some((option) => option.value === value) ? value : null;
}

/** Whether anything in the group can still be chosen, for a `clear` button. */
export function hasEnabledOption(options: readonly RadioOption[], disabled: boolean): boolean {
  return !disabled && options.some((option) => !option.disabled);
}
