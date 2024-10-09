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
