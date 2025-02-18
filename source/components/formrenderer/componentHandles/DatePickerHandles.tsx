import React from "react";
import { DatePicker } from "../../datepicker";
import { FormItem } from "../types";

interface DatePickerHandlesProps {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onChangeEvent?: (event: any) => void;
}

export default function DatePickerHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
  onChangeEvent,
}: DatePickerHandlesProps) {
  const handleSelectDate = (value: string[], key: string) => {
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
      <DatePicker
        name={item?.name}
        onDateChange={(value: any) => {
          if (item?.name) {
            handleSelectDate(value, item.name);
            setRequirementError?.((prevErrors) =>
              prevErrors.filter((errorName) => errorName !== item.name)
            );
          }
          onChangeEvent?.(value);
        }}
        error={
          item?.name && requirementError.includes(item.name)
            ? `${item.name} is required`
            : undefined
        }
        selectedDateValue={item?.value ? new Date(item.value) : undefined}
      />
    </div>
  );
}
