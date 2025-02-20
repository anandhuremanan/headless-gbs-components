import React, { useEffect, useState } from "react";
import { CheckboxHandlesProps } from "../types";

const CheckboxHandles = ({
  item,
  formRef,
  requirementError,
  setRequirementError,
  onChangeEvent,
  updateContext,
}: CheckboxHandlesProps) => {
  const [checked, setChecked] = useState<boolean>(!!item?.value);

  // We Need this to set the value of the checkbox in the form
  // if the value is not set in the form
  useEffect(() => {
    if (item?.name) {
      handleSelect(checked, item.name);
    }
  }, []);

  const handleSelect = (value: boolean, key: string) => {
    if (formRef && formRef.current) {
      const hiddenInput = formRef.current.querySelector(
        `input[name="${key}"]`
      ) as HTMLInputElement;

      if (hiddenInput) {
        hiddenInput.value = value.toString();
      } else {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value.toString();
        formRef.current.appendChild(input);
      }
    }
  };

  return (
    <div className="w-full flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        name={item?.name}
        onChange={(e) => {
          const newValue = e.target.checked;
          setChecked(newValue);
          if (item?.name) {
            handleSelect(newValue, item.name);
            setRequirementError?.((prevErrors) =>
              prevErrors.filter((error) => error !== item.name)
            );
          }
          onChangeEvent?.(e);

          item?.name && updateContext("checkbox", item.name, newValue);
        }}
        className={`w-5 h-5 cursor-pointer rounded-md border-2 transition-colors duration-200 ${
          item?.name && requirementError.includes(item?.name)
            ? "border-red-500"
            : "border-gray-300"
        }`}
      />
      {item?.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
          {item.required && <span className="text-red-500">*</span>}
        </label>
      )}
      {item?.name && requirementError.includes(item.name) && (
        <p className="text-red-500 text-xs">{`${
          item?.label || item?.name
        } is required`}</p>
      )}
    </div>
  );
};

export default CheckboxHandles;
