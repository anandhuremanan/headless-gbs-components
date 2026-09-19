import { describe, expect, it, vi } from "vitest";
import { computeLayout, getLayoutVars, moveColumn, resolveColumns } from "../core/columns";
import { filterRows } from "../core/filtering";
import { createGridEngine, type GridModel } from "../core/grid";
import { buildRows, createRowIdGetter, paginate } from "../core/rows";
import { sortRows, toggleSorting } from "../core/sorting";
import { createInitialState, mergeState } from "../core/state";
import type { ColumnDef, ColumnFilter, GridOptions, GridRow, SortItem } from "../core/types";
import { createFormatters } from "../core/values";
import { getColumnRange, getRowRange } from "../core/virtual";

interface Person {
  id: number;
  name: string;
  age: number | null;
  city: string | null;
  joined: string;
  active: boolean;
  status: "new" | "active" | "gone";
}

const people: Person[] = [
  { id: 1, name: "Alice", age: 34, city: "Paris", joined: "2024-01-15", active: true, status: "active" },
  { id: 2, name: "bob", age: null, city: "Berlin", joined: "2023-06-01", active: false, status: "new" },
  { id: 3, name: "Carol", age: 28, city: null, joined: "2024-01-16", active: true, status: "gone" },
  { id: 4, name: "Dave", age: 41, city: "Paris", joined: "2022-11-30", active: false, status: "active" },
  { id: 5, name: "Item10", age: 28, city: "Rome", joined: "2024-03-01", active: true, status: "new" },
  { id: 6, name: "Item2", age: 50, city: "Berlin", joined: "2021-07-07", active: true, status: "active" },
];

const defs: ColumnDef<Person>[] = [
  { field: "id", type: "number" },
  { field: "name" },
  { field: "age", type: "number" },
  { field: "city" },
  { field: "joined", type: "date" },
  { field: "active", type: "boolean" },
  {
    field: "status",
    options: [
      { label: "New", value: "new" },
      { label: "Active", value: "active" },
      { label: "Gone", value: "gone" },
    ],
  },
];

const columns = resolveColumns(defs);
const formatters = createFormatters("en-US");
const rows = buildRows(people, createRowIdGetter<Person>("id"));
const ids = (list: GridRow<Person>[]) => list.map((row) => row.original.id);

describe("columns", () => {
  it("derives ids and readable headers", () => {
    expect(columns[0].id).toBe("id");
    expect(columns[1].header).toBe("Name");
    expect(resolveColumns<{ firstName: string }>([{ field: "firstName" }])[0].header).toBe("First Name");
    expect(resolveColumns<{ start_date: string }>([{ field: "start_date" }])[0].header).toBe("Start date");
  });

  it("rejects duplicate ids", () => {
    expect(() => resolveColumns<Person>([{ field: "name" }, { field: "name" }])).toThrow(/Duplicate/);
  });

  it("lays out pinned, ordered, sized and hidden columns", () => {
    const layout = computeLayout(columns, {
      columnOrder: ["city", "name"],
      columnVisibility: { age: false },
      columnSizing: { name: 200 },
      columnPinning: { left: ["id"], right: ["status"] },
    });
    expect(layout.left.map((i) => i.column.id)).toEqual(["id"]);
    expect(layout.center.map((i) => i.column.id)).toEqual(["city", "name", "joined", "active"]);
    expect(layout.right.map((i) => i.column.id)).toEqual(["status"]);
    expect(layout.center[1]).toMatchObject({ offset: 160, width: 200 });
    expect(layout.left[0].pinEdge).toBe(true);
    expect(layout.right[0].pinEdge).toBe(true);
    expect(layout.totalWidth).toBe(160 * 5 + 200);
  });

  it("offsets right-pinned columns from the end, including resize previews", () => {
    const layout = computeLayout(columns, {
      columnOrder: [],
      columnVisibility: {},
      columnSizing: {},
      columnPinning: { left: [], right: ["city", "status"] },
    });
    const [city, status] = layout.right;
    expect(getLayoutVars(layout)[`--dg-c${status.visibleIndex}-o`]).toBe("0px");
    expect(getLayoutVars(layout)[`--dg-c${city.visibleIndex}-o`]).toBe("160px");
    expect(getLayoutVars(layout, { status: 300 })[`--dg-c${city.visibleIndex}-o`]).toBe("300px");
  });

  it("moves a column into the target's pin section and back", () => {
    const pinned = moveColumn(columns, { columnOrder: [], columnPinning: { left: ["id"], right: [] } }, "city", "id", "after");
    expect(pinned.columnPinning.left).toEqual(["id", "city"]);

    const unpinned = moveColumn(columns, pinned, "city", "name", "before");
    expect(unpinned.columnPinning.left).toEqual(["id"]);
    expect(unpinned.columnOrder.indexOf("city")).toBe(unpinned.columnOrder.indexOf("name") - 1);
  });
});

