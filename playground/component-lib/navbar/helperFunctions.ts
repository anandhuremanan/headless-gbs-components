const getThemeClasses = (variant: string) => {
  switch (variant) {
    case "dark":
      return "bg-gray-900 text-white shadow-md";
    case "colored":
      return "bg-blue-600 text-white shadow-md";
    default:
      return "bg-white text-gray-800 shadow-md";
  }
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case "fixed":
      return "fixed top-0 left-0 right-0 z-50";
    case "sticky":
      return "sticky top-0 z-40";
    default:
      return "";
  }
};

const getContainerClasses = (containerType: string) => {
  return containerType === "contained" ? "max-w-6xl mx-auto px-4" : "px-4";
};

export { getContainerClasses, getPositionClasses, getThemeClasses };
