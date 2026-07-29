export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  helperText?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  variant?: "default" | "minimal" | "glass";
  className?: string;
}
