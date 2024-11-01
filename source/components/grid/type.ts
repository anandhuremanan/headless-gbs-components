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
