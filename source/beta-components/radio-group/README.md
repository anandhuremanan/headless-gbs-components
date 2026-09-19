# Radio and RadioGroup

One choice out of a few, for React 19, styled to match the rest of the library.
The buttons are real `<input type="radio">` elements sharing a `name`, so the
arrow keys roam the group, the group is one tab stop, and the browser validates
it as one required field — without a line of JavaScript. No runtime
dependencies besides React.

```ts
import { Radio, RadioGroup } from "@/components/radio-group";
import "@/components/radio-group/styles.css";
```

```tsx
<RadioGroup
  label="Send the report"
  name="frequency"
  options={["Daily", "Weekly", "Monthly"]}
  value={frequency}
  onValueChange={setFrequency}
/>

{/* Tiles, for choices that need explaining. */}
<RadioGroup
  label="Plan"
  variant="card"
  orientation="horizontal"
  options={[
    { value: "starter", label: "Starter", description: "Up to 3 projects" },
    { value: "team", label: "Team", description: "Unlimited projects and members" },
  ]}
  defaultValue="team"
/>

{/* Or compose them, when each choice needs its own markup. */}
<RadioGroup label="Delivery" name="delivery">
  <Radio value="standard" label="Standard" description="3–5 days" />
  <Radio value="express" label="Express" description="Tomorrow" disabled />
</RadioGroup>
```

**RadioGroup:** `value` / `defaultValue` / `onValueChange` (`string | null`),
`options` (plain strings or full options) or `<Radio value>` children, `label`
(legend), `description`, `error`, `required`, `disabled`, `name`, `size`,
`orientation`, `variant` (`default` `card`), `clearable`, `classNames` (`root`
`legend` `description` `items` `clear` `error`), `localeText`.

**Radio:** `value`, `label`, `description`, `error`, `size`, `disabled`,
`classNames` (`root` `control` `input` `label` `description` `error`), `ref`
(the `<input>`), and every `<input>` attribute.

A radio cannot be unselected by clicking or by keyboard — that is what the
control is — so an optional question needs either `clearable`, which offers a
button that empties the group, or a "None" option of its own.

`normalizeOptions`, `resolveValue` and `hasEnabledOption` are exported from the
framework-free `core`. `resolveValue` is what makes a value the group does not
offer select nothing, rather than guessing at an option the record never chose.