describe("filtering", () => {
  const run = (filters: ColumnFilter[], search = "") =>
    ids(filterRows(rows, columns, filters, search, formatters));

  it("returns the input array when nothing filters", () => {
    expect(filterRows(rows, columns, [], "  ", formatters)).toBe(rows);
    expect(filterRows(rows, columns, [{ columnId: "name", operator: "contains", value: "" }], "", formatters)).toBe(rows);
  });

  it("matches text case-insensitively", () => {
    expect(run([{ columnId: "name", operator: "contains", value: "B" }])).toEqual([2]);
  });

  it("applies every column filter together", () => {
    expect(
      run([
        { columnId: "city", operator: "equals", value: "paris" },
        { columnId: "active", operator: "equals", value: false },
      ]),
    ).toEqual([4]);
  });

  it("handles empty cell values", () => {
    expect(run([{ columnId: "city", operator: "startsWith", value: "p" }])).toEqual([1, 4]);
    expect(run([{ columnId: "age", operator: "isEmpty" }])).toEqual([2]);
  });

  it("filters numbers", () => {
    expect(run([{ columnId: "age", operator: "between", value: 28, value2: 34 }])).toEqual([1, 3, 5]);
    expect(run([{ columnId: "age", operator: "gt", value: 40 }])).toEqual([4, 6]);
  });

  it("filters dates by local calendar day", () => {
    expect(run([{ columnId: "joined", operator: "equals", value: "2024-01-15" }])).toEqual([1]);
    expect(run([{ columnId: "joined", operator: "before", value: "2023-01-01" }])).toEqual([4, 6]);
    expect(run([{ columnId: "joined", operator: "after", value: "2024-01-15" }])).toEqual([3, 5]);
    expect(run([{ columnId: "joined", operator: "between", value: "2024-01-15", value2: "2024-01-16" }])).toEqual([1, 3]);
  });

  it("filters option sets", () => {
    expect(run([{ columnId: "status", operator: "in", value: ["new", "gone"] }])).toEqual([2, 3, 5]);
  });

  it("searches display values and requires every term", () => {
    expect(run([], "paris active")).toEqual([1, 4]);
    expect(run([], "Gone")).toEqual([3]);
  });
});

