import React from "react";
import { Toast as ToastType } from "./types";
import { useToastStore } from "./toastAtom";
import Icon from "../icon/Icon";
import { circleCheck, info, x, xCircle } from "../icon/iconPaths";

interface ToastProps {
  toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { dismissToast } = useToastStore();
  const icons = {
    success: (
      <Icon
        elements={circleCheck}
        svgClass="h-4 w-4 stroke-green-500 fill-none dark:stroke-white"
      />
    ),
    error: (
      <Icon
        elements={xCircle}
        svgClass="h-4 w-4 stroke-red-500 fill-none dark:stroke-white"
      />
    ),
    info: (
      <Icon
        elements={info}
        svgClass="h-4 w-4 stroke-blue-500 fill-none dark:stroke-white"
      />
    ),
  };

  return (
    <div
      className={`bg-white px-2 py-3 rounded-lg text-sm flex justify-between w-80 m-2 border shadow-lg ${
        toast.type === "success"
          ? "text-green-500"
          : toast.type === "error"
          ? "text-red-500"
          : "text-blue-500"
      }`}
      role="alert"
    >
      <div className="flex gap-2 items-center">
        {icons[toast.type]}
        <div>{toast.message}</div>
      </div>
      {toast.dismissible && (
        <button onClick={() => dismissToast(toast.id)}>
          <Icon
            elements={x}
            svgClass="h-4 w-4 stroke-gray-500 fill-none dark:stroke-white"
          />
        </button>
      )}
    </div>
  );
};

export default Toast;
