import { Toast } from "./types";
import { useToastStore } from "./toastStore";

export function useToast() {
  const store = useToastStore();

  return {
    toast: (props: Omit<Toast, "id">) => store.add(props),
    dismiss: store.dismiss,
    toasts: store.toasts,
  };
}
