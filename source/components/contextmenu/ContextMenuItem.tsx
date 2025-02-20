import { ContextMenuItemProps } from "./types";

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  onClick,
  icon,
  children,
  disabled = false,
}) => (
  <button
    onClick={(e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        onClick?.();
      }
    }}
    disabled={disabled}
    className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
      disabled
        ? "text-gray-400 cursor-not-allowed"
        : "hover:bg-gray-100 cursor-pointer"
    }`}
  >
    {icon && <span className="w-4 h-4">{icon}</span>}
    {children}
  </button>
);

export const ContextMenuDivider: React.FC = () => (
  <div className="my-1 border-t border-gray-200" />
);
