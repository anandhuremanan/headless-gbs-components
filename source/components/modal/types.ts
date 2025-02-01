export type ModalProps = {
  showModal?: boolean;
  modalTitle?: string;
  modalClass?: string;
  modalContentClass?: string;
  classModalContent?: string;
  modalTitleClass?: string;
  classModalTitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
  dismissible?: boolean;
  titleId?: string;
  closeButtonContent?: React.ReactNode;
  animationDuration?: number;
};
