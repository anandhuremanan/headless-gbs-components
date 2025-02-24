/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef } from "react";
import {
  useDatePickerState,
  useYearMonthNavigation,
  useClickOutside,
  isAtYearLimit,
  months,
  applyScrollbarStyles,
} from "@grampro/headless-helpers";
import Icon from "../icon/Icon";
import { calender, down, leftArrows, rightArrows } from "../icon/iconPaths";
import type { DatePickerProps } from "./types";
import { iconClass, popUp, primary } from "../globalStyle";

export const DatePicker = ({
  selectedDateValue,
  minDate = null,
  maxDate = null,
  yearLimitStart = 50,
  yearLimitEnd = 0,
  onDateChange,
  name,
  error,
  placeholder = "Select a date",
  disabled = false,
}: DatePickerProps) => {
  applyScrollbarStyles();

  const dateRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const actualCurrentYear = today.getFullYear();

  const {
    showDatepicker,
    setShowDatepicker,
    showYearMonthPicker,
    setShowYearMonthPicker,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    days,
    selectedDate,
    setSelectedDate,
    tempSelectedDate,
    setTempSelectedDate,
    hasMounted,
  } = useDatePickerState(selectedDateValue || null);

  useEffect(() => {
    console.log("selectedDateValue", selectedDate);
  }, [selectedDate]);

  const { prevMonth, nextMonth } = useYearMonthNavigation(
    currentMonth,
    currentYear,
    yearLimitStart,
    yearLimitEnd,
    setCurrentMonth,
    setCurrentYear
  );

  useClickOutside(
    dateRef as React.RefObject<HTMLElement>,
    () => {
      setShowDatepicker(false);
      setTempSelectedDate(selectedDate || new Date());
    },
    [selectedDate]
  );

  const years = Array.from(
    { length: yearLimitStart + yearLimitEnd + 1 },
    (_, i) => actualCurrentYear - yearLimitStart + i
  ).sort((a, b) => b - a);

  const toggleDatepicker = () => {
    setShowDatepicker(!showDatepicker);
    setShowYearMonthPicker(false);
    if (!showDatepicker) {
      setTempSelectedDate(selectedDate || new Date());
      const date = selectedDate || new Date();
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  };

  const toggleYearMonthPicker = () => {
    setShowYearMonthPicker(!showYearMonthPicker);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setTempSelectedDate(date);
    setShowDatepicker(false);
    if (onDateChange) onDateChange(date);
  };

  const selectYearMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setShowYearMonthPicker(false);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
    setTempSelectedDate(today);
    if (onDateChange) onDateChange(today);
    setShowDatepicker(false);
  };

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="relative inline-block w-full dark:bg-black" ref={dateRef}>
      <button
        type="button"
        onClick={toggleDatepicker}
        className={`${
          error ? primary["error-border"] : "border"
        } p-2 rounded-lg w-full flex items-center gap-2 dark:text-white ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={disabled}
      >
        <Icon
          dimensions={{ width: "20", height: "20" }}
          elements={calender}
          svgClass={iconClass["grey-common"]}
        />
        <span className={!selectedDate ? "text-gray-400" : ""}>
          {selectedDate
            ? selectedDate.toLocaleDateString("en-GB")
            : placeholder}
        </span>
      </button>
      {error && <p className={primary["error-primary"]}>{error}</p>}

      <input
        type="hidden"
        name={name}
        value={selectedDate?.toDateString() || ""}
        readOnly
      />

      {showDatepicker && !disabled && (
        <div className={popUp["pop-up-style"]}>
          <div className="flex justify-between items-center p-2">
            <button
              type="button"
              onClick={prevMonth}
              disabled={isAtYearLimit(
                "prev",
                currentMonth,
                currentYear,
                yearLimitStart,
                yearLimitEnd
              )}
              className={`text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 ${
                isAtYearLimit(
                  "prev",
                  currentMonth,
                  currentYear,
                  yearLimitStart,
                  yearLimitEnd
                )
                  ? "opacity-50"
                  : ""
              }`}
            >
              <Icon
                elements={leftArrows}
                svgClass={"stroke-black fill-none dark:stroke-white"}
              />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-md font-semibold">
                {new Date(currentYear, currentMonth).toLocaleString("default", {
                  month: "long",
                })}{" "}
                {currentYear}
              </span>
              <button
                onClick={toggleYearMonthPicker}
                className=""
                type="button"
              >
                <Icon
                  elements={down}
                  svgClass={"stroke-black fill-none dark:stroke-white"}
                />
              </button>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              disabled={isAtYearLimit(
                "next",
                currentMonth,
                currentYear,
                yearLimitStart,
                yearLimitEnd
              )}
              className={`text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 ${
                isAtYearLimit(
                  "next",
                  currentMonth,
                  currentYear,
                  yearLimitStart,
                  yearLimitEnd
                )
                  ? "opacity-50"
                  : ""
              }`}
            >
              <Icon
                elements={rightArrows}
                svgClass={"stroke-black fill-none dark:stroke-white"}
              />
            </button>
          </div>
          {showYearMonthPicker ? (
            <div className="flex p-2 h-[224px] scrollbar">
              <div className="w-1/2 pr-1">
                <h3 className="text-sm font-semibold mb-1">Month</h3>
                <div className="overflow-y-auto h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar">
                  {months.map((month, index) => (
                    <button
                      type="button"
                      key={month}
                      onClick={() => selectYearMonth(currentYear, index)}
                      className={`w-full text-left p-2 cursor-pointer rounded hover:bg-gray-200 transition duration-150 ease-in-out ${
                        index === currentMonth
                          ? "bg-black text-white hover:bg-blue-600"
                          : ""
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-1/2 pl-1">
                <h3 className="text-sm font-semibold mb-1">Year</h3>
                <div className="overflow-y-auto h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar">
                  {years.map((year) => (
                    <button
                      type="button"
                      key={year}
                      onClick={() => selectYearMonth(year, currentMonth)}
                      className={`w-full text-left p-2 cursor-pointer rounded hover:bg-gray-200 transition duration-150 ease-in-out ${
                        year === currentYear
                          ? "bg-black text-white hover:bg-blue-600"
                          : ""
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 p-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center font-bold text-sm p-1">
                  {day}
                </div>
              ))}
              {days.flat().map((day: Date | null, index: number) => {
                if (!day) {
                  return (
                    <div key={index} className="text-center p-1 w-8 h-8"></div>
                  );
                }
                const isDisabled: boolean | undefined =
                  (minDate && day < minDate) ||
                  (maxDate && day > maxDate) ||
                  undefined;
                const isSelected =
                  day.getDate() === tempSelectedDate?.getDate() &&
                  day.getMonth() === tempSelectedDate?.getMonth() &&
                  day.getFullYear() === tempSelectedDate?.getFullYear();

                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => !isDisabled && selectDate(day)}
                    disabled={isDisabled}
                    className={`text-center p-1 w-8 h-8 cursor-pointer rounded-md hover:bg-gray-200 transition duration-150 ease-in-out ${
                      isSelected
                        ? "bg-black text-white hover:bg-gray-800 dark:bg-white"
                        : ""
                    } ${
                      isDisabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-200"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          )}
          <div className="px-2 py-2 flex justify-between mb-8">
            <button
              type="button"
              onClick={goToToday}
              className="text-black hover:text-blue-600 transition duration-150 ease-in-out"
            >
              Today
            </button>
            <button
              type="button"
              onClick={toggleDatepicker}
              className="text-gray-500 hover:text-gray-600 transition duration-150 ease-in-out"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
