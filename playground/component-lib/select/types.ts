export type ItemsProps = {
  value: string;
  label: string;
};

export type SelectProps = {
  id?: string;
  name?: string;
  error?: undefined | string;
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: (selectedItem: string | undefined) => void;
  selectedItem?: string;
  onFiltering?: (searchTerm: string) => void;
  disabled?: boolean;
};

export type SelectHandle = {
  workingDataSource: ItemsProps[];
  clearSelected: () => void;
  togglePopover: (e: React.MouseEvent) => void;
  getSelectItems: (itemsApi: string) => Promise<void>;
  selectedDisplay: string;
  selected: string | undefined;
};
