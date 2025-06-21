import { useState, useEffect } from "react";

export const useColumns = (columns: any[], workingDataSource: any[]) => {
  const [workingColumns, setWorkingColumns] = useState<any>([]);

  useEffect(() => {
    if (columns && columns.length > 0) {
      const filteredColumns = columns.map((column) => ({
        ...column,
        showFilterPopup: false,
        isFilterActive: false,
      }));
      setWorkingColumns(filteredColumns);
    } else if (
      workingDataSource.length > 0 &&
      Object.keys(workingDataSource[0]).length > 0
    ) {
      const inferredColumns = Object.keys(workingDataSource[0]).map((key) => ({
        field: key,
        headerText: key.charAt(0).toUpperCase() + key.slice(1),
        width: 150,
      }));
      setWorkingColumns((prevColumns: any) => {
        if (JSON.stringify(prevColumns) !== JSON.stringify(inferredColumns)) {
          return inferredColumns;
        }
        return prevColumns;
      });
    }
  }, [columns, workingDataSource]);

  return { workingColumns, setWorkingColumns };
};
