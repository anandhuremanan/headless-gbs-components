import React, { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof value === "string") {
      setCharCount(value.length);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    if (onChange) {
      onChange(e);
    }
  };

  const isFloating = variant === "minimal" && (isFocused || Boolean(value));

  const variantClasses = {
    default: {
      textarea:
        "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 focus:border-black focus:ring-black/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white dark:focus:ring-white/20",
      label: "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300",
    },
    minimal: {
      textarea:
        "border-0 border-b-2 border-zinc-200 bg-transparent px-0 shadow-none focus:border-black dark:border-zinc-800 dark:text-zinc-100 dark:focus:border-white",
      label: twMerge(
        "absolute left-0 pointer-events-none transition-all duration-200",
        isFloating ? "-top-5 text-xs text-black dark:text-white font-semibold" : "top-3 text-sm text-zinc-400"
      ),
    },
    glass: {
      textarea:
        "border border-white/40 bg-white/70 text-zinc-900 shadow-sm backdrop-blur hover:border-white/70 focus:border-black focus:ring-black/20 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-white dark:focus:ring-white/20",
      label: "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300",
    },
  }[variant];

  return (
    <div className={twMerge("relative w-full", className)}>
      {label && variant !== "minimal" && (
        <label className={variantClasses.label}>
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={variant === "minimal" ? (isFocused ? placeholder : "") : placeholder}
          rows={rows}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          className={twMerge(
            "w-full resize-none rounded-lg px-3 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:opacity-60",
            variantClasses.textarea,
            error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""
          )}
          {...props}
        />

        {variant === "minimal" && label && (
          <label
            className={variantClasses.label}
            onClick={() => textareaRef.current?.focus()}
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {error ? (
            <p className="text-xs font-medium text-rose-600">{error}</p>
          ) : helperText ? (
            <p className="text-xs text-zinc-500">{helperText}</p>
          ) : null}
        </div>

        {maxLength && (
          <span
            className={twMerge(
              "shrink-0 text-xs text-zinc-400",
              charCount > maxLength * 0.9 ? "text-amber-600" : "",
              charCount === maxLength ? "text-rose-600" : ""
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};
