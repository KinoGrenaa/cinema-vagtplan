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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`relative w-full rounded-3xl border border-gray-200 bg-white shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 ${widthClasses[width]}`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-xl font-bold">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
