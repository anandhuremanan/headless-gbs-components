import React from "react";
import { useState } from "react";

export default function FilterPopup({ show, columnHeader, filterAction }: any) {
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState("contains");
  const [isFilterActive, setIsFilterActive] = useState(false);

  const handleFilterInput = (e: any) => {
    const filterKeyword = e.target.value;
    setFilterValue(filterKeyword);
  };

  const onCancel = () => {
    filterAction({ type: "cancel" });
  };

  const applyFilter = () => {
    filterAction({
      type: "applyFilter",
      filterValue,
      filterType,
      columnHeader,
    });
    show = false;
    setIsFilterActive(true);
  };

  const clearFilter = () => {
    setIsFilterActive(false);
    filterAction({ type: "clearFilter", columnHeader });
  };

  return (
    show && (
      <div
        className="absolute bg-gray-100 p-2 border z-50 mt-48 flex items-end flex-col shadow-lg gap-2 rounded-md dark:bg-gray-700"
        role="dialog"
      >
        <select
          name={`${columnHeader}-filter`}
          id={`${columnHeader}-filter-id`}
          className="w-full p-2 rounded-lg dark:bg-gray-600"
          value={filterType}
          onChange={(e: any) => {
            setFilterType(e.target.value);
          }}
        >
          <option value="contains">Contains</option>
          <option value="starts_with">Starts With</option>
          <option value="ends_with">Ends With</option>
        </select>
        <input
          type="text"
          placeholder="Enter filter value"
          className="rounded-lg p-2 text-sm dark:bg-gray-600"
          value={filterValue}
          onInput={handleFilterInput}
        />
        <div className="mt-2">
          <button
            className="text-xs bg-red-600 text-white p-1 rounded-lg hover:bg-red-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          {isFilterActive && (
            <button
              className="text-xs bg-black text-white p-1 rounded-lg dark:bg-white dark:text-white"
              onClick={clearFilter}
            >
              Clear Filter
            </button>
          )}
          <button
            className="text-xs bg-black text-white p-1 rounded-lg dark:bg-white dark:text-black"
            onClick={applyFilter}
          >
            Apply Filter
          </button>
        </div>
      </div>
    )
  );
}
