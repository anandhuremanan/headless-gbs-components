/*
 * Mounts the grid described by `eval/grid/v0/fixture.json` without a browser.
 *
 * The corpus is written against one specific grid — specific columns, specific
 * semantics, specific policy — because an utterance only means something
 * against a particular table. "Show the worst performers" is a sort on churn
 * risk here and would be a sort on something else elsewhere; the fixture is
 * what makes the case checkable rather than a matter of opinion.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeLayout, resolveColumns } from "../../source/beta-components/data-grid/core/columns";
import { filterRows } from "../../source/beta-components/data-grid/core/filtering";
import { createGridEngine, type GridApi, type GridModel } from "../../source/beta-components/data-grid/core/grid";
import { buildRows, createRowIdGetter, paginate } from "../../source/beta-components/data-grid/core/rows";
import { sortRows } from "../../source/beta-components/data-grid/core/sorting";
import type { ColumnDef, GridOptions } from "../../source/beta-components/data-grid/core/types";
import { createFormatters } from "../../source/beta-components/data-grid/core/values";
import {
  createGridAgent,
  type GridAgent,
  type GridAgentPolicy,
  type GridColumnSemantics,
} from "../../source/beta-components/data-grid/agent";

export type Row = Record<string, string | number | boolean>;

export interface Fixture {
  today: string;
  locale: string;
  getRowId: string;
  columns: ColumnDef<Row>[];
  semantics: Record<string, GridColumnSemantics>;
  policy: GridAgentPolicy;
  rows: Row[];
}

const here = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export const FIXTURE_PATH = here("../../eval/grid/v0/fixture.json");
export const CASES_PATH = here("../../eval/grid/v0/cases.jsonl");

export const loadFixture = (): Fixture =>
  JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Fixture;

export interface EvalCase {
  id: string;
  category: string;
  utterance: string;
  /** What should happen when a caller sends `intents`. */
  expect: "accept" | "reject" | "ambiguous";
  intents: unknown[];
  /** Run first, so the case starts from a realistic state. */
  setup?: unknown[];
  /** For `reject`: the validation code that must come back. */
  code?: string;
  /** For `ambiguous`: other readings that are also defensible. */
  alternatives?: unknown[][];
  /** For `accept`: the command must come back needing confirmation. */
  confirm?: boolean;
  note?: string;
}

export function loadCases(): EvalCase[] {
  return readFileSync(CASES_PATH, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//"))
    .map((line, index) => {
      try {
        return JSON.parse(line) as EvalCase;
      } catch (error) {
        throw new Error(`cases.jsonl line ${index + 1} is not valid JSON: ${(error as Error).message}`);
      }
    });
}

/** A live grid plus its agent, in the state the fixture describes. */
export function mount(fixture: Fixture = loadFixture()): { agent: GridAgent<Row>; api: GridApi<Row> } {
  const options: GridOptions<Row> = {
    data: fixture.rows,
    columns: fixture.columns,
    getRowId: fixture.getRowId as Extract<keyof Row, string>,
    enableRowSelection: true,
  };

  const engine = createGridEngine(options);
  const columns = resolveColumns(options.columns);
  const coreRows = buildRows(options.data, createRowIdGetter(options.getRowId));
  const formatters = createFormatters(fixture.locale);

  const sync = () => {
    const state = engine.api.getState();
    const filtered = filterRows(coreRows, columns, state.filters, state.globalFilter, formatters);
    const sorted = sortRows(filtered, columns, state.sorting, fixture.locale);
    const model: GridModel<Row> = {
      columns,
      coreRows,
      sortedRows: sorted,
      page: paginate(sorted, state.pagination, { enabled: true, server: false }),
      layout: computeLayout(columns, state),
      rowHeight: 40,
      headerHeight: 40,
      formatters,
    };
    engine.sync(options, model);
  };
  sync();
  engine.store.subscribe(sync);

  const [year, month, day] = fixture.today.split("-").map(Number);
  const agent = createGridAgent<Row>({
    api: engine.api,
    options,
    semantics: fixture.semantics,
    policy: fixture.policy,
    locale: fixture.locale,
    now: () => new Date(year, month - 1, day),
  });

  return { agent, api: engine.api };
}
