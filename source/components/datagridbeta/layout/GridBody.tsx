import React from "react";
import { useGridContext } from "../context/GridContext";
import FilterPopup from "./FilterPopup";
import Icon from "../../icon/Icon";
import { listFilter, squarePen, trash } from "../../icon/iconPaths";
import { Column } from "../type";
import EditableRow from "./EditableRow";

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
    lazy,
    activeFilterArray,
    toggleFilterPopup,
    handleFilterAction,
    selectAll,
    handleSelectAll,
    handleSelect,
    isRowSelected,
  } = useGridContext();

  const renderCell = (rowData: any, column: Column, rowIndex: number) => {
    const cellValue = rowData[column.field];
    const globalRowIndex = rowIndex + currentPage * pageSettings.pageNumber;

    if (column.template && !column.editable) {
      const TemplateComponent = column.template;
      return (
        <TemplateComponent
          rowData={rowData}
          rowIndex={globalRowIndex}
          rowChange={(changes) => rowChange?.(changes)}
        />
      );
    }

    if (column.tooltip && !column.editable) {
      return (
        <span title={cellValue?.toString()}>
          {cellValue && cellValue.length > 10
            ? `${cellValue.slice(0, 10)}...`
            : cellValue}
        </span>
      );
    }

    if (column.editable && !column.template) {
      return (
        <EditableRow
          columnType={column.type ? column.type : undefined}
          cellValue={cellValue}
          rowIndex={globalRowIndex}
          field={column.field}
          style={{ width: column.width ? `${column.width}px` : "auto" }}
          rowData={rowData}
        />
      );
    }

    return cellValue;
  };

  const displayStart = currentPage * pageSettings.pageNumber;
  const displayEnd = displayStart + pageSettings.pageNumber;
  const displayData = lazy
    ? workingDataSource
    : workingDataSource.slice(displayStart, displayEnd);

  const isEditablePresent = workingColumns.some(
    (column) => column.editable || column.template
  );

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
                          svgClass={`ml-2 fill-none ${
                            activeFilterArray.some(
                              (filter) => filter.filterColumn === column.field
                            )
                              ? "stroke-red-400 dark:stroke-red-400"
                              : "stroke-black dark:stroke-white"
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
            {isEditablePresent && <th className={tableHeaderStyle}>Action</th>}
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
              <td
                colSpan={workingColumns.length + (selectAll ? 1 : 0)}
                className="text-center py-3"
              >
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
                  <td
                    key={colIndex}
                    className={gridColumnStyle}
                    style={{
                      width: column.width ? `${column.width}px` : "auto",
                      maxWidth: column.width ? `${column.width}px` : "auto",
                    }}
                  >
                    {renderCell(rowData, column, rowIndex)}
                  </td>
                ))}
                {isEditablePresent && (
                  <td style={{ width: "16px", padding: "4px" }}>
                    <div className="flex justify-start items-start px-2 gap-3">
                      <button
                        className="cursor-pointer"
                        onClick={() => console.log(rowData)}
                      >
                        <Icon
                          dimensions={{ width: "16", height: "16" }}
                          elements={squarePen}
                          svgClass="fill-none stroke-black dark:stroke-white"
                        />
                      </button>
                      <button className="cursor-pointer">
                        <Icon
                          dimensions={{ width: "16", height: "16" }}
                          elements={trash}
                          svgClass="fill-none stroke-red-500 dark:stroke-red-500"
                        />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GridBody;
