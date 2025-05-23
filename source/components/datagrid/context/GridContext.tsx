import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { getSourceData } from "../../utils";
import {
  clearFilterHelper,
  handleApplyFilterHelper,
} from "@grampro/headless-helpers";
import type { GridProps } from "../type";

interface GridContextType {
  workingDataSource: any[];
  fallbackSourceData: any[];
  workingColumns: any[];
  currentPage: number;
  pageStart: number;
  pageEnd: number;
  totalPages: number;
  searchParam: string;
  activeFilterArray: any[];
  selectedRows: any[];
  isFetching: boolean | undefined;

  // Navigation methods
  nextPage: () => void;
  prevPage: () => void;
  goToEndPage: () => void;
  goToFirstPage: () => void;
  goToPage: (page: number) => void;
  lazy: boolean;

  // Search methods
  handleSearchInput: (e: any) => void;
  handleSearch: (searchParam: string) => void;

  // Filter methods
  toggleFilterPopup: (index: number) => void;
  handleApplyFilter: (event: any) => void;
  clearFilter: (event: any) => void;
  handleFilterAction: (action: any, colIndex: number) => void;

  // Row selection methods
  handleSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelect: (rowData: any) => void;
  isRowSelected: (rowData: any) => boolean;

  // Grid settings
  columns: any[];
  pageSettings: any;
  enableSearch: boolean;
  enableExcelExport: boolean;
  enablePdfExport: boolean;
  excelName: string;
  pdfName: string;
  pdfOptions: any;
  gridButtonClass: string;
  selectAll: boolean;
  tableHeaderStyle: string;
  gridContainerClass: string;
  gridColumnStyleSelectAll: string;
  gridColumnStyle: string;
  rowChange: (rowData: any) => void;
  showTotalPages?: boolean;
  onSearch?: (searchParam: string) => void;
}

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
  } = props;

  // States Handling Grid
  const [workingDataSource, setWorkingDataSource] = useState<any>([]);
  const [fallbackSourceData, setFallbackSourceData] = useState([]);
  const [workingColumns, setWorkingColumns] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [pageEnd, setPageEnd] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchParam, setSearchParam] = useState("");
  const [activeFilterArray, setActiveFilterArray] = useState<any>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // This will returns the Page Navigation Status of Grid
  useEffect(() => {
    if (pageStatus) {
      pageStatus({ currentPage: currentPage, totalPages: totalPages });
    }
  }, [pageStatus, currentPage, totalPages]);

  // Function to handle API datasource
  const getGridData = useCallback(async () => {
    try {
      const sourceData = await getSourceData(dataSource);
      const gridData = sourceData.sourcedata;
      setFallbackSourceData(gridData);
      setWorkingDataSource(gridData);
      const totalPages = Math.ceil(gridData.length / pageSettings.pageNumber);
      setTotalPages(totalPages);
      setPageEnd(Math.min(10, totalPages));
    } catch (error) {
      console.error("Error fetching grid source data:", error);
    }
  }, [dataSource, pageSettings.pageNumber]);

  // Calculates total pages and determine dataSource type
  useEffect(() => {
    const handleDataSource = async () => {
      if (Array.isArray(dataSource)) {
        setWorkingDataSource(dataSource);

        // if lazy is true, then totalPages will be taken from pageSettings
        const totalPages =
          lazy && pageSettings.totalCount
            ? Math.ceil(pageSettings.totalCount / pageSettings.pageNumber)
            : Math.ceil(dataSource.length / pageSettings.pageNumber);

        setTotalPages(totalPages);
        setPageEnd(Math.min(10, totalPages));
      } else if (typeof dataSource === "string") {
        await getGridData();
      }
    };

    handleDataSource();
  }, [dataSource, pageSettings, getGridData]);

  // Adds Filter Column
  useEffect(() => {
    if (columns && columns.length > 0) {
      const filteredColumns = columns.map((column) => ({
        ...column,
        showFilterPopup: false,
        isFilterActive: false,
      }));
      setWorkingColumns(filteredColumns);
    }
  }, [columns]);

  // Adds Search Column
  useEffect(() => {
    if (!columns || columns.length === 0) {
      if (
        workingDataSource.length > 0 &&
        Object.keys(workingDataSource[0]).length > 0
      ) {
        const inferredColumns = Object.keys(workingDataSource[0]).map(
          (key) => ({
            field: key,
            headerText: key.charAt(0).toUpperCase() + key.slice(1),
            width: 150,
          })
        );
        setWorkingColumns((prevColumns: any) => {
          if (JSON.stringify(prevColumns) !== JSON.stringify(inferredColumns)) {
            return inferredColumns;
          }
          return prevColumns;
        });
      }
    }
  }, [columns, workingDataSource]);

  // *** Page Navigation Helper Methods
  const updatePageRange = (page: number) => {
    const start = Math.floor(page / 10) * 10;
    setPageStart(start);
    setPageEnd(Math.min(start + 10, totalPages));
  };

  const nextPage = () => {
    setCurrentPage((prevPage) => {
      if (prevPage < totalPages - 1) {
        const newPage = prevPage + 1;
        updatePageRange(newPage);
        return newPage;
      }
      return prevPage;
    });
  };

  const prevPage = () => {
    setCurrentPage((prevPage) => {
      if (prevPage > 0) {
        const newPage = prevPage - 1;
        updatePageRange(newPage);
        return newPage;
      }
      return prevPage;
    });
  };

  const goToEndPage = () => {
    const lastPage = totalPages - 1;
    setCurrentPage(lastPage);
    updatePageRange(lastPage);
  };

  const goToFirstPage = () => {
    setCurrentPage(0);
    updatePageRange(0);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    updatePageRange(page);
  };

  // *** Search Functions
  const handleSearchInput = (e: any) => {
    const searchValue = e.target.value;
    if (searchParamValue) searchParamValue(searchValue);
    setSearchParam(searchValue);

    if (searchValue === "") {
      if (!lazy) {
        setWorkingDataSource(
          fallbackSourceData.length > 0 ? fallbackSourceData : dataSource
        );
        const fallback =
          fallbackSourceData.length > 0 ? fallbackSourceData : dataSource;
        const totalPages = Math.ceil(fallback.length / pageSettings.pageNumber);
        setTotalPages(totalPages);
        setPageEnd(Math.min(pageStart + 10, totalPages));
      }
    }
  };

  const handleSearch = (searchParam: string) => {
    if (!lazy) {
      const filteredData = workingDataSource.filter((item: any) =>
        Object.values(item).some((val: any) => {
          const trimmedVal = val.toString().toLowerCase().trim();
          const trimmedSearchParam = searchParam.toLowerCase().trim();
          return trimmedVal.includes(trimmedSearchParam);
        })
      );
      setWorkingDataSource(filteredData);
      resetPage(filteredData);
    }
  };

  // *** Filter Functions
  // Resetting pagination params for updating pagination
  function resetPage(dataSource: any) {
    const newTotalPages = Math.ceil(
      dataSource.length / pageSettings.pageNumber
    );

    setTotalPages(newTotalPages);
    setCurrentPage(0);
    setPageStart(0);
    setPageEnd(Math.min(10, newTotalPages));
  }

  const toggleFilterPopup = (index: number) => {
    setWorkingColumns((prevColumns: any) =>
      prevColumns.map((column: any, i: any) =>
        i === index
          ? { ...column, showFilterPopup: !column.showFilterPopup }
          : column
      )
    );
  };

  function handleApplyFilter(event: any) {
    const {
      columns: updatedColumns,
      workingDataSource: updatedFullDataSource,
      activeFilterArray: updatedActiveFilterArray,
    } = handleApplyFilterHelper(event, columns, workingDataSource);

    setWorkingColumns(updatedColumns);
    setWorkingDataSource(updatedFullDataSource);
    setActiveFilterArray(updatedActiveFilterArray);
    if (activeFilterArrayValue)
      activeFilterArrayValue(updatedActiveFilterArray);
    resetPage(updatedFullDataSource);
  }

  function clearFilter(event: any) {
    const clearDataSource = Array.isArray(dataSource)
      ? dataSource
      : fallbackSourceData;
    const {
      columns: updatedColumns,
      workingDataSource: updatedDataSource,
      activeFilterArray: updatedActiveFilterArray,
    } = clearFilterHelper(event, workingColumns, clearDataSource);

    setWorkingColumns(updatedColumns);
    setWorkingDataSource(updatedDataSource);
    setActiveFilterArray(updatedActiveFilterArray);
    if (activeFilterArrayValue)
      activeFilterArrayValue(updatedActiveFilterArray);
    resetPage(updatedDataSource);
  }

  const handleFilterAction = (action: any, colIndex: number) => {
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
  };

  // *** Row Selection Functions
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.checked ? workingDataSource : [];
    setSelectedRows(selected);
    onSelectRow?.(selected);
  };

  const handleSelect = (rowData: any) => {
    setSelectedRows((prevData) => {
      const isSelected = prevData.includes(rowData);
      let updatedData;
      if (isSelected) {
        updatedData = prevData.filter((item) => item !== rowData);
      } else {
        updatedData = [...prevData, rowData];
      }
      if (onSelectRow) onSelectRow(updatedData);
      return updatedData;
    });
  };

  const isRowSelected = (rowData: any) => {
    return selectedRows.includes(rowData);
  };

  // Provide context value
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
