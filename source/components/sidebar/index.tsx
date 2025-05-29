import { SidebarProps } from "./type";
import { useSidebarState } from "./hooks/useSidebarState";
import { SidebarLogo } from "./components/SidebarLogo";
import { SidebarMenu } from "./components/SidebarMenu";
import { SidebarFooter } from "./components/SidebarFooter";
import { UserProfile } from "./components/UserProfile";
import Icon from "../icon/Icon";
import { menuIcon, x } from "../icon/iconPaths";
import { useState } from "react";

export function Sidebar({ menuData, iconMap }: SidebarProps) {
  const { sidebarData, toggleItem } = useSidebarState(menuData);
  const [showSideBarMobile, setShowSideBarMobile] = useState(false);

  return (
    <div>
      {/* Mobile menu button - only show when sidebar is closed */}
      {!showSideBarMobile && (
        <button
          className="md:hidden flex items-center justify-between absolute p-4 border z-50 bg-white rounded-xl top-3 left-3"
          onClick={() => setShowSideBarMobile(true)}
        >
          <Icon
            elements={menuIcon}
            svgClass={"stroke-black fill-none"}
            dimensions={{ width: "18", height: "18" }}
          />
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {showSideBarMobile && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowSideBarMobile(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed left-0 top-0 h-screen bg-white w-64 border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
          showSideBarMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pr-4">
          <SidebarLogo logo={sidebarData.logo} />
          <button onClick={() => setShowSideBarMobile(false)}>
            <Icon
              elements={x}
              svgClass={"stroke-black fill-none"}
              dimensions={{ width: "18", height: "18" }}
            />
          </button>
        </div>
        <SidebarMenu
          sections={sidebarData.sections}
          iconMap={iconMap}
          toggleItem={toggleItem}
        />
        <SidebarFooter footerItems={sidebarData.footer} iconMap={iconMap} />
        <UserProfile profile={sidebarData.profile} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-screen bg-white w-64 border-r border-gray-200 sticky left-0 top-0">
        <SidebarLogo logo={sidebarData.logo} />
        <SidebarMenu
          sections={sidebarData.sections}
          iconMap={iconMap}
          toggleItem={toggleItem}
        />
        <SidebarFooter footerItems={sidebarData.footer} iconMap={iconMap} />
        <UserProfile profile={sidebarData.profile} />
      </div>
    </div>
  );
}
