import type {
  TimeEntry,
} from "../../types";
import {
  getStatusClass,
  getStatusLabel,
} from "../../utils";

type Props = {
  entry: TimeEntry;
  onEdit:
    (entry: TimeEntry) => void;
  onOpenHistory:
    (entry: TimeEntry) => void;
  onApprove:
    (entry: TimeEntry) => void;
  onUnapprove:
    (entry: TimeEntry) => void;
  onSendBackForChanges:
    (entryId: number) => void;
  onVoid:
    (entry: TimeEntry) => void;
};

const secondaryAction =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-offset-gray-900";

const primaryAction =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-400 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-gray-900";

const warningAction =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/60 dark:active:bg-amber-900/60 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-900";

const destructiveAction =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-red-300 bg-transparent px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900";

export default function TimeApprovalEntryActions({
  entry,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: Props) {
  const isPending =
    entry.status ===
    "PENDING";

  const isApproved =
    entry.status ===
    "APPROVED";

  const isVoided =
    entry.status ===
    "VOIDED";

  const isOpenEntry =
    !entry.clockOut;

  return (
    <div className="flex w-full flex-col gap-3 lg:w-72">
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
            entry.status,
          )}`}
        >
          {getStatusLabel(
            entry.status,
          )}
        </span>

        {entry.deviation
          ?.hasDeviation && (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {entry.shift
              ? "Afvigelse"
              : "Manuel registrering"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {isPending &&
          !isOpenEntry && (
          <button
            type="button"
            onClick={() =>
              onApprove(entry)
            }
            className={`${primaryAction} col-span-2`}
          >
            Godkend
          </button>
        )}

        {isApproved && (
          <button
            type="button"
            onClick={() =>
              onUnapprove(entry)
            }
            className={`${warningAction} col-span-2`}
          >
            Fjern godkendelse
          </button>
        )}

        {!isVoided && (
          <button
            type="button"
            onClick={() =>
              onEdit(entry)
            }
            className={
              secondaryAction
            }
          >
            {"Redig\u00e9r"}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            onOpenHistory(entry)
          }
          className={
            secondaryAction
          }
        >
          Historik
        </button>

        {isPending && (
          <button
            type="button"
            onClick={() =>
              onSendBackForChanges(
                entry.id,
              )
            }
            className={
              warningAction
            }
          >
            Send retur
          </button>
        )}

        {entry.status !==
          "VOIDED" && (
          <button
            type="button"
            onClick={() =>
              onVoid(entry)
            }
            className={`${destructiveAction} ${
              isPending
                ? ""
                : "col-span-2"
            }`}
          >
            Afvis registrering
          </button>
        )}
      </div>
    </div>
  );
}
