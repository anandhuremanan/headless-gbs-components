import { MenuData } from "../type";

type SidebarLogoProps = {
  logo: MenuData["logo"];
};

export const SidebarLogo = ({ logo }: SidebarLogoProps) => {
  if (!logo) return null;

  return (
    <div className="p-4 flex items-center">
      <div className="flex-shrink-0 mr-2">
        <div className="h-6 w-6 bg-black text-white rounded flex items-center justify-center">
          <img
            src={logo?.logoUrl}
            alt={logo?.name}
            className="h-4 w-4 text-white"
          />
        </div>
      </div>
      <span className="text-gray-800 font-semibold text-lg">{logo?.name}</span>
    </div>
  );
};
