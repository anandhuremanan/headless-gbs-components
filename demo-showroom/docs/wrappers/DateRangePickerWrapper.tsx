"use client";

import { useState } from "react";
import {
  addDays,
  DateRangePicker,
  startOfMonth,
  toISODate,
  type DatePreset,
  type DateRange,
} from "../../../source/beta-components/date-picker";

const TODAY = new Date();

const PRESETS: DatePreset[] = [
  { label: "Last 7 days", range: { start: addDays(TODAY, -6), end: TODAY } },
  { label: "Last 30 days", range: { start: addDays(TODAY, -29), end: TODAY } },
  { label: "This month", range: { start: startOfMonth(TODAY), end: TODAY } },
];

const show = (date: Date | null) => (date ? toISODate(date) : "null");

/** Live example used in the DateRangePicker documentation. */
export function DateRangePickerWrapper() {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
      }}
    >
      <DateRangePicker
        label="Reporting period"
        value={range}
        onChange={setRange}
        presets={PRESETS}
        description="Two months, shortcuts, and a preview band while you pick the end date."
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {show(range.start)} → {show(range.end)}
      </code>
    </div>
  );
}

export default DateRangePickerWrapper;
