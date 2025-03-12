import { ChangeEvent } from "react";

interface PageSettingsProps {
  pageNumber: number;
}

export type GridProps = {
  dataSource: any[] | string;
  columns?: any[];
  pageSettings: PageSettingsProps;
  enableSearch?: boolean;
  lazy?: boolean;
  enableExcelExport?: boolean;
  excelName?: string;
  enablePdfExport?: boolean;
  pdfName?: string;
  gridContainerClass?: string;
  gridButtonClass?: string;
  gridHeaderClass?: string;
  gridGlobalSearchButtonClass?: string;
  gridPaginationButtonClass?: string;
  pdfOptions?: any;
  isFetching?: boolean;
  showPagination?: boolean;
  selectAll?: boolean;
  onSelectRow?: (value: any) => void;
  tableHeaderStyle?: string;
  gridColumnStyleSelectAll?: string;
  gridColumnStyle?: string;
  rowChange?: any;
  pageStatus?: any;
};

interface GridColumn {
  key: string;
  label: string;
  [key: string]: any;
}

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

export type GridToolbarProps = {
  enableExcelExport: boolean;
  enableSearch: boolean;
  enablePdfExport: boolean;
  gridButtonClass: string;
  workingDataSource: any[];
  columns: GridColumn[];
  excelName: string;
  pdfName: string;
  pdfOptions: PDFExportOptions;
  searchParam: string;
  handleSearchInput: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSearch: (searchTerm: string) => void;
};

export type PaginationProps = {
  goToFirstPage: () => void;
  currentPage: number;
  prevPage: () => void;
  pageStart: number;
  goToPage: (page: number) => void;
  workingDataSource: any[];
  pageEnd: number;
  totalPages: number;
  nextPage: () => void;
  goToEndPage: () => void;
};

export type Column = {
  field: string;
  headerText?: string;
  width?: number;
  filter?: boolean;
  template?: React.FC<{
    rowData: any;
    rowIndex: number;
    rowChange: (changes: any) => void;
  }>;
  tooltip?: boolean;
  showFilterPopup?: boolean;
};

export type GridBodyProps = {
  selectAll?: boolean;
  handleSelectAll: () => void;
  workingColumns: Column[];
  tableHeaderStyle: string;
  toggleFilterPopup: (index: number) => void;
  activeFilterArray: { filterColumn: string }[];
  handleFilterAction: (action: any, index: number) => void;
  workingDataSource: any[];
  isFetching: boolean | undefined;
  currentPage: number;
  pageSettings: { pageNumber: number };
  gridColumnStyleSelectAll: string;
  isRowSelected: (rowData: any) => boolean;
  handleSelect: (rowData: any) => void;
  gridColumnStyle: string;
  rowChange?: (changes: any) => void;
};
