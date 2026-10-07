/*
 * The smallest grid the browser needs in order to reach the real validator.
 *
 * `tools/eval/harness.ts` does this for Node, but it reads the fixture with
 * `node:fs`, which a browser cannot. So this is the same construction with the
 * fixture handed in instead of read. Everything it builds — the engine, the
 * contract, the agent, the five validation layers — is the production code,
 * imported from `source/`. Nothing is reimplemented.
 *
 * The probe only needs `agent.respond()`, to prove the browser pipeline
 * reaches the same validator boundary the Node run reached.
 */

import { computeLayout, resolveColumns } from "../../../source/beta-components/data-grid/core/columns";
import { filterRows } from "../../../source/beta-components/data-grid/core/filtering";
import {
  createGridEngine,
  type GridModel,
} from "../../../source/beta-components/data-grid/core/grid";
import { buildRows, createRowIdGetter, paginate } from "../../../source/beta-components/data-grid/core/rows";
import { sortRows } from "../../../source/beta-components/data-grid/core/sorting";
import type { ColumnDef, GridOptions } from "../../../source/beta-components/data-grid/core/types";
import { createFormatters } from "../../../source/beta-components/data-grid/core/values";
import {
  createGridAgent,
  type GridAgent,
  type GridAgentPolicy,
  type GridColumnSemantics,
} from "../../../source/beta-components/data-grid/agent";

type Row = Record<string, string | number | boolean>;

export interface Fixture {
  today: string;
  locale: string;
  getRowId: string;
  columns: ColumnDef<Row>[];
  semantics: Record<string, GridColumnSemantics>;
  policy: GridAgentPolicy;
  rows: Row[];
}

export function mountInBrowser(fixture: Fixture): GridAgent<Row> {
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
  return createGridAgent<Row>({
    api: engine.api,
    options,
    semantics: fixture.semantics,
    policy: fixture.policy,
    locale: fixture.locale,
    now: () => new Date(year, month - 1, day),
  });
}
