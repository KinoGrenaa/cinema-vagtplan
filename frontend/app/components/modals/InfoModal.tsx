"use client";

import { AlertTriangle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

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
  info: "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white",
  error:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  success:
    "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
  warning:
    "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-gray-950 dark:hover:bg-amber-400",
};

const iconClasses: Record<InfoModalVariant, string> = {
  info: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
  error:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
  success:
    "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-900",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
};

const icons: Record<InfoModalVariant, typeof Info> = {
  info: Info,
  error: TriangleAlert,
  success: CheckCircle2,
  warning: AlertTriangle,
};

export default function InfoModal({
  open,
  title,
  description,
  buttonText = "OK",
  variant = "info",
  onClose,
}: InfoModalProps) {
  const Icon = icons[variant];

  return (
    <BaseModal open={open} title={title} onClose={onClose} width="sm">
      <div className="space-y-5">
        <div className="flex gap-4">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${iconClasses[variant]}`}
          >
            <Icon size={20} />
          </div>

          <p className="whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition ${buttonClasses[variant]}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
