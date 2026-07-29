import type { InputHTMLAttributes } from "react";

export type MaterialInputProps = {
  label?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  textarea?: boolean;
  rows?: number;
  cols?: number;
} & InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
