"use client";

import { useState } from "react";
import { Badge, Tag } from "../../../source/beta-components/badge";

/** Live example used in the Badge documentation. */
export function BadgeWrapper() {
  const [tags, setTags] = useState(["Berlin", "Paris", "Rome"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 520,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Badge variant="success">Active</Badge>
        <Badge variant="warning" dot>
          Degraded
        </Badge>
        <Badge variant="danger" appearance="solid">
          Failed
        </Badge>
        <Badge variant="accent" appearance="outline">
          Beta
        </Badge>
        <Badge>Draft</Badge>
        <Badge size="sm">Small</Badge>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Badge count={3} variant="danger" appearance="solid" />
        <Badge count={128} variant="danger" appearance="solid" />
        <Badge count={0} showZero />
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          a count of 0 without showZero renders nothing
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          minHeight: 24,
        }}
      >
        {tags.map((tag) => (
          <Tag
            key={tag}
            onRemove={() =>
              setTags((current) => current.filter((item) => item !== tag))
            }
          >
            {tag}
          </Tag>
        ))}
        {tags.length === 0 && (
          <button
            type="button"
            onClick={() => setTags(["Berlin", "Paris", "Rome"])}
          >
            Put them back
          </button>
        )}
      </div>
    </div>
  );
}

export default BadgeWrapper;
