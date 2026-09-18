"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { AnchoredPopover } from "../../shared/react/Popover";
import { useControllableState } from "../../shared/react/useControllableState";
import type {
  PopoverAlign,
  PopoverCloseReason,
  PopoverLocaleText,
  PopoverSide,
  PopoverSlot,
} from "../core/types";
import { defaultPopoverText } from "./locale";
import { cx } from "./props";

export interface PopoverHandle {
  open(): void;
  close(): void;
  /** The panel, while it is open. */
  getElement(): HTMLElement | null;
}

/** Given to `children` when it is a function. */
export interface PopoverRenderProps {
  close(): void;
}

export interface PopoverProps {
  /**
   * The element that opens it. It is cloned with a ref and the ARIA attributes
   * that tie it to the panel, so pass a single element that forwards both — any
   * button in this library does.
   */
  trigger: ReactElement<{ ref?: Ref<HTMLElement>; [attribute: string]: unknown }>;
  children?: ReactNode | ((props: PopoverRenderProps) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean, reason?: PopoverCloseReason): void;
  /** Heading inside the panel, which also names it. */
  title?: ReactNode;
  description?: ReactNode;
  /** Names the panel when there is no `title`. */
  "aria-label"?: string;
  /** Side of the trigger to open on, before flipping for space. Default `bottom`. */
  side?: PopoverSide;
  /** Default `start`. */
  align?: PopoverAlign;
  /** Distance from the trigger, in pixels. Default 6. */
  gap?: number;
  /** Cap the panel to the space available and let it scroll. Default false. */
  scrollable?: boolean;
  /** Move focus into the panel when it opens. Default true. */
  autoFocus?: boolean;
  id?: string;
  className?: string;
  classNames?: Partial<Record<PopoverSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<PopoverLocaleText>;
  ref?: Ref<PopoverHandle>;
}

/**
 * A panel anchored to the element that opens it, in the top layer, so it is
 * never clipped by a scrolling parent. The browser provides light dismiss and
 * Escape; focus moves into the panel and returns to the trigger on close.
 *
 * For a list of commands use the Menu, and for a short label on hover use the
 * Tooltip. This is for everything else: a filter form, a colour picker, a bit
 * of help text too long for a tooltip.
 */
export function Popover(props: PopoverProps) {
  const {
    ref,
    trigger,
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    title,
    description,
    "aria-label": ariaLabel,
    side = "bottom",
    align = "start",
    gap = 6,
    scrollable = false,
    autoFocus = true,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultPopoverText, ...localeText }), [localeText]);

  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpenState] = useControllableState(openProp, defaultOpen);

  const setOpen = useCallback(
    (next: boolean, reason?: PopoverCloseReason) => {
      setOpenState(next);
      onOpenChange?.(next, reason);
    },
    [setOpenState, onOpenChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false, "api"),
      getElement: () => panelRef.current,
    }),
    [setOpen],
  );

  // The anchor is state, not a ref: the panel only renders once we have an
  // element to position it against.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const renderProps: PopoverRenderProps = { close: () => setOpen(false, "api") };
  const content = typeof children === "function" ? children(renderProps) : children;

  if (!isValidElement(trigger)) {
    throw new Error("Popover: `trigger` must be a single React element.");
  }

  const triggerProps = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
    "aria-controls": open ? `${id}-panel` : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      (trigger.props as { onClick?: (event: MouseEvent<HTMLElement>) => void }).onClick?.(event);
      if (event.defaultPrevented) return;
      if (open) {
        setOpen(false, "trigger");
      } else {
        setAnchor(event.currentTarget);
        setOpen(true);
      }
    },
  };

  return (
    <>
      {cloneElement(trigger, triggerProps)}
      {open && anchor && (
        <AnchoredPopover
          anchor={anchor}
          onClose={() => setOpen(false, "outside")}
          id={`${id}-panel`}
          label={title ? undefined : (ariaLabel ?? text.label)}
          labelledBy={title ? `${id}-title` : undefined}
          describedBy={description ? `${id}-description` : undefined}
          side={side}
          align={align}
          gap={gap}
          fitHeight={scrollable}
          autoFocus={autoFocus}
          observeResize="self"
          returnFocus
          className={cx("pv-root", classNames?.root, className)}
        >
          {/* The popover element itself is the dialog; this only draws it. */}
          <div ref={panelRef} className={cx("pv-panel", classNames?.panel)} style={style}>
            {(title || description) && (
              <div className={cx("pv-header", classNames?.header)}>
                {title && (
                  <p id={`${id}-title`} className={cx("pv-title", classNames?.title)}>
                    {title}
                  </p>
                )}
                {description && (
                  <p id={`${id}-description`} className={cx("pv-description", classNames?.description)}>
                    {description}
                  </p>
                )}
              </div>
            )}
            <div className={cx("pv-body", classNames?.body)}>{content}</div>
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
