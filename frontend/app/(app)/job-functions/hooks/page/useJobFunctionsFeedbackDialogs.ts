import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { buildJobFunctionsFeedbackModalsProps } from "../../helpers/page/jobFunctionsFeedbackModalProps";

export function useJobFunctionsFeedbackDialogs() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  return {
    confirmDialog,
    feedbackModalProps: buildJobFunctionsFeedbackModalsProps({
      confirmDialog,
      infoDialog,
    }),
    infoDialog,
  };
}
