/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import Stroke from "./Stroke";
import type { SpinnerProps } from "./types";

export const Spinner: React.FC<SpinnerProps> = ({
  size = "h-10 w-10",
  color = "border-blue-600",
  fullCircleColor = "border-t-red-400",
  dotColor = "bg-blue-500",
  duration = "duration-500",
  type = "circle",
  strokeColor = "stroke-blue-500",
}) => {
  if (type === "circle") {
    return (
      <div
        className={`loader ease-linear rounded-full border-4 border-t-4 ${color} ${size} ${duration} border-t-transparent animate-spin`}
      ></div>
    );
  } else if (type === "circle-bg") {
    return (
      <div
        className={`${size} animate-spin rounded-full border-4 ${fullCircleColor}`}
      ></div>
    );
  } else if (type === "dot") {
    return (
      <div className="flex space-x-2 dark:invert">
        <div
          className={`${size} ${dotColor} rounded-full animate-bounce`}
          style={{ animationDelay: "-0.3s" }}
        ></div>
        <div
          className={`${size} ${dotColor} rounded-full animate-bounce`}
          style={{ animationDelay: "-0.15s" }}
        ></div>
        <div
          className={`${size} ${dotColor} rounded-full animate-bounce`}
        ></div>
      </div>
    );
  } else if (type === "stroke") {
    return <Stroke size={size} strokeColor={strokeColor} />;
  } else {
    return null;
  }
};
