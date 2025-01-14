import React from "react";
import { Input } from "../input";

export default function InputHandles({
  item,
  requirementError,
  setRequirementError,
}: any) {
  return (
    <div className="w-full">
      {item.label && (
        <label htmlFor={item.name} className="font-medium text-sm">
          {item.label}
        </label>
      )}
      <Input
        type={item.type}
        name={item.name}
        placeholder={item.placeholder || ""}
        error={
          requirementError.includes(item.name)
            ? `${item.name} is required`
            : undefined
        }
        onChange={() =>
          setRequirementError((prevErrors: any) =>
            prevErrors.filter((errorName: any) => errorName !== item.name)
          )
        }
      />
    </div>
  );
}
