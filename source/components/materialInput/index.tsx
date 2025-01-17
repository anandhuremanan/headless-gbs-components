import React, { useState, useRef } from "react";
import { MaterialInputProps } from "./types";

const MaterialInput = ({
  label,
  type = "text",
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  className = "",
}: MaterialInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    if (!value) {
      setIsFocused(false);
    }
  };

  const isFloating = isFocused || value;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={`
            peer w-full px-3 py-3
            bg-transparent
            border rounded-md
            outline-none
            transition-all duration-200 ease-in-out
            placeholder-transparent
            ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500"
            }
            ${disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-900"}
          `}
        />
        <label
          onClick={() => inputRef.current?.focus()}
          className={`
            absolute left-3 
            pointer-events-none
            transition-all duration-200 ease-in-out
            cursor-text
            ${isFloating ? "-top-2 text-xs bg-white px-1" : "top-3 text-base"}
            ${
              error
                ? "text-red-500"
                : isFocused
                ? "text-blue-500"
                : "text-gray-500"
            }
            ${disabled ? "text-gray-400 cursor-not-allowed" : ""}
          `}
        >
          {label}
          {required && " *"}
        </label>
      </div>

      {/* Helper text or error message */}
      {(helperText || error) && (
        <div
          className={`
            mt-1 text-xs
            ${error ? "text-red-500" : "text-gray-500"}
          `}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default MaterialInput;
