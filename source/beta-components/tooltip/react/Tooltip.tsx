"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnchoredPopover } from "../../shared/react/Popover";
import {
  isHoverPointer,
  nextVisibility,
  type TooltipTrigger,
  type TooltipTriggers,
} from "../core/visibility";
import type { TooltipAlign, TooltipSide, TooltipSlot } from "../core/types";
import { cx } from "./props";

export interface TooltipProps {
  /** The short label. Keep it to a few words. */
  content: ReactNode;
  /**
   * The control it describes: a single element, cloned with a ref, the pointer
   * and focus handlers, and `aria-describedby`.
   */
  children: ReactElement<{ [attribute: string]: unknown }>;
  /** Default `top`. */
  side?: TooltipSide;
  /** Default `center`, which is only meaningful with `side` top or bottom. */
  align?: TooltipAlign;
  /** Distance from the control. Default 6. */
  gap?: number;
  /** Wait before showing on hover, in ms. Default 400. Focus never waits. */
  delay?: number;
  /** Wait before hiding, in ms. Default 120, so crossing a gap does not flicker. */
  closeDelay?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  classNames?: Partial<Record<TooltipSlot, string>>;
  style?: CSSProperties;
}

/**
 * A short label shown on hover or keyboard focus, following the WAI-ARIA
 * tooltip pattern: it describes the control rather than naming it, Escape
 * dismisses it, and it never takes focus.
 *
 * Touch devices never see it — a tooltip on tap covers the thing that was
 * tapped — so never put anything here that is not available some other way.
 */
export function Tooltip(props: TooltipProps) {
  const {
    content,
    children,
    side = "top",
    align = "center",
    gap = 6,
    delay = 400,
    closeDelay = 120,
    disabled = false,
    id: idProp,
    className,
    classNames,
    style,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [triggers, setTriggers] = useState<TooltipTriggers>({ hovered: false, focused: false });

  // What is asking for the tooltip is state, and a delayed change is the effect
  // that follows from it: React clears the pending timer whenever that state
  // changes, so there is no timer to track and nothing to cancel by hand.
  useEffect(() => {
    const next = nextVisibility(triggers, { open: delay, close: closeDelay });
    // Anything immediate has already been applied by the handler below.
    if (next.delay === 0) return;
    const timer = setTimeout(() => setOpen(next.open), next.delay);
    return () => clearTimeout(timer);
  }, [triggers, delay, closeDelay]);

  const set = (trigger: TooltipTrigger, value: boolean) => {
    const next = { ...triggers, [trigger]: value };
    setTriggers(next);
    // Keyboard focus shows it at once. Doing that here rather than in the
    // effect keeps it in the same render as the event that caused it.
    const visibility = nextVisibility(next, { open: delay, close: closeDelay });
    if (visibility.delay === 0) setOpen(visibility.open);
  };

  const hide = useCallback(() => {
    setTriggers({ hovered: false, focused: false });
    setOpen(false);
  }, []);

  // Escape closes it wherever focus happens to be, which the pattern requires
  // and which matters most when the tooltip is covering something.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, hide]);

  if (!isValidElement(children)) {
    throw new Error("Tooltip: `children` must be a single React element.");
  }

  const childProps = children.props as {
    onPointerEnter?(event: PointerEvent<HTMLElement>): void;
    onPointerLeave?(event: PointerEvent<HTMLElement>): void;
    onFocus?(event: FocusEvent<HTMLElement>): void;
    onBlur?(event: FocusEvent<HTMLElement>): void;
    onKeyDown?(event: KeyboardEvent<HTMLElement>): void;
    onClick?(event: unknown): void;
    "aria-describedby"?: string;
  };

  const shown = open && !disabled;

  const triggerProps = {
    // Describes, never names: the control keeps its own accessible name.
    "aria-describedby": cx(childProps["aria-describedby"], shown ? id : "") || undefined,
    onPointerEnter(event: PointerEvent<HTMLElement>) {
      childProps.onPointerEnter?.(event);
      if (disabled || !isHoverPointer(event.pointerType)) return;
      // The anchor comes from the event rather than a ref: it is the same
      // element either way, and it keeps this component out of the business of
      // cloning a ref onto someone else's element.
      setAnchor(event.currentTarget);
      set("hovered", true);
    },
    onPointerLeave(event: PointerEvent<HTMLElement>) {
      childProps.onPointerLeave?.(event);
      set("hovered", false);
    },
    onFocus(event: FocusEvent<HTMLElement>) {
      childProps.onFocus?.(event);
      // Only for keyboard focus: clicking a button should not leave a tooltip
      // hanging over whatever the click just did.
      if (disabled || !event.target.matches(":focus-visible")) return;
      setAnchor(event.currentTarget);
      set("focused", true);
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      childProps.onBlur?.(event);
      set("focused", false);
    },
    onClick(event: unknown) {
      childProps.onClick?.(event);
      hide();
    },
  };

  return (
    <>
      {cloneElement(children, triggerProps)}
      {shown && anchor && (
        <AnchoredPopover
          anchor={anchor}
          onClose={hide}
          id={id}
          role="tooltip"
          side={side}
          align={align}
          gap={gap}
          autoFocus={false}
          observeResize="self"
          // Manual: an `auto` popover closes every other one, so a tooltip on a
          // control inside a menu would take the menu down with it.
          mode="manual"
          className={cx("tt-root", classNames?.root, className)}
        >
          {/* The popover element itself is the tooltip; this only draws it. */}
          <div className={cx("tt-content", classNames?.content)} style={style}>
            {content}
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
