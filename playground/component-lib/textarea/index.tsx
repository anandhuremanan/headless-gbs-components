import React, { useState, useRef, useEffect } from "react";
import type { TextAreaProps } from "./types";

export const TextArea = ({
  label,
  placeholder = "Enter your text here...",
  value,
  onChange,
  error,
  helperText,
  rows = 4,
  maxLength,
  required = false,
  disabled = false,
  variant = "default",
  className = "",
  ...props
}: TextAreaProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (value) {
      setCharCount(value.length);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCharCount(newValue.length);
    if (onChange) {
      onChange(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "minimal":
        return {
          container: "relative",
          textarea: `w-full px-0 py-3 text-gray-900 placeholder-gray-400 bg-transparent border-0 border-b-2 border-gray-200 resize-none focus:border-blue-500 focus:outline-none ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`,
          label: `absolute left-0 transition-all duration-200 pointer-events-none ${
            isFocused || value
              ? "-top-6 text-sm text-blue-500"
              : "top-3 text-base text-gray-400"
          }`,
        };
      default:
        return {
          container: "relative",
          textarea: `w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-lg resize-none focus:border-blue-500 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 shadow-sm hover:border-gray-300 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : ""
          } ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`,
          label: `block text-sm font-medium text-gray-700 mb-2 ${
            required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""
          }`,
        };
    }
  };

  const variantClasses = getVariantClasses();

  return (
    <div className={`${variantClasses.container} ${className}`}>
      {label && <label className={variantClasses.label}>{label}</label>}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={
            variant === "minimal" && isFocused
              ? placeholder
              : variant === "minimal"
              ? ""
              : placeholder
          }
          rows={rows}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          className={variantClasses.textarea}
          {...props}
        />

        {/* Floating label for minimal variant */}
        {variant === "minimal" && label && (
          <label className={variantClasses.label}>{label}</label>
        )}
      </div>

      {/* Bottom section with helper text, error, and character count */}
      <div className="flex justify-between items-start mt-2">
        <div className="flex-1">
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg
                className="w-4 h-4 mr-1 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}
          {!error && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>

        {maxLength && (
          <div className="ml-4 flex-shrink-0">
            <span
              className={`text-sm ${
                charCount > maxLength * 0.9
                  ? "text-amber-600"
                  : charCount === maxLength
                  ? "text-red-600"
                  : "text-gray-400"
              }`}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
