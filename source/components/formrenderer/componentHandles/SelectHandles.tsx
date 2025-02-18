import React, { useState } from "react";
import { Select } from "../../select";

interface Option {
  value: string;
  label: string;
}

interface SelectHandlesProps {
  item?: {
    name?: string;
    label?: string;
    options?: Option[];
    value?: string;
    required?: boolean;
  };
  requirementError: string[];
  setRequirementError: React.Dispatch<React.SetStateAction<string[]>>;
  formRef: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
}

export default function SelectHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
  onChangeEvent,
}: SelectHandlesProps) {
  const [options] = useState<Option[]>(item?.options || []);

  const handleSelect = (value: string | undefined, key: string) => {
    if (!formRef?.current) return;

    let input = formRef.current.querySelector(
      `input[name="${key}"]`
    ) as HTMLInputElement | null;

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      formRef.current.appendChild(input);
    }

    if (value) {
      input.value = value;
    }
    const event = new Event("change", { bubbles: true });
    input.dispatchEvent(event);
  };

  return (
    <div className="w-full">
      {item?.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
          {item.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Select
        name={item?.name}
        items={options}
        selectedItem={item?.value ?? ""}
        onSelect={(value: string | undefined) => {
          item?.name && handleSelect(value, item.name);
          setRequirementError((prevErrors) =>
            prevErrors.filter((errorName) => errorName !== item?.name)
          );
          onChangeEvent?.(value);
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
