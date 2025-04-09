import { useState } from "react";
import { MenuData } from "../type";

export const useSidebarState = (menuData: MenuData) => {
  const [sidebarData, setSidebarData] = useState<MenuData>(menuData);

  const toggleItem = (sectionIndex: number, itemId: number): void => {
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

  const toggleProMode = (): void => {
    const newData = { ...sidebarData };
    if (!newData.footer) return;

    const proModeIndex = newData.footer.findIndex((item) => item.toggle);
    if (proModeIndex === -1) return;

    newData.footer[proModeIndex].active = !newData.footer[proModeIndex].active;
    setSidebarData({ ...newData });
  };

  return {
    sidebarData,
    toggleItem,
    toggleProMode,
  };
};
