import { useEffect } from "react";

export type ShiftPlanningReplacementScope = "DAY" | "WEEK" | "MONTH";

export type ShiftPlanningReplacementDraftOption = {
  id: number;
  label: string;
};

export type ShiftPlanningReplacementExistingItem = {
  shiftId: number;
  dateKey: string;
  startTime: string;
  endTime: string;
  userId: number | null;
  userName: string | null;
  jobFunctionId: number | null;
  jobFunctionName: string;
  canRemove: boolean;
  blockReasons: string[];
};

export type ShiftPlanningReplacementProposedItem = {
  draftItemId: number;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  userId: number | null;
  userName: string | null;
  jobFunctionId: number | null;
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  requiredIndex: number;
  sourceMovieShowingIds: number[];
  canCreate: boolean;
  blockReasons: string[];
};

export type ShiftPlanningReplacementPreview = {
  mode: "PREVIEW_ONLY";
  createsOrChangesShifts: false;
  cinemaId: number;
  draftId: number;
  draftName: string | null;
  scope: ShiftPlanningReplacementScope;
  requestedDateKey: string;
  startDateKey: string;
  endDateKey: string;
  checkedAt: string;
  summary: {
    existingShiftCount: number;
    removableShiftCount: number;
    blockedExistingShiftCount: number;
    assignedExistingShiftCount: number;
    retainedExistingShiftCount: number;
    proposedShiftCount: number;
    creatableShiftCount: number;
    blockedProposedShiftCount: number;
    ignoredPastProposedShiftCount: number;
    affectedDateCount: number;
    canReplace: boolean;
  };
  blockingReasons: string[];
  existingItems: ShiftPlanningReplacementExistingItem[];
  proposedItems: ShiftPlanningReplacementProposedItem[];
};

