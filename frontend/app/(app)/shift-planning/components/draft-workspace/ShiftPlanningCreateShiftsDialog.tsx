"use client";

import { useEffect } from "react";

export type ShiftPlanningCreateShiftsResult = {
  createdShiftCount: number;
  affectedDateKeys: string[];
  message: string;
};

type ShiftPlanningCreateShiftsDialogProps = {
  open: boolean;
  draftName: string;
  readyCount: number;
  readyDateCount: number;
  warningCount: number;
  busy: boolean;
  errorMessage: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ShiftPlanningCreateShiftsDialog({
  open,
  draftName,
  readyCount,
  readyDateCount,
  warningCount,
  busy,
  errorMessage,
  onConfirm,
  onClose,
}: ShiftPlanningCreateShiftsDialogProps) {
  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/75 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-planning-create-shifts-title"
        aria-describedby="shift-planning-create-shifts-description"
        className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xl dark:border-emerald-900 dark:bg-gray-900"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
          Sidste bekræftelse
        </p>
        <h3
          id="shift-planning-create-shifts-title"
          className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white"
        >
          Opret vagterne i vagtplanen?
        </h3>
        <p
          id="shift-planning-create-shifts-description"
          className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
        >
          Kladden <span className="font-semibold">“{draftName}”</span> er gemt
          og kontrolleret automatisk. Når du fortsætter, bliver vagterne synlige
          i vagtplanen, og kladden flyttes til tidligere kladder.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Vagter
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-950 dark:text-emerald-100">
              {readyCount}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Datoer
            </p>
            <p className="mt-1 text-2xl font-extrabold text-blue-950 dark:text-blue-100">
              {readyDateCount}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Advarsler
            </p>
            <p className="mt-1 text-2xl font-extrabold text-amber-950 dark:text-amber-100">
              {warningCount}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-300">
          Systemet kontrollerer fortidsdatoer, eksisterende vagter og konflikter
          igen i selve oprettelsen. Vagtplanen ændres ikke, hvis kontrollen ikke
          længere kan bestås.
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            autoFocus
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-emerald-950 dark:disabled:text-emerald-500 dark:focus-visible:ring-offset-gray-900"
          >
            {busy ? "Opretter vagter…" : "Ja, opret vagter"}
          </button>
        </div>
      </div>
    </div>
  );
}
