import { useState, useCallback } from "react";
import { useSelectState } from "./useSelectState";
import { useSelectData } from "./useSelectData";
import type { ItemsProps } from "./type";

export const useMultiSelectState = (
  items: ItemsProps[] | string | undefined,
  selectedItems: string[] = [],
  lazy = false,
  onSelect?: (selectedItems: string[]) => void
) => {
  const [selected, setSelected] = useState<string[]>(selectedItems);

  const {
    showPopover,
    setShowPopover,
    workingDataSource,
    setWorkingDataSource,
    searchTerm,
    setSearchTerm,
    togglePopover,
  } = useSelectState();

  const { filteredItems, getSelectItems } = useSelectData(
    items,
    setWorkingDataSource,
    workingDataSource,
    searchTerm,
    lazy,
    undefined
  );

  const handleSelect = useCallback(
    (value: string) => {
      const newSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      setSelected(newSelected);
      onSelect?.(newSelected);
    },
    [selected, onSelect]
  );

  const clearSelected = useCallback(() => {
    setSelected([]);
    setShowPopover(false);
    setSearchTerm("");
    onSelect?.([]);
  }, [setShowPopover, setSearchTerm, onSelect]);

  return {
    showPopover,
    setShowPopover,
    workingDataSource,
    filteredItems,
    selected,
    searchTerm,
    setSearchTerm,
    handleSelect,
    togglePopover,
    clearSelected,
    getSelectItems,
  };
};
