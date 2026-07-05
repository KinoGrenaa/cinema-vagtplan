import type { ComponentProps } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

export type JobFunctionsFeedbackModalsProps = {
  confirmModalProps: ComponentProps<typeof ConfirmModal>;
  infoModalProps: ComponentProps<typeof InfoModal>;
};

export default function JobFunctionsFeedbackModals({
  confirmModalProps,
  infoModalProps,
}: JobFunctionsFeedbackModalsProps) {
  return (
    <>
      <ConfirmModal {...confirmModalProps} />
      <InfoModal {...infoModalProps} />
    </>
  );
}
