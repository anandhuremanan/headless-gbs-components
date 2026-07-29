export type DatePickerProps = {
  placeholder?: string | undefined;
  selectedDateValue?: Date;
  minDate?: Date | null;
  maxDate?: Date | null;
  yearLimitStart?: number;
  yearLimitEnd?: number;
  onDateChange?: (date: Date | null) => void;
  name?: string;
  error?: string;
  disabled?: boolean;
};
