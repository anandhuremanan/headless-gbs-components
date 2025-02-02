import React from "react";
import { Toast } from "./types";

type ToastState = {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

let listeners: Array<(state: ToastState) => void> = [];
let state: ToastState = {
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2);
    state.toasts = [{ ...toast, id }, ...state.toasts];
    emitChange();
  },
  dismiss: (id) => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
    emitChange();
  },
};

function emitChange() {
  for (let listener of listeners) {
    listener(state);
  }
}

export function useToastStore(): ToastState {
  const [, setUpdate] = React.useState({});

  React.useEffect(() => {
    const listener = () => setUpdate({});
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return state;
}
