import type { MouseEventHandler, ReactNode } from "react";

export type BreadcrumbSlot = "root" | "list" | "item" | "link" | "current" | "separator" | "ellipsis";

/** Handed to `renderLink`, to draw a crumb with your router's link component. */
export interface BreadcrumbLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
