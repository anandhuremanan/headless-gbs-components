"use client";

import { useState, type CSSProperties } from "react";
import { Spinner } from "@/components/spinner";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

/** Live example used in the Spinner documentation. */
export function SpinnerWrapper() {
  const [loading, setLoading] = useState(false);

  const reload = (ms: number) => {
    setLoading(true);
    setTimeout(() => setLoading(false), ms);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 420,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Spinner size="sm" />
        <Spinner />
        <Spinner size="lg" variant="dots" />
        <Spinner size="sm" showLabel label="Saving…" />
      </div>
      <Spinner
        loading={loading}
        delay={250}
        minDuration={600}
        style={{ borderRadius: 8 }}
      >
        <div
          style={{
            padding: 16,
            border: "1px solid rgb(128 128 128 / 0.3)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7 }}>Monthly active users</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>18,402</div>
        </div>
      </Spinner>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={button} onClick={() => reload(1500)}>
          Reload (1.5 s)
        </button>
        <button type="button" style={button} onClick={() => reload(100)}>
          Quick reload (no flash)
        </button>
      </div>
    </div>
  );
}

export default SpinnerWrapper;
