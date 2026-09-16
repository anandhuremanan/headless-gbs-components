"use client";

import { useLayoutEffect, useRef, type ReactNode, type ToggleEvent } from "react";
import { cx } from "./context";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  label: string;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}

/**
 * Anchored popover on the native Popover API: rendered in the top layer (never
 * clipped by the grid's scroll containers), with light dismiss and Escape.
 * Mount it to open, unmount it to close.
 */
export function Popover({ anchor, onClose, label, align = "start", className, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const rtl = getComputedStyle(anchor).direction === "rtl";
      const alignEnd = (align === "end") !== rtl;
      const { offsetWidth: width, offsetHeight: height } = el;
      const left = Math.min(
        Math.max(8, alignEnd ? rect.right - width : rect.left),
        window.innerWidth - width - 8,
      );
      let top = rect.bottom + 4;
      if (top + height > window.innerHeight - 8 && rect.top - height - 4 >= 8) {
        top = rect.top - height - 4;
      }
      el.style.left = `${Math.max(8, left)}px`;
      el.style.top = `${Math.max(8, top)}px`;
    };

    el.showPopover();
    position();
    el.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus({
      preventScroll: true,
    });

    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      const hadFocus = el.contains(document.activeElement);
      if (el.matches(":popover-open")) el.hidePopover();
      if ((hadFocus || document.activeElement === document.body) && anchor.isConnected) {
        anchor.focus({ preventScroll: true });
      }
    };
  }, [anchor, align]);

  const onToggle = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState === "closed") onClose();
  };

  return (
    <div
      ref={ref}
      popover="auto"
      role="dialog"
      aria-label={label}
      className={cx("dg-popover", className)}
      onToggle={onToggle}
    >
      {children}
    </div>
  );
}
