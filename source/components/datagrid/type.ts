import type { ChangeEvent } from "react";

interface PageSettingsProps {
  pageNumber: number;
  totalCount?: number;
}

export interface ActiveFilterArrayValue {
  filterColumn: string;
  filterCondition: string;
  filterValue: string;
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
  pageStatus?: ({ currentPage }: { currentPage: number }) => void;
  activeFilterArrayValue?: ActiveFilterArrayValue[] | any;
  searchParamValue?: (value: string) => void;
  showTotalPages?: boolean;
  onSearch?: (value: string) => void;
  onToolbarButtonClick?: (action: string) => void;
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

export interface GridContextType {
  workingDataSource: any[];
  fallbackSourceData: any[];
  workingColumns: any[];
  currentPage: number;
  pageStart: number;
  pageEnd: number;
  totalPages: number;
  searchParam: string;
  activeFilterArray: any[];
  selectedRows: any[];
  isFetching: boolean | undefined;

  // Navigation methods
  nextPage: () => void;
  prevPage: () => void;
  goToEndPage: () => void;
  goToFirstPage: () => void;
  goToPage: (page: number) => void;
  lazy: boolean;

  // Search methods
  handleSearchInput: (e: any) => void;
  handleSearch: (searchParam: string) => void;

  // Filter methods
  toggleFilterPopup: (index: number) => void;
  handleApplyFilter: (event: any) => void;
  clearFilter: (event: any) => void;
  handleFilterAction: (action: any, colIndex: number) => void;

  // Row selection methods
  handleSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelect: (rowData: any) => void;
  isRowSelected: (rowData: any) => boolean;

  // Grid settings
  columns: any[];
  pageSettings: any;
  enableSearch: boolean;
  enableExcelExport: boolean;
  enablePdfExport: boolean;
  excelName: string;
  pdfName: string;
  pdfOptions: any;
  gridButtonClass: string;
  selectAll: boolean;
  tableHeaderStyle: string;
  gridContainerClass: string;
  gridColumnStyleSelectAll: string;
  gridColumnStyle: string;
  rowChange: (rowData: any) => void;
  showTotalPages?: boolean;
  onSearch?: (searchParam: string) => void;
  onToolbarButtonClick?: (action: string) => void;
}
