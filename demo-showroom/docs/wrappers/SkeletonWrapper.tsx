"use client";

import { useState, type CSSProperties } from "react";
import { Empty, Skeleton } from "../../../source/beta-components/skeleton";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const panel: CSSProperties = {
  padding: 16,
  border: "1px solid rgb(128 128 128 / 0.3)",
  borderRadius: 8,
};

const InboxIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5 5h14l2 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" />
  </svg>
);

type State = "loading" | "empty" | "loaded";

/** Live example used in the Skeleton documentation. */
export function SkeletonWrapper() {
  const [state, setState] = useState<State>("loading");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 480,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {(["loading", "empty", "loaded"] as const).map((option) => (
          <button
            key={option}
            type="button"
            style={{ ...button, fontWeight: state === option ? 600 : 400 }}
            onClick={() => setState(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div style={panel}>
        {state === "loading" ? (
          <div style={{ display: "flex", gap: 12 }}>
            <Skeleton variant="circle" width={40} />
            <div style={{ flex: 1 }}>
              <Skeleton lines={3} label="Loading activity" />
            </div>
          </div>
        ) : state === "empty" ? (
          <Empty
            size="sm"
            icon={<InboxIcon />}
            title="No activity yet"
            description="Once someone uploads a file, it will show up here."
            actions={
              <button type="button" style={button}>
                Invite your team
              </button>
            }
          />
        ) : (
          <ul
            style={{
              margin: 0,
              paddingInlineStart: 18,
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            <li>Ada uploaded contract.pdf</li>
            <li>Grace commented on INV-1042</li>
            <li>Alan invited two teammates</li>
          </ul>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <Skeleton variant="rect" width={140} height={72} animation="wave" />
        <Skeleton variant="rect" width={100} height={48} animation="pulse" />
        <Skeleton variant="rect" width={60} height={32} animation="none" />
      </div>
    </div>
  );
}

export default SkeletonWrapper;
