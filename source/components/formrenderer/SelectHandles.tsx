import React, { useEffect, useState } from "react";
import { Select } from "../select";
import { Option, SelectHandlesProps } from "./types";

export default function SelectHandles({
  item,
  requirementError,
  setRequirementError,
  formRef,
  dependencyMap = {},
}: SelectHandlesProps) {
  const [options, setOptions] = useState<Option[]>(item?.options || []);

  const getFieldValue = (fieldName: string): string => {
    if (!formRef?.current) return "";
    const field = formRef.current.querySelector(
      `input[name="${fieldName}"]`
    ) as HTMLInputElement;
    return field?.value || "";
  };

  const getDependentOptions = (fieldName: string): Option[] => {
    const fieldConfig = dependencyMap[fieldName];
    if (!fieldConfig) return [];

    let currentData = fieldConfig.dataStructure;

    if (fieldConfig.parent) {
      const parentValue = getFieldValue(fieldConfig.parent);
      if (!parentValue) return [];

      const getNestedValue = (data: any, path: string[]): any => {
        return path.reduce((acc, key) => acc?.[key], data);
      };

      const parentChain: string[] = [];
      let currentField = fieldName;
      while (dependencyMap[currentField]?.parent) {
        const parent = dependencyMap[currentField].parent!;
        parentChain.unshift(getFieldValue(parent));
        currentField = parent;
      }

      currentData = getNestedValue(currentData, parentChain);
    }

    if (Array.isArray(currentData)) {
      return currentData.map((value) => ({ value, label: value }));
    } else if (typeof currentData === "object" && currentData !== null) {
      return Object.keys(currentData).map((key) => ({
        value: key,
        label: key,
      }));
    }

    return [];
  };

  useEffect(() => {
    if (!item?.name || !dependencyMap[item.name]) {
      return;
    }

    const updateOptions = () => {
      const newOptions = getDependentOptions(item.name!);
      setOptions(newOptions);
    };

    updateOptions();

    const parentField = dependencyMap[item.name]?.parent;
    if (parentField && formRef?.current) {
      const parentInput = formRef.current.querySelector(
        `input[name="${parentField}"]`
      );

      const handleParentChange = () => {
        if (formRef.current) {
          const currentField = formRef.current.querySelector(
            `input[name="${item.name}"]`
          ) as HTMLInputElement;
          if (currentField) {
            currentField.value = "";
          }
        }
        updateOptions();
      };

      parentInput?.addEventListener("change", handleParentChange);
      return () =>
        parentInput?.removeEventListener("change", handleParentChange);
    }
  }, [item?.name, dependencyMap, formRef]);

  const handleSelect = (value: string | undefined, key: string) => {
    if (!formRef?.current) return;

    let input = formRef.current.querySelector(
      `input[name="${key}"]`
    ) as HTMLInputElement;

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
          setRequirementError &&
            setRequirementError((prevErrors) =>
              prevErrors.filter((errorName) => errorName !== item?.name)
            );
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
