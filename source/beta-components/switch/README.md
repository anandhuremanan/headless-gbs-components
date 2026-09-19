# Switch

A setting that takes effect the moment it is flipped, for React 19, styled to
match the rest of the library. The control is a real
`<input type="checkbox" role="switch">`, so forms, form libraries and assistive
technology work as they do natively — and it is announced as "on"/"off" rather
than "checked". No runtime dependencies besides React.

```ts
import { Switch } from "@/components/switch";
import "@/components/switch/styles.css";
```

```tsx
<Switch label="Email notifications" name="notify" checked={on} onCheckedChange={setOn} />

{/* Return a promise and the switch shows the new setting, spins while it saves,
    and puts itself back if the save fails. */}
<Switch
  label="Two-factor authentication"
  description="Ask for a code from your authenticator app."
  checked={enabled}
  onCheckedChange={(next) => api.setTwoFactor(next)}
/>

{/* A settings row: label first, switch against the right edge. */}
<Switch label="Weekly digest" labelPosition="start" defaultChecked />
```

**Props:** `checked` / `defaultChecked` / `onCheckedChange` (may return a
promise), `value`, `label`, `description`, `error`, `size` (`sm` `md` `lg`),
`labelPosition` (`end` `start`), `loading`, `disabled`, `readOnly`, `required`,
`name`, `classNames` (`root` `control` `input` `track` `thumb` `label`
`description` `error`), `localeText`, `ref` (the `<input>`), and every
`<input>` attribute.

**Keyboard:** **Space** toggles. **→** turns it on and **←** off (mirrored in
right-to-left layouts), which is the ARIA switch pattern.

The `idleToggle`, `request`, `settle` and `adopt` state machine behind the
saving behaviour is exported from the framework-free `core`: it decides what a
failed save goes back to, and ignores the answer to a request that a later one
has already replaced.

Use a **Checkbox** instead when the value is part of a form that is submitted
later, and a Switch when flipping it *is* the action.
