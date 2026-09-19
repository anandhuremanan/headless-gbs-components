"use client";

import { createContext, use } from "react";
import type { AccordionIconPosition, AccordionSize, AccordionVariant } from "../core/types";

export interface AccordionContextValue {
  open: readonly string[];
  toggle(value: string): void;
  size: AccordionSize;
  variant: AccordionVariant;
  iconPosition: AccordionIconPosition;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

export function useAccordionContext(component: string): AccordionContextValue {
  const context = use(AccordionContext);
  if (!context) throw new Error(`<${component}> must be used inside an <Accordion>.`);
  return context;
}
