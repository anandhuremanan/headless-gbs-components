/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef } from "react";
import { twMerge } from "tailwind-merge";
import Icon from "../icon/Icon";
import { eye } from "../icon/iconPaths";
import type { InputProps } from "./types";

export const Input = ({
  OTPField = false,
  OTPValue = "",
  OTPLength = 4,
  OTPClass = "w-8 h-10 m-1 border border-gray-600 rounded-lg text-center",
  onOTPValueChange,
  ...props
}: InputProps) => {
  const [otpValues, setOtpValues] = useState(new Array(OTPLength).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<any>([]);

  const defaultClass = "bg-gray-100 p-2 rounded-lg";

  // This will update the OTP Field Value
  const updateOtpValue = (index: number, e: any) => {
    e.preventDefault();
    const input = e.target;
    if (input) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = input.value;
      setOtpValues(newOtpValues);
      if (index < OTPLength - 1 && input.value) {
        inputRefs.current[index + 1].focus();
      }
      OTPValue = newOtpValues.join("");
      if (onOTPValueChange) onOTPValueChange(OTPValue);
    }
  };

  // Function for handling keyboard navigation in OTP Field
  const handleKeydown = (index: number, e: any) => {
    if (e.key === "Backspace" && otpValues[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < OTPLength - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Password Feild Toggler
  const toggleTypeForPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      {!OTPField ? (
        <div className="text-input-container w-60 relative">
          <input
            className={twMerge(defaultClass, "w-full focus:outline-blue-400")}
            {...props}
            type={
              props.type === "password" && showPassword ? "text" : props.type
            }
          />
          {/* If Type is password, this will show a password visible toggle button */}
          {props.type && props.type === "password" && (
            <button
              className="absolute inset-y-0 right-0 flex items-center pr-2"
              onClick={toggleTypeForPassword}
            >
              <Icon
                elements={eye}
                svgClass={"h-5 w-5 stroke-gray-500 fill-none dark:stroke-white"}
              />
            </button>
          )}
        </div>
      ) : (
        <div className="otp-container">
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
                ref={(ref) => (inputRefs.current[index] = ref)}
                className={OTPClass}
              />
            ))}
        </div>
      )}
    </div>
  );
};
