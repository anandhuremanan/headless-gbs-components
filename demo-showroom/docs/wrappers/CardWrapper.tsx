"use client";

import type { CSSProperties } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Stat,
  trendDirection,
} from "../../../source/beta-components/card";

const button: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid rgb(128 128 128 / 0.4)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const grid: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const UsersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 20v-2a4 4 0 0 0-3-3.9" />
  </svg>
);

/** Live example used in the Card documentation. */
export function CardWrapper() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 620,
      }}
    >
      <div style={grid}>
        <Card>
          <CardBody>
            <Stat
              label="Revenue"
              value="£48,120"
              trend={{
                direction: trendDirection(12.4),
                label: "12.4%",
                description: "vs last month",
              }}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            {/* Down is the good outcome here, so the colour flips but the arrow
                still points the way the number moved. */}
            <Stat
              label="Churn"
              value="2.1%"
              trend={{
                direction: trendDirection(0.6),
                label: "0.6pp",
                invert: true,
                description: "vs last month",
              }}
            />
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody>
            <Stat
              label="Active users"
              value="1,284"
              icon={<UsersIcon />}
              help="Updated a minute ago"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={<h3 style={{ margin: 0, fontSize: 15 }}>Recent invoices</h3>}
          description="The last three, newest first"
          actions={
            <button type="button" style={button}>
              Export
            </button>
          }
        />
        <CardBody>
          <ul
            style={{
              margin: 0,
              paddingInlineStart: 18,
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            <li>INV-1043 · £2,400 · paid</li>
            <li>INV-1042 · £980 · pending</li>
            <li>INV-1041 · £1,150 · paid</li>
          </ul>
        </CardBody>
        <CardFooter>
          <button type="button" style={button}>
            View all
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default CardWrapper;
