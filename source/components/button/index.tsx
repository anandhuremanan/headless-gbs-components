/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { buttonStyles } from "../../globalStyle";
import type { ComponentSize, ComponentVariant } from "../../theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ComponentVariant;
  size?: ComponentSize;
  buttonClass?: string;
}

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  buttonClass,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={twMerge(
        buttonStyles.base,
        buttonStyles.sizes[size],
        buttonStyles.variants[variant],
        className,
        buttonClass
      )}
      {...props}
    >
      {children}
    </button>
  );
};
