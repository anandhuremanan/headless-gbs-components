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
  onSelect?: any;
  selectedItem?: string;
  onFiltering?: any;
};
