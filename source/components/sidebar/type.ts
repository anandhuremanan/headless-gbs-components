export type IconComponent = React.FC;

export type MenuItem = {
  id: number;
  name: string;
  icon: string;
  path: string;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  badge?: string;
  toggle?: boolean;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export type MenuData = {
  logo?: {
    name: string;
    logoUrl: string;
  };
  sections?: MenuSection[];
  footer?: MenuItem[];
  profile?: {
    name: string;
    email: string;
    avatarUrl: string;
  };
};

export type SidebarProps = {
  menuData: MenuData;
  iconMap: Record<string, IconComponent>;
};
