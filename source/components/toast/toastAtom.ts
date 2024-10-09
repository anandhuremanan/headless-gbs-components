import { atom, useAtom } from "jotai";
import { Toast } from "./types";

export const toastsAtom = atom<Toast[]>([]);

export const useToastStore = () => {
  const [toasts, setToasts] = useAtom(toastsAtom);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.floor(Math.random() * 10000);
    const newToast = { ...toast, id };
    setToasts((prev) => [newToast, ...prev]);
    if (toast.timeout) {
      setTimeout(() => dismissToast(id), toast.timeout);
    }
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismissToast };
};
