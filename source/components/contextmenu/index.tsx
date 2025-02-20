import React, { useState, useEffect, useCallback, MouseEvent } from "react";
import { ContextMenuProps, Position } from "./types";

export const ContextMenu: React.FC<ContextMenuProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  const handleContextMenu = useCallback(
    (event: MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault();
      setIsVisible(true);
      setPosition({
        x: event.pageX,
        y: event.pageY,
      });
    },
    []
  );

  const handleClick = useCallback(() => {
    if (isVisible) setIsVisible(false);
  }, [isVisible]);

  useEffect(() => {
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleClick, handleContextMenu]);

  // Ensure menu stays within viewport bounds
  const adjustedPosition = useCallback((position: Position): Position => {
    const menuWidth = 160; // min-width from CSS
    const menuHeight = 200; // approximate max height

    return {
      x: Math.min(position.x, window.innerWidth - menuWidth),
      y: Math.min(position.y, window.innerHeight - menuHeight),
    };
  }, []);

  const finalPosition = adjustedPosition(position);

  return (
    <>
      {isVisible && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]"
          style={{
            top: finalPosition.y,
            left: finalPosition.x,
            zIndex: 1000,
          }}
        >
          {children}
        </div>
      )}
    </>
  );
};
