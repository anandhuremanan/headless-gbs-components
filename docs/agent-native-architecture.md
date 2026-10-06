# GramproKit as an agent-native UI runtime

Architecture proposal. Status: **phases 1 and 2 are implemented; the rest is still
proposal.** Claims are marked either *established* (verifiable, with a source) or
*proposed* (our design choice).

Shipped since this was written:

- **Phase 1 — Component Passport v1.** `docs/component-passport.md`. 27 passports,
  generated and drift-checked in CI.
- **Phase 2 — the DataGrid agent runtime.** `docs/grid-agent-runtime.md`. Runtime
  contract, generated per-instance intent schema, five-layer validator, executor
  abstraction, snapshot history, saved views, and a 230-case utterance corpus.
  No model, by design.

Where this document and the implementation disagree, the implementation is right
and the disagreement is noted in section 10.

Scope: the 27 components of the **2.0 beta** set only. Legacy 1.x components
(`FormRenderer`, `SideBar`, `MaterialInput`, `ContextMenu`, `Navbar`, `Bargraph`,
`DarkMode`, `Toast`, `Uploader`, …) are out of scope.

---

## 0. What the research changed

Two findings reshaped this proposal relative to the original sketch.

**MCP Apps is a better near-term fit than A2UI for "AI operates existing UI."**
*Established:* MCP Apps is the first official MCP extension, co-developed by
Anthropic and OpenAI, stable at spec version `2026-01-26` and folded into the
`2026-07-28` MCP release candidate. A server declares a UI resource under the
`ui://` scheme with mime type `text/html;profile=mcp-app`; the host renders it in
a sandboxed iframe and the two sides talk JSON-RPC over `postMessage`.

The direction-specific methods matter:

| Direction | Methods |
| --- | --- |
| View → Host | `tools/call`, `resources/read`, `ui/open-link`, `ui/message`, `ui/request-display-mode`, **`ui/update-model-context`** |
| Host → View | `ui/notifications/tool-input`, `ui/notifications/tool-result`, `ui/notifications/tool-cancelled`, `ui/notifications/host-context-changed`, `ui/resource-teardown` |

`ui/update-model-context` is, almost exactly, the "component exposes its own
semantic context to the model" idea — standardised, with shipping hosts (Claude,
ChatGPT, VS Code, Goose). Tool `visibility: ["app"]` lets a UI-only tool exist
that the agent cannot call directly.

*Established limitation:* "the host controls state; the UI cannot push unsolicited
state changes into the host." Our grid can ask, not command.

**A2UI is strong but not ready to build against.** *Established:* Apache 2.0,
16.6k stars, 1,401 commits, 318 open issues; catalogs are JSON Schema documents
with `components` and `functions` maps, `allowedParents`/`allowedChildren`
composition constraints and an `accessibility` block. But v0.8 is legacy, **v0.9.1
is "Current" and v1.0 is a "Candidate" whose own spec page tells production users
to stay on v0.9.1**, the 0.9→1.0 move has breaking changes, the project describes
itself as "early stage public preview" — and **the React renderer is planned, not
shipped** (Lit and Angular exist).

*Proposed:* treat A2UI as a projection target we track, not a dependency. Build
the MCP Apps adapter first.

---

## 1. Capability model — is the abstraction sound?

The proposed tags were Query, Extraction, TemporalInterpretation, ActionIntent,
Summarization, Classification.

*Proposed assessment:* sound, but it conflates two axes. "Summarization" describes
what the **model** does; "filter a column" describes what the **component** offers.
Mixing them produces exactly the vague `aiUseCases` prose we want to avoid.

Split them:

- **Operations** — the contract. Deterministic, typed, validated, enumerable.
  `filter`, `sort`, `selectRows`, `setDateRange`, `chooseOption`. This is what a
  model emits and a validator checks. It is the real artifact.
- **Capabilities** — a routing hint. `Query`, `TemporalInterpretation`,
  `Extraction`… a short closed vocabulary saying *which task shapes* a component's
  operations serve, so an orchestrator can pick the right component without
  reading every operation.

A component declares both. Capabilities are advisory and may be wrong without
breaking anything; operations are load-bearing and are validated. That separation
is what keeps the passport machine-usable.

---

## 2. Passport structure

