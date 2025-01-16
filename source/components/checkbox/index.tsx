/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { InputHTMLAttributes } from "react";

export const Checkbox = ({
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input type="checkbox" className="w-5 h-5 cursor-pointer" {...props} />
  );
};
