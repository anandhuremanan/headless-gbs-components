/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState } from "react";
import InputHandles from "./InputHandles";
import SelectHandles from "./SelectHandles";
import { FormElement, FormItem, FormRendererProps } from "./types";
import MultiHandles from "./MultiHandles";
import DatePickerHandles from "./DatePickerHandles";
import CheckboxHandles from "./CheckBoxHandles";

const FormRenderer = ({
  onSubmit,
  sourceData,
  formFormationClass = "grid grid-cols-1 text-left gap-4",
  formParentClass = "w-96",
  dependencyConfig,
}: FormRendererProps) => {
  const formRef = useRef<FormElement>(null);
  const [requirementError, setRequirementError] = useState<string[]>([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requirementErrorItems: string[] = [];

    sourceData?.forEach((item: FormItem) => {
      if (item.required && item.name) {
        const field = formRef.current?.querySelector(
          `[name="${item.name}"]`
        ) as HTMLInputElement | null;

        if (!field || !field.value.trim()) {
          requirementErrorItems.push(item.name);
        }
      }
    });

    setRequirementError(requirementErrorItems);

    if (requirementErrorItems.length > 0) return;

    const formData = new FormData(formRef.current as HTMLFormElement);
    if (onSubmit) onSubmit(formData);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={formParentClass}>
      {sourceData && sourceData?.length > 0 ? (
        <div className={formFormationClass}>
          {sourceData.map((item: FormItem, index: number) => {
            switch (item.component) {
              case "input":
                return (
                  <InputHandles
                    key={index}
                    item={item}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                  />
                );

              case "select":
                return (
                  <SelectHandles
                    key={index}
                    item={item}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                    formRef={formRef}
                    dependencyMap={dependencyConfig}
                  />
                );

              case "multi-select":
                return (
                  <MultiHandles
                    key={index}
                    item={item}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                    formRef={formRef}
                  />
                );

              case "datepicker":
                return (
                  <DatePickerHandles
                    key={index}
                    item={item}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                    formRef={formRef}
                  />
                );

              case "checkbox":
                return (
                  <CheckboxHandles
                    key={index}
                    item={item}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                    formRef={formRef}
                  />
                );

              case "button":
                return (
                  <div key={index} className="w-full mt-1">
                    <button
                      type={item.button_type}
                      className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-300 dark:bg-white dark:text-black"
                    >
                      {item.value}
                    </button>
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>
      ) : (
        <div>No Source Data Found</div>
      )}
    </form>
  );
};

export default FormRenderer;
