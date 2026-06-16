"use client";

import BaseModal from "./BaseModal";

type InfoModalVariant = "info" | "error" | "success" | "warning";

type InfoModalProps = {
  open: boolean;
  title: string;
  description: string;
  buttonText?: string;
  variant?: InfoModalVariant;
  onClose: () => void;
};

const buttonClasses: Record<InfoModalVariant, string> = {
  info: "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200",
  error: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
};

export default function InfoModal({
  open,
  title,
  description,
  buttonText = "OK",
  variant = "info",
  onClose,
}: InfoModalProps) {
  return (
    <BaseModal open={open} title={title} onClose={onClose} width="md">
      <div className="space-y-6">
        <p className="whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
          {description}
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${buttonClasses[variant]}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
