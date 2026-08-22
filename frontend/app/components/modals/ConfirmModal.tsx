"use client";

import type {
  ReactNode,
} from "react";

import BaseModal from "./BaseModal";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "success" | "primary";
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
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
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400"
      : confirmVariant === "success"
        ? "bg-green-700 hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400"
        : "bg-blue-700 hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400";

  return (
    <BaseModal open={open} title={title} onClose={onCancel} width="sm">
      <div className="space-y-6">
        <p className="whitespace-pre-line text-gray-600 dark:text-gray-300">
          {description}
        </p>
        {children}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              loading ||
              confirmDisabled
            }
            className={`rounded-xl px-4 py-2 font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-gray-900 ${confirmButtonClass}`}
          >
            {loading ? "Behandler..." : confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
