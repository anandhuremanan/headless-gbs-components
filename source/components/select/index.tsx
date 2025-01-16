/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Icon from "../icon/Icon";
import { check, search, upDown, x } from "../icon/iconPaths";
import { getSourceData } from "../utils";
import type { ItemsProps, SelectHandle, SelectProps } from "./types";
import { selectStyle } from "./style";
import { popUp, primary } from "../globalStyle";

const Select = forwardRef<SelectHandle, SelectProps>((props, ref) => {
  const {
    id = "",
    name = "",
    placeholder = "Select an Item...",
    items,
    lazy = false,
    showSearch = true,
    onSelect,
    selectedItem: initialSelectedItem,
    error = undefined,
    onFiltering,
  } = props;

  const [showPopover, setShowPopover] = useState(false);
  const [workingDataSource, setWorkingDataSource] = useState<ItemsProps[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | undefined>(
    initialSelectedItem
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  // This will close the popup if clicked outside of the component
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node)
    ) {
      setShowPopover(false);
    }
  }, []);

  // This will close the popup if clicked outside of the component
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Focus to input feild when popup opens
  useEffect(() => {
    if (showPopover) {
      inputRef.current?.focus();
    }
  }, [showPopover]);

  // Handles if items is an API URL
  const getSelectItems = useCallback(async (itemsApi: string) => {
    const itemsData = await getSourceData(itemsApi);
    setWorkingDataSource(itemsData.sourcedata);
  }, []);

  useEffect(() => {
    if (Array.isArray(items)) {
      setWorkingDataSource(items);
    } else if (typeof items === "string") {
      getSelectItems(items);
    }
  }, [items, getSelectItems]);

  useEffect(() => {
    setSelectedItem(initialSelectedItem);
  }, [initialSelectedItem]);

  //Sets if a default value is passed
  const selectedDisplay = useMemo(() => {
    if (selectedItem && workingDataSource.length > 0) {
      const selected = workingDataSource.find(
        (item) => item.value === selectedItem
      );
      return selected ? selected.label : "";
    }
    return "";
  }, [selectedItem, workingDataSource]);

  // Toggles Popover
  const togglePopover = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover((prev) => !prev);
  }, []);

  // Handles Selection of items
  const handleSelect = useCallback(
    (value: string) => {
      setSelectedItem(value);
      setShowPopover(false);
      setSearchTerm("");
      if (onSelect) onSelect(value);
    },
    [onSelect]
  );

  // Clears Selection
  const clearSelected = useCallback(() => {
    setSelectedItem(undefined);
    if (onSelect) onSelect("");
    setShowPopover(false);
    setSearchTerm("");
  }, [onSelect]);

  // Filtering logic
  const filteredItems = useMemo(() => {
    if (!searchTerm || lazy) return workingDataSource;
    return workingDataSource.filter((item) =>
      Object.values(item).some((val) =>
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [workingDataSource, searchTerm, lazy]);

  // Making Select Functions Accessible in Paren
  useImperativeHandle(ref, () => ({
    workingDataSource,
    items,
    clearSelected,
    togglePopover,
    getSelectItems,
    selectedDisplay,
    selected: selectedItem,
  }));

  return (
    <div className="relative w-96" ref={selectRef} id={id}>
      <div className="w-full relative">
        <button
          className={`${error ? primary["error-border"] : "border"} ${
            selectStyle["select-button"]
          }`}
          onClick={togglePopover}
          type="button"
        >
          {selectedDisplay || placeholder}
          <Icon
            elements={upDown}
            svgClass="h-4 w-4 stroke-gray-500 fill-none dark:stroke-white"
          />
        </button>
        {selectedDisplay && (
          <button
            className={selectStyle["selectedDisplay-Button"]}
            onClick={clearSelected}
          >
            <Icon
              elements={x}
              svgClass="h-4 w-4 stroke-gray-500 fill-none dark:stroke-white"
            />
          </button>
        )}
        <p className={primary["error-primary"]}>{error && error}</p>
      </div>

      {/* Hidden input to integrate with the form */}
      <input type="hidden" name={name} value={selectedItem || ""} readOnly />

      {showPopover && (
        <div className={popUp["pop-up-style"]}>
          {showSearch && (
            <div className={selectStyle["input-parent"]}>
              <Icon
                elements={search}
                svgClass="stroke-gray-500 fill-none dark:stroke-white"
              />
              <input
                autoComplete="off"
                type="text"
                name="search"
                id="search"
                placeholder="Search a value"
                className="w-full outline-none dark:bg-black"
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (onFiltering) onFiltering(e.target.value);
                }}
              />
            </div>
          )}
          {filteredItems.length > 0 ? (
            filteredItems.map(({ value, label }) => (
              <button
                key={value}
                className={selectStyle["filter-button"]}
                onClick={() => handleSelect(value)}
              >
                <Icon
                  elements={check}
                  svgClass={`h-4 w-4 fill-none ${
                    selectedItem === value ? "stroke-gray-500" : ""
                  }`}
                />
                {label}
              </button>
            ))
          ) : (
            <div className="text-sm text-center">No Data Found</div>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = "Select";

const MemoizedSelect = memo(Select);
export { MemoizedSelect as Select };
