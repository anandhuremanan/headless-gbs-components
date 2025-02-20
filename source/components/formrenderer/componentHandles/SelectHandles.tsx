import React, { useCallback, useEffect, useState } from "react";
import { Select } from "../../select";
import { Option, SelectHandlesProps } from "../types";
import { evaluateExpression } from "@grampro/headless-helpers";

export default function SelectHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
  onChangeEvent,
  context,
  updateContext,
}: SelectHandlesProps) {
  const [options] = useState<Option[]>(item?.options || []);
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
      updateContext("select", item.name, item.value);
    }

    const disabled = evaluateCondition(item?.disabled);

    setIsDisabled(disabled);

    // Only set required if not disabled
    const required = disabled ? false : evaluateCondition(item?.required);
    setIsRequired(required);
  }, [item, context, evaluateCondition, updateContext]);

  // Handle select change event
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
          {isRequired && <span className="text-red-500">*</span>}
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
        disabled={isDisabled}
      />
    </div>
  );
}
