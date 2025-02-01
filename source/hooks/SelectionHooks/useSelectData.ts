import { useCallback, useEffect, useMemo } from "react";
import { getSourceData } from "../../utils";
import type { ItemsProps } from "./type";

export const useSelectData = (
  items: ItemsProps[] | string | undefined,
  setWorkingDataSource: (data: ItemsProps[]) => void,
  workingDataSource: ItemsProps[],
  searchTerm: string,
  lazy: boolean,
  selectedItem?: string
) => {
  const getSelectItems = useCallback(
    async (itemsApi: string) => {
      const itemsData = await getSourceData(itemsApi);
      setWorkingDataSource(itemsData.sourcedata);
    },
    [setWorkingDataSource]
  );

  useEffect(() => {
    if (!items) {
      setWorkingDataSource([]);
      return;
    }

    if (Array.isArray(items)) {
      setWorkingDataSource(items);
    } else if (typeof items === "string") {
      getSelectItems(items);
    }
  }, [items, getSelectItems, setWorkingDataSource]);

  const selectedDisplay = useMemo(() => {
    if (selectedItem && workingDataSource.length > 0) {
      const selected = workingDataSource.find(
        (item) => item.value === selectedItem
      );
      return selected ? selected.label : "";
    }
    return "";
  }, [selectedItem, workingDataSource]);

  const filteredItems = useMemo(() => {
    if (!searchTerm || lazy) return workingDataSource;
    return workingDataSource.filter((item) =>
      Object.values(item).some((val) =>
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [workingDataSource, searchTerm, lazy]);

  return {
    getSelectItems,
    selectedDisplay,
    filteredItems,
  };
};
