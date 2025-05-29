export type IconComponent = React.FC;

export type MenuItem = {
  id: number | string;
  name: string;
  icon: string;
  path?: string;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  badge?: string;
  toggle?: boolean;
  type?: string;
  component?: React.FC;
};

export type MenuSection = {
  id?: number | string;
  title: string;
  items: MenuItem[];
  component?: React.FC;
  type?: string;
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
