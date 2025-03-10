/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useMemo, memo } from "react";

type SkeletonType = "text" | "circle" | "rectangle";

interface SkeletonProps {
  type?: SkeletonType;
  lines?: number;
  height?: string | number;
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
  animationDuration?: number;
  keyframes?: string;
}

const Skeleton: React.FC<SkeletonProps> = memo(
  ({
    type = "text",
    lines = 1,
    height,
    width,
    className = "",
    style = {},
    animationDuration = 1.5,
    keyframes = `
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  `,
  }) => {
    const getStyle = useMemo(() => {
      const baseStyle: React.CSSProperties = {
        backgroundColor: "#e0e0e0",
        borderRadius: "4px",
        animation: `pulse ${animationDuration}s ease-in-out 0.5s infinite`,
        width: width || "100%",
        ...style,
      };

      switch (type) {
        case "text":
          return {
            ...baseStyle,
            height: height || "16px",
            marginBottom: "8px",
          };
        case "circle":
          return {
            ...baseStyle,
            height: height || "48px",
            width: width || "48px",
            borderRadius: "50%",
          };
        case "rectangle":
          return {
            ...baseStyle,
            height: height || "120px",
          };
        default:
          return baseStyle;
      }
    }, [type, height, width, style, animationDuration]);

    const renderLines = useMemo(() => {
      if (type !== "text" || lines <= 1) return null;

      return Array.from({ length: lines - 1 }, (_, index) => (
        <div
          key={index}
          className={`skeleton-line ${className}`}
          style={getStyle}
        />
      ));
    }, [type, lines, className, getStyle]);

    return (
      <div className="skeleton-wrapper" style={{ width: "100%" }}>
        <style>{keyframes}</style>
        <div className={`skeleton ${className}`} style={getStyle} />
        {renderLines}
      </div>
    );
  }
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
