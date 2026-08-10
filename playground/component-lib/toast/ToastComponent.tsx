import React, { useEffect } from "react";
import type { Toast } from "./types";
import { useToastStore } from "./toastStore";
import ToastIcon from "./ToastIcon";

interface ToastProps {
  toast: Toast;
}

const leftBorderColors = {
  default: "border-l-zinc-550 dark:border-l-zinc-600",
  success: "border-l-emerald-500",
  error: "border-l-rose-500",
  warning: "border-l-amber-500",
} as const;

const CloseButton = ({ onDismiss }: { onDismiss: () => void }) => (
  <button
    onClick={onDismiss}
    className="shrink-0 rounded-md p-1 transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 focus:outline-none"
  >
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
);

export function ToastComponent({ toast }: ToastProps) {
  const { dismiss } = useToastStore();
  const handleDismiss = () => dismiss(toast.id);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration]);

  if (toast.content) {
    return (
      <div className="relative pointer-events-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-lg">
        {toast.content}
        <div className="absolute top-2 right-2">
          <CloseButton onDismiss={handleDismiss} />
        </div>
      </div>
    );
  }

  const borderClass = leftBorderColors[toast.type || "default"];

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        pointer-events-auto relative flex w-full items-start justify-between
        overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3.5 shadow-lg
        border-l-4 ${borderClass}
        animate-fade-in
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="mt-0.5 shrink-0">
          <ToastIcon type={toast.type} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight leading-none">
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              {toast.description}
            </div>
          )}
        </div>
        {toast.action && (
          <div className="shrink-0 flex items-center gap-2">
            {toast.action}
          </div>
        )}
        <CloseButton onDismiss={handleDismiss} />
      </div>
    </div>
  );
}