The brief proposed `passport.generated.json` + `passport.manual.json`.
*Proposed change:* keep that split but **do not commit a third merged file as a
peer**. A committed merge is a third drift surface — this repo has already lost
time to exactly that (a forked `demo-showroom/docs`, a stale Malayalam page, 26
doc pages describing a CSS layer the code had moved off).

```
button/
├── core/
├── react/
├── styles.css
├── README.md
├── passport.manual.json      authored; the generator never writes this
├── passport.json             generated merge; regenerable, CI-checked
└── examples/                 authored; referenced by the passport
```

Two committed files. `passport.json` is the only thing consumers read.
`passport.manual.json` is the only thing humans edit. The derived-only half is
never persisted separately — it is recomputed and folded into `passport.json`,
and drift is "regenerate and diff."

### What can actually be derived — measured

Ran the TypeScript compiler API over all 27 components:

```
81 Props interfaces     795 props        185 required
65 event handlers       221 styling slots  158 data-* state attributes
props carrying a JSDoc description:  37%
components with a README:            26/27   (avatar has none)
components with an examples/ dir:     0/27
```

*Established (measured in this repo).* Derivable today: prop names, types,
optionality, required/optional, events (`on*`), slot unions, the `data-*` state
vocabulary, and for the grid the full `FilterOperator` × `ColumnType` matrix.
Not derivable: purpose, composition rules, safe mutations, capabilities — and
**63% of props have no description**, so most prose must be authored or lifted
from the READMEs. `examples/` does not exist anywhere yet; the proposed layout
assumes 27 directories of new authored content.

Roughly two-thirds generatable, one-third authoring. Budget accordingly.

### `passport.manual.json` (authored)

```json
{
  "$schema": "https://gramprokit.dev/schema/passport-manual/1.json",
  "component": "Button",
  "purpose": "Trigger an action. Not for navigation unless `render` supplies a link element.",
  "capabilities": ["ActionIntent"],
  "composition": {
    "mustNotContain": ["Button", "a"],
    "notes": "Nesting interactive elements is invalid HTML and traps the keyboard."
  },
  "safeMutations": {
    "allowed": ["variant", "size", "loading", "disabled", "fullWidth"],
    "forbidden": ["type", "onClick", "render"],
    "rationale": "Appearance is safe for an agent to change. Behaviour is not."
  },
  "propNotes": {
    "render": "Escape hatch for router links. Changes the rendered element."
  },
  "examples": ["examples/basic.tsx", "examples/async-submit.tsx"]
}
```

### `passport.json` (generated merge — excerpt)

```json
{
  "$schema": "https://gramprokit.dev/schema/passport/1.json",
  "passportVersion": "1.0.0",
  "component": "Button",
  "source": {
    "library": "gbs-add-block",
    "libraryVersion": "2.1.0",
    "files": ["react/Button.tsx", "react/props.ts", "core/types.ts", "styles.css"],
    "sourceHash": "sha256:9f2c…",
    "generatedAt": "2026-10-06T00:00:00Z"
  },
  "purpose": "Trigger an action. Not for navigation unless `render` supplies a link element.",
  "capabilities": ["ActionIntent"],
  "props": [
    { "name": "variant", "type": "enum", "values": ["primary","secondary","outline","ghost","danger","link"],
      "default": "primary", "required": false, "origin": "derived",
      "description": "Visual weight.", "descriptionOrigin": "jsdoc" },
    { "name": "onClick", "type": "function", "signature": "(e: MouseEvent) => void | Promise<unknown>",
      "required": false, "origin": "derived",
      "description": "Return a promise to show loading until it settles.", "descriptionOrigin": "jsdoc" }
  ],
  "events": ["onClick"],
  "slots": ["root", "content", "spinner", "icon"],
  "states": ["data-variant", "data-size", "data-loading", "data-disabled"],
  "accessibility": {
    "supplied": ["native <button> semantics", "disabled state", "focus ring"],
    "required": ["aria-label when icon-only"]
  },
  "safeMutations": { "allowed": ["variant","size","loading","disabled","fullWidth"],
                     "forbidden": ["type","onClick","render"] },
  "operations": [],
  "coverage": { "propsTotal": 17, "propsDescribed": 9, "describedPct": 53 }
}
```

`origin` and `descriptionOrigin` on every field make it auditable which half a
value came from. `coverage` makes authoring debt visible in CI instead of
invisible.

### Drift detection

CI regenerates and compares. Three distinct failures, three different messages:

