import type { TimeEntry } from "../../types";

type Props = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (entry: TimeEntry) => void;
  onSendBackForChanges: (entryId: number) => void;
  onVoid: (entry: TimeEntry) => void;
};

const secondaryAction =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-offset-gray-900";

const warningAction =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/60 dark:active:bg-amber-900/60 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-900";

const destructiveAction =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-red-300 bg-transparent px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900";

export default function TimeApprovalEntryActions({
  entry,
  onEdit,
  onOpenHistory,
  onSendBackForChanges,
  onVoid,
}: Props) {
  const isPending = entry.status === "PENDING";
  const isVoided = entry.status === "VOIDED";

  return (
    <div className="grid h-fit grid-cols-2 gap-2 xl:w-72">
      {!isVoided && (
        <button
          type="button"
          onClick={() => onEdit(entry)}
          className={secondaryAction}
        >
          Redigér
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenHistory(entry)}
        className={`${secondaryAction} ${isVoided ? "col-span-2" : ""}`}
      >
        Historik
      </button>

      {isPending && (
        <button
          type="button"
          onClick={() => onSendBackForChanges(entry.id)}
          className={warningAction}
        >
          Send retur
        </button>
      )}

      {!isVoided && (
        <button
          type="button"
          onClick={() => onVoid(entry)}
          className={`${destructiveAction} ${
            isPending ? "" : "col-span-2"
          }`}
        >
          Afvis registrering
        </button>
      )}
    </div>
  );
}
