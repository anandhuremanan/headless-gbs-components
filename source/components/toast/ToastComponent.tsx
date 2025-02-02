import React, { useEffect } from "react";
import { Toast } from "./types";
import { useToastStore } from "./toastStore";

interface ToastProps {
  toast: Toast;
}

const bgColors = {
  default: "bg-white hover:bg-gray-50",
  success: "bg-green-50 hover:bg-green-100",
  error: "bg-red-50 hover:bg-red-100",
  warning: "bg-yellow-50 hover:bg-yellow-100",
} as const;

const iconColors = {
  default: "text-gray-800",
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
} as const;

const CloseButton = ({ onDismiss }: { onDismiss: () => void }) => (
  <button
    onClick={onDismiss}
    className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/10"
  >
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
);

const ToastIcon = ({ type }: { type: Toast["type"] }) => {
  if (!type) return null;

  return (
    <div className={`h-5 w-5 ${iconColors[type]}`}>
      {type === "success" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {type === "error" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {type === "warning" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
    </div>
  );
};

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
      <div className="relative">
        {toast.content}
        <div className="absolute top-2 right-2">
          <CloseButton onDismiss={handleDismiss} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        ${bgColors[toast.type || "default"]}
        transform transition-all duration-300 ease-in-out
        pointer-events-auto relative flex w-full items-center justify-between
        overflow-hidden rounded-lg border p-4 shadow-lg
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 w-full">
        <ToastIcon type={toast.type} />
        <div className="flex-1">
          {toast.title && (
            <div className="font-medium text-sm text-gray-900">
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className="text-sm text-gray-500 mt-1">
              {toast.description}
            </div>
          )}
        </div>
        {toast.action}
        <CloseButton onDismiss={handleDismiss} />
      </div>
    </div>
  );
}
