import { describe, expect, it, vi } from "vitest";
import {
  buildIntentSchema,
  createGridAgent,
  createGridExecutors,
  decodeGridView,
  encodeGridView,
  GRID_OPERATIONS,
  nearest,
  projectQuery,
  resolveRelativeDate,
  type GridAgent,
} from "../agent";
import { checkSchema, createSnapshotHistory, parseQuantity } from "../../shared/core/agent";
import { computeLayout, resolveColumns } from "../core/columns";
import { filterRows } from "../core/filtering";
import { createGridEngine, type GridApi, type GridModel } from "../core/grid";
import { buildRows, createRowIdGetter, paginate } from "../core/rows";
import { sortRows } from "../core/sorting";
import type { ColumnDef, GridOptions } from "../core/types";
import { createFormatters } from "../core/values";

interface Account {
  id: number;
  name: string;
  email: string;
  region: string;
  tier: "gold" | "silver";
  revenue: number;
  churnRisk: number;
  signedUp: string;
  active: boolean;
}

const accounts: Account[] = [
  { id: 1, name: "Backwater Logistics", email: "a@x.in", region: "Kerala", tier: "gold", revenue: 4250000, churnRisk: 0.07, signedUp: "2026-09-14", active: true },
  { id: 2, name: "Spice Route", email: "b@x.in", region: "Kerala", tier: "silver", revenue: 180000, churnRisk: 0.41, signedUp: "2026-08-02", active: true },
  { id: 3, name: "Cubbon Analytics", email: "c@x.in", region: "Karnataka", tier: "gold", revenue: 9400000, churnRisk: 0.04, signedUp: "2025-03-19", active: true },
  { id: 4, name: "Hubli Transport", email: "d@x.in", region: "Karnataka", tier: "silver", revenue: 65000, churnRisk: 0.58, signedUp: "2024-05-17", active: false },
  { id: 5, name: "Marina Shipping", email: "e@x.in", region: "Tamil Nadu", tier: "gold", revenue: 1980000, churnRisk: 0.13, signedUp: "2026-09-30", active: true },
];

const columnDefs: ColumnDef<Account>[] = [
  { field: "id", type: "number" },
  { field: "name", header: "Customer" },
  { field: "email", header: "Email" },
  { field: "region", header: "Region" },
  {
    field: "tier",
    header: "Tier",
    options: [
      { label: "Gold", value: "gold" },
      { label: "Silver", value: "silver" },
    ],
  },
  { field: "revenue", type: "number", header: "Revenue" },
  { field: "churnRisk", type: "number", header: "Churn risk" },
  { field: "signedUp", type: "date", header: "Signed up" },
  { field: "active", type: "boolean", header: "Active" },
];

const SEMANTICS = {
  email: { pii: true },
  revenue: { unit: "INR", higherIsBetter: true },
  churnRisk: { percentBasis: "fraction" as const, higherIsBetter: false },
  region: { synonyms: ["state"] },
};

const NOW = new Date(2026, 9, 6); // 2026-10-06, so relative phrases are fixed.

/**
 * A grid without React: the engine, plus the model the React layer would hand
 * it after every commit. Re-synced on each store change, so selection, paging
 * and exports behave exactly as they do in the browser.
 */
function mountGrid(overrides: Partial<GridOptions<Account>> = {}) {
  const options: GridOptions<Account> = {
    data: accounts,
    columns: columnDefs,
    getRowId: "id",
    enableRowSelection: true,
    ...overrides,
  };
  const engine = createGridEngine(options);
  const columns = resolveColumns(options.columns);
  const coreRows = buildRows(options.data, createRowIdGetter(options.getRowId));
  const formatters = createFormatters("en-IN");

  const sync = () => {
    const state = engine.api.getState();
    const filtered = filterRows(coreRows, columns, state.filters, state.globalFilter, formatters);
    const sorted = sortRows(filtered, columns, state.sorting);
    const model: GridModel<Account> = {
      columns,
      coreRows,
      sortedRows: sorted,
      page: paginate(sorted, state.pagination, {
        enabled: options.enablePagination !== false,
        server: options.mode === "server",
        ...(options.rowCount !== undefined ? { rowCount: options.rowCount } : {}),
      }),
      layout: computeLayout(columns, state),
      rowHeight: 40,
      headerHeight: 40,
      formatters,
    };
    engine.sync(options, model);
  };
  sync();
  engine.store.subscribe(sync);
  return { engine, api: engine.api, options };
}

