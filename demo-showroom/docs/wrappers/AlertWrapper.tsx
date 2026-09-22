"use client";

import { useState } from "react";
import { Alert } from "@/components/alert";

/** Live example used in the Alert documentation. */
export function AlertWrapper() {
  const [shown, setShown] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 560,
      }}
    >
      <Alert variant="info" title="Read-only workspace">
        You have view access to this project. Ask an owner for edit rights.
      </Alert>
      <Alert variant="warning" title="Your trial ends in 3 days">
        After that the workspace becomes read-only.
      </Alert>
      {shown ? (
        <Alert
          variant="danger"
          title="We could not save your changes"
          onDismiss={() => setShown(false)}
        >
          The connection dropped. Your edits are still here.
        </Alert>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          style={{ alignSelf: "flex-start" }}
        >
          Bring it back
        </button>
      )}
      <Alert variant="success" size="sm">
        240 rows imported.
      </Alert>
    </div>
  );
}

export default AlertWrapper;
