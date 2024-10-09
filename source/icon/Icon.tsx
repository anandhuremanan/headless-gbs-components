import React from "react";

type SvgElement = {
  type: "path" | "circle";
  key: string;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
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
        }
        return null;
      })}
    </svg>
  );
}
