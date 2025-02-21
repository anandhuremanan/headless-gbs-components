import React, { useCallback, useEffect, useState } from "react";
import { DatePicker } from "../../datepicker";
import { DatePickerHandlesProps } from "../types";
import { evaluateExpression } from "@grampro/headless-helpers";

export default function DatePickerHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
  onChangeEvent,
  context,
  updateContext,
}: DatePickerHandlesProps) {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isRequired, setIsRequired] = useState<boolean>(false);

  // Evaluate expression with memoization
  const evaluateCondition = useCallback(
    (expression: string | boolean | undefined): boolean => {
      if (typeof expression === "string") {
        return evaluateExpression(expression, context);
      }
      return !!expression;
    },
    [context]
  );

  // Initialize context and handle dynamic states
  useEffect(() => {
    if (item?.name && item?.value !== undefined) {
      updateContext("datepicker", item.name, item.value);
    }

    const disabled = evaluateCondition(item?.disabled);

    setIsDisabled(disabled);

    // Only set required if not disabled
    const required = disabled ? false : evaluateCondition(item?.required);
    setIsRequired(required);
  }, [item, context, evaluateCondition, updateContext]);

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
          {isRequired && <span className="text-red-500">*</span>}
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
        disabled={isDisabled}
      />
    </div>
  );
}
