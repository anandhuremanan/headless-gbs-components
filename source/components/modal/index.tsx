/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useCallback, memo, useRef } from "react";
import { twMerge } from "tailwind-merge";
import Icon from "../icon/Icon";
import { x } from "../icon/iconPaths";
import { ModalProps } from "./types";

const defaultClasses = {
  modal:
    "fixed z-10 overflow-y-auto inset-0 flex items-center justify-center bg-[#2b2426bd]",
  modalContent: "bg-white m-10 md:w-[80vh] rounded-xl relative",
  modalTitle:
    "p-4 text-lg leading-6 font-medium text-gray-900 flex justify-between items-center",
  closeButton:
    "p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300",
  closeIcon: "h-5 w-5 stroke-gray-500 fill-none",
};

export const Modal = memo(
  ({
    showModal = false,
    setShowModal,
    modalTitle = "Modal Title",
    modalClass = defaultClasses.modal,
    modalContentClass = defaultClasses.modalContent,
    classModalContent = "",
    modalTitleClass = defaultClasses.modalTitle,
    classModalTitle = "",
    children,
    showCloseButton = false,
    dismissible = false,
    titleId = "modal-title",
    closeButtonContent,
    animationDuration = 200,
  }: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Handle ESC key press to close modal
    const handleEscKey = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && showModal && dismissible) {
          setShowModal(false);
        }
      },
      [showModal, dismissible, setShowModal]
    );

    // Handle click outside modal to close
    const handleOutsideClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && dismissible) {
          setShowModal(false);
        }
      },
      [dismissible, setShowModal]
    );

    // Handle close button click
    const handleClose = useCallback(() => {
      setShowModal(false);
    }, [setShowModal]);

    // Manage focus trap and keyboard events
    useEffect(() => {
      if (showModal) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        document.addEventListener("keydown", handleEscKey);
        document.body.style.overflow = "hidden";
        modalRef.current?.focus();
      } else {
        document.removeEventListener("keydown", handleEscKey);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      }

      return () => {
        document.removeEventListener("keydown", handleEscKey);
        document.body.style.overflow = "";
      };
    }, [showModal, handleEscKey]);

    // Animation styles
    const modalStyles: React.CSSProperties = {
      transition: `opacity ${animationDuration}ms ease-in-out`,
      opacity: showModal ? 1 : 0,
      visibility: showModal ? "visible" : "hidden",
    };

    if (!showModal) {
      return null;
    }

    return (
      <div
        className={modalClass}
        aria-labelledby={titleId}
        role="dialog"
        aria-modal="true"
        onClick={handleOutsideClick}
        style={modalStyles}
      >
        <div
          ref={modalRef}
          className={twMerge(modalContentClass, classModalContent)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          role="document"
          tabIndex={-1}
        >
          <div className={twMerge(modalTitleClass, classModalTitle)}>
            <h2 id={titleId}>{modalTitle}</h2>
            {showCloseButton && (
              <button
                onClick={handleClose}
                className={defaultClasses.closeButton}
                aria-label="Close modal"
                type="button"
              >
                {closeButtonContent || (
                  <Icon elements={x} svgClass={defaultClasses.closeIcon} />
                )}
              </button>
            )}
          </div>
          <hr className="border-gray-200" />
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

export default Modal;