function mountAgent(
  overrides: Partial<GridOptions<Account>> = {},
  agentOverrides: Partial<Parameters<typeof createGridAgent<Account>>[0]> = {},
): { agent: GridAgent<Account>; api: GridApi<Account> } {
  const { api, options } = mountGrid(overrides);
  const agent = createGridAgent<Account>({
    api,
    options,
    semantics: SEMANTICS,
    locale: "en-IN",
    now: () => NOW,
    ...agentOverrides,
  });
  return { agent, api };
}

const column = (agent: GridAgent<Account>, id: string) =>
  agent.contract().columns.find((entry) => entry.id === id)!;

// ---------------------------------------------------------------------------

describe("runtime contract", () => {
  it("reports the grid's real columns, not an invented list", () => {
    const { agent } = mountAgent();
    const contract = agent.contract();

    expect(contract.contract).toBe("gbs.datagrid");
    expect(contract.columns.map((entry) => entry.id)).toEqual(
      columnDefs.map((def) => def.field),
    );
    expect(column(agent, "name").label).toBe("Customer");
    expect(column(agent, "revenue").type).toBe("number");
    expect(column(agent, "signedUp").type).toBe("date");
  });

  it("never carries rows, only counts and bounded summaries", () => {
    const { agent } = mountAgent();
    const serialised = JSON.stringify(agent.contract());

    for (const account of accounts) expect(serialised).not.toContain(account.email);
    expect(serialised).not.toContain("Backwater Logistics");
    expect(agent.contract().stats).toEqual({
      totalRows: 5,
      filteredRows: 5,
      pageRows: 5,
      selectedRows: 0,
    });
  });

  it("derives enum values from the live data, and bounds from numbers", () => {
    const { agent } = mountAgent();
    expect(column(agent, "region").stats).toEqual({
      kind: "string",
      distinct: 3,
      nulls: 0,
      values: ["Karnataka", "Kerala", "Tamil Nadu"],
    });
    expect(column(agent, "revenue").stats).toEqual({
      kind: "number",
      min: 65000,
      max: 9400000,
      nulls: 0,
    });
    expect(column(agent, "signedUp").stats).toEqual({
      kind: "date",
      min: "2024-05-17",
      max: "2026-09-30",
      nulls: 0,
    });
    expect(column(agent, "active").stats).toEqual({ kind: "boolean", true: 4, false: 1, nulls: 0 });
  });

  it("counts an identifier column but never lists it", () => {
    const { agent } = mountAgent();
    // Five rows, five distinct names: nothing repeats, so this is an
    // identifier rather than a category, however small the table is.
    expect(column(agent, "name").stats).toEqual({ kind: "string", distinct: 5, nulls: 0 });
  });

  it("stops listing values past the cardinality cap", () => {
    const { agent } = mountAgent({}, { maxEnumValues: 2 });
    const stats = column(agent, "region").stats;
    expect(stats).toMatchObject({ kind: "string", distinct: 3 });
    expect(stats && "values" in stats ? stats.values : undefined).toBeUndefined();
  });

  it("takes the operator set from the column's type", () => {
    const { agent } = mountAgent();
    expect(column(agent, "revenue").operators).toEqual([
      "equals", "notEquals", "gt", "gte", "lt", "lte", "between", "isEmpty", "isNotEmpty",
    ]);
    expect(column(agent, "signedUp").operators).toEqual([
      "equals", "before", "after", "between", "isEmpty", "isNotEmpty",
    ]);
    expect(column(agent, "active").operators).toEqual(["equals"]);
    // A column with fixed options is filtered by membership, and only that.
    expect(column(agent, "tier").operators).toEqual(["in", "isEmpty", "isNotEmpty"]);
    expect(column(agent, "name").operators).toContain("startsWith");
    expect(column(agent, "name").operators).not.toContain("gt");
  });

  it("withholds operations the grid has turned off", () => {
    const { agent } = mountAgent({ enableRowSelection: false, enableColumnPinning: false });
    const { operations } = agent.contract();

    expect(operations).not.toContain("selectRows");
    expect(operations).not.toContain("selectAll");
    expect(operations).not.toContain("pinColumn");
    expect(operations).toContain("filter");
  });

  it("declares nothing the grid cannot do", () => {
    const { agent } = mountAgent();
    const names = agent.contract().operations as string[];
    expect(names).not.toContain("group");
    expect(names).not.toContain("aggregate");
    expect(names).not.toContain("chart");
  });

  it("reflects the state as it changes", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "filter", column: "region", operator: "equals", value: "Kerala" });
    await agent.execute({ action: "sort", column: "revenue", direction: "desc" });

    const { state, stats } = agent.contract();
    expect(state.filters).toEqual([{ column: "region", operator: "equals", value: "Kerala" }]);
    expect(state.sorting).toEqual([{ column: "revenue", direction: "desc" }]);
    expect(stats.filteredRows).toBe(2);
    expect(state.canUndo).toBe(true);
  });

  it("marks a column the host restricted, and summarises it never", () => {
    const { agent } = mountAgent();
    const email = column(agent, "email");
    expect(email.restricted).toBe("policy");
    expect(email.filterable).toBe(false);
    expect(email.operators).toEqual([]);
    expect(email.stats).toBeUndefined();
  });

  it("admits what it cannot know in server mode", () => {
    const { agent } = mountAgent({ mode: "server", rowCount: 9310 });
    expect(agent.contract().stats).toMatchObject({ totalRows: 9310, filteredRows: null });
  });
});

