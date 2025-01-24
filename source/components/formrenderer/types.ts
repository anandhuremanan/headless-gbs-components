export type FormItem = {
  id?: string;
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
  dependency?: string;
  hasDependents?: boolean;
  isReady?: boolean;
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
