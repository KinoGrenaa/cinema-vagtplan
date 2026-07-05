import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";

import type { JobFunctionsFeedbackModalsProps } from "../components/page/JobFunctionsFeedbackModals";

type ConfirmDialog = ReturnType<typeof useConfirm>;
type InfoDialog = ReturnType<typeof useInfoModal>;

type BuildFeedbackModalsPropsOptions = {
  confirmDialog: ConfirmDialog;
  infoDialog: InfoDialog;
};

export function buildJobFunctionsFeedbackModalsProps({
  confirmDialog,
  infoDialog,
}: BuildFeedbackModalsPropsOptions): JobFunctionsFeedbackModalsProps {
  return {
    confirmModalProps: {
      open: confirmDialog.open,
      title: confirmDialog.title,
      description: confirmDialog.description,
      confirmText: confirmDialog.confirmText,
      cancelText: confirmDialog.cancelText,
      confirmVariant: confirmDialog.confirmVariant,
      loading: confirmDialog.loading,
      onConfirm: confirmDialog.handleConfirm,
      onCancel: confirmDialog.handleCancel,
    },
    infoModalProps: {
      open: infoDialog.open,
      title: infoDialog.title,
      description: infoDialog.description,
      buttonText: infoDialog.buttonText,
      variant: infoDialog.variant,
      onClose: infoDialog.close,
    },
  };
}
