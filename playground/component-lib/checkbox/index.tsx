/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { type InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const Checkbox = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      type="checkbox"
      className={twMerge(
        "h-5 w-5 cursor-pointer rounded border-slate-300 text-sky-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
        className
      )}
      {...props}
    />
  );
};

