# Grampro Kit — Figma design system generator

A private Figma plugin that builds the Grampro Kit design system into any Figma
file, straight from the tokens and components in `component-lib`. Run it once in
an empty file, publish that file as a library, and the design team gets the same
colors, sizes, type and components the React code uses.

## What it creates

| Page | Contents |
| --- | --- |
| **Foundations** | Color swatches in Light and Dark mode, type ramp, radius, control heights, spacing. |
| **Components · Actions & navigation** | Button, Icon button, Spinner, Checkbox (+ CheckboxGroup example), Tab (+ tab list examples), Breadcrumb item and separator (+ trail examples). |
| **Components · Forms** | Input, OTP cell (+ code example), Textarea, Select trigger and option (+ open Select example), Date field and Day cell (+ calendar example). |
| **Components · Choice & quantity** | Switch (+ settings list), Radio and Radio card (+ group and plan examples), NumberInput (+ the same amount in three locales). |
| **Components · Overlays & data** | Modal (dialog and drawers), Dialog, Toast (+ stack), Upload drop zone and file row (+ uploader example), Grid header cell, cell and selection cell (+ full grid example). |
| **Components · Menus & surfaces** | Menu item (+ panel example), Popover, Tooltip, Card (+ interactive and focused examples), Stat (+ tile row), Skeleton (+ loading card), Empty state. |
| **Components · Status & identity** | Alert, Badge and Tag (+ filter row), Avatar (+ group with overflow), Progress (+ rings), Accordion item (+ a group with one open). |

Plus, in the file's local assets:

- **Variables** — `Grampro Kit · Color` (35 colors, Light and Dark modes) and
  `Grampro Kit · Size` (18: radius, control heights, spacing). Each variable's
  description names its CSS counterpart (e.g. `--gbs-accent`), and scopes keep
  text colors to text and border colors to strokes. The components resolve every
  value through the shared `--gbs-*` palette, so setting those four or five
  variables on `:root` in code is the same act as switching a variable mode here.
- **Text styles** — 13 under `Grampro Kit/Body`, `Label`, `Title` and `Numeric`.
- **38 component sets** with variant properties (`Variant`, `Size`, `State`, …),
  text properties (`Label`, `Title`, …) and on/off toggles for optional parts
  (icons, descriptions, counters, badges). Every fill, stroke and radius is bound
  to a variable, so switching a frame to Dark mode restyles it completely.

## Run it (designers)

You need the **Figma desktop app**; development plugins can't be imported in the browser.

1. Create a new Figma design file, e.g. "Grampro Kit".
2. **Plugins → Development → Import plugin from manifest…** and choose
   `design/figma-plugin/manifest.json` from this repository.
3. **Plugins → Development → Grampro Kit — Design System Generator.**
   It takes a minute and closes with a summary.
4. Publish it: **Assets panel → Libraries (book icon) → Publish.** Other files
   then enable the library and use the components and variables.

Dark mode: select a frame, then in the right panel under **Appearance** set the
`Grampro Kit · Color` mode to **Dark**.

> Two variable modes (Light and Dark) need a paid Figma plan. On the Starter
> plan the plugin creates Light only and says so in its summary.

## Running it again

When the code's tokens or components change, update `src/tokens.ts` (and the
generators if a component changed), rebuild, and run the plugin in the same
file:

- **Variables and text styles are updated in place**, so everything bound to
  them — in this file and in files using the published library — picks up the
  new values.
- **Pages are rebuilt.** Previous pages are renamed `… (previous <date>)` rather
  than deleted. Components on the new pages are new components, so for a library
  that's already in use, prefer updating tokens only, or change the affected
  components by hand, to avoid replacing instances in other files.

## Develop

```bash
cd design/figma-plugin
npm install
npm run build    # compiles src/*.ts to dist/code.js (committed, so designers don't need Node)
npm run smoke    # runs the plugin against a mock Figma API to catch runtime errors
```

| File | Purpose |
| --- | --- |
| `src/tokens.ts` | Colors (light/dark), sizes and type — mirror of the CSS variables. |
| `src/lib.ts` | Variables and styles, frame/text/icon builders, variant sets and properties. |
| `src/foundations.ts` | The Foundations page. |
| `src/actions.ts` | Button, Icon button, Spinner, Checkbox, Tabs, Breadcrumb. |
| `src/forms.ts` | Input, OTP, Textarea, Select, DatePicker. |
| `src/controls.ts` | Switch, Radio, RadioGroup, NumberInput. |
| `src/display.ts` | Alert, Badge, Tag, Avatar, Progress, Accordion. |
| `src/overlays.ts` | Modal, Dialog, Toast, FileUploader, DataGrid. |
| `src/surfaces.ts` | Menu, Popover, Tooltip, Card, Stat, Skeleton, Empty state. |
| `src/main.ts` | Pages and orchestration. |

## Limits

- **Font:** Inter stands in for the components' `system-ui` font stack, so text
  metrics differ slightly from the browser.
- **Close, not exact:** components match the CSS in color, size, radius, spacing
  and states, but they aren't pixel-identical, and CSS-only details are
  approximated: `color-mix()` hovers, the sliding tab indicator, animations, and
  the skeleton's pulse and wave (Figma shows their resting state).
- **Icons:** simple stroke icons drawn from the same shapes as the code. Swap in
  your icon library's components if you have one.
- **Not verified in the Figma app:** the plugin was type-checked against Figma's
  official plugin typings and smoke-tested against a mock API. Check the first
  run in Figma before publishing the library.