describe("generated intent schema", () => {
  it("is byte-identical for the same contract", () => {
    const a = mountAgent().agent;
    const b = mountAgent().agent;
    expect(JSON.stringify(a.schema())).toBe(JSON.stringify(b.schema()));
    expect(JSON.stringify(buildIntentSchema(a.contract()).schema)).toBe(JSON.stringify(a.schema()));
  });

  it("pins the column ids of this instance", () => {
    const { agent } = mountAgent();
    const sort = buildIntentSchema(agent.contract()).byAction.get("sort");
    expect(sort?.properties?.column?.enum).toEqual([
      "id", "name", "region", "tier", "revenue", "churnRisk", "signedUp", "active",
    ]);
  });

  it("couples the operator set to the column, so an illegal pair cannot be written", () => {
    const { agent } = mountAgent();
    const schema = agent.schema();

    expect(checkSchema(
      { action: "filter", column: "revenue", operator: "gt", value: 100000 },
      schema,
    )).toEqual([]);
    expect(checkSchema(
      { action: "filter", column: "revenue", operator: "startsWith", value: "1" },
      schema,
    )).not.toEqual([]);
    expect(checkSchema(
      { action: "filter", column: "name", operator: "startsWith", value: "Back" },
      schema,
    )).toEqual([]);
  });

  it("bounds the page index by the instance's page count", () => {
    const { agent } = mountAgent({ initialState: { pagination: { pageIndex: 0, pageSize: 2 } } });
    const setPage = buildIntentSchema(agent.contract()).byAction.get("setPage");
    expect(setPage?.properties?.index).toMatchObject({ minimum: 0, maximum: 2 });
  });

  it("offers only the export formats policy allows", () => {
    const { agent } = mountAgent({}, { policy: { allowExportFormats: ["csv"] } });
    const exportBranch = buildIntentSchema(agent.contract()).byAction.get("export");
    expect(exportBranch?.properties?.format?.enum).toEqual(["csv"]);
  });
});

