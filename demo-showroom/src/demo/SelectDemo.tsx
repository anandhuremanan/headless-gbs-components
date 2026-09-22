import { useEffect, useMemo, useRef, useState } from "react";
import {
  MultiSelect,
  Select,
  type ComboboxHandle,
  type ComboboxOption,
} from "@/components/combobox";
import { createEmployees, DEPARTMENTS, type Employee } from "./data";

const COUNTRIES: ComboboxOption[] = [
  { value: "in", label: "India", group: "Asia", keywords: ["bharat"] },
  { value: "jp", label: "Japan", group: "Asia" },
  { value: "kr", label: "South Korea", group: "Asia" },
  { value: "sg", label: "Singapore", group: "Asia" },
  { value: "ae", label: "United Arab Emirates", group: "Asia" },
  { value: "de", label: "Germany", group: "Europe", description: "Berlin" },
  { value: "fr", label: "France", group: "Europe", description: "Paris" },
  { value: "es", label: "Spain", group: "Europe", description: "Madrid" },
  { value: "se", label: "Sweden", group: "Europe", description: "Stockholm" },
  {
    value: "uk",
    label: "United Kingdom",
    group: "Europe",
    description: "London",
  },
  { value: "us", label: "United States", group: "Americas" },
  { value: "ca", label: "Canada", group: "Americas" },
  { value: "br", label: "Brazil", group: "Americas" },
  { value: "mx", label: "Mexico", group: "Americas", disabled: true },
  { value: "ng", label: "Nigeria", group: "Africa" },
  { value: "za", label: "South Africa", group: "Africa" },
  { value: "au", label: "Australia", group: "Oceania" },
];

const DEPARTMENT_OPTIONS: ComboboxOption[] = DEPARTMENTS.map((d) => ({
  value: d,
  label: d,
}));

// 10,000 options: the list virtualizes automatically.
const CITY_OPTIONS: ComboboxOption[] = Array.from(
  { length: 10_000 },
  (_, i) => ({
    value: `city-${i}`,
    label: `City ${i + 1}`,
    description: i % 3 === 0 ? "Regional office" : undefined,
  }),
);

const PAGE_SIZE = 20;
const DIRECTORY = createEmployees(2_000);

/** Stands in for an API: search + paging with latency. */
function searchEmployees(search: string, page: number, signal: AbortSignal) {
  return new Promise<{ options: ComboboxOption<number>[]; hasMore: boolean }>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        const term = search.trim().toLowerCase();
        const matches = term
          ? DIRECTORY.filter((e) =>
              `${e.name} ${e.email} ${e.department}`
                .toLowerCase()
                .includes(term),
            )
          : DIRECTORY;
        const slice = matches.slice(0, (page + 1) * PAGE_SIZE);
        resolve({
          options: slice.map((employee: Employee) => ({
            value: employee.id,
            label: employee.name,
            description: `${employee.department} · ${employee.email}`,
          })),
          hasMore: matches.length > slice.length,
        });
      }, 320);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    },
  );
}

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const cardTitle = "mb-1 text-sm font-semibold";
const cardNote = "mb-3 text-xs text-zinc-600 dark:text-zinc-400";

export function SelectDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ClientSelects />
      <ServerSelect />
      <CreatableSelect />
      <FormExample />
    </div>
  );
}

function ClientSelects() {
  const [country, setCountry] = useState<string | null>("de");
  const [departments, setDepartments] = useState<string[]>([
    "Engineering",
    "Design",
  ]);
  const [city, setCity] = useState<string | null>(null);
  const selectRef = useRef<ComboboxHandle<string>>(null);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Client options</h2>
      <p className={cardNote}>
        Search, groups, descriptions, disabled options, and a 10,000-option list
        that virtualizes.
      </p>
      <div className="flex flex-col gap-4">
        <Select
          label="Country"
          options={COUNTRIES}
          value={country}
          onChange={setCountry}
          placeholder="Choose a country"
          description={
            country
              ? `Value: ${country}`
              : "Grouped, with keyword search (try “bharat”)"
          }
        />

        <MultiSelect
          label="Departments"
          options={DEPARTMENT_OPTIONS}
          value={departments}
          onChange={setDepartments}
          max={4}
          placeholder="Pick up to four"
          description="Tags, select all, and a maximum of four"
        />

        <Select
          label="City"
          options={CITY_OPTIONS}
          value={city}
          onChange={setCity}
          placeholder="Search 10,000 cities"
          size="sm"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            onClick={() => selectRef.current?.open()}
          >
            Open “No search”
          </button>
          <Select
            className="max-w-55"
            aria-label="Country, without search"
            ref={selectRef}
            options={COUNTRIES}
            searchable={false}
            value={country}
            onChange={setCountry}
            placeholder="No search box"
          />
        </div>
      </div>
    </section>
  );
}

