"use client";

import BaseModal from "./BaseModal";

type ExportFormat = "csv" | "xlsx" | "pdf" | "uniconta";

type ExportModalProps = {
  open: boolean;
  exporting: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
};

const formats: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv", label: "CSV", description: "Standard CSV-fil" },
  { value: "xlsx", label: "XLSX", description: "Excel-regneark" },
  { value: "pdf", label: "PDF", description: "PDF-rapport" },
  {
    value: "uniconta",
    label: "Uniconta CSV",
    description: "CSV-fil til Uniconta",
  },
];

export default function ExportModal({
  open,
  exporting,
  onClose,
  onExport,
}: ExportModalProps) {
  if (!open) return null;

  return (
    <BaseModal open={open} title="Eksporter lønrapport" onClose={onClose}>
      <div className="space-y-3">
        {formats.map((format) => (
          <button
            key={format.value}
            type="button"
            disabled={exporting}
            onClick={() => onExport(format.value)}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {format.label}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {format.description}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={exporting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
        >
          Annuller
        </button>
      </div>
    </BaseModal>
  );
}
