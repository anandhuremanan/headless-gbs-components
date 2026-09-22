"use client";

import { useState } from "react";
import { RadioGroup } from "../../../source/beta-components/radio-group";

/** Live example used in the RadioGroup documentation. */
export function RadioGroupWrapper() {
  const [frequency, setFrequency] = useState<string | null>("Weekly");
  const [plan, setPlan] = useState<string | null>("team");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 520,
      }}
    >
      <RadioGroup
        label="Send the report"
        description="Arrow keys move between the choices; the group is one tab stop."
        name="docs-frequency"
        options={["Daily", "Weekly", "Monthly"]}
        value={frequency}
        onValueChange={setFrequency}
        clearable
      />

      <RadioGroup
        label="Plan"
        name="docs-plan"
        variant="card"
        value={plan}
        onValueChange={setPlan}
        options={[
          {
            value: "starter",
            label: "Starter",
            description: "Up to 3 projects",
          },
          {
            value: "team",
            label: "Team",
            description: "Unlimited projects and members",
          },
          {
            value: "enterprise",
            label: "Enterprise",
            description: "Talk to us",
            disabled: true,
          },
        ]}
      />

      <code style={{ fontSize: 12, opacity: 0.7 }}>
        frequency: {frequency ?? "null"} · plan: {plan ?? "null"}
      </code>
    </div>
  );
}

export default RadioGroupWrapper;
