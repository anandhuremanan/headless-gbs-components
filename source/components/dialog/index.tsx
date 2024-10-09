/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { twMerge } from "tailwind-merge";
import type { DialogProps } from "./types";

export const Dialog = ({
  showDialog = false,
  dialogMessage = "Are you sure?",
  dialogActionOne = "OK",
  dialogActionTwo = "Cancel",
  onDialogActionOneClick,
  onDialogActionTwoClick,
  dialogClass = "bg-white p-4 rounded-lg shadow-lg w-96",
  dialogContentClass = "text-lg",
  dialogActionOneStyle = "bg-black hover:bg-black text-white font-bold px-2 py-1 rounded mt-4",
  dialogActionTwoStyle = "border text-black  font-bold px-2 py-1 rounded mt-4 ml-2",
}: DialogProps) => {
  if (!showDialog) return null;
  return (
    <div
      className={twMerge(
        dialogClass,
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <p className={dialogContentClass}>{dialogMessage}</p>
      <button className={dialogActionOneStyle} onClick={onDialogActionOneClick}>
        {dialogActionOne}
      </button>
      <button className={dialogActionTwoStyle} onClick={onDialogActionTwoClick}>
        {dialogActionTwo}
      </button>
    </div>
  );
};
