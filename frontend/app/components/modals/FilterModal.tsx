"use client";

import type { ReactNode } from "react";
import BaseModal from "./BaseModal";

type FilterModalProps = {
  open: boolean;
  title?: string;
  activeFilterCount?: number;
  children: ReactNode;
  applyText?: string;
  resetText?: string;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
};

export default function FilterModal({
  open,
  title = "Filtre",
  activeFilterCount = 0,
  children,
  applyText = "Anvend",
  resetText = "Nulstil filtre",
  onApply,
  onClose,
  onReset,
}: FilterModalProps) {
  return (
    <BaseModal open={open} title={title} onClose={onClose} width="lg">
      <div className="space-y-6">
        {activeFilterCount > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            {activeFilterCount} aktivt filter
            {activeFilterCount === 1 ? "" : "e"}
          </div>
        )}

        {children}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {resetText}
          </button>

          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {applyText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
