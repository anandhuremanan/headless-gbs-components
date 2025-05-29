import { MenuItem, IconComponent } from "../type";

type SidebarFooterProps = {
  footerItems?: MenuItem[];
  iconMap: Record<string, IconComponent>;
};

export const SidebarFooter = ({ footerItems, iconMap }: SidebarFooterProps) => {
  if (!footerItems) return null;
  if (!iconMap) return null;

  return (
    <div className="border-t border-gray-200">
      <ul className="px-4 py-2 space-y-1">
        {footerItems?.map((item) => {
          const IconComponent = iconMap[item.icon] || (() => null);

          if (item.type === "custom" && item.component) {
            const CustomComponent = item.component;
            return (
              <li
                key={item.id}
                className="py-2 px-3 flex items-center text-sm text-gray-700"
              >
                <span className="mr-3">
                  <IconComponent />
                </span>
                <CustomComponent />
              </li>
            );
          }

          return (
            <li key={item.id}>
              <a
                href={item.path}
                className="flex items-center py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="mr-3">
                  <IconComponent />
                </span>
                <span>{item?.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
