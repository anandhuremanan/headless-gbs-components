"use client";

import { useLayoutEffect, useRef, type ReactNode, type ToggleEvent } from "react";
import { cx } from "../core/cx";

/** Space kept between the popover and the edge of the viewport. */
const EDGE = 8;

export interface AnchoredPopoverProps {
  /** The element the popover is positioned against. */
  anchor: HTMLElement;
  /** Called when the browser light-dismisses it, or Escape closes it. */
  onClose(): void;
  children: ReactNode;
  id?: string;
  className?: string;
  /**
   * Gives the popover `role="dialog"` and this accessible name. Leave it out
   * for content that already carries its own role, such as a listbox.
   */
  label?: string;
  /** Which edge of the anchor to align to, in reading order. Default `start`. */
  align?: "start" | "end";
  /** Distance between the anchor and the popover. Default 4. */
  gap?: number;
  /** Make the popover at least as wide as its anchor. */
  matchAnchorWidth?: boolean;
  /**
   * Cap the height to the free space on the chosen side, and prefer the side
   * with more room. For scrolling content such as a long list; panels that
   * cannot scroll should leave it off so they only flip when they fully fit.
   */
  fitHeight?: boolean;
  /** Floor for `fitHeight`, so a cramped viewport still shows something. Default 140. */
  minHeight?: number;
  /** Selector for the element focused on open, or `false` to leave focus alone. */
  autoFocus?: string | false;
  /** Reposition when the popover resizes (`self`) or the anchor does too (`both`). */
  observeResize?: "self" | "both" | false;
  /** Put focus back on the anchor when the popover closes. */
  returnFocus?: boolean;
}

/**
 * Anchored popover on the native Popover API: rendered in the top layer, so it
 * is never clipped by a scrolling parent or an `overflow: hidden` ancestor, and
 * the browser provides light dismiss and Escape. Mount it to open, unmount it
 * to close.
 *
 * Positioning is deliberately plain — align, clamp to the viewport, flip when
 * there is no room below — because that is all any of the components need, and
 * it keeps the library free of a positioning dependency.
 */
export function AnchoredPopover({
  anchor,
  onClose,
  children,
  id,
  className,
  label,
  align = "start",
  gap = 4,
  matchAnchorWidth = false,
  fitHeight = false,
  minHeight = 140,
  autoFocus = "[data-autofocus]",
  observeResize = false,
  returnFocus = false,
}: AnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      if (matchAnchorWidth) el.style.minWidth = `${rect.width}px`;

      const { offsetWidth: width, offsetHeight: height } = el;
      const rtl = getComputedStyle(anchor).direction === "rtl";
      const alignEnd = (align === "end") !== rtl;
      const preferred = alignEnd ? rect.right - width : rect.left;
      const left = Math.min(Math.max(EDGE, preferred), window.innerWidth - width - EDGE);

      const below = window.innerHeight - rect.bottom - gap - EDGE;
      const above = rect.top - gap - EDGE;
      // Scrolling content takes the roomier side; a fixed-size panel only moves
      // above when the whole of it fits there, rather than running off the top.
      const flip = height > below && (fitHeight ? above > below : height <= above);

      el.style.left = `${Math.max(EDGE, left)}px`;
      el.style.top = `${Math.max(EDGE, flip ? rect.top - gap - height : rect.bottom + gap)}px`;
      if (fitHeight) el.style.maxHeight = `${Math.max(minHeight, flip ? above : below)}px`;
    };

    el.showPopover();
    position();
    // A popover is display:none until it is shown, so focus only lands after
    // showPopover().
    if (autoFocus) el.querySelector<HTMLElement>(autoFocus)?.focus({ preventScroll: true });

    const observer = observeResize ? new ResizeObserver(position) : null;
    observer?.observe(el);
    if (observeResize === "both") observer?.observe(anchor);
    window.addEventListener("resize", position);
    // Capture: a scroll in any ancestor moves the anchor, not just the page.
    window.addEventListener("scroll", position, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      const hadFocus = el.contains(document.activeElement);
      if (el.matches(":popover-open")) el.hidePopover();
      if (returnFocus && (hadFocus || document.activeElement === document.body) && anchor.isConnected) {
        anchor.focus({ preventScroll: true });
      }
    };
  }, [
    anchor,
    align,
    gap,
    matchAnchorWidth,
    fitHeight,
    minHeight,
    autoFocus,
    observeResize,
    returnFocus,
  ]);

  return (
    <div
      ref={ref}
      id={id}
      popover="auto"
      role={label ? "dialog" : undefined}
      aria-label={label}
      className={cx(className)}
      onToggle={(event: ToggleEvent<HTMLDivElement>) => {
        if (event.newState === "closed") onClose();
      }}
    >
      {children}
    </div>
  );
}
