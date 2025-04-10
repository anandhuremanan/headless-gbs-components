import { useEffect, useState } from "react";
import { MenuItem, IconComponent } from "../type";

type MenuItemProps = {
  item: MenuItem;
  iconMap: Record<string, IconComponent>;
  onToggle: () => void;
};

export const MenuItemComponent = ({
  item,
  iconMap,
  onToggle,
}: MenuItemProps) => {
  const IconComponent = iconMap[item.icon] || (() => null);
  const [path, setPath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPath(window.location.pathname);
    }
  }, []);

  return (
    <li>
      <a
        href={item.path}
        onClick={
          item.expandable
            ? (e) => {
                e.preventDefault();
                onToggle();
              }
            : undefined
        }
        className={`flex items-center py-2 px-3 rounded-md text-sm ${
          item.path === path
            ? "bg-gray-100 text-black font-medium"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="mr-3">
          <IconComponent />
        </span>
        <span className="flex-grow">{item.name}</span>
        {item.badge && (
          <span className="bg-black text-white text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
        {item.expandable && (
          <svg
            className={`h-4 w-4 transform ${item.expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </a>
      {item.expandable && item.expanded && (
        <ul className="pl-10 mt-1 space-y-1">
          <li>
            <a
              href="#"
              className="block py-1 text-sm text-gray-600 hover:text-teal-600"
            >
              Submenu Item 1
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block py-1 text-sm text-gray-600 hover:text-teal-600"
            >
              Submenu Item 2
            </a>
          </li>
        </ul>
      )}
    </li>
  );
};
