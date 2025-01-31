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
  useRef,
  useState,
} from "react";
import Icon from "../icon/Icon";
import { check, search, upDown, x } from "../icon/iconPaths";
import { getSourceData } from "../utils";
import type { ItemsProps, MultiSelectHandle, MultiSelectProps } from "./types";
import { primary } from "../globalStyle";

const MultiSelect = forwardRef<MultiSelectHandle, MultiSelectProps>(
  (props, ref) => {
    const {
      placeholder = "Select Items...",
      items,
      lazy = false,
      showSearch = true,
      onSelect,
      truncate = true,
      selectedItems = [],
      name,
      error,
    } = props;

    const [showPopover, setShowPopover] = useState(false);
    const [workingDataSource, setWorkingDataSource] = useState<ItemsProps[]>(
      []
    );
    const [filteredItems, setFilteredItems] = useState<ItemsProps[]>([]);
    const [selected, setSelected] = useState<string[]>(selectedItems);
    const [searchTerm, setSearchTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      inputRef.current?.focus();
    }, [showPopover]);

    useEffect(() => {
      handleDataSource();
    }, [items]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setShowPopover(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSelectItems = async (itemsApi: string) => {
      const itemsData = await getSourceData(itemsApi);
      setWorkingDataSource(itemsData.sourcedata);
      setFilteredItems(itemsData.sourcedata);
    };

    const handleDataSource = async () => {
      if (Array.isArray(items)) {
        setWorkingDataSource(items);
        setFilteredItems(items);
      } else if (typeof items === "string") {
        await getSelectItems(items);
      }
    };

    const togglePopover = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPopover(!showPopover);
    };

    const handleSelect = useCallback(
      (value: string) => {
        const newSelected = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        setSelected(newSelected);
        onSelect?.(newSelected);
      },
      [selected, onSelect]
    );

    const getSelectedDisplay = () => {
      if (selected.length === 0) return placeholder;
      const displayedItems = selected
        .slice(0, 3)
        .map(
          (value) =>
            workingDataSource.find((item) => item.value === value)?.label || ""
        );
      let display = displayedItems.join(", ");
      if (selected.length > 3 && truncate) {
        display += `, +${selected.length - 3} more`;
      }
      return display;
    };

    const inputSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toLowerCase();
      setSearchTerm(value);
      if (!lazy) {
        setFilteredItems(
          workingDataSource.filter((item) =>
            Object.values(item).some((val) =>
              val.toString().toLowerCase().includes(value)
            )
          )
        );
      }
    };

    const clearSelected = () => {
      setSelected([]);
      setShowPopover(false);
      if (onSelect) onSelect([]);
    };

    useImperativeHandle(ref, () => ({
      workingDataSource,
      items,
      clearSelected,
      togglePopover,
      getSelectItems,
      selectedDisplay: getSelectedDisplay(),
      selected,
    }));

    return (
      <div className="relative w-full" ref={selectRef}>
        <div
          className={`relative border w-full flex items-center px-4 py-2 rounded-lg ${
            error && "border-red-500"
          }`}
        >
          <button
            onClick={togglePopover}
            className="flex-grow text-sm text-left font-medium"
            type="button"
          >
            {getSelectedDisplay()}
          </button>
          <div className="flex items-center space-x-2">
            {selected.length > 0 && (
              <button
                className="flex items-center px-2"
                onClick={clearSelected}
                type="button"
              >
                <Icon
                  elements={x}
                  svgClass="h-4 w-4 stroke-gray-500 fill-none dark:stroke-white"
                />
              </button>
            )}
            <button onClick={togglePopover} type="button">
              <Icon
                elements={upDown}
                svgClass="h-4 w-4 stroke-gray-500 fill-none dark:stroke-white"
              />
            </button>
          </div>
        </div>
        {error && <p className={primary["error-primary"]}>{error}</p>}

        {/* Hidden input to integrate with the form */}
        <input
          type="hidden"
          name={name}
          value={JSON.stringify(selected) || ""}
          readOnly
        />

        {showPopover && (
          <div className="w-full absolute overflow-y-auto border px-2 rounded-lg mt-[1px] scrollbar bg-white z-50 scrollbar h-auto dark:bg-black dark:text-white">
            {showSearch && (
              <div className="flex p-2 gap-1 items-center sticky top-0 bg-white border-b dark:bg-black">
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
                  onChange={inputSearchHandler}
                />
              </div>
            )}
            {filteredItems.length > 0 ? (
              filteredItems.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  className="flex items-center w-full px-2 py-1 text-left hover:bg-blue-100 gap-2 rounded-lg mt-1 text-sm dark:hover:bg-blue-600"
                  onClick={() => handleSelect(value)}
                >
                  <Icon
                    elements={check}
                    svgClass={`h-4 w-4 fill-none ${
                      selected.includes(value) ? "stroke-gray-500" : ""
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
  }
);

const MemoizedMultiSelect = memo(MultiSelect);
export { MemoizedMultiSelect as MultiSelect };
