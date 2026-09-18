import {
  AlertCircleIcon,
  InfoIcon as SharedInfo,
  SpinnerIcon as SharedSpinner,
  SuccessIcon as SharedSuccess,
  WarningIcon as SharedWarning,
  type IconProps,
} from "../../shared/react/icons";

/*
 * The dialog draws its status icon at 20px, beside the title.
 */
export const InfoIcon = (p: IconProps) => <SharedInfo width={20} height={20} {...p} />;
export const SuccessIcon = (p: IconProps) => <SharedSuccess width={20} height={20} {...p} />;
export const WarningIcon = (p: IconProps) => <SharedWarning width={20} height={20} {...p} />;
export const DangerIcon = (p: IconProps) => <AlertCircleIcon width={20} height={20} {...p} />;

export const SpinnerIcon = (p: IconProps) => (
  <SharedSpinner width={14} height={14} {...p} className="dl-spinner" />
);
