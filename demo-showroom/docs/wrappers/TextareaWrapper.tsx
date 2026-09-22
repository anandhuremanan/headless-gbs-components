"use client";

import { useState } from "react";
import { Textarea } from "@/components/textarea";

/** Live example used in the Textarea documentation. */
export function TextareaWrapper() {
  const [notes, setNotes] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 480,
      }}
    >
      <Textarea
        label="Delivery notes"
        value={notes}
        onValueChange={setNotes}
        autoResize
        minRows={2}
        maxRows={6}
        maxLength={280}
        showCount
        placeholder="Grows as you type, up to six lines"
        description="Shown to the courier."
      />
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        lines: {notes === "" ? 0 : notes.split("\n").length}
      </code>
    </div>
  );
}

export default TextareaWrapper;
