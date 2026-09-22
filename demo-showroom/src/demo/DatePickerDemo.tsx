import { useRef, useState } from "react";
import {
  addDays,
  DatePicker,
  DateRangePicker,
  startOfMonth,
  toISODate,
  type DatePickerHandle,
  type DatePreset,
  type DateRange,
} from "../../../source/beta-components/date-picker";

const card = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";
const button = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";

const TODAY = new Date();
const PRESETS: DatePreset[] = [
  { label: "Today", range: { start: TODAY, end: TODAY } },
  { label: "Last 7 days", range: { start: addDays(TODAY, -6), end: TODAY } },
  { label: "Last 30 days", range: { start: addDays(TODAY, -29), end: TODAY } },
  { label: "This month", range: { start: startOfMonth(TODAY), end: TODAY } },
];

const LOCALES = ["en-GB", "en-US", "de-DE", "ja-JP"] as const;

export function DatePickerDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BasicPicker />
      <LimitedPicker />
      <RangePicker />
      <FormExample />
    </div>
  );
}

function BasicPicker() {
  const [date, setDate] = useState<Date | null>(null);
  const [locale, setLocale] = useState<string>("en-GB");
  const pickerRef = useRef<DatePickerHandle<Date | null>>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Basic</h2>
      <p className={cardNote}>
        Type a date or pick one. The field order, month names and first day of the week follow the
        locale; ISO and month names (“12 Mar 2026”) are always accepted.
      </p>
      <div className="flex flex-col gap-4">
        <DatePicker
          label="Delivery date"
          locale={locale}
          value={date}
          onChange={setDate}
          description={date ? `Value: ${toISODate(date)}` : "Nothing selected"}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-600 dark:text-zinc-400" htmlFor="locale">
            Locale
          </label>
          <select
            id="locale"
            className={button}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {LOCALES.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <button type="button" className={button} onClick={() => pickerRef.current?.open()}>
            Open the small one
          </button>
        </div>

        <DatePicker
          ref={pickerRef}
          size="sm"
          locale={locale}
          placeholder="Small, no typing"
          allowInput={false}
          defaultValue={TODAY}
        />
      </div>
    </section>
  );
}

function LimitedPicker() {
  const [date, setDate] = useState<Date | null>(null);
  const min = addDays(TODAY, -30);
  const max = addDays(TODAY, 60);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Limits and blocked days</h2>
      <p className={cardNote}>
        Bookable between {toISODate(min)} and {toISODate(max)}, weekends excluded. Week numbers are
        on, and the week starts on Sunday.
      </p>
      <div className="flex flex-col gap-4">
        <DatePicker
          label="Appointment"
          value={date}
          onChange={setDate}
          min={min}
          max={max}
          weekStartsOn={0}
          showWeekNumbers
          isDateDisabled={(day) => day.getDay() === 0 || day.getDay() === 6}
          error={date && date.getDay() === 5 ? "Fridays fill up fast — double-check." : undefined}
          description="Weekends are blocked; the arrows stop at the limits."
        />
        <DatePicker label="Disabled" defaultValue={TODAY} disabled />
        <DatePicker label="Read-only" defaultValue={TODAY} readOnly />
      </div>
    </section>
  );
}

function RangePicker() {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });

  return (
    <section className={card}>
      <h2 className={cardTitle}>Range</h2>
      <p className={cardNote}>
        Two months, shortcuts down the side, and a preview band while you pick the second date.
      </p>
      <div className="flex flex-col gap-4">
        <DateRangePicker
          label="Reporting period"
          value={range}
          onChange={setRange}
          presets={PRESETS}
          description={
            range.start && range.end
              ? `${toISODate(range.start)} → ${toISODate(range.end)}`
              : range.start
                ? "Now pick the end date"
                : "Nothing selected"
          }
        />
        <DateRangePicker label="One month at a time" numberOfMonths={1} size="sm" />
      </div>
    </section>
  );
}

function FormExample() {
  const [posted, setPosted] = useState<string | null>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>In a form</h2>
      <p className={cardNote}>
        Uncontrolled fields post ISO dates through hidden inputs — the range posts
        <code className="px-1">period-start</code> and <code className="px-1">period-end</code>.
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setPosted(
            [...data.entries()].map(([key, entry]) => `${key}=${String(entry) || "—"}`).join("  "),
          );
        }}
      >
        <DatePicker label="Invoice date" name="invoice" defaultValue={TODAY} required />
        <DateRangePicker label="Period" name="period" defaultValue={PRESETS[1].range} />
        <div className="flex items-center gap-2">
          <button type="submit" className={button}>
            Submit
          </button>
          <code className="text-xs text-zinc-600 dark:text-zinc-400">{posted ?? "not submitted"}</code>
        </div>
      </form>
    </section>
  );
}
