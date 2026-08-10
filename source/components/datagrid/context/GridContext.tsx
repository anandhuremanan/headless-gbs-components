import React, { createContext, useContext } from "react";
import type { GridContextType, GridProps } from "../type";
import { gridStyles } from "../../globalStyle";
import {
  useDataSource,
  useColumns,
  usePagination,
  useSearch,
  useFiltering,
  useRowSelection,
} from "../hooks";

const GridContext = createContext<GridContextType | undefined>(undefined);

export const GridProvider: React.FC<{
  children: React.ReactNode;
  props: GridProps;
}> = ({ children, props }) => {
  const {
    dataSource,
    columns = [],
    enableSearch = false,
    lazy = false,
    enableExcelExport = false,
    excelName = "data",
    enablePdfExport = false,
    pdfName = "data",
    pdfOptions = {},
    selectAll = false,
    onSelectRow,
    isFetching,
    gridColumnStyleSelectAll = "px-4 text-xs",
    gridColumnStyle = "p-2 text-xs",
    showTotalPages = false,
    onSearch = () => {},
    onToolbarButtonClick = () => {},
    initialFilters = [],
    initialSearchParam = "",
  } = props;

  // Resolve pageSize with fallbacks
  const resolvedPageSize = props.pageSize || props.pageSettings?.pageNumber || 10;
  const resolvedPageSettings = {
    pageNumber: resolvedPageSize,
    totalCount: props.pageSettings?.totalCount,
  };

  // Resolve callback aliases
  const resolvedRowChange = props.onRowClick || props.rowChange || (() => {});
  const resolvedPageStatus = props.onPageChange || props.pageStatus || (() => {});
  const resolvedActiveFilterArrayValue = props.onFilterChange || props.activeFilterArrayValue;
  const resolvedSearchParamValue = props.onSearchChange || props.searchParamValue || (() => {});

  // Resolve CSS classes using design tokens from theme presets
  const gridContainerClass = props.gridContainerClass || gridStyles.container;
  const gridButtonClass = props.gridButtonClass || gridStyles.button;
  const tableHeaderStyle = props.tableHeaderStyle || gridStyles.tableHeader;
  const gridToolbarClass = props.gridToolbarClass || gridStyles.toolbar;
  const gridPaginationClass = props.gridPaginationClass || gridStyles.pagination;
  const gridRowEvenClass = props.gridRowEvenClass || gridStyles.rowEven;
  const gridRowOddClass = props.gridRowOddClass || gridStyles.rowOdd;
  const gridRowSelectedClass = props.gridRowSelectedClass || gridStyles.rowSelected;

  // Data source management
  const {
    workingDataSource,
    setWorkingDataSource,
    fallbackSourceData,
    totalPages,
    setTotalPages,
  } = useDataSource(dataSource, resolvedPageSettings, lazy);

  // Column management
  const { workingColumns, setWorkingColumns } = useColumns(
    columns,
    workingDataSource,
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
  } = usePagination(
    totalPages,
    lazy,
    workingDataSource,
    resolvedPageStatus,
  );

  // Search functionality
  const { searchParam, handleSearchInput, handleSearch } = useSearch({
    workingDataSource,
    setWorkingDataSource,
    fallbackSourceData,
    dataSource,
    lazy,
    pageSettings: resolvedPageSettings,
    resetPage,
    setTotalPages,
    searchParamValue: resolvedSearchParamValue,
    initialSearchParam,
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
    pageSettings: resolvedPageSettings,
    activeFilterArrayValue: resolvedActiveFilterArrayValue,
    lazy,
    initialFilters,
  });

  // Row selection functionality
  const { selectedRows, handleSelectAll, handleSelect, isRowSelected } =
    useRowSelection(workingDataSource, onSelectRow);

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
    pageSettings: resolvedPageSettings,
    pageSize: resolvedPageSize,
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
    gridToolbarClass,
    gridPaginationClass,
    gridRowEvenClass,
    gridRowOddClass,
    gridRowSelectedClass,
    gridColumnStyleSelectAll,
    gridColumnStyle,
    rowChange: resolvedRowChange,
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
