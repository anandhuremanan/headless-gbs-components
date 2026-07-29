import React from "react";

type SvgElement = {
  type: "path" | "circle" | "polyline" | "rect" | "line";
  key: string;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  points?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

type IconProps = {
  svgClass?: string;
  elements?: SvgElement[];
  dimensions?: any;
};

export default function Icon({
  svgClass = "stroke-none fill-none",
  elements = [
    { type: "path", d: "m11 17-5-5 5-5", key: "13zhaf" },
    { type: "path", d: "m18 17-5-5 5-5", key: "h8a8et" },
    { type: "circle", cx: 12, cy: 12, r: 5, key: "circle1" },
    { type: "polyline", points: "20 6 12 13 4 6", key: "polyline1" },
    {
      type: "rect",
      x: 4,
      y: 4,
      width: 16,
      height: 16,
      key: "rect1",
      rx: 2,
      ry: 2,
    },
    { type: "line", x1: 0, y1: 0, x2: 24, y2: 24, key: "line1" }, // Example line
  ],
  dimensions = { width: "24", height: "24" },
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={svgClass}
    >
      {elements.map((element) => {
        if (element.type === "path") {
          return <path d={element.d} key={element.key} />;
        } else if (element.type === "circle") {
          return (
            <circle
              cx={element.cx}
              cy={element.cy}
              r={element.r}
              key={element.key}
            />
          );
        } else if (element.type === "polyline") {
          return <polyline points={element.points} key={element.key} />;
        } else if (element.type === "rect") {
          return (
            <rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              rx={element.rx}
              ry={element.ry}
              key={element.key}
            />
          );
        } else if (element.type === "line") {
          return (
            <line
              x1={element.x1}
              y1={element.y1}
              x2={element.x2}
              y2={element.y2}
              key={element.key}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
