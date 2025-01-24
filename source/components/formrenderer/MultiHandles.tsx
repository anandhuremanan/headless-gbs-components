import React from "react";
import { FormItem } from "./types";
import { MultiSelect } from "../multiselect";

interface MultiSelectHandlesProps {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

export default function MultiHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
}: MultiSelectHandlesProps) {
  const handleSelect = (value: string[], key: string) => {
    if (formRef && formRef.current) {
      const hiddenInput = formRef.current.querySelector(
        `input[name="${key}"]`
      ) as HTMLInputElement;

      if (hiddenInput) {
        hiddenInput.value = Array.isArray(value)
          ? JSON.stringify(value)
          : value;
      } else {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = Array.isArray(value) ? JSON.stringify(value) : value;
        formRef.current.appendChild(input);
      }
    }
  };

  return (
    <div className="w-full">
      {item?.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
          {item.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <MultiSelect
        name={item?.name}
        items={item?.options}
        onSelect={(value: string[]) => {
          if (item?.name) {
            handleSelect(value, item.name);
            setRequirementError?.((prevErrors) =>
              prevErrors.filter((errorName) => errorName !== item.name)
            );
          }
        }}
        error={
          item?.name && requirementError.includes(item.name)
            ? `${item.name} is required`
            : undefined
        }
      />
    </div>
  );
}
