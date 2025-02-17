export interface FormElement extends HTMLFormElement {
  [key: string]: any;
}

export type FormItem = {
  id?: string;
  name?: string;
  component?: string;
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

interface DependencyConfig {
  source: string;
  parent?: string;
  dataStructure: any;
}

export type FormRendererProps = {
  onSubmit?: (formData: FormData) => void;
  sourceData?: FormItem[] | undefined;
  formFormationClass?: string;
  formParentClass?: string;
  dependencyConfig?: Record<string, DependencyConfig>;
};

export type SelectHandlesProps = {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
  dependencyMap?: Record<
    string,
    {
      source: string;
      parent?: string;
      dataStructure: any;
    }
  >;
};

export type Option = {
  value: string;
  label: string;
};

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

export type FieldValue = string | boolean | number | null;

export interface FormContext {
  [componentName: string]: {
    [fieldName: string]: FieldValue;
  };
}
