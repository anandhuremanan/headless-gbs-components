"use client";

import { Avatar, AvatarGroup } from "../../../source/beta-components/avatar";

const PEOPLE = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Edsger Dijkstra"];

/** Live example used in the Avatar documentation. */
export function AvatarWrapper() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 520 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {PEOPLE.slice(0, 4).map((name) => (
          <Avatar key={name} name={name} />
        ))}
        <Avatar name="Ada Lovelace" src="https://example.invalid/missing.png" />
        <span style={{ fontSize: 12, opacity: 0.7 }}>a broken image falls back to initials</span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar name="Ada Lovelace" size="xs" />
        <Avatar name="Grace Hopper" size="sm" status="online" />
        <Avatar name="Alan Turing" status="busy" />
        <Avatar name="Katherine Johnson" size="lg" shape="square" status="away" />
        <Avatar name="Edsger Dijkstra" size="xl" />
      </div>

      <AvatarGroup label="Assigned to" max={4}>
        {PEOPLE.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>
    </div>
  );
}

export default AvatarWrapper;
