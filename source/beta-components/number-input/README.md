# NumberInput

A numeric field for React 19 that reads and writes numbers the way the locale
does, styled to match the Input component. No runtime dependencies besides
React.

```ts
import { NumberInput } from "@/components/number-input";
import "@/components/number-input/styles.css";
```

```tsx
<NumberInput label="Quantity" min={1} max={99} value={qty} onValueChange={setQty} />

<NumberInput label="Amount" format="currency" currency="USD" decimals={2} locale="en-US" />

{/* 45% in the field is 0.45 in the value, as Intl and CSS both have it. */}
<NumberInput label="Discount" format="percent" step={0.01} min={0} max={1} />
```

**Why not `<input type="number">`:** the wheel silently edits it while the page
scrolls; an entry it considers invalid reports itself as the empty string, so
"nothing" and "not a number yet" cannot be told apart and what was typed is
gone; it understands one notation, so `1.234,56` is not a number to it; and its
spin buttons cannot be styled. This field is a text input with
`role="spinbutton"`, which has none of those problems and the same
announcements.

**Props:** `value` / `defaultValue` / `onValueChange` (`number | null`), `min`,
`max`, `step`, `largeStep`, `snapToStep`, `decimals`, `locale`, `format`
(`decimal` `currency` `percent`), `currency`, `useGrouping`, `clampBehavior`
(`blur` `strict` `none`), `stepper`, `wheel`, `selectOnFocus`, `clearable`,
`label`, `description`, `error`, `size`, `leading`, `trailing`, `disabled`,
`readOnly`, `required`, `classNames` (`root` `label` `control` `input`
`stepper` `description` `error`), `localeText`, `ref` (the `<input>`), and
every `<input>` attribute.

**Keyboard:** **↑** / **↓** step, **Page Up** / **Page Down** step by
`largeStep`, **Home** / **End** jump to `min` / `max` where there is one, and
**Escape** puts back the last committed number.

The field shows a grouped, formatted number at rest and the plain number while
it has focus, so separators never appear under the caret. An entry that cannot
be read falls back to the last good value on blur rather than being discarded.

`parseNumber`, `formatNumber`, `toEditText`, `localeParts`, `stepBy`,
`snapToStep`, `clamp`, `round` and `decimalsOf` are exported from the
framework-free `core` — the same parsing a server can reuse to accept what the
field sends.

**`wheel` is off by default.** Turning it on lets the wheel change a focused
field, which is exactly the behaviour that makes `<input type="number">`
dangerous in a long form.
