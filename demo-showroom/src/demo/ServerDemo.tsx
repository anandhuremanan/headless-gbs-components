import { useEffect, useState } from "react";
import {
  buildRows,
  createColumnHelper,
  createFormatters,
  createRowIdGetter,
  DataGrid,
  filterRows,
  paginate,
  resolveColumns,
  sortRows,
  type GridQuery,
} from "@/components/data-grid";
import { createOrders, type Order, type OrderStatus } from "./data";

const col = createColumnHelper<Order>();
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  shipped:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  refunded: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
};

const columns = [
  col.field("id", { header: "Order", width: 130, pin: "left" }),
  col.field("customer", { width: 200 }),
  col.field("product", { width: 180 }),
  col.field("quantity", { type: "number", width: 110 }),
  col.field("total", {
    type: "number",
    width: 130,
    format: (value) => money.format(value),
  }),
  col.field("status", {
    width: 130,
    options: (["pending", "paid", "shipped", "refunded"] as const).map((s) => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      value: s,
    })),
    cell: ({ value }) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[value]}`}
      >
        {value}
      </span>
    ),
  }),
  col.field("orderedAt", { header: "Ordered", type: "date", width: 150 }),
];

// Stand-in for an API. A real server can import the same core functions
// (filterRows, sortRows, paginate) so client and server semantics match.
const database = buildRows(
  createOrders(25_000),
  createRowIdGetter<Order>("id"),
);
const serverColumns = resolveColumns(columns);
const serverFormatters = createFormatters("en-US");

function fetchOrders(query: GridQuery, signal: AbortSignal) {
  return new Promise<{ rows: Order[]; total: number }>((resolve, reject) => {
    const timer = setTimeout(() => {
      const filtered = filterRows(
        database,
        serverColumns,
        query.filters,
        query.globalFilter,
        serverFormatters,
      );
      const sorted = sortRows(filtered, serverColumns, query.sorting);
      const page = paginate(sorted, query.pagination, {
        enabled: true,
        server: false,
      });
      resolve({
        rows: page.rows.map((row) => row.original),
        total: sorted.length,
      });
    }, 350);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

const initialQuery: GridQuery = {
  sorting: [{ columnId: "orderedAt", desc: true }],
  filters: [],
  globalFilter: "",
  pagination: { pageIndex: 0, pageSize: 25 },
};

const NO_ORDERS: Order[] = [];

export function ServerDemo() {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<{
    query: GridQuery;
    rows: Order[];
    total: number;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(query, controller.signal).then(
      (response) => setResult({ query, ...response }),
      () => {},
    );
    return () => controller.abort();
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Server mode: the grid only emits the query. Data comes from a simulated
        API with 350&nbsp;ms latency; stale requests are aborted and the
        previous page stays visible while loading.
      </p>
      <DataGrid
        mode="server"
        data={result?.rows ?? NO_ORDERS}
        rowCount={result?.total ?? 0}
        loading={result?.query !== query}
        columns={columns}
        getRowId="id"
        initialState={initialQuery}
        onQueryChange={setQuery}
        pageSizeOptions={[25, 50, 100]}
        height={560}
        toolbar={{ export: false }}
        aria-label="Orders"
      />
    </div>
  );
}
