import { useGridContext } from "../context/GridContext";

// Hook for pagination functionality
export const useGridPagination = () => {
  const {
    currentPage,
    pageStart,
    pageEnd,
    totalPages,
    goToFirstPage,
    prevPage,
    goToPage,
    nextPage,
    goToEndPage,
    workingDataSource,
  } = useGridContext();

  return {
    currentPage,
    pageStart,
    pageEnd,
    totalPages,
    goToFirstPage,
    prevPage,
    goToPage,
    nextPage,
    goToEndPage,
    workingDataSource,
  };
};

// Hook for grid search functionality
export const useGridSearch = () => {
  const { searchParam, handleSearchInput, handleSearch, enableSearch } =
    useGridContext();

  return {
    searchParam,
    handleSearchInput,
    handleSearch,
    enableSearch,
  };
};

// Hook for grid filter functionality
export const useGridFilter = () => {
  const {
    workingColumns,
    activeFilterArray,
    toggleFilterPopup,
    handleFilterAction,
  } = useGridContext();

  return {
    workingColumns,
    activeFilterArray,
    toggleFilterPopup,
    handleFilterAction,
  };
};

// Hook for row selection
export const useGridRowSelection = () => {
  const { selectAll, handleSelectAll, handleSelect, isRowSelected } =
    useGridContext();

  return {
    selectAll,
    handleSelectAll,
    handleSelect,
    isRowSelected,
  };
};

// Hook for export functionality
export const useGridExport = () => {
  const {
    enableExcelExport,
    enablePdfExport,
    workingDataSource,
    columns,
    excelName,
    pdfName,
    pdfOptions,
    gridButtonClass,
  } = useGridContext();

  return {
    enableExcelExport,
    enablePdfExport,
    workingDataSource,
    columns,
    excelName,
    pdfName,
    pdfOptions,
    gridButtonClass,
  };
};
