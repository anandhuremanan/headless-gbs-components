import React, { useEffect, useState, useCallback } from "react";
import { validateInput } from "../helperFunctions";
import { Input } from "../../input";
import { InputHandlesProps } from "../types";
import { evaluateExpression } from "@grampro/headless-helpers";
import { twMerge } from "tailwind-merge";

const InputHandles: React.FC<InputHandlesProps> = ({
  item,
  requirementError,
  setRequirementError,
  onChangeEvent,
  context,
  updateContext,
}) => {
  const [inputError, setInputError] = useState<string | null>(null);
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
      updateContext("input", item.name, item.value);
    }

    const disabled = evaluateCondition(item?.disabled);
    setIsDisabled(disabled);

    // Only set required if not disabled
    const required = disabled ? false : evaluateCondition(item?.required);
    setIsRequired(required);
  }, [item, context, evaluateCondition, updateContext]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      if (item?.name) {
        updateContext("input", item.name, value);
        setRequirementError?.((prev) =>
          prev.filter((error) => error !== item.name)
        );
      }

      const validationError = validateInput(value, item?.type);
      setInputError(validationError);

      onChangeEvent?.(event);
    },
    [
      item?.name,
      item?.type,
      updateContext,
      setRequirementError,
      onChangeEvent,
      validateInput,
    ]
  );

  // Merge input classes
  const inputClassName = twMerge(
    "border rounded-md px-4 py-[6px] w-full text-black",
    inputError || (item?.name && requirementError.includes(item?.name))
      ? "border-red-500"
      : "border-gray-300",
    item?.stepProperty?.customClass?.inputClass
  );

  return (
    <div className="w-full">
      {item?.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
          {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      <Input
        type={item?.type}
        name={item?.name}
        placeholder={item?.placeholder ?? ""}
        onChange={handleChange}
        className={inputClassName}
        defaultValue={item?.value ?? ""}
        disabled={isDisabled}
        required={isRequired}
      />
      {item?.name && requirementError.includes(item.name) && (
        <p className="text-red-500 text-xs">{`${item.name} is required`}</p>
      )}
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
    </div>
  );
};

export default InputHandles;
