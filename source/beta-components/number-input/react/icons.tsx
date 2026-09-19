import { Svg, XIcon as SharedX, type IconProps } from "../../shared/react/icons";

/** 14px, to sit inside the field without crowding the number. */
export const XIcon = (p: IconProps) => <SharedX width={14} height={14} {...p} />;

/** Chevrons rather than plus and minus: the pair reads as one spinner. */
export const ChevronUpIcon = (p: IconProps) => (
  <Svg width={12} height={12} {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg width={12} height={12} {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
