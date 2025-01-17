/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from "react";
import { twMerge } from "tailwind-merge";
import type { ModalProps } from "./types";
import Icon from "../icon/Icon";
import { x } from "../icon/iconPaths";

export const Modal = ({
  showModal = false,
  modalTitle = "Modal Title",
  modalClass = "fixed z-10 overflow-y-auto inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 transition-opacity",
  modalContentClass = "bg-white m-10 md:w-[80vh] rounded-xl relative",
  classModalContent = "",
  modalTitleClass = "p-4 text-lg leading-6 font-medium text-gray-900 flex justify-between items-center",
  classModalTitle = "",
  children,
  showCloseButton = false,
  onClose,
  dissmissible = false,
}: ModalProps) => {
  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showModal && onClose) {
        onClose();
      }
    };

    if (showModal) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showModal, onClose]);

  // Handle click outside modal to close
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (onClose && e.target === e.currentTarget && dissmissible) {
      onClose();
    }
  };

  return (
    <>
      {showModal && (
        <div
          className={modalClass}
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
          onClick={handleOutsideClick}
        >
          <div
            className={twMerge(modalContentClass, classModalContent)}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
            role="dialog"
          >
            <div className={twMerge(modalTitleClass, classModalTitle)}>
              <span>{modalTitle}</span>
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  aria-label="Close modal"
                >
                  <Icon
                    elements={x}
                    svgClass={
                      "h-5 w-5 stroke-gray-500 fill-none dark:stroke-white"
                    }
                  />
                </button>
              )}
            </div>
            <hr className="border-gray-200" />
            <div className="p-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
};
