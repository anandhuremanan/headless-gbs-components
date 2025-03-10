import React from "react";
import { NavItem, NavItemComponentProps } from "./types";

const NavItemComponent: React.FC<NavItemComponentProps> = ({
  items,
  isMobile,
  activeSubmenu,
  toggleSubmenu,
  variant,
}) => {
  const renderNavItems = (navItems: NavItem[], isSubmenu: boolean = false) => {
    return navItems.map((item) => {
      const hasChildren = item.children && item.children.length > 0;

      if (item.customComponent) {
        return (
          <li
            key={item.id}
            className={`${isMobile ? "block w-full" : "relative"} ${
              isSubmenu ? "w-full" : ""
            }`}
          >
            {item.customComponent}
          </li>
        );
      }

      return (
        <li
          key={item.id}
          className={`${isMobile ? "block w-full" : "relative"} ${
            isSubmenu ? "w-full" : ""
          }`}
        >
          {hasChildren ? (
            <>
              <button
                onClick={(e) => toggleSubmenu(item.id, e)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-md
                  ${item.highlight ? "font-medium text-blue-600" : ""}
                  ${
                    isMobile
                      ? "w-full text-left"
                      : "hover:bg-opacity-10 hover:bg-gray-200"
                  }
                `}
              >
                <span className="flex items-center">
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </span>
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${
                    activeSubmenu === item.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`
                  ${
                    isMobile
                      ? "pl-4 border-l border-gray-200"
                      : "absolute left-0 min-w-max shadow-lg rounded-md py-2 bg-white z-50"
                  }
                  ${
                    variant === "dark" && !isMobile
                      ? "bg-gray-800 text-white"
                      : ""
                  }
                  ${activeSubmenu === item.id ? "block" : "hidden"}
                  ${!isMobile ? "mt-1" : ""}
                `}
              >
                <ul className="w-full">
                  {renderNavItems(item.children || [], true)}
                </ul>
              </div>
            </>
          ) : (
            <a
              href={item.href}
              className={`
                flex items-center px-3 py-2 rounded-md
                ${item.highlight ? "font-medium text-blue-600" : ""}
                ${
                  isMobile
                    ? "block w-full"
                    : "hover:bg-opacity-10 hover:bg-gray-200"
                }
              `}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </a>
          )}
        </li>
      );
    });
  };

  return (
    <ul className="md:flex md:space-x-1 flex-col md:flex-row">
      {renderNavItems(items)}
    </ul>
  );
};

export default NavItemComponent;
