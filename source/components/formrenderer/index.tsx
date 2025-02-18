/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState } from "react";
import { useFormContext } from "@grampro/headless-helpers";
import { FormElement, FormItem, FormRendererProps } from "./types";
import InputHandles from "./componentHandles/InputHandles";
import SelectHandles from "./componentHandles/SelectHandles";
import MultiHandles from "./componentHandles/MultiHandles";
import DatePickerHandles from "./componentHandles/DatePickerHandles";
import CheckboxHandles from "./componentHandles/CheckBoxHandles";

const FormRenderer = ({
  onSubmit,
  sourceData,
  formFormationClass = "grid grid-cols-1 text-left gap-4",
  formParentClass = "w-96",
}: FormRendererProps) => {
  const formRef = useRef<FormElement>(null);
  const [requirementError, setRequirementError] = useState<string[]>([]);

  const { context, updateContext } = useFormContext();

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
                    onChangeEvent={item.onChangeEvent}
                    formRef={formRef}
                    context={context}
                    updateContext={updateContext}
                  />
                );

              case "select":
                return (
                  <SelectHandles
                    key={index}
                    item={{
                      name: item.name,
                      label: item.label,
                      options: item.options,
                      value: item.value,
                      required: Boolean(item.required),
                    }}
                    requirementError={requirementError}
                    setRequirementError={setRequirementError}
                    formRef={formRef}
                    onChangeEvent={item.onChangeEvent}
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
                    onChangeEvent={item.onChangeEvent}
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
                    onChangeEvent={item.onChangeEvent}
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
                    onChangeEvent={item.onChangeEvent}
                    sourceData={sourceData}
                    context={context}
                    updateContext={updateContext}
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
