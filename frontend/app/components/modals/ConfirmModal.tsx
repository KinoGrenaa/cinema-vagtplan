"use client";

import BaseModal from "./BaseModal";

type ConfirmModalProps = {
  open: boolean;

  title: string;
  description: string;

  confirmText?: string;
  cancelText?: string;

  confirmVariant?: "danger" | "success" | "primary";

  loading?: boolean;

  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Bekræft",
  cancelText,
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : confirmVariant === "success"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200";

  return (
    <BaseModal open={open} title={title} onClose={onCancel} width="sm">
      <div className="space-y-6">
        <p className="whitespace-pre-line text-gray-600 dark:text-gray-300">
          {description}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {cancelText && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 font-semibold text-white transition disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? "Behandler..." : confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
