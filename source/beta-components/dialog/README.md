# Dialog

Alert, confirm and prompt dialogs for React 19 that you can `await`, styled to
match the rest of the library. No runtime dependencies besides React.

## Setup

```ts
import { dialog, DialogHost } from "@/components/dialog";
import "@/components/dialog/styles.css";
```

Mount `<DialogHost />` once near the root, then:

```tsx
if (await dialog.confirm({ title: "Delete 3 invoices?", intent: "danger", confirmLabel: "Delete" })) {
  await deleteInvoices();
}

const name = await dialog.prompt({ title: "Rename", defaultValue: "report.pdf", required: true });
await dialog.alert("Export finished");
```

- `alert` resolves when closed; `confirm` resolves `true`/`false`; `prompt` resolves the text or `null`.
- `onConfirm` may be async: the dialog shows progress, and if it throws, shows the error and stays open.
- Requests queue and show one at a time. Where there is no document (a server render) they resolve as canceled.
- `<Dialog open onClose>` is the same dialog as a regular controlled component.

## Options

`title`, `description`, `intent` (`default` `info` `success` `warning` `danger`),
`icon`, `confirmLabel`, `cancelLabel`, `dismissible`, `size` (`sm` `md`),
`onConfirm`. Prompt adds `defaultValue`, `placeholder`, `inputLabel`, `inputType`,
`required` and `validate`.

## Headless use

`createDialogStore()` and `createDialogApi(store)` build separate instances; pass
the store to `<DialogHost store={store} />`. The core has no React imports.
