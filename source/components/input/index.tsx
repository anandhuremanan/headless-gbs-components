/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef } from "react";
import { twMerge } from "tailwind-merge";
import Icon from "../icon/Icon";
import { eye, search } from "../icon/iconPaths";
import type { InputProps } from "./types";
import { iconClass, inputStyles, primary } from "../globalStyle";

export const Input = ({
  OTPField = false,
  OTPValue = "",
  OTPLength = 4,
  OTPClass = inputStyles.otp,
  onOTPValueChange,
  error = undefined,
  ...props
}: InputProps) => {
  const [otpValues, setOtpValues] = useState(new Array(OTPLength).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateOtpValue = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const input = e.target;
    if (input) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = input.value;
      setOtpValues(newOtpValues);
      if (index < OTPLength - 1 && input.value) {
        inputRefs.current[index + 1]?.focus();
      }
      OTPValue = newOtpValues.join("");
      if (onOTPValueChange) onOTPValueChange(OTPValue);
    }
  };

  const handleKeydown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && otpValues[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      setTimeout(() => {
        if (inputRefs.current[index - 1]) {
          const inputEl = inputRefs.current[index - 1];
          if (inputEl) {
            const length = inputEl.value.length;
            inputEl.setSelectionRange(length, length);
          }
        }
      }, 0);
    } else if (e.key === "ArrowRight" && index < OTPLength - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      setTimeout(() => {
        if (inputRefs.current[index + 1]) {
          const inputEl = inputRefs.current[index + 1];
          if (inputEl) {
            const length = inputEl.value.length;
            inputEl.setSelectionRange(length, length);
          }
        }
      }, 0);
    }
  };

  const toggleTypeForPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      {!OTPField ? (
        <div className="text-input-container w-full relative flex flex-col">
          <div className="relative">
            <input
              className={twMerge(
                inputStyles.default,
                error ? inputStyles.error : "",
                "w-full text-black pr-10"
              )}
              {...props}
              type={
                props.type === "password" && showPassword ? "text" : props.type
              }
            />
            {props.type === "search" && (
              <div className="absolute inset-y-0 right-2 flex items-center">
                <Icon elements={search} svgClass={iconClass["grey-common"]} />
              </div>
            )}
            {props.type === "password" && (
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center"
                onClick={toggleTypeForPassword}
              >
                <Icon
                  elements={eye}
                  svgClass={
                    error ? iconClass["error-icon"] : iconClass["grey-common"]
                  }
                />
              </button>
            )}
          </div>
          {error && <div className={primary["error-primary"]}>{error}</div>}
        </div>
      ) : (
        <div className={inputStyles.otpContainer}>
          {Array(OTPLength)
            .fill("")
            .map((_, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                pattern="[0-9]*"
                value={otpValues[index]}
                onChange={(e) => updateOtpValue(index, e)}
                onKeyDown={(e) => handleKeydown(index, e)}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className={OTPClass}
              />
            ))}
        </div>
      )}
    </div>
  );
};
