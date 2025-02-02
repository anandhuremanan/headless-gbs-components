"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { ToastPosition } from "./types";
import { useToastStore } from "./toastStore";
import { ToastComponent } from "./ToastComponent";

const positions: Record<ToastPosition, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export function Toaster({
  position = "top-right",
}: {
  position?: ToastPosition;
}) {
  const [mounted, setMounted] = React.useState(false);
  const { toasts } = useToastStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed z-50 flex flex-col gap-2 w-full max-w-[420px] ${positions[position]}`}
    >
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}
