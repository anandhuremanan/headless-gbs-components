import { MenuSection as MenuSectionType, IconComponent } from "../type";
import { MenuItemComponent } from "./MenuItem";

type MenuSectionProps = {
  section: MenuSectionType;
  sectionIndex: number;
  iconMap: Record<string, IconComponent>;
  toggleItem: (sectionIndex: number, itemId: number) => void;
};

export const MenuSection = ({
  section,
  sectionIndex,
  iconMap,
  toggleItem,
}: MenuSectionProps) => {
  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-gray-400 mb-2">
        {section.title}
      </div>
      <ul className="space-y-1">
        {section.items.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            iconMap={iconMap}
            onToggle={() => toggleItem(sectionIndex, item.id)}
          />
        ))}
      </ul>
    </div>
  );
};
