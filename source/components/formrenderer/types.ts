export type FormItem = {
  name?: string;
  component?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  value?: string;
  label?: string;
  button_type?: "button" | "submit" | "reset";
  key?: string;
};

export type FormRendererProps = {
  onSubmit?: (formData: FormData) => void;
  sourceData?: FormItem[] | undefined;
  formFormationClass?: string;
  formParentClass?: string;
};