describe("validation", () => {
  const reject = (agent: GridAgent<Account>, intent: unknown) => {
    const result = agent.validate(intent);
    if (result.status !== "rejected") throw new Error(`expected a rejection, got ${result.status}`);
    return result;
  };

  it("names the column it could not find, and guesses", () => {
    const { agent } = mountAgent();
    const result = reject(agent, { action: "filter", column: "revenu", operator: "gt", value: 1 });
    expect(result).toMatchObject({ layer: "reference", code: "unknown-column" });
    expect(result.suggestion).toContain("revenue");
  });

  it("resolves a column named by a synonym when suggesting", () => {
    const { agent } = mountAgent();
    const result = reject(agent, { action: "sort", column: "state", direction: "asc" });
    expect(result.suggestion).toContain("region");
  });

  it("refuses an operator the column's type does not support", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "filter", column: "revenue", operator: "contains", value: "1" }).layer)
      .toBe("schema");
  });

  it("refuses an operation the grid has turned off", () => {
    const { agent } = mountAgent({ enableRowSelection: false });
    expect(reject(agent, { action: "selectAll" })).toMatchObject({ code: "operation-unavailable" });
  });

  it("refuses an operation policy withholds", () => {
    const { agent } = mountAgent({}, { policy: { denyOperations: ["export"] } });
    expect(reject(agent, { action: "export", format: "csv" })).toMatchObject({
      layer: "policy",
      code: "operation-denied",
    });
  });

  it("refuses a restricted column with the reason, not a schema error", () => {
    const { agent } = mountAgent();
    const result = reject(agent, { action: "filter", column: "email", operator: "contains", value: "x" });
    expect(result).toMatchObject({ layer: "policy", code: "not-filterable" });
    expect(result.suggestion).toContain("restricted");
  });

  it("refuses an unknown action, and guesses", () => {
    const { agent } = mountAgent();
    const result = reject(agent, { action: "sortBy", column: "revenue" });
    expect(result.code).toBe("unknown-operation");
    expect(result.suggestion).toContain("sort");
  });

  it("refuses rows that are not in the grid", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "selectRows", rowIds: ["1", "999"] })).toMatchObject({
      code: "unknown-rows",
    });
  });

  it("refuses an option the column does not have", () => {
    const { agent } = mountAgent();
    const result = reject(agent, { action: "filter", column: "tier", operator: "in", value: ["platinum"] });
    expect(result).toMatchObject({ layer: "reference", code: "unknown-option" });
  });

  it("refuses an unparseable value for a typed column", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "filter", column: "revenue", operator: "gt", value: "lots" }))
      .toMatchObject({ layer: "coercion", code: "not-a-number" });
    expect(reject(agent, { action: "filter", column: "signedUp", operator: "after", value: "soonish" }))
      .toMatchObject({ layer: "coercion", code: "not-a-date" });
  });

  it("refuses a between with no upper bound", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "filter", column: "revenue", operator: "between", value: 1 }))
      .toMatchObject({ code: "missing-value2" });
  });

  it("refuses to move a column relative to itself", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "moveColumn", column: "name", target: "name", placement: "after" }))
      .toMatchObject({ code: "same-column" });
  });

  it("refuses an export of a selection that does not exist", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "export", format: "csv", scope: "selected" }))
      .toMatchObject({ code: "nothing-selected" });
  });

  it("refuses an export beyond the row cap", () => {
    const { agent } = mountAgent({}, { policy: { maxExportRows: 2 } });
    expect(reject(agent, { action: "export", format: "csv" })).toMatchObject({
      layer: "policy",
      code: "export-too-large",
    });
  });

  it("refuses an undo when there is nothing to undo", () => {
    const { agent } = mountAgent();
    expect(reject(agent, { action: "undo" })).toMatchObject({ code: "nothing-to-undo" });
  });
});

