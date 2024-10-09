/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { useToastStore } from "./toastAtom";
import Toast from "./Toast";
import { ToastPosition } from "./types";

interface ToastsProps {
  position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

export const Toasts: React.FC<ToastsProps> = ({ position = "top-right" }) => {
  const { toasts } = useToastStore();

  return (
    <section
      className={`fixed flex flex-col z-50 p-4 ${positionClasses[position]}`}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </section>
  );
};
