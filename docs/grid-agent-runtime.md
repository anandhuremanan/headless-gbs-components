# The DataGrid agent runtime

```
live DataGrid  →  runtime contract  →  validated command  →  executor  →  new GridState
```

No model appears anywhere in that line. Everything here works with a form, a
keyboard shortcut or a bookmark as the caller, and it ships four features that
have nothing to do with AI: **saved views, shareable URLs, an audit trail and
undo across every operation the grid has.** A model, when one is added, plugs
into the front — it produces the intent, and the five validation layers treat
it exactly as they treat any other untrusted input.

This is Phase 2 of the agent-native work. Phase 1 (`docs/component-passport.md`)
described what a component *is*. This describes what one instance of it *can
do, right now*, and how to make it do it safely.

## The four things, kept apart

They change for different reasons, so they are different objects:

| | Answers | Lives | Changes when |
| --- | --- | --- | --- |
| **Passport** | what DataGrid knows how to do | `passport.json`, build time | the source changes |
| **Runtime contract** | what *this instance* can do | memory, per render | state or props change |
| **Intent** | what the caller is asking for | the wire | every request |
| **Executor** | how *this application* performs it | your code | you swap it |

The separation is not tidiness. Later, `Passport → A2UI`, `Passport + runtime
contract → a model's prompt and schema`, and `Intent → validator → executor`
all have to evolve independently; collapsed into one object they could not.

## Getting started

```tsx
import { DataGrid, createGridAgent, type GridApi } from "@/components/data-grid";

const options = { data, columns, getRowId: "id", enableRowSelection: true } as const;
const grid = useRef<GridApi<Customer>>(null);

const agent = useMemo(
  () =>
    createGridAgent({
      api: grid.current!,
      options,
      locale: "en-IN",
      semantics: {
        revenue: { unit: "INR", higherIsBetter: true, synonyms: ["arr", "sales"] },
        churnRisk: { percentBasis: "fraction", higherIsBetter: false },
        email: { pii: true },
      },
      policy: { confirmExportRows: 5000, maxSelectRows: 500 },
    }),
  [],
);

// Hand it this render's props when data, columns or feature flags change.
useEffect(() => agent.update(options));

<DataGrid {...options} ref={grid} />;
```

`options` is the same object you give `<DataGrid>` — data, columns and the
feature flags. The agent reads capabilities from it rather than being told them
twice.

Then:

```ts
const result = agent.validate({
  action: "filter", column: "revenue", operator: "gt", value: "1 lakh",
});

// { status: "done",
//   commands: [{ operation: "filter",
//                intent: { action: "filter", column: "revenue", operator: "gt", value: 100000 },
//                explain: { summary: "Filter Revenue greater than ₹1,00,000",
//                           interpretation: "revenue gt 100000",
//                           affectedRows: 1842, currentRows: 9310 } }],
//   warnings: [{ layer: "coercion", code: "scale-applied", message: 'Read "1 lakh" as 100000.' }] }

await agent.execute(result.commands[0].intent);
```

`validate` changes nothing, so it is also the confirmation preview: `explain`
carries everything a dialog needs.

## The runtime contract

`agent.contract()` returns, for this instance:

```jsonc
{
  "contract": "gbs.datagrid",
  "contractVersion": "1.0.0",
  "component": "DataGrid",
  "instanceId": "dg-1puyu5b",
  "capabilities": { "mode": "client", "sorting": true, "multiSort": true, "selection": true,
                    "selectionMode": "multiple", "columnPinning": true, "editing": false,
                    "exportFormats": ["csv", "excel", "pdf"], "undo": true /* … */ },
  "columns": [
    { "id": "revenue", "label": "Revenue", "type": "number",
      "visible": true, "pinned": null, "sortable": true, "filterable": true,
      "operators": ["equals", "notEquals", "gt", "gte", "lt", "lte", "between",
                    "isEmpty", "isNotEmpty"],
      "unit": "INR", "higherIsBetter": true,
      "stats": { "kind": "number", "min": 65000, "max": 45000000, "nulls": 0 } }
  ],
  "operations": ["search", "filter", "sort", /* … */ "undo", "redo"],
  "state": { "sorting": [], "filters": [], "search": "", "page": { "index": 0, "size": 50, "count": 1 },
             "selection": { "count": 0, "all": false }, "canUndo": false, "canRedo": false /* … */ },
  "stats": { "totalRows": 9310, "filteredRows": 1842, "pageRows": 50, "selectedRows": 0 }
}
```