describe("coercion", () => {
  const warningsOf = (agent: GridAgent<Account>, intent: unknown) => {
    const result = agent.validate(intent);
    if (result.status !== "done" && result.status !== "needs-confirmation") {
      throw new Error(`expected a command, got ${result.status}`);
    }
    return result;
  };

  it("reads written scales, and says so", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "revenue", operator: "gt", value: "1 lakh",
    });
    expect(result.commands[0].intent).toEqual({
      action: "filter", column: "revenue", operator: "gt", value: 100000,
    });
    expect(result.warnings.map((w) => w.code)).toContain("scale-applied");
  });

  it("converts a percentage into the basis the column stores", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "churnRisk", operator: "gt", value: "40%",
    });
    expect(result.commands[0].intent).toMatchObject({ value: 0.4 });
    expect(result.warnings.map((w) => w.code)).toContain("percent-converted");
  });

  it("assumes the stored basis for a bare number, and warns that it did", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "churnRisk", operator: "gt", value: 40,
    });
    expect(result.commands[0].intent).toMatchObject({ value: 0.4 });
    expect(result.warnings.map((w) => w.code)).toContain("percent-basis-assumed");
  });

  it("widens a relative phrase that names a span into a range", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "signedUp", operator: "equals", value: "last month",
    });
    expect(result.commands[0].intent).toEqual({
      action: "filter", column: "signedUp", operator: "between",
      value: "2026-09-01", value2: "2026-09-30",
    });
  });

  it("matches an option by its label, whatever the case", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "tier", operator: "in", value: ["GOLD"],
    });
    expect(result.commands[0].intent).toMatchObject({ value: ["gold"] });
    expect(result.warnings.map((w) => w.code)).toContain("option-normalised");
  });

  it("corrects the case of a value the data really has", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "region", operator: "equals", value: "kerala",
    });
    expect(result.commands[0].intent).toMatchObject({ value: "Kerala" });
    expect(result.warnings.map((w) => w.code)).toContain("case-normalised");
  });

  it("notes a currency that is not the column's, and converts nothing", () => {
    const { agent } = mountAgent();
    const result = warningsOf(agent, {
      action: "filter", column: "revenue", operator: "gt", value: "$2000",
    });
    expect(result.commands[0].intent).toMatchObject({ value: 2000 });
    expect(result.warnings.map((w) => w.code)).toContain("currency-mismatch");
  });

  it("reads a quantity written in words", () => {
    // The coercion layer exists so a model never has to do this arithmetic,
    // and the prompt tells it to pass the words through untouched.
    expect(parseQuantity("one crore")).toMatchObject({ value: 10000000, scale: "crore" });
    expect(parseQuantity("ten lakh")).toMatchObject({ value: 1000000 });
    expect(parseQuantity("five hundred")).toMatchObject({ value: 500 });
    expect(parseQuantity("twenty five lakh")).toMatchObject({ value: 2500000 });
    expect(parseQuantity("twenty-five")).toMatchObject({ value: 25 });
    expect(parseQuantity("ninety nine")).toMatchObject({ value: 99 });
    expect(parseQuantity("twenty percent")).toMatchObject({ value: 20, percent: true });
    expect(parseQuantity("zero")).toMatchObject({ value: 0 });
    // An article is not a number: reading junk as 1 is worse than refusing it.
    expect(parseQuantity("a squillion")).toBeNull();
    expect(parseQuantity("a crore")).toBeNull();
  });

  it("reads written quantities the same way every time", () => {
    expect(parseQuantity("1 lakh")).toMatchObject({ value: 100000, scale: "lakh" });
    expect(parseQuantity("2 crore")).toMatchObject({ value: 20000000 });
    expect(parseQuantity("₹1,00,000")).toMatchObject({ value: 100000, currency: "INR" });
    expect(parseQuantity("1.5k")).toMatchObject({ value: 1500 });
    expect(parseQuantity("(2,400)")).toMatchObject({ value: -2400 });
    expect(parseQuantity("20%")).toMatchObject({ value: 20, percent: true });
    expect(parseQuantity("rs.50000")).toMatchObject({ value: 50000, currency: "INR" });
    expect(parseQuantity("lots")).toBeNull();
    expect(parseQuantity("1.2.3")).toBeNull();
  });

  it("resolves only the relative phrases it documents", () => {
    expect(resolveRelativeDate("today", NOW)).toEqual({ from: "2026-10-06", to: "2026-10-06", single: true });
    expect(resolveRelativeDate("last quarter", NOW)).toEqual({ from: "2026-07-01", to: "2026-09-30", single: false });
    expect(resolveRelativeDate("last 30 days", NOW)).toEqual({ from: "2026-09-06", to: "2026-10-06", single: false });
    expect(resolveRelativeDate("last year", NOW)).toEqual({ from: "2025-01-01", to: "2025-12-31", single: false });
    expect(resolveRelativeDate("around diwali", NOW)).toBeNull();
  });

  it("finds the nearest name, or admits it cannot", () => {
    expect(nearest("revenu", ["revenue", "region"])).toBe("revenue");
    expect(nearest("zzzzzzzzzz", ["revenue", "region"])).toBeNull();
  });
});

