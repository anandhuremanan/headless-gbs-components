import React, { type HTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { cardStyles } from "../../globalStyle";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  cardClass?: string;
  interactive?: boolean;
}

export function Card({
  children,
  cardClass,
  className,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={twMerge(
        cardStyles.base,
        interactive ? cardStyles.interactive : "",
        className,
        cardClass
      )}
      {...props}
    >
      {children}
    </div>
  );
}