type ShiftPlanningReplaceShiftsDialogProps = {
  open: boolean;
  targetLabel: string;
  draftOptions: ShiftPlanningReplacementDraftOption[];
  selectedDraftId: number | null;
  preview: ShiftPlanningReplacementPreview | null;
  loading: boolean;
  busy: boolean;
  errorMessage: string | null;
  onSelectDraft: (draftId: number) => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "Tidspunkt mangler";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPersonLabel(userName: string | null) {
  return userName?.trim() || "Uden medarbejder";
}

export default function ShiftPlanningReplaceShiftsDialog({
  open,
  targetLabel,
  draftOptions,
  selectedDraftId,
  preview,
  loading,
  busy,
  errorMessage,
  onSelectDraft,
  onConfirm,
  onClose,
}: ShiftPlanningReplaceShiftsDialogProps) {
  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  if (!open) return null;

  const canReplace =
    selectedDraftId !== null &&
    Boolean(preview?.summary.canReplace) &&
    !loading &&
    !busy;
  const blockedCount =
    (preview?.summary.blockedExistingShiftCount ?? 0) +
    (preview?.summary.blockedProposedShiftCount ?? 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-planning-shifts-title"
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-violet-300 bg-white shadow-2xl dark:border-violet-800 dark:bg-gray-900"
      >
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">
            Faktiske vagter + kladde
          </p>
          <h3
            id="replace-planning-shifts-title"
            className="mt-1 text-xl font-extrabold text-gray-950 dark:text-white"
          >
            Erstat vagter for {targetLabel}?
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Systemet fjerner kun fremtidige vagter, der er oprettet gennem
            vagtplanlægningen, og opretter derefter kladdens fremtidige vagter.
            Vagter, der allerede er startet, og manuelle vagter bliver stående.
            Begge dele gennemføres samlet eller slet ikke.
          </p>
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/25">
            <label
              htmlFor="shift-planning-replacement-draft"
              className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300"
            >
              Erstat med
            </label>
            <select
              id="shift-planning-replacement-draft"
              value={selectedDraftId === null ? "" : String(selectedDraftId)}
              onChange={(event) => {
                const draftId = Number(event.target.value);
                if (Number.isInteger(draftId) && draftId > 0) {
                  void onSelectDraft(draftId);
                }
              }}
              disabled={loading || busy || draftOptions.length === 0}
              className="mt-2 block w-full rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-gray-950 dark:text-white"
            >
              {draftOptions.length === 0 ? (
                <option value="">Ingen åbne kladder</option>
              ) : (
                <option value="" disabled>
                  Vælg kladde
                </option>
              )}
              {draftOptions.map((draft) => (
                <option key={draft.id} value={String(draft.id)}>
                  {draft.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-violet-800 dark:text-violet-200">
              Vælg den gemte kladde, der skal være den nye plan. Hvis en kladde
              allerede vises i kalenderen, er den forvalgt, men den kan ændres her.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 overscroll-contain">
          {loading && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm font-semibold text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
              Kontrollerer hvad der kan fjernes og oprettes…
            </div>
          )}

          {!loading &&
            !errorMessage &&
            !preview &&
            selectedDraftId === null &&
            draftOptions.length > 0 && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
                <span className="font-bold">Vælg først “Erstat med”.</span>{" "}
                Derefter viser systemet præcis hvilke vagter der fjernes, og
                hvilke der oprettes.
              </div>
            )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {preview && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/25">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                    Fjernes
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-red-900 dark:text-red-100">
                    {preview.summary.existingShiftCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/25">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Oprettes
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-violet-900 dark:text-violet-100">
                    {preview.summary.proposedShiftCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/25">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Tildelte gamle vagter
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-blue-900 dark:text-blue-100">
                    {preview.summary.assignedExistingShiftCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    Tidligere beholdes
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {preview.summary.retainedExistingShiftCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Blokeret
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-amber-900 dark:text-amber-100">
                    {blockedCount}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                Periode: {preview.startDateKey} – {preview.endDateKey} ·{" "}
                {preview.summary.affectedDateCount} berørte{" "}
                {preview.summary.affectedDateCount === 1 ? "dato" : "datoer"}
              </p>

              {(preview.summary.retainedExistingShiftCount > 0 ||
                preview.summary.ignoredPastProposedShiftCount > 0) && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                  <span className="font-bold">Tidligere vagter ændres ikke.</span>{" "}
                  {preview.summary.retainedExistingShiftCount > 0 && (
                    <>
                      {preview.summary.retainedExistingShiftCount} allerede startede
                      eller tidligere{" "}
                      {preview.summary.retainedExistingShiftCount === 1
                        ? "vagt beholdes"
                        : "vagter beholdes"}
                      .
                    </>
                  )}{" "}
                  {preview.summary.ignoredPastProposedShiftCount > 0 && (
                    <>
                      {preview.summary.ignoredPastProposedShiftCount} tilsvarende
                      tidligere{" "}
                      {preview.summary.ignoredPastProposedShiftCount === 1
                        ? "kladdeforslag springes"
                        : "kladdeforslag springes"}{" "}
                      over.
                    </>
                  )}
                </div>
              )}

              {preview.blockingReasons.length > 0 && (
                <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/35">
                  <p className="font-bold text-red-900 dark:text-red-100">
                    Erstatningen kan ikke gennemføres endnu
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-200">
                    {preview.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/15">
                  <h4 className="font-extrabold text-red-900 dark:text-red-100">
                    Fjernes fra vagtplanen
                  </h4>
                  <div className="mt-3 space-y-2">
                    {preview.existingItems.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Ingen planlægningsoprettede vagter i perioden.
                      </p>
                    ) : (
                      preview.existingItems.map((item) => (
                        <div
                          key={item.shiftId}
                          className={`rounded-xl border p-3 ${
                            item.canRemove
                              ? "border-red-200 bg-white dark:border-red-900 dark:bg-gray-950"
                              : "border-red-500 bg-red-100 dark:border-red-700 dark:bg-red-950/50"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-gray-950 dark:text-white">
                                {formatDateTime(item.startTime)} –{" "}
                                {new Date(item.endTime).toLocaleTimeString("da-DK", {
                                  timeZone: "Europe/Copenhagen",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {item.jobFunctionName} · {getPersonLabel(item.userName)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                item.canRemove
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100"
                              }`}
                            >
                              {item.canRemove ? "Kan fjernes" : "Blokeret"}
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
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/15">
                  <h4 className="font-extrabold text-violet-900 dark:text-violet-100">
                    Oprettes fra kladden
                  </h4>
                  <div className="mt-3 space-y-2">
                    {preview.proposedItems.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Kladden indeholder ingen vagter i perioden.
                      </p>
                    ) : (
                      preview.proposedItems.map((item) => (
                        <div
                          key={item.draftItemId}
                          className={`rounded-xl border p-3 ${
                            item.canCreate
                              ? "border-violet-200 bg-white dark:border-violet-900 dark:bg-gray-950"
                              : "border-red-500 bg-red-100 dark:border-red-700 dark:bg-red-950/50"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-gray-950 dark:text-white">
                                {formatDateTime(item.startTime)} –{" "}
                                {item.endTime
                                  ? new Date(item.endTime).toLocaleTimeString("da-DK", {
                                      timeZone: "Europe/Copenhagen",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "?"}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {item.jobFunctionName ?? "Jobfunktion mangler"} ·{" "}
                                {getPersonLabel(item.userName)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                item.canCreate
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100"
                              }`}
                            >
                              {item.canCreate ? "Kan oprettes" : "Blokeret"}
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
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!canReplace}
            className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-200 disabled:text-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 dark:disabled:bg-violet-950 dark:disabled:text-violet-500"
          >
            {busy ? "Erstatter…" : "Ja, erstat vagter"}
          </button>
        </div>
      </div>
    </div>
  );
}
