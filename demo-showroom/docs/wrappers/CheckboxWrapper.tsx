"use client";

import { useState } from "react";
import { Checkbox } from "../../../source/beta-components/checkbox";

/** Live example used in the Checkbox documentation. */
export function CheckboxWrapper() {
  const [checked, setChecked] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <Checkbox
        label="Email me about new features"
        description="About once a month. Unsubscribe any time."
        checked={checked}
        onCheckedChange={setChecked}
      />
      <Checkbox label="Partly selected" checked="indeterminate" />
      <Checkbox label="Disabled" disabled defaultChecked />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        checked: {String(checked)}
      </code>
    </div>
  );
}

export default CheckboxWrapper;
