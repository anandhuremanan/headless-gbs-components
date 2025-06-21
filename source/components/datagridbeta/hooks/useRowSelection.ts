import { useState, useCallback } from "react";

export const useRowSelection = (
  workingDataSource: any[],
  onSelectRow?: (rows: any[]) => void
) => {
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.checked ? workingDataSource : [];
      setSelectedRows(selected);
      onSelectRow?.(selected);
    },
    [workingDataSource, onSelectRow]
  );

  const handleSelect = useCallback(
    (rowData: any) => {
      setSelectedRows((prevData) => {
        const isSelected = prevData.includes(rowData);
        let updatedData;
        if (isSelected) {
          updatedData = prevData.filter((item) => item !== rowData);
        } else {
          updatedData = [...prevData, rowData];
        }
        if (onSelectRow) onSelectRow(updatedData);
        return updatedData;
      });
    },
    [onSelectRow]
  );

  const isRowSelected = useCallback(
    (rowData: any) => {
      return selectedRows.includes(rowData);
    },
    [selectedRows]
  );

  return {
    selectedRows,
    handleSelectAll,
    handleSelect,
    isRowSelected,
  };
};
