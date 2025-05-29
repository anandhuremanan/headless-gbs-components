import { useState } from "react";
import { MenuData } from "../type";

export const useSidebarState = (menuData: MenuData) => {
  const [sidebarData, setSidebarData] = useState<MenuData>(menuData);

  const toggleItem = (sectionIndex: number, itemId: number | string): void => {
    const newData = { ...sidebarData };

    const section = newData.sections?.[sectionIndex];
    if (!section) return;

    const itemIndex = section.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    if (section.items[itemIndex].expandable) {
      section.items[itemIndex].expanded = !section.items[itemIndex].expanded;
      setSidebarData({ ...newData });
    }
  };

  const toggleMode = (): void => {
    const newData = { ...sidebarData };
    if (!newData.footer) return;

    const toggleModeIndex = newData.footer.findIndex(
      (item) => item.type === "toggle"
    );
    if (toggleModeIndex === -1) return;

    newData.footer[toggleModeIndex].active =
      !newData.footer[toggleModeIndex].active;
    setSidebarData({ ...newData });
  };

  return {
    sidebarData,
    toggleItem,
    toggleMode,
  };
};
