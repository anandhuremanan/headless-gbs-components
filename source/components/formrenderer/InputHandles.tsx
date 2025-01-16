import React, { useState } from "react";
import { validateEmail, validatePhoneNumber } from "./helperFunctions";
import { Input } from "../input";
import { FormItem } from "./types";

interface InputHandlesProps {
  item?: FormItem;
  requirementError: string[];
  setRequirementError?: React.Dispatch<React.SetStateAction<string[]>>;
}

const InputHandles = ({
  item,
  requirementError,
  setRequirementError,
}: InputHandlesProps) => {
  const [inputError, setInputError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setRequirementError &&
      setRequirementError((prevErrors: string[]) =>
        prevErrors.filter((error) => error !== item?.name)
      );

    // Validation based on input type
    if (item?.type === "email") {
      if (!validateEmail(value)) {
        setInputError("Invalid email format");
      } else {
        setInputError(null);
      }
    } else if (item?.type === "tel") {
      if (!validatePhoneNumber(value)) {
        setInputError("Invalid phone number. Must be 10 digits.");
      } else {
        setInputError(null);
      }
    }
  };

  return (
    <div className="w-full">
      {item?.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
        </label>
      )}
      <Input
        type={item?.type}
        name={item?.name}
        placeholder={item?.placeholder || ""}
        onChange={handleChange}
        className={`border rounded p-2 w-full text-black ${
          inputError || (item?.name && requirementError.includes(item?.name))
            ? "border-red-500"
            : "border-gray-300"
        }`}
      />
      {item?.name && requirementError.includes(item.name) && (
        <p className="text-red-500 text-xs">{`${item?.name} is required`}</p>
      )}
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
    </div>
  );
};

export default InputHandles;
