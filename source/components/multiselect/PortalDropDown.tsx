import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { popUp } from "../globalStyle";

export const PortalDropdown = ({ targetRef, children, isVisible }: any) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setPosition({
        top: rect.bottom + scrollTop + 4,
        left: rect.left + scrollLeft,
        width: rect.width,
      });
    }
  }, [isVisible, targetRef]);

  if (!isVisible) return null;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 1000,
      }}
      className={popUp["pop-up-style"]}
      data-select-portal="true"
    >
      {children}
    </div>,
    document.body
  );
};
