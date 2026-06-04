"use client";

import { useEffect, useState } from "react";
import BaseModal from "./BaseModal";

type InputModalProps = {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  value: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function InputModal({
  open,
  title,
  description,
  label = "Begrundelse",
  placeholder = "",
  value,
  confirmText = "Bekræft",
  cancelText = "Annuller",
  loading = false,
  required = false,
  onChange,
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTouched(false);
    }
  }, [open]);

  const isInvalid = required && touched && value.trim().length === 0;

  function handleConfirm() {
    setTouched(true);

    if (required && value.trim().length === 0) {
      return;
    }

    onConfirm();
  }

  return (
    <BaseModal open={open} title={title} onClose={onCancel}>
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            {label}
          </label>

          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            rows={4}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
          />

          {isInvalid && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Feltet skal udfyldes.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Arbejder..." : confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
