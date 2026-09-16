"use client";

import { useLayoutEffect, useRef, type ReactNode, type ToggleEvent } from "react";
import { cx } from "./props";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  children: ReactNode;
  className?: string;
  /** Distance between the anchor and the popover. */
  gap?: number;
}

/**
 * Anchored popover on the native Popover API: top layer (never clipped by a
 * scrolling parent or overflow), with light dismiss and Escape built in.
 * It matches the anchor's width and flips above when space is tight.
 */
export function ComboboxPopover({ anchor, onClose, children, className, gap = 4 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      el.style.minWidth = `${rect.width}px`;
      const height = el.offsetHeight;
      const below = window.innerHeight - rect.bottom - gap - 8;
      const flip = height > below && rect.top - gap - 8 > below;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - el.offsetWidth - 8);
      el.style.left = `${left}px`;
      el.style.top = flip ? `${Math.max(8, rect.top - gap - height)}px` : `${rect.bottom + gap}px`;
      el.style.maxHeight = `${Math.max(140, flip ? rect.top - gap - 8 : below)}px`;
    };

    el.showPopover();
    position();
    // Focus once the popover is actually shown; a popover is display:none until then.
    el.querySelector<HTMLElement>("[data-autofocus], input, [tabindex]")?.focus({ preventScroll: true });

    // Follow both sizes: the list as options filter, and the control as tags wrap.
    const observer = new ResizeObserver(position);
    observer.observe(el);
    observer.observe(anchor);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [anchor, gap]);

  return (
    <div
      ref={ref}
      popover="auto"
      className={cx("cb-popover", className)}
      onToggle={(event: ToggleEvent<HTMLDivElement>) => {
        if (event.newState === "closed") onClose();
      }}
    >
      {children}
    </div>
  );
}
