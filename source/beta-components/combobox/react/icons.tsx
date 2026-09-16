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

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
export const ChevronIcon = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const XIcon = (p: IconProps) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const SpinnerIcon = (p: IconProps) => (
  <Svg {...p} className={["cb-spinner", p.className].filter(Boolean).join(" ")}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Svg>
);
