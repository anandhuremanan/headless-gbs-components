# GramproKit

**An agent-native UI runtime for React.**

React components you own — styled, dependency-free, and machine-readable. Each
component arrives in your project as source, with its stylesheet, and with a
contract describing what it is and what can safely be done to it.

```bash
npx gbs-add-block@latest -a DataGrid --beta
```

The source lands in `component-lib/`. There is no runtime package to depend on,
and nothing to wait for upstream when you need a change.

## What "agent-native" means here

Most component libraries are built for a human reading documentation. These are
built to be operable by a program as well — a coding agent writing your UI, or
a model driving a grid at runtime — without either one guessing.

Three things make that true, and all three ship today:

**A passport per component.** `passport.json` is generated from the TypeScript
source and drift-checked in CI: every prop with its real type, the events, the
slots, the `data-*` states, and the operations the component actually supports.
Generated, so it cannot quietly stop being true.
→ [`docs/component-passport.md`](docs/component-passport.md)

**A runtime contract.** The passport says what a DataGrid *is*. The runtime
contract says what *this* grid can do right now: these columns, these operators,
this state, this many rows. Counts and bounded summaries only — never your data.
→ [`docs/grid-agent-runtime.md`](docs/grid-agent-runtime.md)

**A validator between intent and action.** Five layers — schema, reference,
coercion, policy, plausibility — stand between a requested operation and
anything happening. `"1 lakh"` becomes `100000` deterministically rather than by
a model's arithmetic. An operation on a column the host restricted is refused
with a reason. Nothing that fails validation runs.

### What that buys you with no AI at all

The runtime ships no model, and most of it is useful anyway:

- **Saved views** and **shareable URLs** — the grid's whole state in a link
- **Undo and redo** across every operation, by snapshot
- **An audit trail** of what changed, in readable labels
- **Confirmation before anything irreversible**, with the affected row count
  computed from a real dry run

A model, when one is added, plugs into the front of that pipeline. It produces
an intent, and the validator treats it exactly as it treats any other untrusted
input. That is the point of the ordering.

## Not headless — styled, and replaceable

An earlier version of this README called these components headless. They are
not. They ship 27 stylesheets with a default look, theming and dark mode, and
the word elsewhere in the ecosystem means *no styles at all*.

What is true is that the styling gets out of your way at three levels: CSS
variables, slot classes, and `data-*` state attributes. Nothing is
`!important`, and nothing needs beating on specificity.

Each component also has a **framework-free core** — `createDialogStore()`,
`createGridEngine()` — with no React imports, usable on a server. That part is
genuinely headless, and the component READMEs document it under "Headless use".

## Documentation

[gramprokit.vercel.app](https://gramprokit.vercel.app) — usage and props per
component.

In this repository:

| | |
| --- | --- |
| [`docs/component-passport.md`](docs/component-passport.md) | the generated contract, and why its text is data rather than instructions |
| [`docs/grid-agent-runtime.md`](docs/grid-agent-runtime.md) | runtime contract, intent schema, the five validation layers, undo, saved views |
| [`docs/grid-agent-evaluation.md`](docs/grid-agent-evaluation.md) | the 230-case corpus and how a model gets measured against it |
| [`docs/agent-native-architecture.md`](docs/agent-native-architecture.md) | where this is going, and which parts are still proposal |

## Agent skill

Install the skill once per project so a coding agent uses these components
correctly instead of guessing at the API:

```bash
npx gbs-add-block@latest -skill
```

It writes the skill at the root of the project you run it in, in the place each
agent looks:

| Agent | Gets |
| --- | --- |
| GBS SE Agent | `.gbs/skills/gbs-components/` (canonical) |
| Claude Code | `.claude/skills/gbs-components/` |
| Antigravity | `.agents/rules/gbs-components.md` |
| Codex | a marked block in `AGENTS.md` |

Pick a subset with `--for claude,codex`, or `--for none` for just `.gbs/`.
Commit the result so everyone's agent picks it up. Re-run to update; a file you
have edited is never replaced without `--force`.

## Status

The 2.x line is in active development and the next release will be a major
version. What is built and tested:

- 27 beta components, source-first, zero runtime dependencies
- Passports for all 27, generated and drift-checked
- The DataGrid agent runtime, with 21 operations and a 230-case corpus
- A model evaluation harness — no model shipped yet

Still open: a browser-local model behind an `ai` prop, operations for DatePicker
and Combobox, and the remaining authored passport metadata. The roadmap and its
unresolved questions are in
[`docs/agent-native-architecture.md`](docs/agent-native-architecture.md).

## Cascade layers (since 2.1.0)

**The application owns CSS cascade order.** Component rules live in a layer of
their own, `gbs`, and the stylesheets no longer declare a global layer order.

Previously every `styles.css` opened with
`@layer theme, base, components, utilities;` — a leaf file asserting the order
of the whole document. Whichever stylesheet the bundler emitted first silently
won that argument. It also meant a Tailwind v3 build failed outright, and
Bootstrap's Reboot could not be put in front of the components.

- Tailwind **v3** projects now build. Utilities override components there too,
  with no setup.
- Tailwind **v4** projects add one line to their global CSS:
  `@layer gbs, utilities;` — **without it, utilities no longer override
  component styles.** This is the migration step.
- Bootstrap, Normalize or any unlayered reset can now be placed before the
  components: `@layer bootstrap, gbs, app, utilities;`
- Projects with no CSS framework need no change.

See the Theming page, "Cascade layers", for the full model.

## Authors

- [@anandhuremanan](https://www.github.com/anandhuremanan)
