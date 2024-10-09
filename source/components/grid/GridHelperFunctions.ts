import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

let activeFilterArray: any[] = [];

interface PDFExportOptions {
  layout: "portrait" | "landscape";
  paperSize:
    | "a3"
    | "a4"
    | "letter"
    | "legal"
    | "tabloid"
    | "statement"
    | "executive";
}

export function handleApplyFilterHelper(
  event: any,
  columns: any,
  dataSource: any
) {
  let workingDataSource: any[] = [...dataSource];
  let filterValue = event.filterValue.toLowerCase();
  let filterCondition = event.filterType;
  let filterColumn = event.columnHeader;

  // Add the new filter to activeFilterArray
  activeFilterArray.push({
    filterValue: filterValue,
    filterCondition: filterCondition,
    filterColumn: filterColumn,
  });

  columns = columns.map((column: any) => {
    if (column.field === filterColumn) {
      return { ...column, isFilterActive: true, showFilterPopup: false };
    }
    return column;
  });

  // Apply all active filters
  activeFilterArray.forEach((filter: any) => {
    workingDataSource = dataSource.filter((item: any) => {
      let columnValue = item[filter.filterColumn].toString().toLowerCase();
      switch (filter.filterCondition) {
        case "contains":
          return columnValue.includes(filter.filterValue);
        case "equals":
          return columnValue === filter.filterValue;
        case "starts_with":
          return columnValue.startsWith(filter.filterValue);
        case "ends_with":
          return columnValue.endsWith(filter.filterValue);
        default:
          return true;
      }
    });
  });

  return { columns, workingDataSource, activeFilterArray };
}

// Function For Clearing the Filter
export function clearFilterHelper(
  event: any,
  columns: any[],
  dataSource: any[]
) {
  let workingDataSource = [...dataSource];
  let filterColumn = event.columnHeader;

  // Remove the cleared filter from activeFilterArray
  activeFilterArray = activeFilterArray.filter(
    (filter: any) => filter.filterColumn !== filterColumn
  );

  let hasActiveFilters = activeFilterArray.length > 0;

  // Reset the isFilterActive and showFilterPopup flags for the cleared filter
  columns = columns.map((column: any) => {
    if (column.field === filterColumn) {
      return { ...column, isFilterActive: false, showFilterPopup: false };
    }
    return column;
  });

  // Reapply all remaining active filters
  if (hasActiveFilters) {
    activeFilterArray.forEach((filter: any) => {
      workingDataSource = workingDataSource.filter((item: any) => {
        let columnValue = item[filter.filterColumn].toString().toLowerCase();
        switch (filter.filterCondition) {
          case "contains":
            return columnValue.includes(filter.filterValue);
          case "equals":
            return columnValue === filter.filterValue;
          case "starts_with":
            return columnValue.startsWith(filter.filterValue);
          case "ends_with":
            return columnValue.endsWith(filter.filterValue);
          default:
            return true;
        }
      });
    });
  }

  return { columns, workingDataSource, hasActiveFilters, activeFilterArray };
}

export function exportToExcelHelper(
  dataSource: any[],
  columns: any[],
  excelName: string
) {
  // This will remove the column template.
  const templateRemovedColumn = columns.filter((column) => !column.template);
  const dataToExport = dataSource.map((row) => {
    const rowData: any = {};
    templateRemovedColumn.forEach((column: any) => {
      rowData[column.field] = row[column.field];
    });
    return rowData;
  });
  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${excelName}.xlsx`);
}

export function exportToPDFHelper(
  dataSource: any[],
  columns: any[],
  pdfName: string,
  pdfoptions?: PDFExportOptions
) {
  const { layout = "portrait", paperSize = "a4" }: any = pdfoptions;

  const doc: any = new jsPDF({
    orientation: layout,
    unit: "mm",
    format: paperSize,
  });
  // This will remove the columns with template.
  const printableColumns = columns.filter(
    (column) => !column.template || column.showInPdf
  );

  const dataToExport = dataSource.map((row) => {
    const rowData: any = {};
    printableColumns.forEach((column: any) => {
      rowData[column.field] = row[column.field];
    });
    return Object.values(rowData);
  });

  const columnNames = printableColumns.map((column: any) => column.field);
  doc.autoTable({
    head: [columnNames],
    body: dataToExport,
  });

  doc.save(`${pdfName}.pdf`);
}

export function handleEditActionHelper(
  e: any,
  isEditModeActive: boolean,
  actionMode: string,
  newEntry: any,
  workingDataSource: any[],
  goToFirstPage: () => void
) {
  const { mode } = e.detail;
  let dataSourceUpdate = [...workingDataSource];
  let isEditModeActiveUpdate: boolean = isEditModeActive;
  let actionModeUpdate: string = actionMode;
  let newEntryUpdate: any = { ...newEntry };

  function resetEditMode() {
    isEditModeActiveUpdate = false;
    actionModeUpdate = "";
    newEntryUpdate = {};
  }

  function addNewEntry() {
    if (Object.keys(newEntryUpdate).length > 0) {
      dataSourceUpdate = [newEntryUpdate, ...workingDataSource];
      newEntryUpdate = {};
    }
  }

  switch (mode) {
    case "add":
      isEditModeActiveUpdate = true;
      actionModeUpdate = mode;
      goToFirstPage();
      break;
    case "cancel":
      resetEditMode();
      break;
    case "update":
      addNewEntry();
      resetEditMode();
      break;
    default:
      break;
  }

  return {
    dataSourceUpdate,
    isEditModeActiveUpdate,
    actionModeUpdate,
    newEntryUpdate,
  };
}