describe("plausibility", () => {
  it("counts the rows a filter would leave, without running it", () => {
    const { agent, api } = mountAgent();
    const result = agent.validate({ action: "filter", column: "region", operator: "equals", value: "Kerala" });
    if (result.status !== "done" && result.status !== "needs-confirmation") {
      throw new Error(`expected a command, got ${result.status}`);
    }

    expect(result.commands[0].explain).toMatchObject({
      summary: "Filter Region is Kerala",
      affectedRows: 2,
      currentRows: 5,
    });
    expect(api.getState().filters).toEqual([]);
  });

  it("warns when nothing would be left", () => {
    const { agent } = mountAgent();
    const result = agent.validate({ action: "filter", column: "revenue", operator: "gt", value: "10 crore" });
    if (result.status !== "done" && result.status !== "needs-confirmation") {
      throw new Error(`expected a command, got ${result.status}`);
    }
    expect(result.warnings.map((w) => w.code)).toContain("empty-result");
  });

  it("warns when a filter changes nothing", () => {
    const { agent } = mountAgent();
    const result = agent.validate({ action: "filter", column: "revenue", operator: "gt", value: 1 });
    if (result.status !== "done" && result.status !== "needs-confirmation") {
      throw new Error(`expected a command, got ${result.status}`);
    }
    expect(result.warnings.map((w) => w.code)).toContain("no-op");
  });

  it("asks before an export large enough to be a surprise", () => {
    const { agent } = mountAgent({}, { policy: { confirmExportRows: 3 } });
    const result = agent.validate({ action: "export", format: "csv" });
    expect(result.status).toBe("needs-confirmation");
    if (result.status !== "needs-confirmation") return;
    expect(result.confirm).toMatchObject({ code: "large-export" });
  });

  it("asks before anything that cannot be undone", () => {
    const { agent } = mountAgent();
    const result = agent.validate({ action: "export", format: "csv" });
    expect(result.status).toBe("needs-confirmation");
  });

  it("counts a batch together, not one filter at a time", () => {
    const { agent } = mountAgent();
    const result = agent.validate([
      { action: "filter", column: "region", operator: "equals", value: "Kerala" },
      { action: "filter", column: "revenue", operator: "gt", value: "10 lakh" },
    ]);
    if (result.status !== "done" && result.status !== "needs-confirmation") {
      throw new Error(`expected a command, got ${result.status}`);
    }
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].explain.affectedRows).toBe(1);
  });

  it("projects a query without touching the grid", () => {
    expect(projectQuery({ filters: [], globalFilter: "" }, { action: "search", text: "kochi" }))
      .toEqual({ filters: [], globalFilter: "kochi" });
    expect(
      projectQuery(
        { filters: [{ columnId: "a", operator: "equals", value: 1 }], globalFilter: "x" },
        { action: "clearFilters" },
      ),
    ).toEqual({ filters: [], globalFilter: "" });
  });
});

describe("execution", () => {
  it("only ever calls methods the grid really has", () => {
    const { api } = mountGrid();
    const executors = createGridExecutors(api, { undo: () => true, redo: () => true });

    for (const [name, executor] of executors) {
      if (!executor.apiMethod) continue;
      expect(typeof (api as unknown as Record<string, unknown>)[executor.apiMethod]).toBe("function");
      expect(GRID_OPERATIONS[name].apiMethod).toBe(executor.apiMethod);
    }
  });

  it("has an executor for every operation it declares", () => {
    const { api } = mountGrid();
    const executors = createGridExecutors(api, { undo: () => true, redo: () => true });
    for (const name of Object.keys(GRID_OPERATIONS)) expect(executors.has(name as never)).toBe(true);
  });

  it("leaves undo and redo without an apiMethod, because the grid has none", () => {
    expect(GRID_OPERATIONS.undo.apiMethod).toBeUndefined();
    expect(GRID_OPERATIONS.redo.apiMethod).toBeUndefined();
    expect(GRID_OPERATIONS.export.apiMethod).toBeUndefined();
  });

  it("applies a validated command to the grid", async () => {
    const { agent, api } = mountAgent();
    const result = await agent.execute({
      action: "filter", column: "revenue", operator: "gte", value: "19 lakh",
    });

    expect(result.status).toBe("done");
    expect(api.getState().filters).toEqual([
      { columnId: "revenue", operator: "gte", value: 1900000 },
    ]);
  });

  it("will not run something that needs confirmation until it is given", async () => {
    const exportCsv = vi.fn(async () => {});
    const { api, options } = mountGrid();
    const agent = createGridAgent<Account>({
      api: { ...api, exportCsv },
      options,
      semantics: SEMANTICS,
      now: () => NOW,
    });

    expect((await agent.execute({ action: "export", format: "csv" })).status).toBe("needs-confirmation");
    expect(exportCsv).not.toHaveBeenCalled();

    const confirmed = await agent.execute({ action: "export", format: "csv" }, { confirm: true });
    expect(confirmed.status).toBe("done");
    expect(exportCsv).toHaveBeenCalledWith({ scope: "filtered" });
  });

  it("changes nothing when validation fails", async () => {
    const { agent, api } = mountAgent();
    const before = api.getState();
    const result = await agent.execute({ action: "filter", column: "nope", operator: "gt", value: 1 });
    expect(result.status).toBe("rejected");
    expect(api.getState()).toBe(before);
  });

  it("appends to the sort rather than replacing it, when asked", async () => {
    const { agent, api } = mountAgent();
    await agent.execute({ action: "sort", column: "region", direction: "asc" });
    await agent.execute({ action: "sort", column: "revenue", direction: "desc", append: true });
    expect(api.getState().sorting).toEqual([
      { columnId: "region", desc: false },
      { columnId: "revenue", desc: true },
    ]);
  });

  it("runs a batch as one step", async () => {
    const { agent, api } = mountAgent();
    await agent.execute([
      { action: "filter", column: "region", operator: "equals", value: "Kerala" },
      { action: "sort", column: "revenue", direction: "desc" },
    ]);
    expect(api.getState().filters).toHaveLength(1);
    expect(agent.history()).toHaveLength(1);
  });
});

