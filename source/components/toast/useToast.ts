import { ToastOptions } from "./types";
import { useToastStore } from "./toastAtom";

const useToast = () => {
  const { addToast, dismissToast } = useToastStore();

  return {
    addToast: ({
      message,
      type = "info",
      dismissible = false,
      timeout = 3000,
    }: ToastOptions) =>
      addToast({
        message,
        type,
        dismissible,
        timeout,
      }),
    dismissToast,
  };
};

export default useToast;
