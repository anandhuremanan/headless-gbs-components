import { useState, useCallback } from "react";
import {
  clearFilterHelper,
  handleApplyFilterHelper,
} from "@grampro/headless-helpers";
import type { ActiveFilterArrayValue } from "../type";

interface UseFilteringProps {
  columns: any[];
  workingColumns: any[];
  setWorkingColumns: (columns: any[]) => void;
  workingDataSource: any[];
  setWorkingDataSource: (data: any[]) => void;
  dataSource: any;
  fallbackSourceData: any[];
  resetPage: (data: any[], settings: any) => number;
  setTotalPages: (pages: number) => void;
  pageSettings: any;
  activeFilterArrayValue?: (filters: ActiveFilterArrayValue[]) => void;
  lazy: boolean;
  initialFilters?: any[];
}

export const useFiltering = ({
  columns,
  workingColumns,
  setWorkingColumns,
  workingDataSource,
  setWorkingDataSource,
  dataSource,
  fallbackSourceData,
  resetPage,
  setTotalPages,
  pageSettings,
  activeFilterArrayValue,
  lazy,
  initialFilters = [],
}: UseFilteringProps) => {
  const [activeFilterArray, setActiveFilterArray] = useState<any>(initialFilters);

  const toggleFilterPopup = useCallback(
    (index: number) => {
      setWorkingColumns(
        workingColumns.map((column: any, i: any) =>
          i === index
            ? { ...column, showFilterPopup: !column.showFilterPopup }
            : column
        )
      );
    },
    [workingColumns, setWorkingColumns]
  );

  const handleApplyFilter = useCallback(
    (event: any) => {
      const {
        columns: updatedColumns,
        workingDataSource: updatedFullDataSource,
        activeFilterArray: updatedActiveFilterArray,
      } = handleApplyFilterHelper(event, columns, workingDataSource);

      setWorkingColumns(updatedColumns);
      
      const newActiveFilters = updatedActiveFilterArray;
      setActiveFilterArray(newActiveFilters);

      if (!lazy) {
        setWorkingDataSource(updatedFullDataSource);
        const totalPages = resetPage(updatedFullDataSource, pageSettings);
        setTotalPages(totalPages);
      } else {
        // In lazy mode, we reset page to 0 but keep totalPages from pageSettings
        resetPage(workingDataSource, pageSettings);
      }
      
      if (activeFilterArrayValue)
        activeFilterArrayValue?.(newActiveFilters);
    },
    [
      columns,
      workingDataSource,
      setWorkingColumns,
      setWorkingDataSource,
      activeFilterArrayValue,
      resetPage,
      pageSettings,
      setTotalPages,
      lazy,
      activeFilterArray,
    ]
  );

  const clearFilter = useCallback(
    (event: any) => {
      const clearDataSource = Array.isArray(dataSource)
        ? dataSource
        : fallbackSourceData;
      const {
        columns: updatedColumns,
        workingDataSource: updatedDataSource,
        activeFilterArray: updatedActiveFilterArray,
      } = clearFilterHelper(event, workingColumns, clearDataSource);

      setWorkingColumns(updatedColumns);

      // Manual fallback: ensure the filter is removed from the active array
      let newActiveFilters = updatedActiveFilterArray;
      if (event.type === "clearFilter" && event.columnHeader) {
        newActiveFilters = activeFilterArray.filter(
          (f: any) => f.filterColumn !== event.columnHeader
        );
      }
      
      setActiveFilterArray(newActiveFilters);

      if (!lazy) {
        setWorkingDataSource(updatedDataSource);
        const totalPages = resetPage(updatedDataSource, pageSettings);
        setTotalPages(totalPages);
      } else {
        // In lazy mode, we reset page to 0 but keep totalPages from pageSettings
        resetPage(workingDataSource, pageSettings);
      }

      if (activeFilterArrayValue)
        activeFilterArrayValue?.(newActiveFilters);
    },
    [
      dataSource,
      fallbackSourceData,
      workingColumns,
      setWorkingColumns,
      setWorkingDataSource,
      activeFilterArrayValue,
      resetPage,
      pageSettings,
      setTotalPages,
      lazy,
      activeFilterArray,
    ]
  );

  const handleFilterAction = useCallback(
    (action: any, colIndex: number) => {
      switch (action.type) {
        case "cancel":
          toggleFilterPopup(colIndex);
          break;
        case "applyFilter":
          handleApplyFilter(action);
          break;
        case "clearFilter":
          clearFilter(action);
          break;
        default:
          break;
      }
    },
    [toggleFilterPopup, handleApplyFilter, clearFilter]
  );

  return {
    activeFilterArray,
    toggleFilterPopup,
    handleApplyFilter,
    clearFilter,
    handleFilterAction,
  };
};
