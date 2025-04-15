type BarData = {
  label: string;
  value: number;
};

export type BarChartProps = {
  data: BarData[];
  height?: number;
  title?: string;
  showXValue?: boolean;
};
