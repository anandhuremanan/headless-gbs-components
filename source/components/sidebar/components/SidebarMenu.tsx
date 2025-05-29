import { IconComponent, MenuSection } from "../type";
import { MenuSection as MenuSectionComponent } from "./MenuSection";

type SidebarMenuProps = {
  sections?: MenuSection[];
  iconMap: Record<string, IconComponent>;
  toggleItem: (sectionIndex: number, itemId: number) => void;
};

export const SidebarMenu = ({
  sections,
  iconMap,
  toggleItem,
  
}: SidebarMenuProps) => {
  return (
    <div className="flex-grow overflow-y-auto px-4 py-2">
      {sections?.map((section, sectionIndex) => (
        <MenuSectionComponent
          key={section.title}
          section={section}
          sectionIndex={sectionIndex}
          iconMap={iconMap}
          toggleItem={toggleItem}
        />
      ))}
    </div>
  );
};
