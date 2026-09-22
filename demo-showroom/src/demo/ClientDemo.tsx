import { useRef, useState } from "react";
import {
  createColumnHelper,
  DataGrid,
  type CellEditEvent,
  type GridApi,
} from "@/components/data-grid";
import { createEmployees, DEPARTMENTS, type Employee } from "./data";

const col = createColumnHelper<Employee>();
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Defined once at module level so the grid's column memoization never invalidates.
const columns = [
  col.field("id", {
    header: "ID",
    type: "number",
    width: 90,
    pin: "left",
    align: "start",
  }),
  col.field("name", {
    width: 190,
    editable: true,
    validate: (value) => (value.trim() ? null : "Name is required"),
  }),
  col.field("email", { width: 270 }),
  col.field("department", {
    width: 150,
    editable: true,
    options: DEPARTMENTS.map((d) => ({ label: d, value: d })),
  }),
  col.field("role", { width: 130 }),
  col.field("country", { width: 150 }),
  col.field("salary", {
    type: "number",
    width: 130,
    editable: true,
    format: (value) => currency.format(value),
    validate: (value) =>
      value === null || Number.isNaN(value) || value < 0
        ? "Enter a positive amount"
        : null,
  }),
  col.field("rating", {
    type: "number",
    width: 120,
    cell: ({ value }) => (
      <span
        className="tracking-wider text-amber-500"
        aria-label={`${value} out of 5`}
      >
        {"★".repeat(value)}
        <span className="text-zinc-300 dark:text-zinc-700">
          {"★".repeat(5 - value)}
        </span>
      </span>
    ),
  }),
  col.field("startDate", {
    header: "Start date",
    type: "date",
    width: 140,
    editable: true,
  }),
  col.field("active", {
    type: "boolean",
    width: 96,
    editable: true,
    pin: "right",
  }),
];

const buttonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

export function ClientDemo() {
  const [data, setData] = useState(() => createEmployees(100_000));
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const apiRef = useRef<GridApi<Employee>>(null);

  // Simulates a save request; the cell shows the pending value until it resolves.
  const onCellEdit = ({ rowId, columnId, value }: CellEditEvent<Employee>) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        setData((prev) => {
          const index = Number(rowId) - 1;
          const next = prev.slice();
          next[index] = { ...prev[index], [columnId]: value };
          return next;
        });
        resolve();
      }, 400);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => apiRef.current?.focusCell(0, "name")}
        >
          Focus first cell
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            apiRef.current?.setSorting([{ columnId: "salary", desc: true }])
          }
        >
          Sort by top salary
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            apiRef.current?.exportExcel({
              scope: "selected",
              fileName: "selected-employees",
            })
          }
        >
          Export selected (.xlsx)
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {lastClicked
            ? `Last clicked: ${lastClicked}`
            : "100,000 rows, no pagination: scroll, sort, filter, edit (double-click or Enter)"}
        </span>
      </div>

      <DataGrid
        ref={apiRef}
        data={data}
        columns={columns}
        getRowId="id"
        enableRowSelection
        enablePagination={false}
        height={620}
        exportFileName="employees"
        aria-label="Employees"
        onCellEdit={onCellEdit}
        onRowClick={(row) => setLastClicked(row.name)}
      />
    </div>
  );
}
