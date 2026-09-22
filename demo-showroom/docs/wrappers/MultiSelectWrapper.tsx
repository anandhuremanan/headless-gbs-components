"use client";

import { useState } from "react";
import {
  MultiSelect,
  type ComboboxOption,
} from "../../../source/beta-components/combobox";

const SKILLS: ComboboxOption[] = [
  { value: "react", label: "React", group: "Frontend" },
  { value: "typescript", label: "TypeScript", group: "Frontend" },
  {
    value: "css",
    label: "CSS",
    group: "Frontend",
    description: "Layout and theming",
  },
  { value: "node", label: "Node.js", group: "Backend" },
  { value: "dotnet", label: ".NET", group: "Backend" },
  {
    value: "postgres",
    label: "PostgreSQL",
    group: "Backend",
    description: "Relational database",
  },
  { value: "docker", label: "Docker", group: "Platform" },
  { value: "k8s", label: "Kubernetes", group: "Platform", disabled: true },
];

/** Live example used in the MultiSelect documentation. */
export function MultiSelectWrapper() {
  const [skills, setSkills] = useState<string[]>(["react", "typescript"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <MultiSelect
        label="Skills"
        options={SKILLS}
        value={skills}
        onChange={setSkills}
        max={4}
        placeholder="Pick up to four"
        description="Tags, select all, and a maximum of four."
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {JSON.stringify(skills)}
      </code>
    </div>
  );
}

export default MultiSelectWrapper;
