"use client";

import { useState } from "react";
import {
  createColumnHelper,
  DataGrid,
  type CellEditEvent,
} from "@/components/data-grid";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  country: string;
  salary: number;
  rating: number;
  startDate: string;
  active: boolean;
}

const FIRST_NAMES = [
  "Ava",
  "Liam",
  "Noah",
  "Emma",
  "Olivia",
  "Mateo",
  "Aarav",
  "Sofia",
  "Yuki",
  "Zara",
];
const LAST_NAMES = [
  "Smith",
  "Garcia",
  "Kim",
  "Patel",
  "Muller",
  "Rossi",
  "Silva",
  "Nguyen",
  "Cohen",
  "Okafor",
];
const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "Support",
];
const COUNTRIES = [
  "India",
  "United States",
  "Germany",
  "Brazil",
  "Japan",
  "France",
];

/** 50 rows, generated without randomness so the docs look the same on every load. */
function createEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      department: DEPARTMENTS[(i * 3) % DEPARTMENTS.length],
      country: COUNTRIES[(i * 5) % COUNTRIES.length],
      salary: 45_000 + ((i * 3607) % 120_000),
      rating: 1 + ((i * 3) % 5),
      startDate: `20${15 + (i % 10)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
      active: i % 7 !== 0,
    };
  });
}

const col = createColumnHelper<Employee>();
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns = [
  col.field("id", {
    header: "ID",
    type: "number",
    width: 70,
    pin: "left",
    align: "start",
  }),
  col.field("name", {
    width: 170,
    editable: true,
    validate: (value) => (value.trim() ? null : "Name is required"),
  }),
  col.field("email", { width: 240 }),
  col.field("department", {
    width: 150,
    editable: true,
    options: DEPARTMENTS.map((d) => ({ label: d, value: d })),
  }),
  col.field("country", { width: 150 }),
  col.field("salary", {
    type: "number",
    width: 120,
    editable: true,
    format: (value) => currency.format(value),
    validate: (value) =>
      value === null || value < 0 ? "Enter a positive amount" : null,
  }),
  col.field("rating", {
    type: "number",
    width: 110,
    cell: ({ value }) => (
      <span
        aria-label={`${value} out of 5`}
        style={{ color: "#f59e0b", letterSpacing: 1 }}
      >
        {"★".repeat(value)}
        <span style={{ opacity: 0.25 }}>{"★".repeat(5 - value)}</span>
      </span>
    ),
  }),
  col.field("startDate", { header: "Start date", type: "date", width: 130 }),
  col.field("active", {
    type: "boolean",
    width: 90,
    editable: true,
    pin: "right",
  }),
];

/** Live example used in the Data Grid documentation. */
export function DataGridWrapper() {
  const [rows, setRows] = useState(() => createEmployees(50));

  const onCellEdit = ({ rowId, columnId, value }: CellEditEvent<Employee>) => {
    setRows((prev) =>
      prev.map((row) =>
        String(row.id) === rowId ? { ...row, [columnId]: value } : row,
      ),
    );
  };

  return (
    <DataGrid
      data={rows}
      columns={columns}
      getRowId="id"
      enableRowSelection
      height={420}
      initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
      onCellEdit={onCellEdit}
      exportFileName="employees"
      aria-label="Employees"
    />
  );
}

export default DataGridWrapper;
