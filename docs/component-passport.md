# Component Passport v1

A passport is a machine-readable contract for one component: what props it
takes, what it renders, what state it exposes, and what a tool may safely do to
it. It is generated from the component's TypeScript source and merged with
semantics a human authored.

Consumers of the passport, now and later: coding agents, the Agent Skill
generator, JSON Schema validation, and — in later phases — MCP Apps surfaces and
an A2UI catalog projection. See `docs/agent-native-architecture.md` for where
this sits in the wider design.

## Why it exists

Documentation written beside code drifts away from it. This repository has
several proofs: a forked `demo-showroom/docs`, a Malayalam page describing a CSS
layer the code had moved off, and 26 component pages repeating a sentence that
had stopped being true. Anything hand-maintained rots.

So the passport is **generated and drift-checked**. The parts a machine can
derive are derived every run; the parts it cannot are authored in a separate
file the generator never writes. CI fails if the two fall out of step.

## The three files

```
component-lib/button/
├── passport.json          generated merge — the only file tools read
├── passport.manual.json   authored by the library; the generator never writes it
└── passport.local.json    yours; the CLI never writes it, and it is optional
```

There is deliberately **no `passport.generated.json`**. A committed
derived-only artifact would be a third thing to keep in sync. The derived half
is recomputed on every run and folded straight into `passport.json`; drift is
simply "regenerate and diff".

Precedence when building `passport.json`:

```
source  →  passport.manual.json  →  passport.local.json
```

| Field | Owner | Overridable? |
| --- | --- | --- |
| `passportVersion`, `source`, `inherits`, `events`, `slots`, `states` | source | **No.** Always regenerated. An overlay setting these is a validation error. |
| `props[].name/type/values/required/origin` | source | **No.** An overlay may annotate a prop, never redefine its type. |
| `props[].description/note/deprecated` | either | Yes — an overlay description sets `descriptionOrigin` accordingly. |
| `purpose`, `accessibility`, `composition`, `operations`, `intentDomains`, `safeMutations`, `examples` | authored | Yes. The generator emits empty shells. |
| New props | `passport.local.json` only | Yes. `passport.manual.json` may not invent props — that is an error. |
| `coverage` | computed | No. Recalculated after overlays. |

## How generation works

`tools/passport/extract.cjs` builds one TypeScript program across every
component — one program, so project-local types resolve across files — and asks
the TypeChecker for each component's props.

The central rule is **origin filtering**:

- **Own source is flattened.** `DataGridProps extends GridOptions`,
  `SelectProps extends ComboboxSharedProps`, `DatePickerProps extends
  DatePickerSharedProps`. These are our API, so their members are enumerated.
  AST-only extraction misses them entirely — it sees 633 of the 798 props, and
  drops half the grid's surface.
- **Library inheritance is a boundary.** Resolving `ButtonHTMLAttributes`
  yields hundreds of DOM properties; `HTMLAttributes` on Tabs resolves to over
  850. Flattening those buries the real API and would swamp a model's context.
  Instead the relationship is recorded:

  ```json
  "inherits": [
    { "from": "ButtonHTMLAttributes<HTMLButtonElement>",
      "omitted": ["onClick"], "passthrough": true }
  ]
  ```

- **A policy allowlist surfaces the useful ones inline.**
  `tools/passport/policy.cjs` lists, per React attributes interface, which
  inherited props are worth showing (`disabled`, `className`, `rows`, `type`…).
  The list is a *wish*: an entry is emitted only when the TypeChecker confirms
  that property exists on that component's resolved type, and it is marked
  `"origin": "inherited"`. Nothing is assumed, and `rows` never appears on a
  Button.

Also derived: enum values from string-literal unions, defaults from the
component's destructuring defaults, `on*` props as events, `classNames` slot
keys from `*Slot` type aliases, and `data-*` state attributes from both the
stylesheet's selectors and the JSX that sets them.

**Descriptions are never invented.** A prop gets a description only from JSDoc
or an overlay, and always carries `descriptionOrigin`. An undocumented prop has
no description field and shows up in `coverage`.

### Determinism

Output must be byte-identical across runs or the CI check is noise. So:
`sourceHash` covers file contents only — no timestamps, no absolute paths —
props are sorted by name, slots keep declaration order, and the JSON is written
with a stable key order and a trailing newline. There is no `generatedAt` field.

## Drift checking

