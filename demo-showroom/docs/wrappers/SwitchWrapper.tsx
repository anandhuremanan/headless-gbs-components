"use client";

import { useState } from "react";
import { Switch } from "@/components/switch";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Live example used in the Switch documentation. */
export function SwitchWrapper() {
  const [notify, setNotify] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [billing, setBilling] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 420,
      }}
    >
      <Switch
        label="Email notifications"
        checked={notify}
        onCheckedChange={setNotify}
      />

      <Switch
        label="Two-factor authentication"
        description="Saves to a pretend server: watch it spin, then settle."
        checked={twoFactor}
        onCheckedChange={async (next) => {
          await wait(900);
          setTwoFactor(next);
        }}
      />

      <Switch
        label="Sync with the billing system"
        description="This one always fails, so it puts itself back."
        checked={billing}
        onCheckedChange={async () => {
          await wait(900);
          setBilling(false);
          throw new Error("The billing system said no");
        }}
      />

      <Switch label="Weekly digest" labelPosition="start" defaultChecked />
      <Switch label="Disabled" disabled />

      <code style={{ fontSize: 12, opacity: 0.7 }}>
        notifications: {String(notify)} · two-factor: {String(twoFactor)}
      </code>
    </div>
  );
}

export default SwitchWrapper;
