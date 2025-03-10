interface AuthSectionProps {
  showAuthButtons: boolean;
  authState: "loggedIn" | "loggedOut";
  userProfile?: { name: string; avatar?: string };
  variant: "light" | "dark" | "colored";
  onLogin?: () => void;
  onSignup?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

interface MobileToggleProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  highlight?: boolean;
  customComponent?: React.ReactNode;
}

interface NavbarProps {
  brand: { name: string; logo?: React.ReactNode; href: string };
  items: NavItem[];
  variant?: "light" | "dark" | "colored";
  position?: "fixed" | "sticky" | "static";
  containerType?: "full" | "contained";
  showSearchBar?: boolean;
  showAuthButtons?: boolean;
  authState?: "loggedIn" | "loggedOut";
  userProfile?: { name: string; avatar?: string };
  rightSection?: React.ReactNode;
  leftSection?: React.ReactNode;
  centerSection?: React.ReactNode;
  onSearch?: (query: string) => void;
  onLogin?: () => void;
  onSignup?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

interface NavItemComponentProps {
  items: NavItem[];
  isMobile: boolean;
  activeSubmenu: string | null;
  toggleSubmenu: (id: string, e: React.MouseEvent) => void;
  variant: "light" | "dark" | "colored";
}

interface SearchBarProps {
  variant: "light" | "dark" | "colored";
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch?: (query: string) => void;
}

export type {
  SearchBarProps,
  NavItemComponentProps,
  NavItem,
  MobileToggleProps,
  AuthSectionProps,
  NavbarProps,
};
