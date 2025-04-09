import { MenuItem, IconComponent } from "../type";

type SidebarFooterProps = {
  footerItems?: MenuItem[];
  iconMap: Record<string, IconComponent>;
  toggleProMode: () => void;
};

export const SidebarFooter = ({
  footerItems,
  iconMap,
  toggleProMode,
}: SidebarFooterProps) => {
  if (!footerItems) return null;
  if (!iconMap) return null;

  return (
    <div className="border-t border-gray-200">
      <ul className="px-4 py-2 space-y-1">
        {footerItems?.map((item) => {
          const IconComponent = iconMap[item.icon] || (() => null);

          if (item.toggle) {
            return (
              <li
                key={item.id}
                className="flex items-center py-2 px-3 text-sm text-gray-700"
              >
                <span className="mr-3">
                  <IconComponent />
                </span>
                <span className="flex-grow">{item.name}</span>
                <button
                  onClick={toggleProMode}
                  className={`w-10 h-5 flex items-center rounded-full p-1 ${
                    item.active ? "bg-black" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      item.active ? "translate-x-5" : ""
                    }`}
                  />
                </button>
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
