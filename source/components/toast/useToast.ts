import { ToastOptions } from "./types";
import { useToastStore } from "./toastAtom";

const useToast = () => {
  const { addToast, dismissToast } = useToastStore();

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
