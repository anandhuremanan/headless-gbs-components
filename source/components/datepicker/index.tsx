/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef } from "react";
import { generateCalendarHelper, months } from "./DatePickerHelper";
import Icon from "../icon/Icon";
import { calender, down, leftArrows, rightArrows } from "../icon/iconPaths";
import type { DatePickerProps } from "./types";

export const DatePicker = ({
  placeholder = undefined,
  selectedDate: initialSelectedDate = new Date(),
  minDate = null,
  maxDate = null,
  yearLimitStart = 50,
  yearLimitEnd = 30,
  onDateChange,
}: DatePickerProps) => {
  const [showDatepicker, setShowDatepicker] = useState(false);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<any>([]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [hasMounted, setHasMounted] = useState(false);
  const [showPlaceHolder, setShowPlaceHolder] = useState<string | undefined>(
    placeholder
  );

  const dateRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // This useEffect will ensure the server and client
  // rendererd date will not mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // This will helps to close the popup when clicked outside of datepicker component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDatepicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setDays(generateCalendarHelper(currentYear, currentMonth));
  }, [currentYear, currentMonth]);

  // DatePicker Toggler
  const toggleDatepicker = () => {
    setShowDatepicker(!showDatepicker);
    setShowYearMonthPicker(false);
  };

  // YearMonthPicker Toggler
  const toggleYearMonthPicker = () => {
    setShowYearMonthPicker(!showYearMonthPicker);
  };

  const selectDate = (date: any) => {
    setSelectedDate(date);
    setShowPlaceHolder(undefined);
    setShowDatepicker(false);
    if (onDateChange) onDateChange(date);
  };

  const selectYearMonth = (year: any, month: any) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setShowYearMonthPicker(false);
    setDays(generateCalendarHelper(year, month));
  };

  // *** DatePicker navigation starts here
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(new Date());
    if (onDateChange) onDateChange(new Date());
  };
  // DatePicker navigation ends here ***

  const years = Array.from(
    { length: yearLimitEnd },
    (_, i) => currentYear - yearLimitStart + i
  );

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="relative inline-block w-80 dark:bg-black" ref={dateRef}>
      <button
        type="button"
        onClick={toggleDatepicker}
        className="border p-2 rounded w-full flex gap-2 items-center justify-center dark:text-white"
      >
        <Icon
          elements={calender}
          svgClass={"stroke-black fill-none dark:stroke-white"}
        />
        {showPlaceHolder ? (
          <span className="text-gray-500">{showPlaceHolder}</span>
        ) : (
          <span>{selectedDate.toLocaleDateString()}</span>
        )}
      </button>

      {showDatepicker && (
        <div className="absolute z-10 bg-white border border-gray-300 shadow-lg mt-1 w-full rounded dark:bg-black dark:text-white px-2">
          <div className="flex justify-between items-center p-2">
            <button
              type="button"
              onClick={prevMonth}
              className="text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <Icon
                elements={leftArrows}
                svgClass={"stroke-gray-500 fill-none dark:stroke-white"}
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
              className="text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
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
                          ? "bg-blue-500 text-white hover:bg-blue-600"
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
                          ? "bg-blue-500 text-white hover:bg-blue-600"
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
              {days.flat().map((day: any, index: any) => {
                if (!day) {
                  return (
                    <div key={index} className="text-center p-1 w-8 h-8"></div>
                  );
                }
                const isDisabled: any =
                  (minDate && day < minDate) || (maxDate && day > maxDate);
                const isSelected =
                  day.getDate() === selectedDate.getDate() &&
                  day.getMonth() === selectedDate.getMonth() &&
                  day.getFullYear() === selectedDate.getFullYear();

                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => !isDisabled && selectDate(day)}
                    disabled={isDisabled}
                    className={`text-center p-1 w-8 h-8 cursor-pointer rounded-full hover:bg-gray-200 transition duration-150 ease-in-out ${
                      isSelected
                        ? "bg-blue-500 text-white hover:bg-blue-600"
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
              className="text-blue-500 hover:text-blue-600 transition duration-150 ease-in-out"
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
