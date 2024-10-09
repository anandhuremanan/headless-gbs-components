/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * Extended Documentation for Grid can be found at
 * https://psychedelic-step-e70.notion.site/Data-GRID-by-GBS-R-D-20ff97c899d24bc590215a6196435fa3
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import FilterPopup from "./FilterPopup";
import {
  clearFilterHelper,
  exportToExcelHelper,
  exportToPDFHelper,
} from "./GridHelperFunctions";
import { handleApplyFilterHelper } from "./GridHelperFunctions";
import Icon from "../icon/Icon";
import {
  leftArrows,
  leftArrow,
  rightArrow,
  rightArrows,
  search,
  listFilter,
} from "../icon/iconPaths";
import type { GridProps } from "./type";
import { getSourceData } from "../utils";

export const Grid = forwardRef((props: GridProps, ref) => {
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
    gridButtonClass = "px-1 py-2 bg-white border rounded-lg text-xs text-black dark:bg-black dark:text-white",
    selectAll = false,
    onSelectRow,
    isFetching,
    tableHeaderStyle = "text-left border-b border-t bg-gray-50 px-2 py-4 dark:bg-gray-700 dark:text-white",
    gridContainerClass = "flex flex-col min-w-screen border rounded-md overflow-hidden dark:bg-black",
    gridColumnStyleSelectAll = "border-b px-4 text-sm dark:text-white",
    gridColumnStyle = "border-b p-2 text-sm dark:text-white",
  } = props;
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
      if (Array.isArray(dataSource) && dataSource.length > 0) {
        setWorkingDataSource(dataSource);
        const totalPages = Math.ceil(
          dataSource.length / pageSettings.pageNumber
        );
        setTotalPages(totalPages);
        setPageEnd(Math.min(10, totalPages));
      } else if (typeof dataSource === "string") {
        await getGridData();
      }
    };

    handleDataSource();
  }, [dataSource, pageSettings]);

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

  // *** Page Navigation Helper Methods Starts Here
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

  const updatePageRange = (page: number) => {
    const start = Math.floor(page / 10) * 10;
    setPageStart(start);
    setPageEnd(Math.min(start + 10, totalPages));
  };
  // Page Navigation Helper Methods Ends Here ***

  // *** Functions handling global search starts here
  const handleSearchInput = (e: any) => {
    if (!lazy) {
      const searchValue = e.target.value;
      setSearchParam(searchValue);
      if (searchValue === "") {
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
    const filteredData = workingDataSource.filter((item: any) =>
      Object.values(item).some((val: any) => {
        const trimmedVal = val.toString().toLowerCase().trim();
        const trimmedSearchParam = searchParam.toLowerCase().trim();
        return trimmedVal.includes(trimmedSearchParam);
      })
    );
    setWorkingDataSource(filteredData);
    const newTotalPages = Math.ceil(
      filteredData.length / pageSettings.pageNumber
    );
    setTotalPages(newTotalPages);
    const newCurrentPage = 0;
    setCurrentPage(newCurrentPage);
    const newPageStart = Math.floor(newCurrentPage / 10) * 10;
    setPageStart(newPageStart);
    setPageEnd(Math.min(newPageStart + 10, newTotalPages));
  };
  // Functions handling global search ends here ***

  // This will render template passed to Grid
  const renderCell = (rowData: any, column: any, rowIndex: number) => {
    if (column.template) {
      return (
        <column.template
          rowData={rowData}
          rowIndex={rowIndex + currentPage * pageSettings.pageNumber}
        />
      );
    }
    return rowData[column.field];
  };

  // *** Filter Handling Functions Starts Here
  const toggleFilterPopup = (index: number) => {
    setWorkingColumns((prevColumns: any) =>
      prevColumns.map((column: any, i: any) =>
        i === index
          ? { ...column, showFilterPopup: !column.showFilterPopup }
          : column
      )
    );
  };

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

  // Applying Filter
  function handleApplyFilter(event: any) {
    const {
      columns: updatedColumns,
      workingDataSource: updatedFullDataSource,
      activeFilterArray: updatedActiveFilterArray,
    } = handleApplyFilterHelper(event, columns, workingDataSource);

    setWorkingColumns(updatedColumns);
    setWorkingDataSource(updatedFullDataSource);
    setActiveFilterArray(updatedActiveFilterArray);

    setActiveFilterArray(updatedActiveFilterArray);
    resetPage(updatedFullDataSource);
  }

  // Clearing Filter
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
  // *** Filter Handling Functions Ends Here

  // *** RowSelection Handling Logic Starts Here
  const handleSelectAll = () => {
    setSelectedRows(workingDataSource);
    if (onSelectRow) onSelectRow(workingDataSource);
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
  // RowSelection Handling Logic Ends Here ***

  // Making Grid Functions Accessible in Parent
  useImperativeHandle(ref, () => ({
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToEndPage,
    handleSearch,
    handleApplyFilter,
    clearFilter,
    workingDataSource,
    dataSource,
  }));

  return (
    <div className={gridContainerClass}>
      <React.Fragment>
        {/* Global utility logic */}
        <div
          className={`min-w-full flex justify-between items-center ${
            enableExcelExport || enableSearch || enablePdfExport
              ? "block"
              : "hidden"
          }`}
        >
          <div className="flex justify-end gap-2 px-1 py-3 flex-grow">
            {enableExcelExport && (
              <button
                className={gridButtonClass}
                onClick={() => {
                  exportToExcelHelper(workingDataSource, columns, excelName);
                }}
              >
                Export as Excel
              </button>
            )}
            {enablePdfExport && (
              <button
                className={gridButtonClass}
                onClick={() => {
                  exportToPDFHelper(
                    workingDataSource,
                    columns,
                    pdfName,
                    pdfOptions
                  );
                }}
              >
                Export as PDF
              </button>
            )}
            {enableSearch && (
              <div className="flex gap-1">
                <input
                  type="search"
                  value={searchParam}
                  onChange={handleSearchInput}
                  placeholder="search"
                  className="outline-none p-2 text-sm font-normal bg-gray-50 rounded-lg max-sm:hidden dark:bg-black dark:border dark:text-white"
                />
                <button
                  className="bg-white border rounded-lg text-black w-10 flex items-center justify-center dark:bg-black dark:text-white"
                  onClick={() => handleSearch(searchParam)}
                >
                  <Icon
                    elements={search}
                    svgClass={"stroke-gray-500 fill-none dark:stroke-white"}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                {selectAll && (
                  <th className="text-left border-b border-t bg-gray-50 px-4 py-4 dark:bg-gray-700 dark:text-white">
                    <input type="checkbox" onChange={handleSelectAll} />
                  </th>
                )}
                {/* Rendering column headers */}
                {workingColumns.map((columnHeader: any, colIndex: number) => (
                  <th
                    key={colIndex}
                    className={tableHeaderStyle}
                    style={{
                      width: columnHeader.width
                        ? `${columnHeader.width}px`
                        : "auto",
                    }}
                  >
                    <div className="flex items-center relative">
                      {columnHeader.headerText
                        ? columnHeader.headerText
                        : columnHeader.field}
                      {columnHeader.filter && !columnHeader.template && (
                        <React.Fragment>
                          <button
                            onClick={() => {
                              toggleFilterPopup(colIndex);
                            }}
                          >
                            <Icon
                              dimensions={{ width: "12", height: "12" }}
                              elements={listFilter}
                              svgClass={`ml-2 fill-none dark:stroke-white ${
                                activeFilterArray &&
                                activeFilterArray.some(
                                  (filter: any) =>
                                    filter.filterColumn === columnHeader.field
                                )
                                  ? "stroke-red-400"
                                  : "stroke-black"
                              }`}
                            />
                          </button>
                          <FilterPopup
                            show={columnHeader.showFilterPopup}
                            columnHeader={columnHeader.field}
                            filterAction={(action: any) => {
                              handleFilterAction(action, colIndex);
                            }}
                          />
                        </React.Fragment>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* rendering body */}
              {workingDataSource.length > 0 && !isFetching ? (
                workingDataSource
                  .slice(
                    currentPage * pageSettings.pageNumber,
                    (currentPage + 1) * pageSettings.pageNumber
                  )
                  .map((rowData: any, rowIndex: number) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                    >
                      {selectAll && (
                        <td className={gridColumnStyleSelectAll}>
                          <input
                            type="checkbox"
                            checked={isRowSelected(rowData)}
                            onChange={() => handleSelect(rowData)}
                          />
                        </td>
                      )}
                      {workingColumns.map((column: any, colIndex: number) => (
                        <td
                          key={colIndex}
                          className={gridColumnStyle}
                          style={{
                            width: column.width ? `${column.width}px` : "auto",
                          }}
                        >
                          {renderCell(rowData, column, rowIndex)}
                        </td>
                      ))}
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={workingColumns.length}
                    className="text-center p-4 border-b text-sm"
                  >
                    {isFetching
                      ? "Fetching Data Please Wait..."
                      : "No Data Found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination logic */}
        <div className="flex p-2 justify-between dark:text-white">
          <div className="flex gap-4">
            <button
              onClick={goToFirstPage}
              className={`${
                currentPage === 0 ? "text-gray-200 dark:text-gray-700" : ""
              }`}
            >
              <Icon
                elements={leftArrows}
                svgClass={`${
                  currentPage === 0
                    ? "stroke-gray-200 fill-none dark:stroke-gray-700"
                    : "stroke-black fill-none dark:stroke-white"
                }`}
              />
            </button>
            <button onClick={prevPage}>
              <Icon
                elements={leftArrow}
                svgClass={`${
                  currentPage === 0
                    ? "stroke-gray-200 fill-none dark:stroke-gray-700"
                    : "stroke-black fill-none dark:stroke-white"
                }`}
              />
            </button>
            <div className="flex flex-row gap-3 items-center">
              {pageStart > 0 && (
                <button
                  className="p-1 w-5 h-5 flex items-center justify-center rounded-full"
                  onClick={() => goToPage(pageStart - 1)}
                >
                  ...
                </button>
              )}
              {workingDataSource.length > 0 &&
                Array.from({ length: pageEnd - pageStart }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(pageStart + i)}
                    className={`${
                      pageStart + i === currentPage
                        ? "font-bold text-white p-2 h-6 bg-black flex items-center justify-center rounded-md w-auto dark:bg-white dark:text-black"
                        : ""
                    }`}
                  >
                    {pageStart + i + 1}
                  </button>
                ))}
              {pageEnd < totalPages && (
                <button onClick={() => goToPage(pageEnd)}>...</button>
              )}
            </div>
            <button
              onClick={nextPage}
              className={`${
                currentPage === totalPages - 1 || workingDataSource.length <= 0
                  ? "text-gray-200 dark:text-gray-700"
                  : ""
              }`}
            >
              <Icon
                elements={rightArrow}
                svgClass={`${
                  currentPage === totalPages - 1 ||
                  workingDataSource.length <= 0
                    ? "stroke-gray-200 fill-none dark:stroke-gray-700"
                    : "stroke-black fill-none dark:stroke-white"
                }`}
              />
            </button>
            <button
              onClick={goToEndPage}
              className={`${
                currentPage === totalPages - 1 || workingDataSource.length <= 0
                  ? "text-gray-200 dark:text-gray-700"
                  : ""
              }`}
            >
              <Icon
                elements={rightArrows}
                svgClass={`${
                  currentPage === totalPages - 1 ||
                  workingDataSource.length <= 0
                    ? "stroke-gray-200 fill-none dark:stroke-gray-700"
                    : "stroke-black fill-none dark:stroke-white"
                }`}
              />
            </button>
          </div>
          <div className="flex text-sm">
            {currentPage + 1} of {totalPages} pages ({workingDataSource.length})
            items
          </div>
        </div>
      </React.Fragment>
    </div>
  );
});