describe("history", () => {
  it("restores the exact state a command replaced", async () => {
    const { agent, api } = mountAgent();
    const before = api.getState();

    await agent.execute({ action: "filter", column: "region", operator: "equals", value: "Kerala" });
    const after = api.getState();
    expect(after).not.toBe(before);

    expect(agent.undo()).toBe(true);
    expect(api.getState()).toEqual(before);
    expect(agent.redo()).toBe(true);
    expect(api.getState()).toEqual(after);
  });

  it("undoes a batch in one step", async () => {
    const { agent, api } = mountAgent();
    const before = api.getState();
    await agent.execute([
      { action: "filter", column: "region", operator: "equals", value: "Kerala" },
      { action: "sort", column: "revenue", direction: "desc" },
    ]);
    agent.undo();
    expect(api.getState()).toEqual(before);
  });

  it("works through the undo operation as well as the method", async () => {
    const { agent, api } = mountAgent();
    const before = api.getState();
    await agent.execute({ action: "search", text: "kerala" });
    await agent.execute({ action: "undo" });
    expect(api.getState()).toEqual(before);
    expect(agent.history()).toHaveLength(1);
  });

  it("refuses undo mixed into a batch", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "search", text: "x" });
    const result = agent.validate([{ action: "undo" }, { action: "clearFilters" }]);
    expect(result).toMatchObject({ status: "rejected", code: "history-in-batch" });
  });

  it("records nothing for an operation that changed nothing", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "clearFilters" });
    expect(agent.history()).toHaveLength(0);
  });

  it("drops the redo branch once a new command lands", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "search", text: "kerala" });
    agent.undo();
    await agent.execute({ action: "search", text: "kochi" });
    expect(agent.canRedo()).toBe(false);
    expect(agent.history()).toHaveLength(1);
  });

  it("labels each entry for an audit trail", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "filter", column: "revenue", operator: "gt", value: "1 lakh" });
    const label = agent.history()[0].label;
    expect(label).toContain("Filter Revenue greater than");
    expect(label).toContain("1,00,000");
  });

  it("keeps at most the configured depth", () => {
    let state = 0;
    const history = createSnapshotHistory<number>({
      read: () => state,
      write: (value) => { state = value; },
      limit: 2,
      now: () => 0,
    });
    for (let i = 1; i <= 5; i++) history.record(`set ${i}`, () => { state = i; });
    expect(history.entries().map((entry) => entry.label)).toEqual(["set 4", "set 5"]);
  });
});

describe("saved views", () => {
  it("round-trips a view through a URL-safe string", async () => {
    const { agent } = mountAgent();
    await agent.execute({ action: "filter", column: "region", operator: "equals", value: "Kerala" });
    const view = agent.saveView("Kerala accounts");

    const encoded = encodeGridView(view);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeGridView(encoded)).toEqual(view);
    expect(decodeGridView("not a view")).toBeNull();
  });

  it("applies a saved view, and undoes it", async () => {
    const { agent, api } = mountAgent();
    await agent.execute({ action: "filter", column: "region", operator: "equals", value: "Kerala" });
    const saved = agent.saveView("Kerala accounts");

    await agent.execute({ action: "clearFilters" });
    expect(api.getState().filters).toEqual([]);

    agent.applyView(saved);
    expect(api.getState().filters).toEqual(saved.state.filters);
    expect(agent.history().at(-1)?.label).toBe('Apply view "Kerala accounts"');
  });
});
