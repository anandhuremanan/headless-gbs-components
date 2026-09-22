"use client";

import { useState } from "react";
import { DatePicker, toISODate } from "@/components/date-picker";

/** Live example used in the DatePicker documentation. */
export function DatePickerWrapper() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <DatePicker
        label="Delivery date"
        value={date}
        onChange={setDate}
        description="Type a date or pick one. Try “12 Mar 2026” or “3/4/2026”."
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {date ? toISODate(date) : "null"}
      </code>
    </div>
  );
}

export default DatePickerWrapper;
