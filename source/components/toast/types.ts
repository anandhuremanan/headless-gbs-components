import { ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: number;
  type: ToastType;
  message: string | ReactNode;
  dismissible: boolean;
  timeout: number;
};

export type ToastOptions = {
  message: string | ReactNode;
  type?: ToastType;
  dismissible?: boolean;
  timeout?: number;
};

export type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
