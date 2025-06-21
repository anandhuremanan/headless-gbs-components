import React from "react";

interface EditableRowProps {
  columnType: string | undefined;
  cellValue: any;
  rowIndex: number;
  field: string;
  style?: React.CSSProperties;
  rowData: any;
}

export default function EditableRow({
  columnType,
  cellValue,
  rowIndex,
  field,
  style,
  rowData,
}: EditableRowProps) {
  // Function to handle cell value change
  const handleCellChange = (newValue: any, field: string) => {
    if (rowData) {
      rowData[field] = newValue;
      rowData(rowData);
      console.log(rowData);
    }
  };

  switch (columnType) {
    case "text":
      return (
        <input
          key={`${field}-${rowIndex}`}
          id={`${field}-${rowIndex}`}
          type="text"
          defaultValue={cellValue || ""}
          onBlur={(e) => handleCellChange(e.target.value, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="px-2 py-1 outline-none focus:ring-1 focus:ring-black rounded"
          style={style}
        />
      );

    case "number":
      return (
        <input
          key={`${field}-${rowIndex}`}
          id={`${field}-${rowIndex}`}
          type="number"
          defaultValue={cellValue || ""}
          onBlur={(e) => handleCellChange(e.target.value, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="px-2 py-1 outline-none focus:ring-1 focus:ring-black rounded"
          style={style}
        />
      );

    default:
      return (
        <input
          type="text"
          defaultValue={cellValue || ""}
          onBlur={(e) => handleCellChange(e.target.value, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
          }}
        />
      );
  }
}
