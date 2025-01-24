const renderCell = (
  rowData: any,
  column: any,
  rowIndex: number,
  currentPage: number,
  pageSettings: any,
  rowChange?: any
) => {
  const cellValue = rowData[column.field];

  if (column.template) {
    return (
      <column.template
        rowData={rowData}
        rowIndex={rowIndex + currentPage * pageSettings.pageNumber}
        rowChange={(changes: any) => {
          if (rowChange) rowChange(changes);
        }}
      />
    );
  }

  if (column.tooltip) {
    return (
      <span title={cellValue?.toString()}>
        {column.tooltip ? cellValue.slice(0, 10) : cellValue}
      </span>
    );
  }

  return cellValue;
};