1. **Source changed, passport stale** — `sourceHash` mismatch. Fail; run the generator.
2. **Manual references something gone** — `safeMutations.allowed` names a prop the
   types no longer have. Fail; a human must decide.
3. **Coverage regressed** — a new prop with no description. Warn, with a threshold
   that ratchets up.

---

## 3. Grid Contract

*Established, verified against `core/types.ts` and `core/grid.ts`:*

```
GridState   sorting, filters, globalFilter, pagination, rowSelection,
            columnOrder, columnVisibility, columnSizing, columnPinning, density
GridQuery   sorting, filters, globalFilter, pagination          (serialisable subset)
FilterOperator  contains notContains equals notEquals startsWith endsWith
                gt gte lt lte between before after in isEmpty isNotEmpty   (16, closed)
ColumnType  "string" | "number" | "date" | "boolean"   (+ options[] for enums)
GridApi     31 methods: getState setState toggleSort setSorting setFilter
            clearFilters setGlobalFilter setPageIndex setPageSize setDensity
            isRowSelectable toggleRowSelected toggleAllRowsSelected clearSelection
            getSelectedRowIds getSelectedRows setColumnVisibility setColumnWidth
            pinColumn moveColumn resetColumns scrollToRow focusCell startEditing
            cancelEditing getRows exportCsv exportExcel exportPdf print
            copyToClipboard
```

**The contract is already ~80% built.** `GridState` is a complete serialisable
snapshot, so undo/redo is a snapshot stack rather than command inversion.

> ⚠ **Gap: the grid has no grouping and no aggregation.** The brief lists both.
> Advertising a capability the component lacks is the worst possible failure —
> the model emits a confident, schema-valid `group` command that cannot execute.
> Either build them first or exclude them from v1 of the contract. Recommendation:
> exclude, and treat grouping as a prerequisite feature with its own ticket.

### Contract emitted to the model (not the data)

```json
{
  "contractVersion": "1.0.0",
  "component": "DataGrid",
  "instanceId": "customers",
  "rowCount": 184203,
  "columns": [
    { "id": "name",    "label": "Customer", "type": "string",  "filterable": true,  "sortable": true },
    { "id": "revenue", "label": "Revenue",  "type": "number",  "unit": "INR",
      "stats": { "min": 12000, "max": 9840000, "median": 310000 } },
    { "id": "growth",  "label": "Growth",   "type": "number",  "unit": "percent",
      "semantics": "higher is better", "stats": { "min": -0.62, "max": 1.4 } },
    { "id": "region",  "label": "Region",   "type": "string",
      "options": ["Kochi","Thrissur","Kozhikode"], "cardinality": 3 },
    { "id": "joinedAt","label": "Joined",   "type": "date" }
  ],
  "capabilities": ["search","filter","sort","select","columns","paginate","export","undo"],
  "operators": { "string": ["contains","equals","startsWith","in","isEmpty"],
                 "number": ["gt","gte","lt","lte","between","equals"],
                 "date":   ["before","after","between"],
                 "boolean":["equals"] },
  "state": { "filters": [], "sorting": [], "globalFilter": "", "selectedCount": 0 }
}
```

*Proposed.* Three deliberate choices:

- **No rows.** The model sees schema, cardinality and summary statistics — never
  184,203 rows. Data processing stays deterministic in the grid.
- **`stats` and `semantics`** are what let the model resolve "worst performing"
  to `sort growth asc` rather than guessing. `"higher is better"` is authored, not
  derived — it belongs in `passport.manual.json`.
- **`operators` is keyed by type**, so constrained decoding can forbid
  `startsWith` on a number before the model ever considers it.

### GridIntent schema

