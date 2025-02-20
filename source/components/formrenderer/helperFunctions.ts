import InputHandles from "./componentHandles/InputHandles";
import SelectHandles from "./componentHandles/SelectHandles";
import MultiHandles from "./componentHandles/MultiHandles";
import DatePickerHandles from "./componentHandles/DatePickerHandles";
import CheckboxHandles from "./componentHandles/CheckBoxHandles";
import { FormItem } from "./types";

// Component Map
export const COMPONENT_MAP = {
  input: InputHandles,
  select: SelectHandles,
  "multi-select": MultiHandles,
  datepicker: DatePickerHandles,
  checkbox: CheckboxHandles,
} as const;

// Field Validation Helper
export const validateField = (
  field: HTMLInputElement | null,
  item: FormItem
): boolean => {
  if (!item.required || !item.name || field?.disabled) {
    return true;
  }
  // Explicitly check for null and empty value
  if (!field) {
    return false;
  }
  return field.value.trim() !== "";
};

// Input Validation functions starts here
// You can add more validation functions here or
// use zod for more complex validation
export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

export const validateInput = (value: string, type?: string): string | null => {
  if (!value) return null;

  switch (type) {
    case "email":
      return validateEmail(value) ? null : "Invalid email format";
    case "tel":
      return validatePhoneNumber(value)
        ? null
        : "Invalid phone number. Must be 10 digits.";
    default:
      return null;
  }
};
// Input Validation functions ends here

// In case of return as objects
export const formDataToObject = (formData: FormData) => {
  const obj: Record<string, any> = {};
  formData.forEach((value, key) => {
    try {
      obj[key] = JSON.parse(value as string);
    } catch {
      obj[key] = value;
    }
  });
  return obj;
};
