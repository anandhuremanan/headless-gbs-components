import type { ReactNode } from "react";

export type AccordionVariant = "separated" | "contained" | "plain";

export type AccordionSize = "sm" | "md" | "lg";

/** Which side of the header the chevron sits on. */
export type AccordionIconPosition = "start" | "end";

export interface AccordionItemData {
  value: string;
  title: ReactNode;
  /** A second line under the title. */
  description?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}
