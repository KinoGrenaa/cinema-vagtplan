import type { ComponentProps } from "react";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import ExportModal from "@/app/components/modals/ExportModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import type { useConfirm } from "@/app/hooks/useConfirm";
import type { useInfoModal } from "@/app/hooks/useInfoModal";
import type { useInputModal } from "@/app/hooks/useInputModal";

type ExportModalProps = ComponentProps<typeof ExportModal>;
type ExportFormat = Parameters<NonNullable<ExportModalProps["onExport"]>>[0];

type PayrollModalsProps = {
  confirmDialog: ReturnType<typeof useConfirm>;
  exportModalOpen: boolean;
  exporting: boolean;
  infoDialog: ReturnType<typeof useInfoModal>;
  inputDialog: ReturnType<typeof useInputModal>;
  onCloseExportModal: () => void;
  onExport: (format: ExportFormat) => Promise<void> | void;
};

export default function PayrollModals({
  confirmDialog,
  exportModalOpen,
  exporting,
  infoDialog,
  inputDialog,
  onCloseExportModal,
  onExport,
}: PayrollModalsProps) {
  return (
    <>
      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

      <InputModal
        open={inputDialog.open}
        loading={inputDialog.loading}
        value={inputDialog.value}
        title={inputDialog.title}
        description={inputDialog.description}
        label={inputDialog.label}
        placeholder={inputDialog.placeholder}
        confirmText={inputDialog.confirmText}
        cancelText={inputDialog.cancelText}
        required={inputDialog.required}
        onChange={inputDialog.setValue}
        onConfirm={inputDialog.handleConfirm}
        onCancel={inputDialog.handleCancel}
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <ExportModal
        open={exportModalOpen}
        exporting={exporting}
        onClose={onCloseExportModal}
        onExport={onExport}
      />
    </>
  );
}
