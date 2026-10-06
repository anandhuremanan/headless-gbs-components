/*
 * Mounts the grid described by `eval/grid/v0/fixture.json` without a browser.
 *
 * The corpus is written against one specific grid — specific columns, specific
 * semantics, specific policy — because an utterance only means something
 * against a particular table. "Show the worst performers" is a sort on churn
 * risk here and would be a sort on something else elsewhere; the fixture is
 * what makes the case checkable rather than a matter of opinion.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

/*
 * Walk up for the directory that holds both the library and the corpus. The
 * harness runs from two places with different working directories — vitest
 * rooted in demo-showroom, and the evaluation CLI rooted at the repository —
 * and `import.meta` is unavailable in the second, because the CLI loads this
 * file through the CommonJS TypeScript hook.
 */
function repoRoot(): string {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "source", "beta-components")) && existsSync(join(dir, "eval", "grid"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate the repository root from " + process.cwd());
}

export const ROOT = repoRoot();
export const FIXTURE_PATH = join(ROOT, "eval", "grid", "v0", "fixture.json");
export const CASES_PATH = join(ROOT, "eval", "grid", "v0", "cases.jsonl");

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

export interface MountOptions {
  /**
   * Wrap the imperative API before the agent is built. The evaluation harness
   * uses this to record `export`, `print` and `copy` instead of performing
   * them — those reach for `document` and a download, neither of which exists
   * in Node. Nothing else is substituted: the contract, the validator, the
   * coercion and every state-changing executor are the production ones.
   */
  wrapApi?(api: GridApi<Row>): GridApi<Row>;
}

/** A live grid plus its agent, in the state the fixture describes. */
export function mount(
  fixture: Fixture = loadFixture(),
  mountOptions: MountOptions = {},
): { agent: GridAgent<Row>; api: GridApi<Row> } {
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

  const api = mountOptions.wrapApi ? mountOptions.wrapApi(engine.api) : engine.api;

  const [year, month, day] = fixture.today.split("-").map(Number);
  const agent = createGridAgent<Row>({
    api,
    options,
    semantics: fixture.semantics,
    policy: fixture.policy,
    locale: fixture.locale,
    now: () => new Date(year, month - 1, day),
  });

  return { agent, api };
}