Three rules it holds to:

**No rows, ever.** Counts and bounded summaries only. A contract is the thing
most likely to be handed to a model, and rows are the thing most likely to be
regretted.

**Nothing invented.** Every capability traces to a grid option or a resolved
column flag. There is no `grouping` because there is no grouping.

**Effective, not nominal.** Policy is applied here, so a column the host
restricted reports `filterable: false`, `operators: []` and `restricted:
"policy"`, and carries no summary.

### Column summaries, and the identifier rule

`stats` is on by default (`stats: false` turns it off). String columns get
their distinct values listed, because that is what stops a model inventing a
region that does not exist — but only when **some value repeats**. A column
with as many distinct values as there are rows is an identifier, not a
category, and listing it would be publishing the data. In a five-row table
every column looks low-cardinality; this rule is what keeps that from leaking.
`maxEnumValues` (default 20) caps the rest.

### Server mode

`totalRows` comes from `rowCount` and `filteredRows` is `null`: the client holds
one page, so any count would be a guess. Plausibility checks that need a count
are skipped rather than estimated.

## The generated intent schema

`agent.schema()` is a JSON Schema for one operation **on this instance**. Give
it to a constrained decoder and a model physically cannot emit an invalid
combination; give it to the validator and the same rule is enforced again,
because a schema that only lives in the decoder is one you are trusting someone
else to run.

The point is the filter branches — one per filterable column, each with that
column's own operator set:

```jsonc
{ "type": "object", "additionalProperties": false,
  "required": ["action", "column", "operator"],
  "properties": {
    "action":   { "const": "filter" },
    "column":   { "const": "revenue" },
    "operator": { "enum": ["equals", "notEquals", "gt", "gte", "lt", "lte",
                           "between", "isEmpty", "isNotEmpty"] },
    "value": { /* … */ } } }
```

`startsWith` on a number column is not rejected — it is unrepresentable.

What is strict and what is not:

| strict | permissive |
| --- | --- |
| action names, column ids, operator sets per column, export formats, densities, placements, page bounds | the *values* people write: `"1 lakh"`, `"20%"`, `"kerala"` |

Values stay loose on purpose. Narrowing them in the schema would reject the
input before the coercion layer saw it, and coercion is where `"1 lakh"` becomes
`100000` deterministically instead of a model guessing.

Generation is deterministic: the same contract always produces byte-identical
JSON.

**One caveat if you validate against a passport instead.** `checkSchema` turns
a schema's `pattern` into a `RegExp`, and a hostile pattern is a denial of
service. The intent schema above is generated from the live contract and never
carries one. A passport's `operations[].input` is authored text that may travel
with an installed component — so if you are tempted to write
`checkSchema(intent, passport.operations.filter.input)`, strip `pattern` first,
or use the generated schema, which is the one the validator uses anyway. See
the *Trust* section of `docs/component-passport.md`.

## The five layers

| Layer | Asks | Example refusal |
| --- | --- | --- |
| 1 schema | is this a shape this instance accepts? | `enum` — `startsWith` is not an operator for Revenue |
| 2 reference | do the column, option and rows it names exist? | `unknown-column` — "there is no column `revenu`. Did you mean `revenue`?" |
| 3 coercion | what do its values mean? | `not-a-number` — Revenue is a number, and "lots" is not one |
| 4 policy | is it allowed? | `not-filterable` — Email is restricted by the application |
| 5 plausibility | does the result look like what was meant? | `empty-result` (warning), `export-too-large` (refusal) |

A failure stops there; later layers would only add noise about a dead command.
The layer a check belongs to is a property of the check, not of when it runs —
a couple of reference and policy checks run *before* the schema, because
"Email cannot be filtered" is a better message than "matched no branch", and
the schema would only have said the latter.

Result shape:

```ts
{ status: "done",                commands, warnings, state }
{ status: "needs-confirmation",  commands, warnings, confirm: { code, message } }
{ status: "rejected",            reason, code, layer, suggestion?, issues }
```

Nothing that failed validation ever runs.

### Coercion, in detail

Deterministic code, with a test for every form it claims to read:

| Written | Read as | Note |
| --- | --- | --- |
| `1 lakh`, `2 crore`, `1.5 cr`, `500k`, `2 million` | 100000, 20000000, 15000000, 500000, 2000000 | `scale-applied` |
| `₹1,00,000`, `Rs 25,00,000` | 100000, 2500000 | Indian grouping needs no special case |
| `(2,400)` | −2400 | accountants' parentheses |
| `$2000` on an INR column | 2000, **unconverted** | `currency-mismatch` — no exchange rate is invented |
| `40%` on `percentBasis: "fraction"` | 0.4 | `percent-converted` |
| `50` on `percentBasis: "fraction"` | 0.5 | `percent-basis-assumed` — the guess is reported |
| `20%` on `percentBasis: "whole"` | 20 | stored as written |
| `last month` on a date column | `between 2026-09-01 .. 2026-09-30` | `relative-range` — the operator is widened, and that is said |
| `kerala` where the data says `Kerala` | `Kerala` | `case-normalised` |
| `GOLD` where the option is `{ label: "Gold", value: "gold" }` | `gold` | `option-normalised` |
| `around diwali` | **refused** | only documented phrases resolve |

Relative phrases understood: `today`, `yesterday`, `tomorrow`, `this/last
week|month|quarter|year`, and `last N days|weeks|months|years`. Weeks start on
Monday. Anything else fails loudly rather than landing on a plausible wrong
date. Pass `now` to make them testable.

### Plausibility runs the query without running it

`projectQuery` works out what the filters would be, and the dataset counts the
matches — so `explain.affectedRows` is the real number before anything changes.
That is what powers:

```
You asked      Show customers with revenue above 1 lakh.
Reading as     Revenue > ₹1,00,000
Affected rows  1,842 of 9,310
               [Apply]  [Cancel]
```

Warnings: `empty-result`, `no-op` (every row already shown matches),
`barely-narrows` (keeps ≥95%). Confirmations: anything irreversible
(`export`, `print`, `copy`) and any export above `confirmExportRows`.

## Executors

An operation is **not** welded to an imperative handle:

```ts
interface OperationExecutor<TInput, TContract, TResult> {
  readonly operation: string;
  /** Set only when `execute` really does call that method. Never required. */
  readonly apiMethod?: string;
  execute(input: TInput, context: ExecutionContext<TContract>): TResult | Promise<TResult>;
}
```

For DataGrid today, `filter` calls `GridApi.setFilter`. For a controlled
component such as DatePicker it would call the host's `onChange`. Same
operation, same schema, different executor — and the contract, the validator
and the history never learn which.

Three operations prove `apiMethod` is optional rather than merely nullable:

- **`export`** spans three methods (`exportCsv`, `exportExcel`, `exportPdf`), so
  no single one applies.
- **`undo`** and **`redo`** are the agent's snapshot history. The grid has no
  method for them at all.

Pass `executors` to `createGridAgent` to replace the registry wholesale.

## Operations

21, each backed by something the grid really implements. `agent.contract().operations`
narrows them to the instance: a grid with `enableRowSelection: false` offers no
`selectRows`.

