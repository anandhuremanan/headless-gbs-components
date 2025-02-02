export type ToastType = "default" | "success" | "error" | "warning";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export interface Toast {
  id: string;
  type?: ToastType;
  duration?: number;
  content?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}
