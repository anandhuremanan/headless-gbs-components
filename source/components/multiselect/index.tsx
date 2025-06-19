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
import { iconClass, primary } from "../globalStyle";
import { selectStyle } from "../globalStyle";
import { PortalDropdown } from "./PortalDropDown";

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
    const buttonRef = useRef<HTMLButtonElement>(null);

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

    useClickOutside(selectRef as React.RefObject<HTMLElement>, (event) => {
      const portalElement = document.querySelector(
        '[data-select-portal="true"]'
      );
      if (portalElement && portalElement.contains(event.target as Node)) {
        return;
      }
      setShowPopover(false);
    });

    useEffect(() => {
      if (showPopover) {
        inputRef.current?.focus();
      }
    }, [showPopover]);

    const getSelectedDisplay = useCallback(() => {
      // if (selected.length === 0) return placeholder;
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

    // Portal dropdown content
    const dropdownContent = (
      <>
        {showSearch && (
          <div className={selectStyle["input-parent"]}>
            <Icon elements={search} svgClass={iconClass["grey-common"]} />
            <input
              autoComplete="off"
              type="text"
              name="search"
              id="search"
              placeholder="Search a value"
              className="w-full outline-none dark:bg-transparent"
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
              className={selectStyle["filter-button"]}
              onClick={() => handleSelect(value)}
            >
              <Icon
                elements={check}
                svgClass={`h-4 w-4 fill-none ${
                  selected.includes(value) ? "stroke-gray-500" : ""
                }`}
              />
              {label.length > 20 ? `${label.substring(0, 20)}...` : label}
            </button>
          ))
        ) : (
          <div className="text-sm text-center">No Data Found</div>
        )}
      </>
    );

    // Selected display Content
    const selectedDisplay = (
      <span className="flex items-center gap-1">
        {selected
          .slice(0, truncate && selected.length > 3 ? 3 : selected.length)
          .map((item: string, index: number) => {
            return (
              <span
                key={index}
                className="bg-slate-800 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
              >
                {item}{" "}
                <span
                  onClick={() => handleSelect(item)}
                  className="cursor-pointer"
                >
                  <Icon elements={x} svgClass={iconClass["grey-common"]} />
                </span>
              </span>
            );
          })}
        {truncate && selected.length > 3 && (
          <span className="bg-slate-800 text-white px-2 py-1 rounded text-xs">
            +{selected.length - 3} more
          </span>
        )}
      </span>
    );

    return (
      <div className="relative w-full" ref={selectRef}>
        <div className="w-full relative">
          <button
            ref={buttonRef}
            className={`${error ? primary["error-border"] : "border"} ${
              selectStyle["select-button"]
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={togglePopover}
            type="button"
            disabled={disabled}
          >
            {selected.length == 0 ? (
              <span>{placeholder}</span>
            ) : (
              <span>{selectedDisplay}</span>
            )}

            <Icon
              elements={upDown}
              svgClass={`${iconClass["grey-common"]} ${
                disabled ? "opacity-50" : ""
              }`}
            />
          </button>
          {selected.length > 0 && (
            <button
              className={selectStyle["selectedDisplay-Button"]}
              onClick={handleClear}
              type="button"
            >
              <Icon elements={x} svgClass={iconClass["grey-common"]} />
            </button>
          )}
        </div>
        {error && <p className={primary["error-primary"]}>{error}</p>}

        <input
          type="hidden"
          name={name}
          value={JSON.stringify(selected) || ""}
          readOnly
          disabled={disabled}
        />

        <PortalDropdown
          targetRef={buttonRef}
          isVisible={showPopover && !disabled}
        >
          {dropdownContent}
        </PortalDropdown>
      </div>
    );
  }
);

const MemoizedMultiSelect = memo(MultiSelect);
export { MemoizedMultiSelect as MultiSelect };
