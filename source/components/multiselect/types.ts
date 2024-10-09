interface ItemsProps {
  value: string;
  label: string;
}

export type MultiSelectProps = {
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: any;
  truncate?: boolean;
  selectedItems?: string[];
};