Discriminated union, closed enums everywhere, designed for constrained decoding:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GridIntent",
  "type": "object",
  "required": ["action"],
  "oneOf": [
    { "properties": {
        "action": { "const": "filter" },
        "column": { "enum": ["name","revenue","growth","region","joinedAt"] },
        "operator": { "enum": ["contains","equals","gt","gte","lt","lte","between","before","after","in","isEmpty"] },
        "value": {}, "value2": {} },
      "required": ["action","column","operator"], "additionalProperties": false },
    { "properties": {
        "action": { "const": "sort" },
        "column": { "enum": ["name","revenue","growth","region","joinedAt"] },
        "direction": { "enum": ["asc","desc"] },
        "append": { "type": "boolean" } },
      "required": ["action","column","direction"], "additionalProperties": false },
    { "properties": { "action": { "const": "search" }, "text": { "type": "string", "maxLength": 200 } },
      "required": ["action","text"], "additionalProperties": false },
    { "properties": { "action": { "const": "selectTop" }, "count": { "type": "integer", "minimum": 1, "maximum": 1000 } },
      "required": ["action","count"], "additionalProperties": false },
    { "properties": { "action": { "const": "export" }, "format": { "enum": ["csv","excel","pdf"] },
        "scope": { "enum": ["filtered","all","selected","page"] } },
      "required": ["action","format"], "additionalProperties": false },
    { "properties": { "action": { "enum": ["undo","redo","reset","clearFilters"] } },
      "required": ["action"], "additionalProperties": false }
  ]
}
```

The column enum is **generated per instance** from the live contract. A model
physically cannot emit a column that does not exist.

### Validator architecture

*Established:* constrained decoding guarantees structure but not meaning —
"constrained decoding eliminates structural failures in small LLMs but reveals a
scale-dependent semantic gap", and the gap widens as models shrink. So the
validator is not optional defence-in-depth; it is where correctness actually lives.

Five layers, each returning a typed rejection rather than throwing:

| Layer | Checks | Example rejection |
| --- | --- | --- |
| 1 Schema | shape, enums, required | guaranteed by constrained decoding; re-checked for cloud models |
| 2 Referential | column exists, operator legal for its type | `startsWith` on a number |
| 3 Coercion | value parses as the column type; units normalised | `"1 lakh"` → `100000`; `"20%"` → `0.2` or `20` per column unit |
| 4 Policy | column filterable/exportable; row limits; PII flags | export blocked on a restricted column |
| 5 Plausibility | result-set sanity | filter would return 0 of 184,203 rows → confirm first |

Layer 3 is where most real failures land, and it is deterministic code, not a
model. Layer 5 is the one that turns a silent wrong answer into a question.

Output is always `{ ok: true, command } | { ok: false, reason, suggestion }`, so
the UI can say *"I read that as Revenue > ₹1,00,000 — apply?"* rather than
silently mangling the view.

---

## 4. Model adapter interface

*Proposed.* Adapter-neutral by construction; no model chosen.

```ts
export interface IntentAdapter {
  readonly id: string;                   // "webllm:qwen2.5-1.5b" | "transformers:…" | "cloud:…"
  readonly runsLocally: boolean;
  init(signal?: AbortSignal): Promise<void>;
  translate(input: {
    utterance: string;
    contract: ComponentContract;          // schema + capabilities + stats, never rows
    state: unknown;                       // current component state
    history?: IntentRecord[];             // for "undo that", "only the Kerala ones"
    signal?: AbortSignal;
  }): Promise<{ intents: unknown[]; confidence?: number; rationale?: string }>;
  dispose(): Promise<void>;
}
```

Returns **unvalidated** `unknown[]` by design — the validator is the only thing
that produces a command. Transformers.js, WebLLM and a cloud endpoint all
implement the same interface, and the eval harness runs them identically.

*Established:* Transformers.js 4.3 ships `@huggingface/transformers-structured-output`,
a pure-JS port of llguidance exposed as a `LogitsProcessorList` that masks any
token breaking a JSON Schema. WebLLM has JSON-mode constrained decoding. So
schema-valid output is available in-browser from both candidates today.

### One model or one per component?

*Proposed, supported by evidence:* one model plus a runtime contract.

*Established:* on the Berkeley Function-Calling Leaderboard, a purpose-built 1B
function-calling model (`xLAM-2-1b-fc-r`, 30.44) scores roughly **three times** a
general-purpose 1B (`Llama-3.2-1B-Instruct`, 10.82); `xLAM-2-3b-fc-r` reaches
65.74% overall; among base models Qwen Coder 3B leads at 75.67% strict accuracy,
with Qwen2.5 1.5B / Qwen3.5 2B / Granite 3.3 2B around 64–67%. Fine-tuned small
models beat baselines 20–500× larger on targeted tasks.

Read carefully: those are *general* tool-calling numbers over arbitrary APIs. Our
task is far narrower — one closed operator set over typed columns. That asymmetry
cuts both ways: the task is easier than BFCL, **and** BFCL numbers cannot be used
to predict our accuracy. Hence: eval set first, model second.

Per-component models would multiply download size, training cost and evaluation
surface for a task that differs mostly in vocabulary — which the contract already
supplies at runtime. One model, many contracts.

---

## 5. Projections

```
                    component source (TypeScript)
                              │  generator
                              ▼
                      passport.json  ◄── passport.manual.json
                              │
      ┌───────────────┬───────┴────────┬──────────────────┐
      ▼               ▼                ▼                  ▼
  Agent Skill    JSON Schema     MCP Apps surface    A2UI catalog
 (.gbs/.claude)  (validation)    (ui:// + tools)     (projection)
```

Everything downstream is generated. The Agent Skill in this repo is currently
hand-written and has been patched three times in one week for drift — it should
become the first consumer of the passport, not a parallel artifact.

### MCP Apps adapter (recommended first)

*Proposed.* The grid is already a React app; MCP Apps asks for exactly that —
HTML in a sandboxed iframe. Mapping:

- Serve the grid as a UI resource at `ui://gramprokit/data-grid`, mime
  `text/html;profile=mcp-app`.
- On mount the view calls **`ui/update-model-context`** with the Grid Contract —
  the model now knows the columns, types, stats and capabilities.
- The host model calls a tool (`grid.apply`, `visibility: ["model","app"]`); the
  result arrives as `ui/notifications/tool-result`; the view runs it through the
  validator and applies it to the live grid.
- The view can call `tools/call` for data the server holds.

No renderer to write, no component mapping, official spec, shipping hosts. This
is pillar **B** with the least new surface area.

### A2UI projection (later)

The passport maps onto an A2UI catalog entry cleanly — `component` discriminator,
`properties`, `allowedParents`/`allowedChildren` from `composition`,
`accessibility` from the passport's accessibility block, `deprecated` flags. The
`functions` map is the interesting half: **grid operations can be exposed as A2UI
functions**, which is the bridge from "agent generates UI" to "agent operates UI"
inside A2UI.

Blocked on: no React renderer (we would have to write one), and v1.0 still
Candidate with breaking changes from 0.9.1. *Proposed:* generate the catalog and
validate it against the published JSON Schema in CI — cheap, proves the mapping —
but do not ship a renderer until the spec stabilises.

---

## 6. CLI and source-first ownership

```bash
npx gbs-add-block -a DataGrid --beta                  # component + passport.json
npx gbs-add-block -a DataGrid --beta --contract       # + contract emitter + validator
npx gbs-add-block -a DataGrid --beta --ai             # + adapter interface + eval harness
npx gbs-add-block --a2ui                              # + catalog projection
```

Everything is copied source. No runtime dependency, consistent with 2.1.0.

**When a developer modifies a copied component**, the passport must follow or it
lies to every agent that reads it. Three-file resolution:

```
component-lib/data-grid/
├── passport.json          shipped, regenerable — treat as vendor-owned
├── passport.manual.json   shipped authored semantics
└── passport.local.json    YOURS — never written by the CLI
```

`passport.local.json` is a deep-merge overlay: add a prop you introduced, mark one
forbidden, add an operation. The CLI reads it, never writes it, and the manifest
protection already built for `shared/` and `.gbs/` applies. A local regenerate
(`npx gbs-add-block --passport --regen`) re-derives from *their* modified source,
so a fork's passport describes the fork.

That is the part a packaged library cannot do: its passport describes the package,
not your copy of it.

---

## 7. Versioning

Four independently moving things:

| Artifact | Versioned by | Breaks when |
| --- | --- | --- |
| Component source | library semver (`2.1.0`) | props/behaviour change |
| Passport schema | `passportVersion` | field added/removed from the format |
| Component contract | `contractVersion` | an operation or operator changes |
| Model + eval | model id + eval-set version | retrained, or the eval set grows |

Rules: the passport carries both `libraryVersion` and `sourceHash`; the contract
declares the minimum `passportVersion` it needs; an adapter declares the
`contractVersion` range it was evaluated against and **refuses** outside it — a
model evaluated on a 16-operator contract must not silently drive an 18-operator
one. The A2UI catalog records which `protocolVersion` it targets.

---

## 8. Component AI classification (2.0 beta set)

*Proposed.* Categories: **G** generative UI · **O** operational control ·
**S** semantic interpretation · **X** extraction · **Z** summarization ·
**R** recommendation · **—** no meaningful AI value.

| Component | Class | What the AI would actually do |
| --- | --- | --- |
| **DataGrid** | O, X, Z | NL → filter/sort/select/export over a live dataset |
| **DatePicker / DateRangePicker** | S | "last quarter", "the Friday before Diwali" → concrete dates |
| **Combobox / Select / MultiSelect** | S, R | resolve a description to options in a large list |
| **FileUploader** | X, Classification | read an uploaded document, fill fields, route by type |
| **Input / NumberInput** | S | "2 lakh" → `200000`; unit and locale normalisation |
| **Textarea** | Z, S | summarise, rewrite, expand — the only true content generator |
| **Menu** | O | "export as PDF" → invoke the right item |
| **Tabs / Accordion** | O | navigate to the panel that answers the question |
| **CheckboxGroup / RadioGroup / Switch / Checkbox / Radio** | O | targets of a form-level agent, little value alone |
| **Modal / Dialog / Popover** | O | open/close — trivial; value is in what they contain |
| **Alert / Toaster** | Z, G | summarise what happened; render agent-authored notices |
| **Card** | G | a natural output target for agent-generated content |
| **Button / Badge / Avatar / Progress / Skeleton / Empty / Spinner / Breadcrumb / Tooltip** | — | presentational or trivially controlled; no standalone AI value |

### Ranking

Scored on usefulness, local-model feasibility, semantic difficulty (lower is
better), privacy value, performance, differentiation, complexity, and infra reuse.

1. **DatePicker / DateRangePicker — best *first* ship.** Tiny closed output
   (`{start, end}`), a well-bounded semantic space, instantly verifiable, high hit
   rate achievable at the small end, and it exercises the entire pipeline —
   contract → intent → validator → API — on an easy problem. Privacy value is real
   (dates in medical/financial forms).
2. **DataGrid — the flagship.** Highest usefulness and differentiation, hardest
   semantics, most infra. Second, not first.
3. **Combobox / MultiSelect.** "Pick from 5,000 options" is a genuine pain;
   semantically mid; reuses the grid's option/enum machinery.
4. **FileUploader.** High value, but extraction is a different model class
   (vision/OCR) — a separate track, not a reuse of the intent pipeline.
5. **Form cluster as one composite.** "Fill this form from this paragraph" across
   Input/NumberInput/Checkbox/Radio/Switch/Select, driven by one contract assembled
   from several passports. Strong demo, depends on everything above.

Everything below that is either trivial or presentational.

---

## 9. The three modes

- **A. Agent-generated UI** — agent composes an interface. A2UI's home ground;
  MCP Apps also supports it. *Position: support via projection, do not lead.*
  Crowded, and the hidden-technical-debt literature on GenUI is not encouraging.
- **B. AI-operated existing UI** — agent drives a UI the developer built.
  *Position: lead here.* MCP Apps makes it tractable now.
- **C. User-to-component natural language** — the user types into the component;
  no agent involved. *Position: lead here too.* This is "Ask this Grid", works
  fully offline, and is the thing a user feels immediately.

B and C share the entire stack — contract, intent schema, validator, adapter — and
differ only in who produces the utterance. That is the reuse argument for building
the contract layer first and the model last.

---

## 10. Roadmap — with challenges

The proposed ten phases, amended:

| # | Phase | Verdict |
| --- | --- | --- |
| 1 | Passport generator + drift | **Keep, first.** Extraction proven; ~⅔ derivable. |
| 2 | DataGrid contract + validator | **Done — and the "DatePicker first" amendment above was wrong.** That argument was about which semantics a *model* finds easier, and phase 2 has no model. Ordered by non-AI payoff instead, DataGrid wins outright: `DatePickerHandle` exposes `open/close/toggle/focus/clear/getValue` and no way to set a value, while the grid has 31 methods and a serialisable `GridState`. See `docs/controlled-component-adapter.md`. |
| 3 | Command engine + undo/redo | **Done, folded into phase 2.** `GridState` made it a snapshot stack, as predicted. Shipped as a non-AI feature: saved views, shareable URLs, audit log, undo. |
| 4 | Semantic eval dataset | **Done for the grid, and moving it earlier was right.** 230 cases written against a fixed fixture *while* the contract was being built; they found `notIn`, multi-value filters on a plain string column, and top-N, all of which would otherwise have been discovered after freezing. |
| 5 | Benchmark candidate models | Keep. |
| 6 | Fine-tune a Grampro SLM | **Conditional.** BFCL shows ~3× gains from specialisation at 1B, but our domain is much narrower than BFCL. Measure stock models against the eval set first; fine-tune only if they miss the bar. |
| 7 | Browser inference adapters | Keep. Both candidates already support constrained decoding. |
| 8 | "Ask this Grid" | Keep. |
| 9 | A2UI projection | **Reorder — MCP Apps before A2UI.** Stable spec, shipping hosts, no renderer to write. |
| 10 | Expand to other components | Keep. |

**Missing phases:**

- **Phase 0 — grouping and aggregation.** The brief's Grid Contract lists both;
  the grid has neither. *Descoped* for now: both are absent from the operation set
  and listed under `notImplemented` in the passport, and the corpus has cases
  asserting that asking for them is refused rather than faked.
- **Phase 3.5 — failure UX.** Confidence, confirm-before-apply, `explainLastAction()`.
  The semantic-gap research makes a silent wrong filter the expected failure, not
  the edge case. Without this the feature is worse than no feature.
  *Partly done:* phase 2 ships the structured half — `explain.summary`,
  `explain.affectedRows` from a real dry run, and a `needs-confirmation` status.
  The UI that renders them is not built.
- **Phase 4.5 — telemetry.** Production utterances are how the eval set grows past
  its first 200 hand-written rows. Opt-in, local-first.

**The sequencing risk:** phases 1–3 produce real value with no AI. Phases 5–8 are
where it could stall. Keep the non-AI value shippable on its own so the AI work
can take as long as it needs.

---

## 11. Long-term differentiation

Not "shadcn with AI features."

Component libraries have always had one consumer: a human writing code. The AI era
adds two more — the **coding agent** that writes the integration, and the
**runtime agent** that operates the running UI. Nearly every library is investing
in the first (better docs, `llms.txt`, docs MCP servers). Almost nobody is built
for the second.

GramproKit's structural advantage is that **the source is in the user's
repository**, which means the contract can live there too — and be forked with it.
A packaged library can ship a passport, but it describes the vendor's package. It
cannot describe *your* modified copy. Ours can, because `passport.local.json` sits
next to the component you changed and regenerates from your source.

That yields a claim no packaged library can make:

> **The contract is a first-class, forkable artifact. An agent reads a description
> of the UI as it actually exists in this repository — including your changes —
> not a description of a package you happened to install.**

Three things compound from there:

1. **Self-describing by construction.** The passport is generated and drift-checked,
   so the description cannot rot away from the code. Hand-written AI metadata always
   rots; this session is four separate proofs of that.
2. **Operable, not just renderable.** Leading on modes B and C — the agent operates
   a UI the developer designed — avoids the crowded, debt-laden generative-UI race
   and plays to a real asset: a grid with 31 deterministic API methods and a fully
   serialisable state.
3. **The eval set is the moat.** Not the model. A labelled corpus of real utterances
   mapped to validated component operations, grown from production telemetry, is
   the asset that makes a 1B model good enough — and it is specific to this
   component vocabulary. Models commoditise; the dataset does not.

The honest risk: all three depend on the passport being genuinely reliable. If it
becomes another hand-maintained file that drifts, the whole thesis collapses into
marketing. The drift check is not a nice-to-have — it is the load-bearing wall.

---

## Sources

*Established* claims above trace to:

- A2UI v1.0 specification — https://a2ui.org/specification/v1.0-a2ui/
- A2UI project — https://github.com/a2ui-project/a2ui
- MCP Apps extension, spec 2026-01-26 — https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- MCP specification 2026-07-28 — https://modelcontextprotocol.io/specification/2026-07-28
- Constrained decoding and the scale-dependent semantic gap — https://arxiv.org/pdf/2609.23742
- JSONSchemaBench — https://arxiv.org/pdf/2501.10868
- Small models for function calling — https://arxiv.org/html/2504.19277v1
- SLMs for agentic tool calling, targeted fine-tuning — https://arxiv.org/html/2512.15943v1
- QLoRA tool-knowledge internalisation — https://arxiv.org/pdf/2605.17774
- Hidden technical debt in GenUI and malleable UIs — https://arxiv.org/pdf/2604.16354

Measurements of this repository (component counts, prop counts, API surface,
`GridState`/`FilterOperator` shape, JSDoc coverage) were taken directly from
`source/beta-components` via the TypeScript compiler API.
