export type Option = {
  value: string;
  label: string;
};
export interface FormElement extends HTMLFormElement {
  [key: string]: any;
}

export type FormItem = {
  id?: string;
  name?: string;
  component?:
    | "input"
    | "select"
    | "multi-select"
    | "datepicker"
    | "checkbox"
    | "button";
  type?: string;
  required?: boolean | string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  value?: string;
  label?: string;
  button_type?: "button" | "submit" | "reset";
  key?: string;
  dependency?: string;
  hasDependents?: boolean;
  isReady?: boolean;
  disabled?: string | boolean;
  onChangeEvent?: (event: any) => void;
  stepProperty?: {
    customClass?: {
      inputClass?: string;
    };
  };
};

export type FormRendererProps = {
  onSubmit?: (formData: FormData) => void;
  sourceData?: FormItem[] | undefined;
  formFormationClass?: string;
  formParentClass?: string;
};

// Handler Props Starts here
export type FieldValue = string | boolean | number | null;

export type CheckboxHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
  changeTrigger?: number;
  setChangeTrigger?: React.Dispatch<React.SetStateAction<number>>;
  sourceData?: FormItem[];
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
};

export interface FormContext {
  [componentName: string]: {
    [fieldName: string]: FieldValue;
  };
}

export type InputHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  onChangeEvent?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
};

export type DatePickerHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
};

export type SelectHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError: React.Dispatch<React.SetStateAction<string[]>>;
  formRef: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
};

export type MultiSelectHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
};
// Handler Props Ends here
