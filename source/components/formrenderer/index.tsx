import React, { useRef, useState, FormEvent } from "react";
import { useFormContext } from "@grampro/headless-helpers";
import InputHandles from "./componentHandles/InputHandles";
import SelectHandles from "./componentHandles/SelectHandles";
import MultiHandles from "./componentHandles/MultiHandles";
import DatePickerHandles from "./componentHandles/DatePickerHandles";
import CheckboxHandles from "./componentHandles/CheckBoxHandles";
import { FormItem, FormRendererProps } from "./types";

// Component mapping
const COMPONENT_MAP = {
  input: InputHandles,
  select: SelectHandles,
  "multi-select": MultiHandles,
  datepicker: DatePickerHandles,
  checkbox: CheckboxHandles,
} as const;

const validateField = (
  field: HTMLInputElement | null,
  item: FormItem
): boolean => {
  if (!item.required || !item.name || field?.disabled) {
    return true;
  }
  // Explicitly check for null and empty value
  if (!field) {
    return false;
  }
  return field.value.trim() !== "";
};

const FormRenderer: React.FC<FormRendererProps> = ({
  onSubmit,
  sourceData = [],
  formFormationClass = "grid grid-cols-1 text-left gap-4",
  formParentClass = "w-96",
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [requirementError, setRequirementError] = useState<string[]>([]);
  const { context, updateContext } = useFormContext();

  // Handle form submission
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requirementErrorItems = sourceData
      .filter((item) => item.required && item.name)
      .reduce((errors: string[], item) => {
        const field = formRef.current?.querySelector(
          `[name="${item.name}"]`
        ) as HTMLInputElement | null;

        if (!validateField(field, item)) {
          errors.push(item.name!);
        }
        return errors;
      }, []);

    setRequirementError(requirementErrorItems);

    if (requirementErrorItems.length === 0 && onSubmit && formRef.current) {
      onSubmit(new FormData(formRef.current));
    }
  };

  // Render form component based on the type
  const renderFormComponent = (item: FormItem, index: number) => {
    if (item.component === "button") {
      return (
        <div key={index} className="w-full mt-1">
          <button
            type={item.button_type}
            className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800"
          >
            {item.value}
          </button>
        </div>
      );
    }

    const Component = item.component && COMPONENT_MAP[item.component];
    if (!Component) return null;

    return (
      <Component
        key={index}
        item={item}
        requirementError={requirementError}
        setRequirementError={setRequirementError}
        formRef={formRef}
        onChangeEvent={item.onChangeEvent}
        context={context}
        updateContext={updateContext}
      />
    );
  };

  // If no source data is found, return a message
  if (!sourceData.length) {
    return <div>No Source Data Found</div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={formParentClass}>
      <div className={formFormationClass}>
        {sourceData.map(renderFormComponent)}
      </div>
    </form>
  );
};

export default FormRenderer;
