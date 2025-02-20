/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  useCallback,
  forwardRef,
  useRef,
  useEffect,
  memo,
  useImperativeHandle,
} from "react";
import type { MultiSelectHandle, MultiSelectProps } from "./types";
import {
  useMultiSelectState,
  useClickOutside,
  applyScrollbarStyles,
} from "@grampro/headless-helpers";
import Icon from "../icon/Icon";
import { check, search, upDown, x } from "../icon/iconPaths";
import { iconClass, popUp, primary } from "../globalStyle";

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
      disabled = false,
    } = props;

    applyScrollbarStyles();

    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLDivElement>(null);

    const {
      showPopover,
      setShowPopover,
      workingDataSource,
      filteredItems,
      selected,
      searchTerm,
      setSearchTerm,
      handleSelect,
      togglePopover,
      clearSelected,
      getSelectItems,
    } = useMultiSelectState(items, selectedItems, lazy, onSelect);

    useClickOutside(selectRef as React.RefObject<HTMLElement>, () =>
      setShowPopover(false)
    );

    useEffect(() => {
      if (showPopover) {
        inputRef.current?.focus();
      }
    }, [showPopover]);

    const getSelectedDisplay = useCallback(() => {
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
    }, [selected, workingDataSource, placeholder, truncate]);

    const handleClear = () => {
      if (disabled) return;
      clearSelected();
      if (onSelect) onSelect([]);
    };

    useImperativeHandle(
      ref,
      () => ({
        workingDataSource,
        items,
        clearSelected,
        togglePopover,
        getSelectItems,
        selectedDisplay: getSelectedDisplay(),
        selected,
      }),
      [
        workingDataSource,
        items,
        clearSelected,
        togglePopover,
        getSelectItems,
        getSelectedDisplay,
        selected,
      ]
    );

    return (
      <div className="relative w-full" ref={selectRef}>
        <div
          className={`relative border w-full flex items-center px-4 py-2 rounded-lg ${
            error && "border-red-500"
          }`}
        >
          <button
            onClick={togglePopover}
            className={`flex-grow text-sm text-left font-medium ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            type="button"
            disabled={disabled}
          >
            {getSelectedDisplay()}
          </button>
          <div className="flex items-center space-x-2">
            {selected.length > 0 && (
              <button
                className="flex items-center px-2"
                onClick={handleClear}
                type="button"
              >
                <Icon elements={x} svgClass={iconClass["grey-common"]} />
              </button>
            )}
            <button onClick={togglePopover} type="button">
              <Icon
                elements={upDown}
                svgClass={`${iconClass["grey-common"]} ${
                  disabled ? "opacity-50" : ""
                }`}
              />
            </button>
          </div>
        </div>
        {error && <p className={primary["error-primary"]}>{error}</p>}

        <input
          type="hidden"
          name={name}
          value={JSON.stringify(selected) || ""}
          readOnly
          disabled={disabled}
        />

        {showPopover && !disabled && (
          <div className={popUp["pop-up-style"]}>
            {showSearch && (
              <div className="flex p-2 gap-1 items-center sticky top-0 bg-white border-b dark:bg-black">
                <Icon elements={search} svgClass={iconClass["grey-common"]} />
                <input
                  autoComplete="off"
                  type="text"
                  name="search"
                  id="search"
                  placeholder="Search a value"
                  className="w-full outline-none dark:bg-black"
                  ref={inputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
