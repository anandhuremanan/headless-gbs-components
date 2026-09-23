# Styling

"Headless" here means the components own behaviour and accessibility and ship a
default look you can replace at three levels: CSS variables, slot classes, and
state attributes.

## 1. Stylesheets are per component

Each folder has its own `styles.css`. Import the ones you use, once, anywhere:

```ts
import "component-lib/button/styles.css";
```

or from a root stylesheet:

```css
@import "../component-lib/button/styles.css";
```

Nothing renders correctly without it — the components emit class names only.

## 2. Theme with `--gbs-*` on `:root`

One set of variables themes every component at once. This is the whole theming
API; reach for the other levels only when it is not enough.

```css
:root {
  --gbs-accent: #7c3aed;
  --gbs-accent-soft: #f3e8ff;
  --gbs-radius: 10px;
  --gbs-font-size: 14px;
}
```

Set them on `:root`, not inside a component — components read them through
inheritance, so anything set on an ancestor reaches every control beneath it.

### Resolution order

Each component variable falls through this chain, stopping at the first set:

1. **The component's own variable** — `--in-accent`, `--dg-accent`, `--ck-border`.
   Set this to change one component, or one instance.
2. **The shared variable** — `--gbs-accent`. The one you normally set.
3. **The DataGrid's variable** — `--dg-accent`, when the grid's stylesheet is
   loaded. Kept for projects that themed the grid before the shared variables existed.
4. **The built-in default** — a `light-dark()` pair, so it follows the page's
   colour scheme.

```css
.in-root { --in-accent: var(--gbs-accent, var(--dg-accent, light-dark(#2563eb, #60a5fa))); }
```

### The shared variables

Defaults written light / dark.

**Surfaces and text:** `--gbs-bg` (`#ffffff`/`#0b0b0e`), `--gbs-fg`
(`#18181b`/`#f4f4f5`), `--gbs-muted` (`#71717a`/`#a1a1aa`), `--gbs-subtle`
(`#f4f4f5`/`#1c1c20`), `--gbs-hover` (`#f4f4f5`/`#1f1f23`), `--gbs-input-bg`
(`#ffffff`/`#121216`), `--gbs-readonly-bg` (`#fafafa`/`#0e0e12`),
`--gbs-header-bg` (`#fafafa`/`#111114`), `--gbs-header-fg` (`#3f3f46`/`#d4d4d8`).

**Borders and shape:** `--gbs-border` (`#e4e4e7`/`#27272a`),
`--gbs-border-subtle` (`#f0f0f2`/`#1c1c20`), `--gbs-border-control`
(`#a1a1aa`/`#52525b`), `--gbs-radius` (`8px`), `--gbs-font-size` (`13px`),
`--gbs-shadow`, `--gbs-backdrop`.

**Accent and status:** `--gbs-accent`, `--gbs-accent-soft`,
`--gbs-accent-strong`, `--gbs-accent-fg`, `--gbs-focus`, `--gbs-danger`,
`--gbs-danger-fg`, `--gbs-success`, `--gbs-warning`, `--gbs-info`.

**Grid-specific:** `--gbs-row-alt`, `--gbs-row-hover`, `--gbs-row-selected`,
`--gbs-row-selected-hover`, `--gbs-cell-px`, `--gbs-pin-shadow`,
`--gbs-skeleton`, `--gbs-tab-fg`, `--gbs-tooltip-bg`, `--gbs-tooltip-fg`.

### Per-component prefixes

To change one component only, set its own prefix on its root class:

| Component | Prefix | Root class |
| --- | --- | --- |
| DataGrid | `--dg-*` | `.dg-root` |
| Combobox | `--cb-*` | `.cb-root` |
| Toaster | `--ts-*` | `.ts-region` |
| Input | `--in-*` | `.in-root` |
| Button | `--bt-*` | `.bt-root` |

```css
.cb-root { --cb-accent: #7c3aed; --cb-radius: 12px; }
```

Toasts render on `<body>`, so grid/shared values they inherit must be set on
`:root`.

## 3. Slot classes

`className` goes to the root element only. To reach an inner part, use
`classNames`, a map of slot name to class string:

```tsx
<Input label="Email" classNames={{ root: "mb-4", label: "font-semibold", input: "font-mono" }} />
```

Slots are per component and listed in each `react/props.ts` and in this skill's
`forms.md` / `overlays.md` / `data-display.md`. Passing a slot that does not
exist is silently ignored, so check the list.

Classes are joined with `cx` from `shared/core/cx.ts`, which drops falsy values
— a conditional that evaluates to `undefined` contributes nothing.

## 4. Tailwind

Every `styles.css` declares:

```css
@layer theme, base, components, utilities;
@layer components { /* the component's rules */ }
```

Component rules live in the `components` layer, so **Tailwind utilities passed
through `className` / `classNames` win** without `!important`. That is the
supported way to adjust spacing, typography and layout.

```tsx
<Button className="w-full sm:w-auto" classNames={{ content: "gap-3" }}>Save</Button>
```

Do not use `!important`, and do not write selectors against internal class names
(`.bt-root`, `.dg-cell`) in app CSS — they are implementation detail. Use the
variables or the slots.

## 5. State attributes

Components expose their state as `data-*` attributes, so you can style states
without tracking them in React.

| Attribute | Where |
| --- | --- |
| `data-state="open"` / `"closing"` | Combobox, Popover, Menu, Modal, toasts |
| `data-side` | Popover, Menu, Tooltip — the side it settled on after flipping |
| `data-size` | Controls that take a `size` |
| `data-invalid`, `data-disabled` | Form controls |
| `data-active`, `data-selected` | Combobox options, grid cells and rows |
| `data-editing`, `data-pinned`, `data-density` | DataGrid |
| `data-type`, `data-custom`, `data-swiping` | Toasts |
| `data-position` | Toaster region |
| `aria-sort` | DataGrid header cells |

```css
.cb-option[data-active] { outline: 2px solid var(--gbs-focus); }
```

## 6. Dark mode

Colours are `light-dark()` pairs driven by the page's `color-scheme`, so the
default is whatever the device prefers. To pin it, set `color-scheme` — the
components follow:

```css
:root { color-scheme: light dark; }          /* follow the device */
:root[data-theme="dark"] { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
```

The DataGrid additionally treats a `.dark` or `[data-theme="dark"]` ancestor as
forcing a scheme.

Do not maintain a second palette for dark mode. Override the `--gbs-*` variables
with `light-dark()` pairs, or set them inside your own `[data-theme="dark"]`
block, and every component follows.

## 7. Right-to-left

The components use logical properties and read `dir` from the document, so RTL
works without configuration. Arrow keys in Menu, Switch and Tabs mirror
automatically. The Toaster takes an explicit `dir` prop if one region needs to
differ from the page.
