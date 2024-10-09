import { InputHTMLAttributes } from "react";

// Sepecify types for components here
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
};

export type DatePickerProps = {
  placeholder?: string | undefined;
  selectedDate?: Date;
  minDate?: Date | null;
  maxDate?: Date | null;
  yearLimitStart?: number;
  yearLimitEnd?: number;
  onDateChange?: any;
};

interface ItemsProps {
  value: string;
  label: string;
}

export type SelectProps = {
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: any;
  selectedItem?: string;
};

export type InputProps = {
  OTPField?: boolean;
  OTPValue?: string;
  OTPLength?: number;
  OTPClass?: string;
  onOTPValueChange?: (value: string) => void;
} & InputHTMLAttributes<HTMLInputElement>;

export type MultiSelectProps = {
  placeholder?: string;
  items?: ItemsProps[] | string;
  lazy?: boolean;
  showSearch?: boolean;
  onSelect?: any;
  truncate?: boolean;
  selectedItems?: string[];
};

export type SpinnerProps = {
  size?: string;
  color?: string;
  fullCircleColor?: string;
  dotColor?: string;
  duration?: string;
  type?: "circle" | "circle-bg" | "dot" | "stroke";
  strokeColor?: string;
};

export type ModalProps = {
  showModal?: boolean;
  modalTitle?: string;
  autoclose?: boolean;
  modalClass?: string;
  modalContentClass?: string;
  classModalContent?: string;
  modalTitleClass?: string;
  classModalTitle?: string;
  children?: React.ReactNode;
};

export type DialogProps = {
  showDialog?: boolean;
  dialogMessage?: string;
  dialogActionOne?: string;
  dialogActionTwo?: string;
  onDialogActionOneClick?: () => void;
  onDialogActionTwoClick?: () => void;
  dialogClass?: string;
  dialogContentClass?: string;
  dialogActionOneStyle?: string;
  dialogActionTwoStyle?: string;
};
