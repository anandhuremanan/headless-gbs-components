# Popover

A panel anchored to the control that opens it, for React 19. Rendered in the top
layer, so it is never clipped by a scrolling parent. No runtime dependencies
besides React.

```ts
import { Popover } from "@/components/popover";
import "@/components/popover/styles.css";
```

```tsx
<Popover trigger={<Button variant="outline">Filters</Button>} title="Filters">
  {({ close }) => (
    <>
      <Checkbox label="Only active" />
      <Button size="sm" onClick={close}>Apply</Button>
    </>
  )}
</Popover>
```

| Prop | Default | Description |
| --- | --- | --- |
| `trigger` | — | A single element, cloned with a ref and the ARIA wiring. |
| `open` / `defaultOpen` / `onOpenChange` | — | Controlled or uncontrolled. The reason is `escape`, `outside`, `trigger` or `api`. |
| `title` / `description` | — | Heading inside the panel; `title` also names it. |
| `aria-label` | "More information" | Names the panel when there is no `title`. |
| `side` / `align` | `bottom` / `start` | Flips and clamps to stay on screen. |
| `gap` | `6` | Distance from the trigger. |
| `scrollable` | `false` | Cap the height to the space available and scroll. |
| `autoFocus` | `true` | Move focus into the panel on open. |
| `className`, `classNames`, `style`, `localeText` | — | Slots: `root`, `panel`, `header`, `title`, `description`, `body`. |

`children` may be a function, which receives `{ close }`.

The browser provides light dismiss and Escape; focus returns to the trigger on
close. `data-side` on the root says which side it settled on after flipping, so
the stylesheet can animate from the right direction.

Placement itself lives in `shared/core/position.ts` and is unit-tested there —
this package is the accessible wrapper around it.

Use the Menu for a list of commands, and the Tooltip for a short label on hover.
