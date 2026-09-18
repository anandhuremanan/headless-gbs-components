# Tooltip

A short label shown on hover or keyboard focus, for React 19, following the
WAI-ARIA tooltip pattern. No runtime dependencies besides React.

```ts
import { Tooltip } from "@/components/tooltip";
import "@/components/tooltip/styles.css";
```

```tsx
<Tooltip content="Export as CSV">
  <Button variant="ghost" aria-label="Export"><DownloadIcon /></Button>
</Tooltip>
```

| Prop | Default | Description |
| --- | --- | --- |
| `content` | — | The label. A few words; anything longer belongs in a Popover. |
| `children` | — | A single element, cloned with a ref, handlers and `aria-describedby`. |
| `side` / `align` / `gap` | `top` / `center` / `6` | Flips and clamps to stay on screen. |
| `delay` | `400` | Wait before showing on hover. Keyboard focus never waits. |
| `closeDelay` | `120` | Wait before hiding, so crossing a small gap does not flicker. |
| `disabled` | `false` | Never show it. |
| `className`, `classNames`, `style` | — | Slots: `root`, `content`. |

## What it will not do

**It describes, it does not name.** The tooltip is wired with
`aria-describedby`, so the control keeps its own accessible name — an icon
button still needs an `aria-label`. A tooltip is not a substitute for one.

**Touch devices never see it.** A tooltip on tap covers the thing that was
tapped. Anything essential must be available another way.

**It never takes focus** and is `pointer-events: none`, so it cannot be hovered
or clicked. Content that needs interaction belongs in a Popover.

`Escape` dismisses it wherever focus is, and clicking the control hides it
rather than leaving it over whatever the click did.

The timing rules are framework-free in `core/visibility.ts` and unit-tested
there. Placement comes from `shared/core/position.ts`.
