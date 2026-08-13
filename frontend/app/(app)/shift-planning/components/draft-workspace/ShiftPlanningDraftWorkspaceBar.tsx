import { useEffect, useMemo, useState } from "react";

import ShiftPlanningCreateShiftsDialog from "./ShiftPlanningCreateShiftsDialog";
import type { ShiftPlanningWorkingPreviewResponse } from "../../helpers/shiftPlanningTypes";

export type ShiftPlanningNamedDraftSummary = {
  id: number | string;
  status?: string | null;
  note?: string | null;
  createdAt?: string | null;
  itemCount?: number | string | null;
};

type ShiftPlanningDraftWorkspaceBarProps = {
  drafts: ShiftPlanningNamedDraftSummary[];
  selectedDraftId: number | null;
  preview: ShiftPlanningWorkingPreviewResponse | null;
  draftsLoading: boolean;
  previewLoading: boolean;
  busy: boolean;
  dirty: boolean;
  editable: boolean;
  errorMessage: string | null;
  year: number;
  month: number;
  onSelectDraft: (draftId: number | null) => void | Promise<void>;
  onCreateDraft: (name: string) => Promise<void>;
  onSaveChanges: () => Promise<void>;
  onDiscardChanges: () => Promise<void>;
  onCopyDraft: (name: string) => Promise<void>;
  onDeleteDraft: () => Promise<void>;
  creatingShifts: boolean;
  onCreateShifts: () => Promise<void>;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDraftFallback(
  draft: ShiftPlanningNamedDraftSummary,
  year: number,
  month: number,
) {
  const note = typeof draft.note === "string" ? draft.note.trim() : "";
  if (note) return note;

  const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
  const createdLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleString("da-DK", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : `kladde ${draft.id}`;
  return `${String(month).padStart(2, "0")}.${year} · ${createdLabel}`;
}

export default function ShiftPlanningDraftWorkspaceBar({
  drafts,
  selectedDraftId,
  preview,
  draftsLoading,
  previewLoading,
  busy,
  dirty,
  editable,
  errorMessage,
  year,
  month,
  onSelectDraft,
  onCreateDraft,
  onSaveChanges,
  onDiscardChanges,
  onCopyDraft,
  onDeleteDraft,
  creatingShifts,
  onCreateShifts,
}: ShiftPlanningDraftWorkspaceBarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateShiftsDialog, setShowCreateShiftsDialog] = useState(false);
  const [createShiftsError, setCreateShiftsError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [copyName, setCopyName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const openDrafts = useMemo(
    () =>
      drafts.filter(
        (draft) => String(draft.status ?? "").toUpperCase() === "DRAFT",
      ),
    [drafts],
  );
  const selectedDraft = useMemo(
    () => drafts.find((draft) => Number(draft.id) === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const canCopySelected = Boolean(selectedDraft) && editable && !dirty && !busy;
  const canDeleteSelected = Boolean(selectedDraft) && editable && !dirty && !busy;
  const readyCount = toNumber(preview?.summary.readyItemCount);
  const blockedCount = toNumber(preview?.summary.blockedItemCount);
  const warningCount = toNumber(preview?.summary.warningCount);
  const readyDateCount = useMemo(
    () =>
      new Set(
        (preview?.items ?? [])
          .filter((item) => item.canBecomeShift)
          .map((item) => item.dateKey),
      ).size,
    [preview],
  );
  const selectedDraftName = selectedDraft
    ? formatDraftFallback(selectedDraft, year, month)
    : "Den valgte kladde";
  const canCreateShifts =
    Boolean(selectedDraft) &&
    editable &&
    !dirty &&
    !draftsLoading &&
    !previewLoading &&
    !busy &&
    readyCount > 0 &&
    blockedCount === 0;
  const createShiftsHint = !selectedDraft
    ? "Vælg eller opret en kladde, før vagter kan oprettes."
    : !editable
      ? "Kun en åben kladde kan oprettes som vagter."
      : dirty
        ? "Gem ændringerne, før vagterne oprettes."
        : draftsLoading || previewLoading
          ? "Kalenderen kontrolleres automatisk…"
          : blockedCount > 0
            ? `${blockedCount} blokeringer skal rettes i kalenderen først.`
            : readyCount === 0
              ? "Der er ingen vagter klar til oprettelse."
              : warningCount > 0
                ? `${readyCount} vagter er klar. ${warningCount} advarsler vises i kalenderen.`
                : `${readyCount} vagter er klar til oprettelse.`;

  useEffect(() => {
    if (!showCreateDialog && !showCopyDialog && !showDeleteDialog) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showCopyDialog, showCreateDialog, showDeleteDialog]);

  const createDraft = async () => {
    const name = draftName.trim();
    if (!name) {
      setDialogError("Skriv et navn til kladden.");
      return;
    }

    try {
      setDialogError(null);
      await onCreateDraft(name);
      setDraftName("");
      setShowCreateDialog(false);
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Kladden kunne ikke oprettes.",
      );
    }
  };

  const saveChanges = async () => {
    try {
      setDialogError(null);
      await onSaveChanges();
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Ændringerne kunne ikke gemmes.",
      );
    }
  };

  const discardChanges = async () => {
    try {
      setDialogError(null);
      await onDiscardChanges();
    } catch (error) {
      setDialogError(
        error instanceof Error
          ? error.message
          : "Ændringerne kunne ikke fortrydes.",
      );
    }
  };

  const copyDraft = async () => {
    const name = copyName.trim();
    if (!name) {
      setDialogError("Skriv et navn til kopien.");
      return;
    }

    try {
      setDialogError(null);
      await onCopyDraft(name);
      setCopyName("");
      setShowCopyDialog(false);
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Kladden kunne ikke kopieres.",
      );
    }
  };

  const deleteDraft = async () => {
    try {
      setDialogError(null);
      await onDeleteDraft();
      setShowDeleteDialog(false);
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Kladden kunne ikke slettes.",
      );
    }
  };

  const createShifts = async () => {
    try {
      setCreateShiftsError(null);
      await onCreateShifts();
      setShowCreateShiftsDialog(false);
    } catch (error) {
      setCreateShiftsError(
        error instanceof Error
          ? error.message
          : "Vagterne kunne ikke oprettes.",
      );
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm dark:border-violet-900/70 dark:bg-violet-950/25">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto] xl:items-end">
          <div>
            <label
              htmlFor="shift-planning-draft-view"
              className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300"
            >
              Visning i kalenderen
            </label>
            <select
              id="shift-planning-draft-view"
              value={
                selectedDraftId !== null &&
                openDrafts.some((draft) => Number(draft.id) === selectedDraftId)
                  ? String(selectedDraftId)
                  : ""
              }
              onChange={(event) => {
                if (event.target.value === "") {
                  void onSelectDraft(null);
                  return;
                }
                const draftId = Number(event.target.value);
                if (Number.isInteger(draftId) && draftId > 0) {
                  void onSelectDraft(draftId);
                }
              }}
              className="mt-2 block w-full rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:border-violet-800 dark:bg-gray-950 dark:text-white"
              disabled={draftsLoading || busy}
            >
              <option value="">Faktisk vagtplan · skrivebeskyttet</option>
              {openDrafts.map((draft) => (
                <option key={String(draft.id)} value={String(draft.id)}>
                  {formatDraftFallback(draft, year, month)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-violet-800 dark:text-violet-200">
              {!selectedDraft
                ? "Du ser den faktiske vagtplan i skrivebeskyttet visning. Vælg en åben kladde eller opret en ny for at ændre uger og dage."
                : dirty
                  ? "Du arbejder stadig i den valgte kladde. Ændringerne er endnu ikke gemt."
                  : editable
                    ? "Den åbne kladde kan redigeres direkte i kalenderen."
                    : "Tidligere kladder er skrivebeskyttede."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => {
                setDialogError(null);
                setShowCreateDialog(true);
              }}
              disabled={busy}
              className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300 dark:bg-violet-600 dark:hover:bg-violet-500 dark:disabled:bg-violet-950 dark:disabled:text-violet-500"
            >
              Ny kladde
            </button>

            {selectedDraft && editable && (
              <>
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={!dirty || busy}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-emerald-950 dark:disabled:text-emerald-500"
                >
                  {busy && dirty ? "Gemmer…" : "Gem ændringer"}
                </button>
                <button
                  type="button"
                  onClick={() => void discardChanges()}
                  disabled={!dirty || busy}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Fortryd ændringer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sourceName = formatDraftFallback(
                      selectedDraft,
                      year,
                      month,
                    );
                    setCopyName(`${sourceName} – kopi`.slice(0, 80));
                    setDialogError(null);
                    setShowCopyDialog(true);
                  }}
                  disabled={!canCopySelected}
                  title={dirty ? "Gem eller fortryd ændringerne før kopiering." : undefined}
                  className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-gray-950 dark:text-violet-200 dark:hover:bg-violet-950/30"
                >
                  Kopiér kladde
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDialogError(null);
                    setShowDeleteDialog(true);
                  }}
                  disabled={!canDeleteSelected}
                  title={dirty ? "Gem eller fortryd ændringerne før sletning." : undefined}
                  className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  Slet kladde
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {dirty && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Ikke gemte ændringer
              </span>
            )}
            {(draftsLoading || previewLoading) && (
              <span className="rounded-full bg-violet-200 px-3 py-1 text-violet-900 dark:bg-violet-900 dark:text-violet-100">
                Opdaterer kalender…
              </span>
            )}
            {!draftsLoading && !previewLoading && !errorMessage && preview && (
              <>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {readyCount} klar
                </span>
                {blockedCount > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 dark:bg-red-950 dark:text-red-200">
                    {blockedCount} blokeringer
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {warningCount} advarsler
                  </span>
                )}
              </>
            )}
            {errorMessage && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 dark:bg-red-950 dark:text-red-200">
                {errorMessage}
              </span>
            )}
            {selectedDraft && editable && !errorMessage && (
              <span className="text-gray-600 dark:text-gray-300">
                {createShiftsHint}
              </span>
            )}
          </div>

          {selectedDraft && editable && (
            <button
              type="button"
              onClick={() => {
                setCreateShiftsError(null);
                setShowCreateShiftsDialog(true);
              }}
              disabled={!canCreateShifts}
              title={canCreateShifts ? undefined : createShiftsHint}
              className="shrink-0 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-blue-950 dark:disabled:text-blue-500 dark:focus-visible:ring-offset-gray-900"
            >
              {creatingShifts ? "Opretter vagter…" : "Opret vagter"}
            </button>
          )}
        </div>

      </section>

      <ShiftPlanningCreateShiftsDialog
        open={showCreateShiftsDialog}
        draftName={selectedDraftName}
        readyCount={readyCount}
        readyDateCount={readyDateCount}
        warningCount={warningCount}
        busy={creatingShifts}
        errorMessage={createShiftsError}
        onConfirm={createShifts}
        onClose={() => {
          if (creatingShifts) return;
          setShowCreateShiftsDialog(false);
          setCreateShiftsError(null);
        }}
      />

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300">
              Ny kladde
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white">
              Navngiv kladden
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Kladden oprettes tom og vælges i kalenderen. Derefter kan du lægge skabeloner på uger og dage.
            </p>
            <label className="mt-5 block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="shift-planning-draft-name">
              Kladdenavn
            </label>
            <input
              id="shift-planning-draft-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Fx September – første udkast"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              disabled={busy}
            />
            {dialogError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {dialogError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700"
                disabled={busy}
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void createDraft()}
                className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Opretter…" : "Opret kladde"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCopyDialog && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300">
              Kopiér kladde
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white">
              Navngiv kopien
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Kopien får de samme foreslåede vagter og problemer som den valgte kladde. Originalen ændres ikke.
            </p>
            <label className="mt-5 block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="shift-planning-copy-draft-name">
              Kladdenavn
            </label>
            <input
              id="shift-planning-copy-draft-name"
              value={copyName}
              onChange={(event) => setCopyName(event.target.value)}
              maxLength={80}
              autoFocus
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              disabled={busy}
            />
            {dialogError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {dialogError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCopyDialog(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700"
                disabled={busy}
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void copyDraft()}
                className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Kopierer…" : "Kopiér kladde"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-600 dark:text-red-300">
              Slet kladde
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-gray-950 dark:text-white">
              Slet {formatDraftFallback(selectedDraft, year, month)}?
            </h3>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Kun kladden slettes. Eksisterende vagter i vagtplanen påvirkes ikke.
            </p>
            {dialogError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {dialogError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700"
                disabled={busy}
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void deleteDraft()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Sletter…" : "Ja, slet kladde"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
