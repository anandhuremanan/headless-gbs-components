"use client";

import { useState } from "react";
import { Button } from "../../../source/beta-components/button";

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Live example used in the Button documentation. */
export function ButtonWrapper() {
  const [saved, setSaved] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline" leading={<PlusIcon />}>
          Outline
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
        <Button variant="outline" icon={<PlusIcon />} aria-label="Add" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button
          onClick={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSaved((count) => count + 1);
          }}
        >
          Save (async)
        </Button>
        <code style={{ fontSize: 12, opacity: 0.7 }}>saved: {saved}</code>
      </div>
    </div>
  );
}

export default ButtonWrapper;
