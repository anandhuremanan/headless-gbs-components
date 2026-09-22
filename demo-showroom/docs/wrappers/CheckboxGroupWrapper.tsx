"use client";

import { useState } from "react";
import {
  CheckboxGroup,
  type CheckboxOption,
} from "../../../source/beta-components/checkbox";

const PERMISSIONS: CheckboxOption[] = [
  { value: "read", label: "View invoices" },
  { value: "create", label: "Create invoices" },
  {
    value: "approve",
    label: "Approve payments",
    description: "Finance team only",
  },
  { value: "export", label: "Export data", disabled: true },
];

/** Live example used in the Checkbox documentation, for groups. */
export function CheckboxGroupWrapper() {
  const [values, setValues] = useState<string[]>(["read"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <CheckboxGroup
        label="Permissions"
        options={PERMISSIONS}
        value={values}
        onValueChange={setValues}
        selectAll
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {JSON.stringify(values)}
      </code>
    </div>
  );
}

export default CheckboxGroupWrapper;
