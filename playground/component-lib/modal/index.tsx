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
import type { ModalProps } from "./types";

const defaultClasses = {
  modal:
    "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm",
  modalContent:
    "relative max-h-[90vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-950",
  modalTitle:
    "flex items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-slate-950 dark:text-slate-50",
  closeButton:
    "absolute right-3 top-3 rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-white",
  closeIcon: "h-5 w-5 stroke-current fill-none",
};

const sizeClasses = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
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
    className = "",
    size = "md",
    children,
    showCloseButton = false,
    dismissible = false,
    titleId = "modal-title",
    closeButtonContent,
    animationDuration = 200,
    showTitle = true,
  }: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const handleEscKey = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && showModal && dismissible) {
          setShowModal(false);
        }
      },
      [showModal, dismissible, setShowModal]
    );

    const handleOutsideClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && dismissible) {
          setShowModal(false);
        }
      },
      [dismissible, setShowModal]
    );

    const handleClose = useCallback(() => {
      setShowModal(false);
    }, [setShowModal]);

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
          className={twMerge(
            modalContentClass,
            sizeClasses[size],
            className,
            classModalContent
          )}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          role="document"
          tabIndex={-1}
        >
          <div className={twMerge(modalTitleClass, classModalTitle)}>
            {showTitle && <h2 id={titleId}>{modalTitle}</h2>}
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
          {showTitle && <hr className="border-slate-200 dark:border-slate-700" />}
          <div className="max-h-[calc(90vh-73px)] overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-200">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

