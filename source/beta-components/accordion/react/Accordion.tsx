"use client";

import {
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { normalizeOpen, toggleOpen } from "../core/open";
import type {
  AccordionIconPosition,
  AccordionItemData,
  AccordionSize,
  AccordionVariant,
} from "../core/types";
import { AccordionItem } from "./AccordionItem";
import { AccordionContext, type AccordionContextValue } from "./context";
import { cx, type AccordionSlot } from "./props";

export interface AccordionProps {
  /** Open panels, by value (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?(value: string[]): void;
  /** Render these panels, or pass `<AccordionItem>` children. */
  items?: readonly AccordionItemData[];
  children?: ReactNode;
  /** Allow more than one panel open at a time. Default false. */
  multiple?: boolean;
  /** Allow the open panel to be closed again. Default true. */
  collapsible?: boolean;
  /** Default `separated`. */
  variant?: AccordionVariant;
  /** Default `md`. */
  size?: AccordionSize;
  /** Which side the chevron sits on. Default `end`. */
  iconPosition?: AccordionIconPosition;
  className?: string;
  classNames?: Partial<Record<AccordionSlot, string>>;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Sections that open one at a time, built on `<details>` and `<summary>`.
 *
 * The browser owns the disclosure: the header is focusable, Enter and Space
 * work, the panel is hidden from search and from the accessibility tree while
 * closed, and Ctrl+F still finds text inside a closed panel in browsers that
 * support it. None of that is implemented here.
 *
 * What is implemented is the accordion *around* the disclosures — which one is
 * open, and whether closing the last is allowed — because `<details name>`
 * alone cannot express a non-collapsible group, and gives no value to store.
 */
export function Accordion(props: AccordionProps) {
  const {
    ref,
    value,
    defaultValue,
    onValueChange,
    items,
    children,
    multiple = false,
    collapsible = true,
    variant = "separated",
    size = "md",
    iconPosition = "end",
    className,
    classNames,
    style,
  } = props;

  const [open, setOpen] = useControllableState<string[]>(value, defaultValue ?? []);
  const settings = useMemo(() => ({ multiple, collapsible }), [multiple, collapsible]);

  /*
   * With `items`, the panels are known and the starting value can be trimmed
   * against them. With children they are not — and asking each item to
   * register itself would mean either reading a ref while rendering or a
   * second render pass on mount, for the sake of dropping a value that already
   * matches nothing and shows nothing.
   *
   * The one thing that needs the list is opening a panel in a non-collapsible
   * accordion that starts with none open, so give that case a `defaultValue`.
   */
  const effective = useMemo(
    () => normalizeOpen(open, items ? items.map((item) => item.value) : open, settings),
    [open, items, settings],
  );

  const toggle = useCallback(
    (item: string) => {
      const next = toggleOpen(effective, item, settings);
      setOpen(next);
      onValueChange?.(next);
    },
    [effective, settings, setOpen, onValueChange],
  );

  const context = useMemo<AccordionContextValue>(
    () => ({ open: effective, toggle, size, variant, iconPosition }),
    [effective, toggle, size, variant, iconPosition],
  );

  return (
    <div
      ref={ref}
      className={cx("ac-root", classNames?.root, className)}
      style={style}
      data-variant={variant}
      data-size={size}
    >
      <AccordionContext value={context}>
        {items
          ? items.map((item) => (
              <AccordionItem
                key={item.value}
                value={item.value}
                title={item.title}
                description={item.description}
                disabled={item.disabled}
              >
                {item.content}
              </AccordionItem>
            ))
          : children}
      </AccordionContext>
    </div>
  );
}
