import { InputHTMLAttributes } from "react";

export type InputProps = {
  OTPField?: boolean;
  OTPValue?: string;
  OTPLength?: number;
  OTPClass?: string;
  onOTPValueChange?: (value: string) => void;
} & InputHTMLAttributes<HTMLInputElement>;
