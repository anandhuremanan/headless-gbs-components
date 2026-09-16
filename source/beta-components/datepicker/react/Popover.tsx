"use client";

import { useLayoutEffect, useRef, type ReactNode, type ToggleEvent } from "react";
import { cx } from "./props";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  label: string;
  id: string;
  /** Move focus into the calendar when it opens. False while someone is typing. */
  autoFocus?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Anchored dialog on the native Popover API: rendered in the top layer, so it is
 * never clipped by a scrolling parent (including a DataGrid cell), with light
 * dismiss and Escape built in. Mount it to open, unmount it to close.
 */
export function DatePickerPopover({
  anchor,
  onClose,
  label,
  id,
  autoFocus = true,
  className,
  children,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const rtl = getComputedStyle(anchor).direction === "rtl";
      const { offsetWidth: width, offsetHeight: height } = el;
      // Align to the reading-start edge, then keep the whole panel on screen.
      const preferred = rtl ? rect.right - width : rect.left;
      const left = Math.min(Math.max(8, preferred), window.innerWidth - width - 8);
      let top = rect.bottom + 4;
      if (top + height > window.innerHeight - 8 && rect.top - height - 4 >= 8) {
        top = rect.top - height - 4;
      }
      el.style.left = `${Math.max(8, left)}px`;
      el.style.top = `${Math.max(8, top)}px`;
    };

    el.showPopover();
    position();
    if (autoFocus) {
      // A popover is display:none until shown, so focus only works after showPopover.
      el.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    }

    // The panel changes height between views (days, months, years).
    const observer = new ResizeObserver(position);
    observer.observe(el);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [anchor, autoFocus]);

  return (
    <div
      ref={ref}
      id={id}
      popover="auto"
      role="dialog"
      aria-label={label}
      className={cx("dp-popover", className)}
      onToggle={(event: ToggleEvent<HTMLDivElement>) => {
        if (event.newState === "closed") onClose();
      }}
    >
      {children}
    </div>
  );
}
