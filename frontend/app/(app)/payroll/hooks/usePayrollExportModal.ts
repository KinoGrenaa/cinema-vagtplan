import { useState } from "react";

type UsePayrollExportModalOptions<TFormat> = {
  downloadExport: (format: TFormat) => Promise<void>;
  showError: (title: string, description: string) => void;
};

export function usePayrollExportModal<TFormat>({
  downloadExport,
  showError,
}: UsePayrollExportModalOptions<TFormat>) {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  function openExportModal() {
    setExportModalOpen(true);
  }

  function closeExportModal() {
    setExportModalOpen(false);
  }

  async function exportPayroll(format: TFormat) {
    try {
      await downloadExport(format);
      setExportModalOpen(false);
    } catch (error) {
      setExportModalOpen(false);

      setTimeout(() => {
        showError(
          "Kan ikke eksportere lønperiode",
          error instanceof Error && error.message
            ? error.message
            : "Eksporten kunne ikke gennemføres.",
        );
      }, 0);
    }
  }

  return {
    closeExportModal,
    exportModalOpen,
    exportPayroll,
    openExportModal,
  };
}