describe("sorting", () => {
  const sorted = (sorting: SortItem[]) => ids(sortRows(rows, columns, sorting));

  it("sorts numbers with empty values last in both directions", () => {
    expect(sorted([{ columnId: "age", desc: false }])).toEqual([3, 5, 1, 4, 6, 2]);
    expect(sorted([{ columnId: "age", desc: true }])).toEqual([6, 4, 1, 3, 5, 2]);
  });

  it("uses natural, case-insensitive string order", () => {
    expect(sorted([{ columnId: "name", desc: false }])).toEqual([1, 2, 3, 4, 6, 5]);
  });

  it("orders strings by the locale it is given", () => {
    // Swedish puts ä after z; German sorts it with a. Same rows, same column,
    // different order — so the locale has to reach the collator.
    const names: GridRow<{ name: string }>[] = [
      { id: "angel", index: 0, original: { name: "ängel" } },
      { id: "zebra", index: 1, original: { name: "zebra" } },
    ];
    const nameColumn = resolveColumns<{ name: string }>([{ field: "name" }]);
    const order = (locale: string) =>
      sortRows(names, nameColumn, [{ columnId: "name", desc: false }], locale).map((row) => row.id);

    expect(order("sv")).toEqual(["zebra", "angel"]);
    expect(order("de")).toEqual(["angel", "zebra"]);
  });

  it("applies sorts in priority order", () => {
    expect(
      sorted([
        { columnId: "city", desc: false },
        { columnId: "age", desc: true },
      ]),
    ).toEqual([6, 2, 4, 1, 5, 3]);
  });

  it("sorts dates and option labels", () => {
    expect(sorted([{ columnId: "joined", desc: false }])).toEqual([6, 4, 2, 1, 3, 5]);
    expect(sorted([{ columnId: "status", desc: false }])).toEqual([1, 4, 6, 3, 2, 5]);
  });

  it("cycles ascending, descending, off", () => {
    const asc = toggleSorting([], "a", false);
    expect(asc).toEqual([{ columnId: "a", desc: false }]);
    const desc = toggleSorting(asc, "a", false);
    expect(desc).toEqual([{ columnId: "a", desc: true }]);
    expect(toggleSorting(desc, "a", false)).toEqual([]);
    expect(toggleSorting(desc, "b", true)).toEqual([
      { columnId: "a", desc: true },
      { columnId: "b", desc: false },
    ]);
    expect(toggleSorting(desc, "b", false)).toEqual([{ columnId: "b", desc: false }]);
  });
});

describe("pagination and virtualization", () => {
  it("clamps the page index", () => {
    const page = paginate(rows, { pageIndex: 9, pageSize: 4 }, { enabled: true, server: false });
    expect(page).toMatchObject({ pageIndex: 1, pageCount: 2, pageOffset: 4 });
    expect(ids(page.rows)).toEqual([5, 6]);
  });

  it("uses the server row count", () => {
    const page = paginate(rows.slice(0, 2), { pageIndex: 3, pageSize: 2 }, { enabled: true, server: true, rowCount: 101 });
    expect(page).toMatchObject({ pageCount: 51, pageOffset: 6, rowCount: 101 });
    expect(page.rows).toHaveLength(2);
  });

  it("computes the visible row window", () => {
    const viewport = { scrollTop: 400, scrollLeft: 0, width: 800, height: 440 };
    expect(getRowRange(viewport, 1000, 40, 40, 2)).toEqual({ start: 8, end: 22 });
  });

  it("computes the visible column window", () => {
    const many = resolveColumns<Record<string, number>>(
      Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, accessor: (row) => row[`c${i}`], width: 100 })),
    );
    const layout = computeLayout(many, {
      columnOrder: [],
      columnVisibility: {},
      columnSizing: {},
      columnPinning: { left: ["c0"], right: [] },
    });
    expect(getColumnRange(layout, { scrollTop: 0, scrollLeft: 1000, width: 500, height: 300 }, 0)).toEqual({ start: 10, end: 14 });
    expect(getColumnRange(layout, { scrollTop: 0, scrollLeft: 0, width: 0, height: 0 })).toEqual({ start: 0, end: 49 });
  });
});

describe("state", () => {
  it("seeds pinning and visibility from column definitions", () => {
    const state = createInitialState<Person>({
      data: [],
      columns: [{ field: "id", pin: "left" }, { field: "name", hidden: true }],
    });
    expect(state.columnPinning).toEqual({ left: ["id"], right: [] });
    expect(state.columnVisibility).toEqual({ name: false });
  });

  it("prefers defined controlled values", () => {
    const state = createInitialState<Person>({ data: [], columns: [] });
    expect(mergeState(state, undefined)).toBe(state);
    expect(mergeState(state, { globalFilter: undefined })).toBe(state);
    expect(mergeState(state, { globalFilter: "x" }).globalFilter).toBe("x");
  });
});

