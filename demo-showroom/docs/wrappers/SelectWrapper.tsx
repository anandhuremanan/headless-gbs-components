"use client";

import { useState } from "react";
import { Select, type ComboboxOption } from "@/components/combobox";

const COUNTRIES: ComboboxOption[] = [
  { value: "in", label: "India", group: "Asia", keywords: ["bharat"] },
  { value: "jp", label: "Japan", group: "Asia", description: "Tokyo" },
  { value: "kr", label: "South Korea", group: "Asia" },
  { value: "sg", label: "Singapore", group: "Asia" },
  { value: "de", label: "Germany", group: "Europe", description: "Berlin" },
  { value: "fr", label: "France", group: "Europe", description: "Paris" },
  { value: "es", label: "Spain", group: "Europe" },
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
];

/** Live example used in the Select documentation. */
export function SelectWrapper() {
  const [country, setCountry] = useState<string | null>("de");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <Select
        label="Country"
        options={COUNTRIES}
        value={country}
        onChange={setCountry}
        placeholder="Choose a country"
        description="Grouped options with search. Try “bharat” to find India."
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {JSON.stringify(country)}
      </code>
    </div>
  );
}

export default SelectWrapper;
