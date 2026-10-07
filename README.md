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

> **Upgrading from 2.1.0 or 2.2.0 — one line to change.** Component CSS no
> longer lives in a cascade layer, because a layer loses to any unlayered reset
> and that broke Tailwind v3 and Bootstrap outright. Delete any
> `@layer gbs, utilities;` you added, and import the generated barrel:
> `@import "./component-lib/gbs.css";` — with Tailwind v4, after the framework
> and `layer(components)`. The installer prints the line you need, and
> [`CHANGELOG.md`](CHANGELOG.md) has the detail.

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

[kit.gramproindia.com](https://kit.gramproindia.com) — usage and props per
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
- The DataGrid agent runtime: 21 operations, five validation layers, snapshot
  undo, and a frozen 231-case evaluation corpus
- **`<DataGrid ai />`** — a natural-language box, driven by an adapter the
  application supplies. No model is bundled, downloaded or named.
- **WebMCP** — one tool, `operate_grid`, exposing the same validated boundary to
  a browser agent. Needs no model at all.
- A model evaluation harness, with the measurements that justify both

Every producer — a model, a browser agent, a form — proposes. The validator
authorizes. The executor mutates state. That boundary is the architecture, and
it is why no AI path gets a second route into the component.

Still open: operations for DatePicker and Combobox (both are controlled
components with no imperative write API, which the executor abstraction is meant
to solve but has not yet proven), and the remaining authored passport metadata.
The roadmap and its unresolved questions are in
[`docs/agent-native-architecture.md`](docs/agent-native-architecture.md).

## Styles

Install a component and the CLI writes `gbs.css` next to it, importing every
component stylesheet you actually installed. Add one line to your global CSS:

```css
@import "./component-lib/gbs.css";
```

That is all, for Tailwind v3, Bootstrap, and projects with no CSS framework.

**Tailwind v4** is the one exception, because it puts its own utilities in a
cascade layer. Import ours after the framework, inside Tailwind's components
layer, so utilities still win:

```css
@import "tailwindcss";
@import "./component-lib/gbs.css" layer(components);
```

The installer detects which of these you need and prints it. `gbs.css` is
rewritten on every install, so the list stays correct as you add components.

**Why it works this way.** Component CSS ships *unlayered*. An unlayered rule
beats every layered rule regardless of specificity, so a library that puts its
rules in a cascade layer loses to any unlayered reset — Tailwind v3's preflight
and Bootstrap's Reboot both qualify. Unlayered, our rules win on ordinary
specificity (a class beats `*`), and your own CSS and utilities still override
them the normal way. `layer(components)` on the import is native CSS, and is
the standard way to place third-party CSS under Tailwind v4.

If you forget it on v4, the failure is small and local: the component renders
correctly, but a utility passed through `className` will not override it.

### Scrollbars

Every scrolling surface in the kit is thin by default, using the standard
`scrollbar-width` / `scrollbar-color` properties. Restyle them all from `:root`:

```css
:root {
  --gbs-scrollbar-width: auto;              /* auto | thin | none */
  --gbs-scrollbar-thumb: var(--gbs-accent); /* defaults to a muted accent */
  --gbs-scrollbar-track: transparent;
}
```

Add `class="gbs-scroll"` to your own scrolling areas to match. Scroll containers
the kit does not own keep the browser default — it never restyles scrollbars it
was not asked to.

## Authors

- [@anandhuremanan](https://www.github.com/anandhuremanan)