| Operation | GridApi method |
| --- | --- |
| `search` | `setGlobalFilter` |
| `filter` | `setFilter` |
| `clearFilters` | `clearFilters` |
| `sort` / `clearSort` | `setSorting` |
| `selectRows` | `toggleRowSelected` |
| `selectAll` | `toggleAllRowsSelected` |
| `clearSelection` | `clearSelection` |
| `setColumnVisibility` | `setColumnVisibility` |
| `pinColumn` | `pinColumn` |
| `moveColumn` | `moveColumn` |
| `setColumnWidth` | `setColumnWidth` |
| `resetColumns` | `resetColumns` |
| `setPage` | `setPageIndex` |
| `setPageSize` | `setPageSize` |
| `setDensity` | `setDensity` |
| `export` | *(three methods)* |
| `print` | `print` |
| `copy` | `copyToClipboard` |
| `undo` / `redo` | *(the agent's history)* |

`agent/operations.ts` is the catalog; `passport.manual.json` publishes the same
set; `tools/eval/__tests__/corpus.test.ts` fails if the two drift.

### What is deliberately absent

- **grouping, aggregation, pivot, charts** — the grid implements none.
- **row mutation** (add, delete, set-cell) — there is no imperative write for a
  cell value. Editing is a UI affordance, driven by `onCellEdit`.
- **`notIn`** — a column with fixed `options` filters by membership only, so an
  exclusion has to list the complement.
- **multi-value filter on a plain string column** — one column holds one
  filter. Two filters on the same column in one batch are refused
  (`duplicate-column-filter`) rather than silently keeping the last.
- **limit / top-N** — "top 10" has no honest expression beyond sort + page size.

## History, views and URLs

Undo is by **snapshot**, not by inverse. Writing an inverse for every operation
means writing it again for every operation added later, and getting it wrong
once is a corrupted document. `GridState` is small and serialisable — which is
the precondition for a component being agent-operable at all — so storing it
whole is both cheaper to maintain and exactly correct.

```ts
agent.undo(); agent.redo(); agent.canUndo();
agent.history();   // [{ label: "Filter Revenue greater than ₹1,00,000", before, after, at }]

const view = agent.saveView("Kerala accounts");
location.hash = encodeGridView(view);          // URL-safe, no dependency

const restored = decodeGridView(location.hash.slice(1));
if (restored) agent.applyView(restored);        // itself undoable
```

A batch is one history entry: "Kerala customers over a crore, newest first" is
three operations and one undo. An operation that changes nothing records
nothing, so a no-op never costs an undo.

**Caveat.** Undo restores state through `GridApi.setState`, which can only write
the keys the grid owns. If the host controls `sorting` or `filters` through the
`state` prop, the host owns undoing them too.

## Policy

```ts
policy: {
  deny: ["internalNotes"],         // no operation may touch these
  denyFilter: ["email"],           // filterable, but not by a caller
  denyPii: true,                   // default: columns marked pii are denied
  denyOperations: ["export"],
  maxExportRows: 50000,
  confirmExportRows: 5000,         // default
  allowExportFormats: ["csv"],
  maxSelectRows: 1000,             // default
}
```

**One limit worth knowing.** The global search is not column-scoped: the grid
matches it against every column whose *definition* says `searchable`. Policy
cannot narrow that, because there is no per-search API to narrow. The validator
warns (`search-covers-restricted`) rather than implying an enforcement it does
not have. The real fix is `searchable: false` on the column definition.

## The utterance corpus

`eval/grid/v0/` holds 230 hand-written cases against one fixed grid
(`fixture.json` — 40 customers, 12 columns, authored semantics, a policy).

```bash
npm run eval:grid      # coverage report
pnpm -C demo-showroom exec vitest run ../tools/eval
```

Without a model there is no accuracy to measure, and that is fine — this does
not measure a model. It measures the **contract**: whether every reading a
person would reasonably expect can be expressed as a command this grid accepts,
and whether everything that should be refused is refused for the reason we
claim. A case that cannot be expressed is a hole in the operation set, and the
time to find those is before the set is frozen.

Each case is one JSON object:

```jsonc
{ "id": "grid-161", "category": "scale",
  "utterance": "Revenue above 1 lakh", "expect": "accept",
  "intents": [{ "action": "filter", "column": "revenue", "operator": "gt", "value": "1 lakh" }] }

{ "id": "grid-198", "category": "unsupported",
  "utterance": "Group the rows by region", "expect": "reject",
  "code": "unknown-operation",
  "intents": [{ "action": "group", "column": "region" }],
  "note": "The grid implements no grouping, so no operation declares it." }
```

181 accept, 39 reject, 10 ambiguous; 18 distinct rejection codes; all 21
operations covered. Ambiguous cases carry `alternatives`, and the test requires
every reading to validate — the point is not that one is right, it is that the
contract can express the disagreement. "Show the worst performing customers"
has three defensible readings across three columns that each declare a
direction of goodness; that is a question to ask, not a guess to make.

## Files

```
source/beta-components/shared/core/agent/     component-agnostic
├── types.ts       OperationDefinition, OperationExecutor, ValidationResult
├── schema.ts      the JSON Schema subset, checked without a dependency
├── history.ts     snapshot undo/redo
└── numbers.ts     parseQuantity: lakh, crore, k, %, ₹, (negative)

source/beta-components/data-grid/agent/       grid-specific, framework-free
├── operations.ts  the 21, and what backs each
├── dataset.ts     the only place that touches rows
├── contract.ts    the runtime contract emitter
├── intent.ts      GridIntent + per-instance schema generation
├── coerce.ts      values, dates, options, near-matching
├── validate.ts    the five layers, explanations, dry runs
├── executors.ts   GridApi-backed registry
└── engine.ts      createGridAgent, history, saved views

eval/grid/v0/      fixture.json, cases.jsonl
tools/eval/        harness.ts, report.cjs, __tests__/corpus.test.ts
```

Nothing under `agent/` imports React, so a command can be validated on a server
before it is ever sent to a browser.

## What is next

`docs/controlled-component-adapter.md` — DatePicker and Combobox have no
imperative write API, and inventing one just to fit this architecture would be
the wrong fix. That design has to be settled before either gets operations.
