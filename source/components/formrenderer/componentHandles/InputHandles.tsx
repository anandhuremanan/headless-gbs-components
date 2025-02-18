import React, { useEffect, useState } from "react";
import { validateEmail, validatePhoneNumber } from "../helperFunctions";
import { Input } from "../../input";
import { FieldValue, FormContext, FormItem } from "../types";
import { evaluateExpression } from "@grampro/expression-evaluator";
import { twMerge } from "tailwind-merge";

interface InputHandlesProps {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
  onChangeEvent?: (event: any) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
  context: FormContext;
  updateContext: (
    componentName: string,
    fieldName: string,
    value: FieldValue
  ) => void;
}

const InputHandles = ({
  item,
  requirementError,
  setRequirementError,
  onChangeEvent,
  context,
  updateContext,
}: InputHandlesProps) => {
  const [inputError, setInputError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isRequired, setIsRequired] = useState<boolean>(false);

  // Initialize context with default values
  useEffect(() => {
    if (item?.name && item?.value !== undefined) {
      updateContext("input", item.name, item.value);
    }
  }, [item?.name, item?.value, updateContext]);

  // Handle dynamic disabled/required states expressions
  useEffect(() => {
    if (typeof item?.disabled === "string") {
      setIsDisabled(evaluateExpression(item.disabled, context));
    } else if (typeof item?.disabled === "boolean") {
      setIsDisabled(item.disabled);
    }

    if (typeof item?.required === "string") {
      setIsRequired(evaluateExpression(item.required, context));
    } else if (typeof item?.required === "boolean") {
      setIsRequired(item.required);
    }
  }, [item, context]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (item?.name) {
      updateContext("input", item.name, value);

      setRequirementError?.((prevErrors) =>
        prevErrors.filter((error) => error !== item.name)
      );
    }

    // Validation based on input type
    if (item?.type === "email" && !validateEmail(value)) {
      setInputError("Invalid email format");
    } else if (item?.type === "tel" && !validatePhoneNumber(value)) {
      setInputError("Invalid phone number. Must be 10 digits.");
    } else {
      setInputError(null);
    }

    // Trigger onChange event
    onChangeEvent?.(event);
  };

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
        placeholder={item?.placeholder || ""}
        onChange={handleChange}
        className={twMerge(
          `border rounded-md px-4 py-[6px] w-full text-black ${
            inputError || (item?.name && requirementError.includes(item?.name))
              ? "border-red-500"
              : "border-gray-300"
          }`,
          item?.stepProperty?.customClass?.inputClass
        )}
        defaultValue={item?.value ?? ""}
        disabled={isDisabled}
        required={isRequired}
      />
      {item?.name && requirementError.includes(item.name) && (
        <p className="text-red-500 text-xs">{`${item?.name} is required`}</p>
      )}
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
    </div>
  );
};

export default InputHandles;
