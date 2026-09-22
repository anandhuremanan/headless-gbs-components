"use client";

import { useEffect, useState } from "react";
import {
  CircularProgress,
  Progress,
} from "../../../source/beta-components/progress";

/** Live example used in the Progress documentation. */
export function ProgressWrapper() {
  const [value, setValue] = useState(18);

  useEffect(() => {
    const timer = setInterval(
      () => setValue((current) => (current >= 100 ? 0 : current + 2)),
      240,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        maxWidth: 460,
      }}
    >
      <Progress label="Uploading report.pdf" value={value} showValue />
      <Progress
        label="Storage"
        value={92}
        showValue
        valueText="9.2 GB of 10 GB"
        variant="warning"
        size="sm"
      />
      <Progress label="Preparing export" value={null} />
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <CircularProgress value={value} showValue />
        <CircularProgress
          value={72}
          size={56}
          thickness={6}
          variant="success"
          showValue
        />
        <CircularProgress value={null} size={28} />
      </div>
    </div>
  );
}

export default ProgressWrapper;
