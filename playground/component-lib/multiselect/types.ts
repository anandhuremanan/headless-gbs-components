export type ItemsProps = {
  value: string;
  label: string;
};

export type MultiSelectProps = {
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: (selectedItem: string[]) => void | [];
  truncate?: boolean;
  selectedItems?: string[];
  name?: string;
  error?: string;
  disabled?: boolean;
};

export type MultiSelectHandle = {
  workingDataSource: ItemsProps[];
  clearSelected: () => void;
  togglePopover: (e: React.MouseEvent) => void;
  getSelectItems: (itemsApi: string) => Promise<void>;
  selectedDisplay: string;
  selected: string[] | undefined;
};
