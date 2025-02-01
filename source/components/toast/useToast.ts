import { ToastOptions } from "./types";
import { useToastContext } from "./ToastContext";

const useToast = () => {
  const { addToast, dismissToast } = useToastContext();

  return {
    addToast: ({
      title,
      message,
      type = "info",
      dismissible = false,
      timeout = 3000,
      action,
    }: ToastOptions) =>
      addToast({
        title,
        message,
        type,
        dismissible,
        timeout,
        action,
      }),
    dismissToast,
  };
};

export default useToast;