interface Query {
  search: string;
  page: number;
}

const NO_OPTIONS: ComboboxOption<number>[] = [];

function ServerSelect() {
  const [query, setQuery] = useState<Query>({ search: "", page: 0 });
  const [result, setResult] = useState<{
    query: Query;
    options: ComboboxOption<number>[];
    hasMore: boolean;
  } | null>(null);
  const [people, setPeople] = useState<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    searchEmployees(query.search, query.page, controller.signal).then(
      (response) => setResult({ query, ...response }),
      () => {},
    );
    return () => controller.abort();
  }, [query]);

  // Derived, so the effect never sets state synchronously.
  const loading = result?.query !== query;

  return (
    <section className={card}>
      <h2 className={cardTitle}>Server options</h2>
      <p className={cardNote}>
        The component reports the search text (debounced 250&nbsp;ms) and asks
        for more while scrolling. Stale requests are aborted; chosen names keep
        their labels after the results change.
      </p>
      <div className="flex flex-col gap-4">
        <MultiSelect<number>
          label="Team members"
          mode="server"
          options={result?.options ?? NO_OPTIONS}
          hasMore={result?.hasMore}
          loading={loading}
          onSearchChange={(term) => setQuery({ search: term, page: 0 })}
          onLoadMore={() =>
            !loading && setQuery((prev) => ({ ...prev, page: prev.page + 1 }))
          }
          value={people}
          onChange={setPeople}
          placeholder="Search 2,000 employees"
          emptyMessage="No employee matches that search"
          maxVisibleTags={2}
        />
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Selected ids: {people.length > 0 ? people.join(", ") : "none"}
        </p>
      </div>
    </section>
  );
}

function CreatableSelect() {
  const [tags, setTags] = useState<ComboboxOption[]>([
    { value: "urgent", label: "urgent" },
    { value: "backend", label: "backend" },
  ]);
  const [selected, setSelected] = useState<string[]>(["urgent"]);

  return (
    <section className={card}>
      <h2 className={cardTitle}>Create options</h2>
      <p className={cardNote}>
        Type a value that doesn&apos;t exist and pick “Create …”.
      </p>
      <MultiSelect
        label="Tags"
        options={tags}
        value={selected}
        onChange={setSelected}
        allowCreate
        onCreate={(label) => {
          const option = { value: label.toLowerCase(), label };
          setTags((prev) => [...prev, option]);
          setSelected((prev) => [...prev, option.value]);
        }}
        placeholder="Add tags"
      />
    </section>
  );
}

function FormExample() {
  const [submitted, setSubmitted] = useState<Record<string, string[]> | null>(
    null,
  );
  const [country, setCountry] = useState<string | null>(null);
  const error = useMemo(
    () => (submitted && !country ? "Please choose a country" : undefined),
    [submitted, country],
  );

  return (
    <section className={card}>
      <h2 className={cardTitle}>Inside a form</h2>
      <p className={cardNote}>
        Values post as hidden inputs, so <code>FormData</code> picks them up.
        Required, error and disabled states included.
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSubmitted({
            country: data.getAll("country").map(String),
            departments: data.getAll("departments").map(String),
          });
        }}
      >
        <Select
          name="country"
          label="Country"
          required
          options={COUNTRIES}
          value={country}
          onChange={setCountry}
          error={error}
          placeholder="Required"
        />
        <MultiSelect
          name="departments"
          label="Departments"
          options={DEPARTMENT_OPTIONS}
          defaultValue={["Sales"]}
          size="lg"
        />
        <Select
          label="Disabled"
          options={COUNTRIES}
          disabled
          placeholder="Not available"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Submit
          </button>
          {submitted && (
            <code className="text-xs text-zinc-600 dark:text-zinc-400">
              {JSON.stringify(submitted)}
            </code>
          )}
        </div>
      </form>
    </section>
  );
}
