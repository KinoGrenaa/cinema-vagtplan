"use client";

import { useEffect } from "react";

export type ShiftPlanningRemovalScope = "DAY" | "WEEK" | "MONTH";

export type ShiftPlanningRemovalPreviewItem = {
  shiftId: number;
  dateKey: string;
  startTime: string;
  endTime: string;
  userId: number | null;
  userName: string | null;
  jobFunctionName: string;
  canDelete: boolean;
  blockReasons: string[];
};

export type ShiftPlanningRemovalPreview = {
  mode: "PREVIEW_ONLY";
  createsOrChangesShifts: false;
  cinemaId: number;
  scope: ShiftPlanningRemovalScope;
  requestedDateKey: string;
  startDateKey: string;
  endDateKey: string;
  checkedAt: string;
  summary: {
    selectedShiftCount: number;
    deletableShiftCount: number;
    blockedShiftCount: number;
    assignedShiftCount: number;
    affectedDateCount: number;
    canRemove: boolean;
  };
  blockingReasons: string[];
  items: ShiftPlanningRemovalPreviewItem[];
};

type ShiftPlanningRemoveShiftsDialogProps = {
  open: boolean;
  targetLabel: string;
  preview: ShiftPlanningRemovalPreview | null;
  loading: boolean;
  busy: boolean;
  errorMessage: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

function formatDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : dateKey;
}

function formatShiftTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ukendt tid";
  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(date);
}

export default function ShiftPlanningRemoveShiftsDialog({
  open,
  targetLabel,
  preview,
  loading,
  busy,
  errorMessage,
  onConfirm,
  onClose,
}: ShiftPlanningRemoveShiftsDialogProps) {
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

  const selectedCount = preview?.summary.selectedShiftCount ?? 0;
  const blockedCount = preview?.summary.blockedShiftCount ?? 0;
  const canRemove =
    Boolean(preview?.summary.canRemove) && !loading && !busy && !errorMessage;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/75 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-planning-remove-shifts-title"
        aria-describedby="shift-planning-remove-shifts-description"
        className="max-h-[90vh] w-full max-w-2xl overscroll-contain overflow-y-auto rounded-3xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-gray-900"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-700 dark:text-red-300">
          Faktiske vagter
        </p>
        <h3
          id="shift-planning-remove-shifts-title"
          className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white"
        >
          Fjern vagter for {targetLabel}?
        </h3>
        <p
          id="shift-planning-remove-shifts-description"
          className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
        >
          Kun vagter, der er oprettet gennem vagtplanlægningen, er med i denne
          handling. Manuelt oprettede vagter bliver ikke slettet. Systemet
          kontrollerer vagterne igen i samme transaktion, før noget fjernes.
        </p>

        {loading && (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Kontrollerer hvilke vagter der kan fjernes…
          </div>
        )}

        {!loading && preview && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Valgt
                </p>
                <p className="mt-1 text-2xl font-bold">{selectedCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Kan fjernes
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {preview.summary.deletableShiftCount}
                </p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Blokeret
                </p>
                <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-100">
                  {blockedCount}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Tildelte
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {preview.summary.assignedShiftCount}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Periode: <span className="font-semibold">{formatDateKey(preview.startDateKey)}</span>
              {" – "}
              <span className="font-semibold">{formatDateKey(preview.endDateKey)}</span>
              {" · "}
              {preview.summary.affectedDateCount} berørte datoer
            </p>

            {selectedCount === 0 && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
                Der er ingen fremtidige vagter fra vagtplanlægningen i perioden.
                Eventuelle manuelle vagter er bevidst ikke medtaget.
              </div>
            )}

            {blockedCount > 0 && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/35 dark:text-red-100">
                <p className="font-bold">
                  Ingen vagter fjernes, fordi mindst én vagt er blokeret.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.items.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Vagter i kontrollen
                </p>
                <div className="mt-2 max-h-64 space-y-2 overscroll-contain overflow-y-auto pr-1">
                  {preview.items.map((item) => (
                    <div
                      key={item.shiftId}
                      className={`rounded-2xl border p-3 text-sm ${
                        item.canDelete
                          ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/50"
                          : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/35"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white">
                            {formatDateKey(item.dateKey)} · {formatShiftTime(item.startTime)}–
                            {formatShiftTime(item.endTime)} · {item.jobFunctionName}
                          </p>
                          <p className="mt-1 text-gray-600 dark:text-gray-300">
                            {item.userName ?? "Uden medarbejder"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            item.canDelete
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {item.canDelete ? "Kan fjernes" : "Blokeret"}
                        </span>
                      </div>
                      {item.blockReasons.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-800 dark:text-red-200">
                          {item.blockReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!canRemove}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:disabled:bg-red-950 dark:disabled:text-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
          >
            {busy
              ? "Fjerner vagter…"
              : `Ja, fjern ${selectedCount} ${selectedCount === 1 ? "vagt" : "vagter"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
