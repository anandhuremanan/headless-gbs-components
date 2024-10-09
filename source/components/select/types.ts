interface ItemsProps {
  value: string;
  label: string;
}

export type SelectProps = {
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: any;
  selectedItem?: string;
};
