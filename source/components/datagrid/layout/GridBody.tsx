import React from "react";
import { useGridContext } from "../context/GridContext";
import { useGridFilter, useGridRowSelection } from "../hooks/GridHooks";
import FilterPopup from "./FilterPopup";
import Icon from "../../icon/Icon";
import { listFilter } from "../../icon/iconPaths";
import { Column } from "../type";

const GridBody = () => {
  const {
    workingDataSource,
    workingColumns,
    isFetching,
    currentPage,
    pageSettings,
    tableHeaderStyle,
    gridColumnStyle,
    gridColumnStyleSelectAll,
    rowChange,
  } = useGridContext();

  const renderCell = (rowData: any, column: Column, rowIndex: number) => {
    const cellValue = rowData[column.field];

    if (column.template) {
      const TemplateComponent = column.template;
      return (
        <TemplateComponent
          rowData={rowData}
          rowIndex={rowIndex + currentPage * pageSettings.pageNumber}
          rowChange={(changes) => rowChange?.(changes)}
        />
      );
    }

    if (column.tooltip) {
      return (
        <span title={cellValue?.toString()}>
          {cellValue && cellValue.length > 10
            ? `${cellValue.slice(0, 10)}...`
            : cellValue}
        </span>
      );
    }

    return cellValue;
  };

  const { activeFilterArray, toggleFilterPopup, handleFilterAction } =
    useGridFilter();
  const { selectAll, handleSelectAll, handleSelect, isRowSelected } =
    useGridRowSelection();

  const displayStart = currentPage * pageSettings.pageNumber;
  const displayEnd = displayStart + pageSettings.pageNumber;
  const displayData = workingDataSource.slice(displayStart, displayEnd);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            {selectAll && (
              <th
                className={tableHeaderStyle}
                style={{ width: "2px", paddingLeft: "16px" }}
              >
                <input
                  type="checkbox"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    handleSelectAll(event);
                  }}
                  className="form-checkbox h-5 w-5"
                />
              </th>
            )}
            {workingColumns.map((column, colIndex) => (
              <th
                key={colIndex}
                className={tableHeaderStyle}
                style={{ width: column.width ? `${column.width}px` : "auto" }}
              >
                <div className="flex items-center relative">
                  {column.headerText || column.field}
                  {column.filter && !column.template && (
                    <>
                      <button onClick={() => toggleFilterPopup(colIndex)}>
                        <Icon
                          dimensions={{ width: "12", height: "12" }}
                          elements={listFilter}
                          svgClass={`ml-2 fill-none dark:stroke-white ${
                            activeFilterArray.some(
                              (filter) => filter.filterColumn === column.field
                            )
                              ? "stroke-red-400"
                              : "stroke-black"
                          }`}
                        />
                      </button>
                      <FilterPopup
                        show={column.showFilterPopup ?? false}
                        columnHeader={column.field}
                        filterAction={(action: any) =>
                          handleFilterAction(action, colIndex)
                        }
                      />
                    </>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isFetching ? (
            <tr>
              <td colSpan={workingColumns.length + (selectAll ? 1 : 0)}>
                Loading...
              </td>
            </tr>
          ) : displayData.length === 0 ? (
            <tr>
              <td colSpan={workingColumns.length + (selectAll ? 1 : 0)}>
                No data found
              </td>
            </tr>
          ) : (
            displayData.map((rowData, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  isRowSelected(rowData)
                    ? "bg-blue-100 dark:bg-blue-900"
                    : rowIndex % 2 === 0
                    ? "bg-gray-50 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    : "bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }
                onClick={() => rowChange(rowData)}
              >
                {selectAll && (
                  <td className={gridColumnStyleSelectAll}>
                    <input
                      type="checkbox"
                      checked={isRowSelected(rowData)}
                      onChange={() => handleSelect(rowData)}
                      className="form-checkbox h-5 w-5"
                    />
                  </td>
                )}
                {workingColumns.map((column, colIndex) => (
                  <td key={colIndex} className={gridColumnStyle}>
                    {renderCell(rowData, column, rowIndex)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GridBody;
