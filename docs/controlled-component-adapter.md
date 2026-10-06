# Design issue: the controlled-component operation adapter

**Status:** open. Blocks DatePicker and Combobox operations.
**Opened:** 2026-10-06, out of Phase 2.

DataGrid got operations first because it has somewhere to put them: 31
imperative methods and a fully serialisable `GridState`. DatePicker and
Combobox have neither, and the temptation is to bolt an imperative API onto
them so they fit the shape DataGrid happens to have. That would be the wrong
fix for the wrong reason, so this is written down before anyone does it.

## What the handles actually expose

```ts
interface DatePickerHandle<TValue> {
  open(): void; close(): void; toggle(): void;
  focus(): void; clear(): void; getValue(): TValue;
}

interface ComboboxHandle<V extends OptionValue = string> {
  open(): void; close(): void; toggle(): void; focus(): void;
  clear(): void; getValue(): V[]; getSelectedOptions(): ComboboxOption<V>[];
}
```

Six and seven members. Five of each are presentation or read-only. There is
exactly **one write**: `clear()`. There is no `setValue`, no `select`, no
`setRange`.

So an operation like `setDateRange` has no method to name — and
`tools/passport/validate.cjs` would reject it as `unknown-api-method`, which is
the check doing its job.

## The thing that changes the answer

`clear()` is a write, and it already works on a controlled component. Here is
how:

```ts
// date-picker/react/useDatePicker.ts
const commit = useCallback(
  (next: DateRange, complete: boolean) => {
    if (value === undefined) setInternal(next);   // uncontrolled: own the state
    onSelectionChange(next, complete);            // always: tell the host
  },
  [value, onSelectionChange],
);

const clear = useCallback(() => { /* … */ commit({ start: null, end: null }, true); }, [commit]);
```

`commit` *is* the adapter. It writes internal state when the component owns it
and notifies the host either way — the same path a user's click takes. A
controlled host hears `onChange` and updates its own state, exactly as it
already must.

This matters because the obvious worry — "controlled components can't be
driven imperatively, so they need a different execution model" — turns out not
to hold for this library. The components already have a commit path that
respects control. `clear()` proves it, in production, today.

## The actual question

Narrower than it first looked:

> Should `setValue` join `clear` on the handle, or should an operation on a
> controlled component be performed by a host-supplied adapter?

### Option A — extend the handle

```ts
interface DatePickerHandle<TValue> {
  // …
  setValue(next: TValue): void;   // routes through the same `commit`
}
```

**For.** Consistent with `clear`, which is already a write through the same
path. Two lines per component. The executor looks exactly like DataGrid's, so
there is one execution model rather than two. `apiMethod` stays meaningful, and
the passport's referential check keeps working.

**Against.** It widens the public API of every control, permanently, for a use
case that is still speculative. It also hands any caller with a `ref` a way to
set a value without the host's knowledge — the host *is* told, via `onChange`,
but a host that ignores its own `onChange` would silently diverge. And a
`setValue` that no React user ever calls is API surface we maintain forever.

### Option B — host-supplied adapter

```ts
const agent = createDatePickerAgent({
  handle: pickerRef.current,
  value, onChange,             // the host's own controlled pair
});
```

**For.** No component API change at all. The host stays the single source of
truth, visibly. Works unchanged for a value stored in a form library, a URL, or
a server round-trip — none of which a `ref` can reach.

**Against.** Two execution models to document and test. `apiMethod` is absent
for most operations, so the passport says less. Every integrator writes the
same three lines of wiring, and the ones who get it wrong get it wrong
silently.

### Option C — both, with the adapter as the contract

The executor interface already takes whatever it needs in its closure
(`OperationExecutor` in `shared/core/agent/types.ts` names no handle). So the
*runtime* needs no decision: ship a `valueAdapter` abstraction that one
implementation satisfies from a handle and another from `{ value, onChange }`,
and let the host pick.

**Against.** Choosing not to choose has a cost: two paths, both half-exercised,
and no clear advice to give an integrator.

## Recommendation, for whoever picks this up

Option A, narrowly scoped — but not until an utterance corpus for DatePicker
exists. The reasoning:

1. `clear()` already set the precedent, and refusing `setValue` while keeping
   `clear` is an inconsistency we would have to explain forever.
2. One execution model is worth real money in tests, docs and the passport.
3. The corpus comes first for the same reason it came first for the grid: it is
   what tells you which operations are wanted, before the set is frozen. For
   DatePicker that list is short and mostly semantic — `setDate`, `setRange`,
   `shiftBy`, `clear`, `openTo` — and three of those need no new API at all.

Do **not** add `setDateRange` to make the architecture look symmetrical. An
operation exists because something implements it.

## Things to settle at the same time

- **Combobox `select(value)` vs `setValue(values)`.** Multi-select makes
  "select Kerala" and "the selection is now [Kerala]" different operations.
- **Validation without a dataset.** The grid's plausibility layer counts rows.
  A date picker has `min`, `max` and `disabledDates` instead — a different
  shape of plausibility, not an absent one.
- **What a DatePicker runtime contract holds.** Probably: value, range mode,
  bounds, disabled dates, locale, first day of week, open state. No rows to
  withhold, so the privacy rule is easier; the semantics are harder.
- **Undo.** `DateRange` is serialisable, so the snapshot history works
  unchanged. Worth confirming before assuming it.

## Prerequisites

- [ ] Utterance corpus for DatePicker, ~120 cases, same format as
      `eval/grid/v0/cases.jsonl`.
- [ ] Decide A / B / C above.
- [ ] If A: `setValue` on `DatePickerHandle` and `ComboboxHandle`, routed
      through the existing `commit`, with tests covering the controlled case.
- [ ] Runtime contract shape for a value control.
