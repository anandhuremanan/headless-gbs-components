import React from "react";
import { useState } from "react";
import { BarChartProps } from "./type";

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  title = "Title",
  showXValue = true,
}) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value));
  const chartHeight = height * 0.8; // Leave room for labels

  // Calculate y-axis ticks
  const yAxisTicks = Array.from({ length: 6 }, (_, i) =>
    Math.round((maxValue * i) / 5)
  );

  return (
    <div className="w-full p-4">
      <h2 className="text-sm font-bold mb-16 text-gray-800 text-left">
        {title}
      </h2>

      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between pr-2 text-right">
          {yAxisTicks.reverse().map((tick, i) => (
            <div
              key={i}
              className="text-xs text-gray-500 h-8 flex items-center justify-end"
            >
              {tick}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1">
          <div className="relative h-48">
            {/* Bars */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end h-40 space-x-1 pt-4">
              {data.map((d, i) => {
                const barHeight = (d.value / maxValue) * chartHeight;
                const isHovered = hoveredBar === i;

                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    {/* Value label on top of bar when hovered */}
                    {isHovered && (
                      <div className="mb-1 text-xs font-medium bg-gray-800 text-white px-2 py-1 rounded shadow-lg z-10">
                        {d.value}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className={`w-full ${
                        isHovered ? "bg-zinc-800" : "bg-black"
                      } rounded-t transition-all duration-200 ease-in-out relative`}
                      style={{
                        height: `${barHeight}px`,
                        boxShadow: isHovered
                          ? "0 4px 12px rgba(59, 130, 246, 0.5)"
                          : "none",
                      }}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis */}
          <div className="flex border-t border-gray-300 pt-2 mt-2">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="text-sm font-medium text-gray-700">
                  {d.label}
                </div>
                {showXValue && (
                  <div className="text-xs text-gray-500 mt-1">{d.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
