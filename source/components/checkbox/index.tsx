import React, { InputHTMLAttributes } from "react";

export const Checkbox = ({
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input type="checkbox" className="w-5 h-5 cursor-pointer" {...props} />
  );
};