function setup(overrides: Partial<GridOptions<Person>> = {}) {
  const options: GridOptions<Person> = {
    data: people,
    columns: defs,
    getRowId: "id",
    enableRowSelection: true,
    ...overrides,
  };
  const engine = createGridEngine(options);
  const resolved = resolveColumns(options.columns);
  const state = engine.api.getState();
  const filtered = filterRows(rows, resolved, state.filters, state.globalFilter, formatters);
  const sortedRows = sortRows(filtered, resolved, state.sorting);
  const model: GridModel<Person> = {
    columns: resolved,
    coreRows: rows,
    sortedRows,
    page: paginate(sortedRows, state.pagination, { enabled: true, server: false }),
    layout: computeLayout(resolved, state),
    rowHeight: 40,
    headerHeight: 40,
    formatters,
  };
  engine.sync(options, model);
  return engine;
}

describe("engine", () => {
  it("returns to the first page and reports the query when filters change", () => {
    const onQueryChange = vi.fn();
    const engine = setup({ onQueryChange, initialState: { pagination: { pageIndex: 2, pageSize: 2 } } });

    engine.api.setFilter("city", { operator: "equals", value: "paris" });

    expect(engine.api.getState().pagination.pageIndex).toBe(0);
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ columnId: "city", operator: "equals", value: "paris" }],
        pagination: { pageIndex: 0, pageSize: 2 },
      }),
    );
  });

  it("leaves controlled state to the parent", () => {
    const onStateChange = vi.fn();
    const engine = setup({ state: { sorting: [] }, onStateChange });

    engine.api.toggleSort("name");

    expect(engine.api.getState().sorting).toEqual([]);
    expect(onStateChange.mock.calls[0][0].sorting).toEqual([{ columnId: "name", desc: false }]);
  });

  it("selects ranges and skips rows that cannot be selected", () => {
    const engine = setup({ enableRowSelection: (row) => row.id !== 3 });

    engine.api.toggleRowSelected("1");
    engine.api.toggleRowSelected("4", { range: true });
    expect(engine.api.getSelectedRowIds()).toEqual(["1", "2", "4"]);

    engine.api.toggleAllRowsSelected(true);
    expect(engine.api.getSelectedRows().map((p) => p.id)).toEqual([1, 2, 4, 5, 6]);
  });

  it("keeps one row selected in single mode", () => {
    const engine = setup({ selectionMode: "single" });
    engine.api.toggleRowSelected("1");
    engine.api.toggleRowSelected("2");
    expect(engine.api.getSelectedRowIds()).toEqual(["2"]);
  });

  it("validates edits and tracks async saves", async () => {
    let finishSave!: () => void;
    const onCellEdit = vi.fn(() => new Promise<void>((resolve) => (finishSave = resolve)));
    const engine = setup({
      columns: [
        { field: "id", type: "number" },
        { field: "name", editable: true, validate: (value) => (String(value).trim() ? null : "Required") },
      ],
      onCellEdit,
    });

    engine.api.startEditing("1", "name");
    expect(engine.store.getSnapshot().ui.editing).toEqual({ rowId: "1", columnId: "name" });

    expect(engine.commitEdit("1", "name", "  ")).toBe("Required");
    expect(engine.commitEdit("1", "name", "Alicia")).toBeNull();
    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "1", columnId: "name", value: "Alicia", previousValue: "Alice" }),
    );
    expect(engine.store.getSnapshot().ui).toMatchObject({ editing: null, pending: { "1": { name: "Alicia" } } });

    finishSave();
    await Promise.resolve();
    await Promise.resolve();
    expect(engine.store.getSnapshot().ui.pending).toEqual({});
  });
});
