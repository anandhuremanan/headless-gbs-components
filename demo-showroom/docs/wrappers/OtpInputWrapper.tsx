"use client";

import { useState } from "react";
import { OtpInput } from "../../../source/beta-components/input";

/** Live example used in the Input documentation, for one-time codes. */
export function OtpInputWrapper() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "wrong">("idle");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <OtpInput
        label="Verification code"
        groups={[3, 3]}
        value={code}
        onValueChange={(next) => {
          setCode(next);
          setStatus("idle");
        }}
        onComplete={(next) => setStatus(next === "123456" ? "ok" : "wrong")}
        error={status === "wrong" ? "That code isn't right. Try 123456." : undefined}
        description={status === "ok" ? "Verified." : "Type or paste the 6-digit code. Try 123456."}
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>value: {JSON.stringify(code)}</code>
    </div>
  );
}

export default OtpInputWrapper;
