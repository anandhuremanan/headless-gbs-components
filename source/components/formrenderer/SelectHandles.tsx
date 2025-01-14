import React from "react";
import { Select } from "../select";

export default function SelectHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
}: any) {
  const handleSelect = (value: string, key: string) => {
    if (formRef.current) {
      const hiddenInput = formRef.current.querySelector(
        `input[name="${key}"]`
      ) as HTMLInputElement;

      if (hiddenInput) {
        hiddenInput.value = value;
      } else {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        formRef.current.appendChild(input);
      }
    }
  };

  return (
    <div className="w-full">
      {item.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
        </label>
      )}
      <Select
        name={item.name}
        items={item.options}
        onSelect={(value: string) => {
          handleSelect(value, item.key);
          setRequirementError((prevErrors: any) =>
            prevErrors.filter((errorName: any) => errorName !== item.name)
          );
        }}
        error={
          requirementError.includes(item.name)
            ? `${item.name} is required`
            : undefined
        }
      ></Select>
    </div>
  );
}