```bash
npm run passport          # generate / refresh
npm run passport:check    # CI gate; writes nothing, exits 1 on drift
```

`passport:check` regenerates in memory and compares with what is committed:

```
  Button: OK
  ✗ DataGrid: passport stale — source changed since the passport was generated; run `npm run passport`
  ✗ DatePicker: manual metadata references prop "foo", which no longer exists in the source
  ! Switch: 15% of props described (6/39), threshold 40%
```

Three distinct failures, three messages:

| Situation | Level |
| --- | --- |
| Source changed, passport not regenerated | error |
| Overlay references a prop that no longer exists | error |
| Overlay contradicts a derived type, or sets a source-owned field | error |
| Operation names an API method the component does not expose | error |
| Coverage below threshold | warning |

Coverage is a **warning**, not a gate. The threshold in `tools/passport/cli.cjs`
starts at 40% and is meant to ratchet upward as props get documented.

CI runs this on any change under `source/beta-components/` or `tools/passport/`
— see `.github/workflows/passport.yml`. It installs `@types/react`, without
which inherited props cannot resolve; the generator warns explicitly if they are
missing rather than silently emitting a thinner passport.

## Operations versus intent domains

These are different things and the schema keeps them apart.

**`operations`** is authoritative. Each entry carries a JSON Schema fragment
for its arguments and, *where one method performs it*, the name of that method
on the component's imperative API. A model emits an operation, a validator
checks it, and only then does anything run. An operation is never declared
because an AI use case sounds plausible — DataGrid has no `group` operation
because the grid implements no grouping, and its manual passport says so under
`notImplemented`.

`apiMethod` is optional, and deliberately so: an operation is not the same
thing as a method call. DataGrid's `export` spans three methods, and `undo` and
`redo` are performed by the agent runtime's snapshot history rather than by the
grid. Forcing a method name onto those would be a fiction. When `apiMethod`
*is* present it is checked: the extractor reads the members of every exported
`*Api` / `*Handle` interface — the thing a `ref` hands back — and a name that
is not among them fails the drift check as `unknown-api-method`.

The runtime half of this lives in `docs/grid-agent-runtime.md`. The passport
says what a component knows how to do; the runtime contract says what one
instance can do right now.

**`intentDomains`** is advisory routing only: `Query`,
`TemporalInterpretation`, `ActionIntent`… It helps an orchestrator pick a
component. It carries no execution semantics and can be wrong without breaking
anything.

In v1, 25 of 27 components have `operations: {}`. That is correct: most have no
deterministic operation surface worth declaring. DataGrid declares 21 — the
same set `data-grid/agent/operations.ts` dispatches on, with a test that fails
if the two drift.

## Extending a passport for modified source

The passport travels with the component on install, because it is part of the
contract. If you change the copied source, regenerate so the passport describes
*your* version:

```bash
npx gbs-add-block -passport           # re-derive from your component-lib/
npx gbs-add-block -passport --check   # verify in your CI
```

This reads your source, so a prop you added appears with its own JSDoc and
`"origin": "derived"`. Put anything a machine cannot derive into
`passport.local.json`:

```json
{
  "purpose": "Our house button. Adds a `tone` treatment on top of upstream.",
  "propNotes": { "tone": "Internal design-system token; not upstream." },
  "safeMutations": { "allowed": ["tone"] }
}
```

The CLI reads that file and never writes it, so re-running the generator — or
taking an upstream update — will not clobber your notes. If you later delete the
prop but leave the note behind, `--check` fails and names it.

Regeneration needs TypeScript resolvable from your project (`npm i -D
typescript`) plus `@types/react`. Both are generation-time only; nothing is
added to your runtime dependencies.

## Schema

`schema/passport-v1.schema.json` is the published JSON Schema. The generator
validates structurally without it — a dependency-free check, since pulling in a
JSON Schema runtime for this would cut against the source-first model — but the
schema file is there so external tooling can validate with whatever it likes.

## Files

```
tools/passport/
├── policy.cjs      which inherited props are worth surfacing
├── extract.cjs     TypeChecker extraction and origin filtering
├── merge.cjs       derived ← manual ← local, with explicit precedence
├── validate.cjs    structural and referential checks, typed issues
├── index.cjs       buildAll / generate / check
├── cli.cjs         npm run passport[:check]
└── __tests__/      31 tests, run by the repo's vitest
schema/passport-v1.schema.json
```
