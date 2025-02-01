import { useState, useCallback } from "react";
import type { ItemsProps } from "./type";

export const useSelectState = (initialSelectedItem?: string) => {
  const [showPopover, setShowPopover] = useState(false);
  const [workingDataSource, setWorkingDataSource] = useState<ItemsProps[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | undefined>(
    initialSelectedItem
  );

  const togglePopover = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover((prev) => !prev);
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedItem(undefined);
    setShowPopover(false);
    setSearchTerm("");
    return "";
  }, []);

  return {
    showPopover,
    setShowPopover,
    workingDataSource,
    setWorkingDataSource,
    searchTerm,
    setSearchTerm,
    selectedItem,
    setSelectedItem,
    togglePopover,
    clearSelected,
  };
};
