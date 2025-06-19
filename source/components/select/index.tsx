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
} from "react";
import Icon from "../icon/Icon";
import { check, search, upDown, x } from "../icon/iconPaths";
import type { ItemsProps, SelectHandle, SelectProps } from "./types";
import { selectStyle } from "../globalStyle";
import { iconClass, primary } from "../globalStyle";
import {
  useSelectState,
  useSelectData,
  applyScrollbarStyles,
  useKeyboardNavigation,
  useClickOutside,
} from "@grampro/headless-helpers";
import { PortalDropdown } from "./PortalDropDown";

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
    disabled = false,
  } = props;

  applyScrollbarStyles();

  const {
    showPopover,
    setShowPopover,
    workingDataSource,
    setWorkingDataSource,
    searchTerm,
    setSearchTerm,
    selectedItem,
    setSelectedItem,
    togglePopover,
    clearSelected,
  } = useSelectState(initialSelectedItem);

  const { getSelectItems, selectedDisplay, filteredItems } = useSelectData(
    items,
    setWorkingDataSource,
    workingDataSource,
    searchTerm,
    lazy,
    selectedItem
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useClickOutside(selectRef as React.RefObject<HTMLElement>, (event) => {
    const portalElement = document.querySelector('[data-select-portal="true"]');
    if (portalElement && portalElement.contains(event.target as Node)) {
      return;
    }
    setShowPopover(false);
  });

  // Update the handleSelect to accept a SelectItem
  const handleSelect = useCallback(
    (item: ItemsProps) => {
      setSelectedItem(item.value);
      setShowPopover(false);
      setSearchTerm("");
      if (onSelect) onSelect(item.value);
    },
    [onSelect, setSelectedItem, setShowPopover, setSearchTerm]
  );

  // Set up keyboard navigation with the correct item type
  const { focusedIndex, setFocusedIndex, itemRefs, handleKeyDown } =
    useKeyboardNavigation<ItemsProps>({
      items: filteredItems,
      isOpen: showPopover,
      onSelect: handleSelect,
      onClose: () => setShowPopover(false),
    });

  useEffect(() => {
    if (showPopover) {
      inputRef.current?.focus();
    }
  }, [showPopover]);

  useEffect(() => {
    if (initialSelectedItem) {
      setSelectedItem(initialSelectedItem);
    }
  }, [initialSelectedItem, setSelectedItem]);

  const handleClear = () => {
    if (disabled) return;
    clearSelected();
    if (onSelect) onSelect(undefined);
  };

  useImperativeHandle(ref, () => ({
    workingDataSource,
    items,
    clearSelected,
    togglePopover,
    getSelectItems,
    selectedDisplay,
    selected: selectedItem,
  }));

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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onFiltering) onFiltering(e.target.value);
              setFocusedIndex(-1);
            }}
          />
        </div>
      )}
      {filteredItems.length > 0 ? (
        filteredItems.map(({ value, label }, index: number) => (
          <button
            key={value}
            ref={(el: any) => {
              if (itemRefs.current) {
                itemRefs.current[index] = el;
              }
            }}
            className={`${selectStyle["filter-button"]} ${
              focusedIndex === index ? "bg-gray-100 dark:bg-gray-700" : ""
            }`}
            onClick={() => handleSelect({ value, label })}
            onMouseEnter={() => setFocusedIndex(index)}
          >
            <Icon
              elements={check}
              svgClass={`h-4 w-4 fill-none ${
                selectedItem === value ? "stroke-gray-500" : ""
              }`}
            />
            {label.length > 20 ? `${label.substring(0, 20)}...` : label}
          </button>
        ))
      ) : (
        <div className="text-sm text-center p-2">No Data Found</div>
      )}
    </>
  );

  return (
    <div
      className="relative w-full"
      ref={selectRef}
      id={id}
      onKeyDown={handleKeyDown}
    >
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
          {selectedDisplay || placeholder}
          <Icon
            elements={upDown}
            svgClass={`${iconClass["grey-common"]} ${
              disabled ? "opacity-50" : ""
            }`}
          />
        </button>
        {selectedDisplay && !disabled && (
          <button
            className={selectStyle["selectedDisplay-Button"]}
            onClick={handleClear}
          >
            <Icon elements={x} svgClass={iconClass["grey-common"]} />
          </button>
        )}
        {error && <p className={primary["error-primary"]}>{error}</p>}
      </div>

      <input
        type="hidden"
        name={name}
        value={selectedItem || ""}
        readOnly
        disabled={disabled}
      />

      {/* Portal Dropdown - renders to document.body */}
      <PortalDropdown
        targetRef={buttonRef}
        isVisible={showPopover && !disabled}
      >
        {dropdownContent}
      </PortalDropdown>
    </div>
  );
});

Select.displayName = "Select";

const MemoizedSelect = memo(Select);
export { MemoizedSelect as Select };
