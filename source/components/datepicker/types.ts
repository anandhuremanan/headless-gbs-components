export type DatePickerProps = {
  placeholder?: string | undefined;
  selectedDate?: Date;
  minDate?: Date | null;
  maxDate?: Date | null;
  yearLimitStart?: number;
  yearLimitEnd?: number;
  onDateChange?: any;
};
