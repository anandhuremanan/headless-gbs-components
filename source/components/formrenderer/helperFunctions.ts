export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

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
