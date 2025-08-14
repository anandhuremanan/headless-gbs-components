import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  renderContent: (activeTabId: string) => ReactNode;
  onChange?: (tabId: string) => void;
  className?: string;
}
