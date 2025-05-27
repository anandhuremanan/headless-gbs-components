import React, { createContext, useContext } from "react";
import type { GridContextType, GridProps } from "../type";
import {
  useDataSource,
  useColumns,
  usePagination,
  useSearch,
  useFiltering,
  useRowSelection,
  usePageStatus,
} from "../hooks";

const GridContext = createContext<GridContextType | undefined>(undefined);

export const GridProvider: React.FC<{
  children: React.ReactNode;
  props: GridProps;
}> = ({ children, props }) => {
  const {
    dataSource,
    columns = [],
    pageSettings,
    enableSearch = false,
    lazy = false,
    enableExcelExport = false,
    excelName = "data",
    enablePdfExport = false,
    pdfName = "data",
    pdfOptions = {},
    gridButtonClass = "px-1 py-2 text-xs rounded bg-zinc-200 dark:bg-zinc-700 cursor-pointer",
    selectAll = false,
    onSelectRow,
    isFetching,
    tableHeaderStyle = "text-left px-2 py-4 bg-zinc-200 dark:bg-zinc-800",
    gridContainerClass = "flex flex-col rounded-md overflow-hidden",
    gridColumnStyleSelectAll = "px-4 text-xs",
    gridColumnStyle = "p-2 text-xs",
    rowChange = () => {},
    pageStatus = () => {},
    activeFilterArrayValue = [],
    searchParamValue = () => {},
    showTotalPages = false,
    onSearch = () => {},
    onToolbarButtonClick = () => {},
  } = props;

  // Data source management
  const {
    workingDataSource,
    setWorkingDataSource,
    fallbackSourceData,
    totalPages,
    setTotalPages,
  } = useDataSource(dataSource, pageSettings, lazy);

  // Column management
  const { workingColumns, setWorkingColumns } = useColumns(
    columns,
    workingDataSource
  );

  // Pagination management
  const {
    currentPage,
    pageStart,
    pageEnd,
    nextPage,
    prevPage,
    goToEndPage,
    goToFirstPage,
    goToPage,
    resetPage,
  } = usePagination(totalPages, lazy);

  // Search functionality
  const { searchParam, handleSearchInput, handleSearch } = useSearch({
    workingDataSource,
    setWorkingDataSource,
    fallbackSourceData,
    dataSource,
    lazy,
    pageSettings,
    resetPage,
    setTotalPages,
    searchParamValue,
  });

  // Filtering functionality
  const {
    activeFilterArray,
    toggleFilterPopup,
    handleApplyFilter,
    clearFilter,
    handleFilterAction,
  } = useFiltering({
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
  });

  // Row selection functionality
  const { selectedRows, handleSelectAll, handleSelect, isRowSelected } =
    useRowSelection(workingDataSource, onSelectRow);

  // Page status reporting
  usePageStatus(currentPage, totalPages, pageStatus);

  // Context value
  const contextValue: GridContextType = {
    // State
    workingDataSource,
    fallbackSourceData,
    workingColumns,
    currentPage,
    pageStart,
    pageEnd,
    totalPages,
    searchParam,
    activeFilterArray,
    selectedRows,
    isFetching,

    // Navigation methods
    nextPage,
    prevPage,
    goToEndPage,
    goToFirstPage,
    goToPage,
    lazy,

    // Search methods
    handleSearchInput,
    handleSearch,

    // Filter methods
    toggleFilterPopup,
    handleApplyFilter,
    clearFilter,
    handleFilterAction,

    // Row selection methods
    handleSelectAll,
    handleSelect,
    isRowSelected,

    // Grid settings
    columns,
    pageSettings,
    enableSearch,
    enableExcelExport,
    enablePdfExport,
    excelName,
    pdfName,
    pdfOptions,
    gridButtonClass,
    selectAll,
    tableHeaderStyle,
    gridContainerClass,
    gridColumnStyleSelectAll,
    gridColumnStyle,
    rowChange,
    showTotalPages,
    onSearch,
    onToolbarButtonClick,
  };

  return (
    <GridContext.Provider value={contextValue}>{children}</GridContext.Provider>
  );
};

// Base context hook
export const useGridContext = () => {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error("useGridContext must be used within a GridProvider");
  }
  return context;
};
