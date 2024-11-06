/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { twMerge } from "tailwind-merge";
import type { ModalProps } from "./types";

export const Modal = ({
  showModal = false,
  modalTitle = "Modal Title",
  modalClass = "fixed z-10 overflow-y-auto inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 transition-opacity",
  modalContentClass = "bg-white m-10 md:w-[80vh] rounded-xl",
  classModalContent = "",
  modalTitleClass = "p-4 text-lg leading-6 font-medium text-gray-900 flex justify-between",
  classModalTitle = "",
  children,
}: ModalProps) => {
  return (
    <>
      {showModal && (
        <div
          className={modalClass}
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={twMerge(modalContentClass, classModalContent)}
            onClick={(e: any) => {
              e.stopPropagation();
            }}
            role="dialog"
          >
            <div className={twMerge(modalTitleClass, classModalTitle)}>
              {modalTitle}
            </div>
            <hr />
            <div className="p-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
};
