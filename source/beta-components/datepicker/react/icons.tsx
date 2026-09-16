import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>;
export const ChevronRightIcon = (p: IconProps) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const XIcon = (p: IconProps) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
