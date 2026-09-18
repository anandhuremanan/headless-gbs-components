/** What is currently asking for the tooltip to be shown. */
export interface TooltipTriggers {
  hovered: boolean;
  focused: boolean;
}

export type TooltipTrigger = keyof TooltipTriggers;

/**
 * Whether the tooltip should be open, and after how long.
 *
 * Hover waits, so running the pointer across a toolbar does not flash a tooltip
 * over every button. Keyboard focus does not: someone who tabbed to a control
 * has already committed to it, and a delay just looks broken.
 */
export function nextVisibility(
  triggers: TooltipTriggers,
  delays: { open: number; close: number },
): { open: boolean; delay: number } {
  if (triggers.focused) return { open: true, delay: 0 };
  if (triggers.hovered) return { open: true, delay: delays.open };
  return { open: false, delay: delays.close };
}

/**
 * Whether a pointer event should count as a hover at all.
 *
 * A touch "hover" is really a tap, and showing a tooltip on tap covers the
 * thing that was tapped. Touch devices get nothing, which is why a tooltip must
 * never carry information that is not also available another way.
 */
export function isHoverPointer(pointerType: string): boolean {
  return pointerType !== "touch" && pointerType !== "pen";
}
