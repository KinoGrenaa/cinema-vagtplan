"use client";

import { useEffect } from "react";

export type ShiftPlanningUnsavedActionKind =
  | "select-draft"
  | "view-schedule"
  | "create-draft"
  | "change-month";

type ShiftPlanningUnsavedChangesDialogProps = {
  open: boolean;
  actionKind: ShiftPlanningUnsavedActionKind;
  dirtyDateCount: number;
  busy: boolean;
  errorMessage: string | null;
  onSaveAndContinue: () => void | Promise<void>;
  onDiscardAndContinue: () => void | Promise<void>;
  onStay: () => void;
};

function getDialogCopy(actionKind: ShiftPlanningUnsavedActionKind) {
  switch (actionKind) {
    case "view-schedule":
      return {
        title: "Vis kun vagtplanen?",
        description:
          "Den valgte kladde har ændringer, som ikke er gemt. Vælg hvad der skal ske, før kladden skjules og den faktiske vagtplan vises.",
        saveLabel: "Gem og vis vagtplanen",
        discardLabel: "Kassér og vis vagtplanen",
      };
    case "create-draft":
      return {
        title: "Opret ny kladde?",
        description:
          "Den valgte kladde har ændringer, som ikke er gemt. Vælg hvad der skal ske, før den nye kladde oprettes.",
        saveLabel: "Gem og opret",
        discardLabel: "Kassér og opret",
      };
    case "change-month":
      return {
        title: "Skift måned?",
        description:
          "Den valgte kladde har ændringer, som ikke er gemt. Vælg hvad der skal ske, før kalenderen skifter måned.",
        saveLabel: "Gem og skift måned",
        discardLabel: "Kassér og skift måned",
      };
    default:
      return {
        title: "Skift kladde?",
        description:
          "Den valgte kladde har ændringer, som ikke er gemt. Vælg hvad der skal ske, før en anden kladde åbnes.",
        saveLabel: "Gem og skift",
        discardLabel: "Kassér og skift",
      };
  }
}

export default function ShiftPlanningUnsavedChangesDialog({
  open,
  actionKind,
  dirtyDateCount,
  busy,
  errorMessage,
  onSaveAndContinue,
  onDiscardAndContinue,
  onStay,
}: ShiftPlanningUnsavedChangesDialogProps) {
  const copy = getDialogCopy(actionKind);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onStay();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [busy, onStay, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/75 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-planning-unsaved-title"
        aria-describedby="shift-planning-unsaved-description"
        className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900 dark:bg-gray-900"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-300">
          Ikke gemte ændringer
        </p>
        <h3
          id="shift-planning-unsaved-title"
          className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white"
        >
          {copy.title}
        </h3>
        <p
          id="shift-planning-unsaved-description"
          className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
        >
          {copy.description}
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {dirtyDateCount === 1
            ? "1 dato er ændret siden sidste gemning."
            : `${dirtyDateCount} datoer er ændret siden sidste gemning.`}
        </p>

        {errorMessage && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-[auto_1fr_1fr]">
          <button
            type="button"
            onClick={onStay}
            disabled={busy}
            autoFocus
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
          >
            Bliv her
          </button>
          <button
            type="button"
            onClick={() => void onDiscardAndContinue()}
            disabled={busy}
            className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/30 dark:focus-visible:ring-offset-gray-900"
          >
            {busy ? "Arbejder…" : copy.discardLabel}
          </button>
          <button
            type="button"
            onClick={() => void onSaveAndContinue()}
            disabled={busy}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-emerald-950 dark:disabled:text-emerald-500 dark:focus-visible:ring-offset-gray-900"
          >
            {busy ? "Arbejder…" : copy.saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
