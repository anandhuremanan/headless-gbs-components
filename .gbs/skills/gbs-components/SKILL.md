---
name: gbs-components
description: Builds UI with the GBS headless component library (gbs-add-block). Use when adding or changing UI in apps that have a component-lib/ folder.
autoAttach: ["src/**/*.tsx", "src/**/*.jsx", "app/**/*.tsx", "components/**/*.tsx"]
---

# GBS components (2.0 beta)

## Install before you import

Not an npm dependency — the CLI **copies source into the repo**:

```bash
npx gbs-add-block -a Button,Input,Modal --beta
```

Writes `component-lib/<folder>/` plus `component-lib/shared/`. Always pass
`--beta`. Import the folder barrel **and its stylesheet** (or the repo's alias):

```ts
import { Button } from "component-lib/button";
import "component-lib/button/styles.css";
```

Folder = lowercased name, except `data-grid`, `date-picker`, `file-uploader`,
`number-input`, `radio-group`.

## Rules most often missed

1. **Change handlers are named per component.** `onValueChange`: Input,
   OtpInput, Textarea, NumberInput, CheckboxGroup, RadioGroup, Tabs, Accordion,
   MenuRadioGroup. `onCheckedChange`: Checkbox, Switch, MenuCheckboxItem.
   `onChange`: Select, MultiSelect, DatePicker, DateRangePicker, FileUploader.
   `onOpenChange`: Modal, Popover, Menu.
2. **Never hand-roll `<label>`, hint or error markup.** Fields take `label`,
   `description` and `error`; `error` also marks the control invalid and wires
   `aria-describedby`. A `<label>` wrapper breaks it.
3. **Style via `classNames` slots** (`classNames={{ root, label }}`);
   `className` hits the root only. Theme globally with `--gbs-*` on `:root`.
4. **Mount `<Toaster />` and `<DialogHost />` once at the app root**, or
   `toast()` and `dialog.confirm()` do nothing.
5. **All are client components** (`"use client"`); a Next.js Server Component
   can render them but not pass function props.
6. **Compound families throw outside their parent**: Tab/TabList/TabPanel need
   Tabs, AccordionItem needs Accordion, MenuItem needs Menu.

## Inventory (required props in parens)

**Forms** — Input, Textarea, NumberInput (locale-aware), OtpInput; Checkbox +
CheckboxGroup; Radio (`value`) + RadioGroup; Switch (applies immediately);
Select and MultiSelect (`options`; searchable, client or server); DatePicker and
DateRangePicker; FileUploader (chunked).

**Actions** — Button: variants, sizes, icons, auto-loading from a returned
promise; `render` draws a router link.

**Overlays** — Modal (native `<dialog>`, also drawers); `dialog` + DialogHost
(`await dialog.confirm/alert/prompt`); Popover (`trigger`); Menu (`trigger`) with
MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuGroup,
MenuSeparator, MenuSub; Tooltip (`content`); `toast` + Toaster.

**Data** — DataGrid (`data`, `columns`) + createColumnHelper: virtualized;
sort, filter, edit, CSV/Excel/PDF export.

**Display** — Tabs/TabList/Tab (`value`)/TabPanel (`value`); Accordion +
AccordionItem (`value`); Card/CardHeader/CardBody/CardFooter/Stat; Alert; Badge
and Tag; Avatar and AvatarGroup; Progress and CircularProgress (`value={null}`
is indeterminate); Skeleton and Empty; Spinner; Breadcrumb (`items`,
`renderLink`).

## Example

```tsx
"use client";
import { useState } from "react";
import { Button } from "component-lib/button";
import { Input } from "component-lib/input";
import { Select } from "component-lib/combobox";
import { Modal } from "component-lib/modal";
import { toast } from "component-lib/toaster";
// plus each styles.css, once

const ROLES = [{ value: "admin", label: "Admin" }, { value: "dev", label: "Dev" }];

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const invalid = !!email && !email.includes("@");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite</Button>
      <Modal open={open} onOpenChange={setOpen} title="Invite a teammate"
        footer={({ close }) => (
          <Button disabled={!email || invalid} onClick={async () => {
            await invite({ email, role });
            toast.success("Invitation sent");
            close();
          }}>Send</Button>
        )}>
        <Input label="Email" type="email" value={email} onValueChange={setEmail}
          required error={invalid ? "Enter a valid email" : undefined} />
        <Select label="Role" options={ROLES} value={role} onChange={setRole} />
      </Modal>
    </>
  );
}
```

## Don't

- Raw `<button>`, `<input>`, `<select>`, `<table>`, `<dialog>`, or a hand-built
  modal/menu/tooltip, when a component exists.
- Deep imports (`.../input/react/Input`); import the barrel. Only `<name>/core`
  is also public.
- Editing `component-lib/shared/`; the CLI replaces it on update.
- Invented props: no `asChild`, no `variant` on Input, no `onChange` on Switch.
- `!important` or internal class selectors; set `--gbs-*` or pass `classNames`.
- A Tooltip as a name; icon buttons need `aria-label`.

## Details (in `references/`)

- `install.md` — CLI flags, folders, `shared/`, 1.x vs beta.
- `forms.md` — text and choice fields, controlled state, form posting.
- `pickers.md` — Select, MultiSelect, DatePicker, FileUploader.
- `overlays.md` — Modal, dialog, Popover, Menu, Tooltip.
- `toaster.md` — `toast()` and `<Toaster />`.
- `data-grid.md` — columns, API, export.
- `data-display.md` — Card, Tabs, Accordion, Badge, Avatar, Progress.
- `styling.md` — tokens, layers, Tailwind, slots, `data-*`, dark.
- `accessibility.md` — what is supplied, what you add.
