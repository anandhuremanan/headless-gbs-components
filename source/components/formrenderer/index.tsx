import React, { useRef, useState } from "react";
import { Button } from "../button";
import InputHandles from "./InputHandles";
import SelectHandles from "./SelectHandles";

const FormRenderer = ({ onSubmit, sourceData }: any) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [requirementError, setRequirementError] = useState<string[]>([]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requirementErrorItems: string[] = [];

    sourceData.forEach((item: any) => {
      if (item.required) {
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
    onSubmit(formData);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-96">
      {sourceData?.length > 0 ? (
        <div className="flex flex-col items-start text-left gap-4">
          {sourceData.map((item: any, index: number) => {
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
                  />
                );

              case "button":
                return (
                  <div key={index} className="w-full mt-2">
                    <Button
                      type={item.type}
                      className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800"
                    >
                      {item.value}
                    </Button>
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
