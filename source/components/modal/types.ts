export type ModalProps = {
  showModal?: boolean;
  setShowModal: (show: boolean) => void;
  modalTitle?: string;
  modalClass?: string;
  modalContentClass?: string;
  classModalContent?: string;
  modalTitleClass?: string;
  classModalTitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  dismissible?: boolean;
  titleId?: string;
  closeButtonContent?: React.ReactNode;
  animationDuration?: number;
};
