"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type BaseModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: "sm" | "md" | "lg" | "xl";
};

const widthClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function BaseModal({
  open,
  title,
  children,
  onClose,
  width = "md",
}: BaseModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 ${widthClasses[width]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold leading-7 text-gray-950 dark:text-gray-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
