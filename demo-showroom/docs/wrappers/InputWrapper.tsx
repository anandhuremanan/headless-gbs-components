"use client";

import { useState } from "react";
import { Input } from "@/components/input";

/** Live example used in the Input documentation. */
export function InputWrapper() {
  const [email, setEmail] = useState("ada@example.com");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
      }}
    >
      <Input
        label="Email"
        type="email"
        value={email}
        onValueChange={setEmail}
        leading="@"
        clearable
        description="We'll send the receipt here."
      />
      <Input
        label="Password"
        type="password"
        defaultValue="correct horse"
        required
      />
      <Input
        label="Headline"
        maxLength={40}
        showCount
        placeholder="Say something short"
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        email: {JSON.stringify(email)}
      </code>
    </div>
  );
}

export default InputWrapper;
