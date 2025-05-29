import { SidebarProps } from "./type";
import { useSidebarState } from "./hooks/useSidebarState";
import { SidebarLogo } from "./components/SidebarLogo";
import { SidebarMenu } from "./components/SidebarMenu";
import { SidebarFooter } from "./components/SidebarFooter";
import { UserProfile } from "./components/UserProfile";

export function Sidebar({ menuData, iconMap }: SidebarProps) {
  const { sidebarData, toggleItem } = useSidebarState(menuData);

  return (
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
  );
}
