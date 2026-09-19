/**
 * Which panels are open after a header is pressed.
 *
 * Three rules, and every accordion gets at least one of them wrong at some
 * point, which is why they are here rather than spread through the component:
 *
 * `multiple` decides whether opening one closes the others. `collapsible`
 * decides whether the open one can be closed by pressing it again — a
 * non-collapsible accordion always has exactly one panel open, which is what
 * you want when the panels are the whole content of the page and an empty page
 * would be a dead end.
 *
 * Order is kept as panels were opened, so a caller storing the value can tell
 * which one was opened last.
 */
export interface ToggleOptions {
  multiple?: boolean;
  collapsible?: boolean;
}

export function toggleOpen(
  open: readonly string[],
  value: string,
  { multiple = false, collapsible = true }: ToggleOptions = {},
): string[] {
  const isOpen = open.includes(value);

  if (!multiple) {
    if (!isOpen) return [value];
    return collapsible ? [] : [value];
  }

  if (!isOpen) return [...open, value];
  // The last panel of a non-collapsible accordion stays put; closing any other
  // one is fine, because something is still open afterwards.
  if (!collapsible && open.length === 1) return [...open];
  return open.filter((item) => item !== value);
}

/**
 * The starting value, trimmed to what the settings allow.
 *
 * A single accordion given three open panels, or a non-collapsible one given
 * none, would otherwise start in a state it can never return to once the user
 * touches it.
 */
export function normalizeOpen(
  open: readonly string[],
  values: readonly string[],
  { multiple = false, collapsible = true }: ToggleOptions = {},
): string[] {
  const known = open.filter((value) => values.includes(value));
  const trimmed = multiple ? known : known.slice(0, 1);
  if (trimmed.length === 0 && !collapsible && values.length > 0) return [values[0]];
  return trimmed;
}
