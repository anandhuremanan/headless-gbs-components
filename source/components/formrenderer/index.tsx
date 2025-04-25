/**
 * Copyright (c) Grampro Business Services and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState, FormEvent } from "react";
import { useFormContext } from "@grampro/headless-helpers";
import { FormItem, FormRendererProps } from "./types";
import { COMPONENT_MAP, validateField } from "./helperFunctions";

const FormRenderer: React.FC<FormRendererProps> = ({
  onSubmit,
  schema = [],
  formFormationClass = "grid grid-cols-1 gap-2",
  formParentClass = "w-96",
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [requirementError, setRequirementError] = useState<string[]>([]);
  const { context, updateContext } = useFormContext();

  // Handle form submission
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requirementErrorItems = schema
      .filter((item) => item.required && item.name)
      .reduce((errors: string[], item) => {
        const field = formRef.current?.querySelector(
          `[name="${item.name}"]`
        ) as HTMLInputElement | null;

        if (!validateField(field, item)) {
          errors.push(item.name!);
        }
        return errors;
      }, []);

    setRequirementError(requirementErrorItems);

    if (requirementErrorItems.length === 0 && onSubmit && formRef.current) {
      onSubmit(new FormData(formRef.current));
    }
  };

  // Render form component based on the type
  const renderFormComponent = (item: FormItem, index: number) => {
    if (item.component === "button") {
      return (
        <div key={index} className="w-full mt-1">
          <button
            type={item.button_type}
            className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800"
          >
            {item.value}
          </button>
        </div>
      );
    }

    const Component = item.component && COMPONENT_MAP[item.component];
    if (!Component) return null;

    return (
      <Component
        key={index}
        item={item}
        requirementError={requirementError}
        setRequirementError={setRequirementError}
        formRef={formRef}
        onChangeEvent={item.onChangeEvent}
        context={context}
        updateContext={updateContext}
      />
    );
  };

  // If no schema data is found, return a message
  if (!schema.length) {
    return <div>No Source Data Found</div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={formParentClass}>
      <div className={formFormationClass}>
        {schema.map(renderFormComponent)}
      </div>
    </form>
  );
};

export default FormRenderer;
