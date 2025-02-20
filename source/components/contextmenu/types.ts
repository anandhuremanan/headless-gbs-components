import { ReactNode } from "react";

interface Position {
  x: number;
  y: number;
}

interface ContextMenuProps {
  children: ReactNode;
}

interface ContextMenuItemProps {
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}

export type { Position, ContextMenuProps, ContextMenuItemProps };
