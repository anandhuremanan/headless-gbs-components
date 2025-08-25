export const createTemplate = (
  type: string,
  config: any = {},
  CustomTemplate?: any
) => {
  return ({ rowData }: { rowData: any }) => {
    const field = config.field || "unknown";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        config.type === "number" ? Number(e.target.value) : e.target.value;
      rowData[field] = value;
      config.onDataChange?.(rowData.id, field, value);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      rowData[field] = e.target.value;
      config.onDataChange?.(rowData.id, field, e.target.value);
    };

    switch (type) {
      case "input":
        return (
          <input
            key={`${field}-${rowData.id}`}
            type={config.type || "text"}
            className={
              config.className ||
              "p-1 text-xs outline-none w-full rounded focus:border-b-2 border-blue-600"
            }
            placeholder={config.placeholder || `Enter ${field}`}
            defaultValue={rowData[field]}
            onChange={handleInputChange}
            onBlur={handleInputChange}
          />
        );

      case "select":
        return (
          <select
            key={`${field}-${rowData.id}`}
            className={
              config.className ||
              "p-1 w-full text-xs rounded outline-none focus:border-b-2 border-blue-600 dark:bg-zinc-900"
            }
            defaultValue={rowData[field]}
            onChange={handleSelectChange}
          >
            {config.options?.map((option: any, i: number) => (
              <option key={i} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case "button":
        return (
          <button
            key={`${field}-${rowData.id}`}
            className={config.className || "border rounded-2xl p-1"}
            onClick={() => config.onClick?.(rowData)}
          >
            {config.text || "Action"}
          </button>
        );

      case "custom":
        return (
          <CustomTemplate
            rowData={rowData}
            field={field}
            config={config}
            {...config}
          />
        );

      default:
        return <span>{rowData[field]}</span>;
    }
  };
};
