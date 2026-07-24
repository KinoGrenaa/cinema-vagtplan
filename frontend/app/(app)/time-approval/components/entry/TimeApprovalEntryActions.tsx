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

const actionBase =
  "rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function TimeApprovalEntryActions({
  entry,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: Props) {
  return (
    <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-52">
      <div
        className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${getStatusClass(
          entry.status,
        )}`}
      >
        {getStatusLabel(
          entry.status,
        )}
      </div>

      {entry.deviation
        ?.hasDeviation && (
        <div className="rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          {entry.shift
            ? "Afvigelse"
            : "Manuel registrering"}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          onEdit(entry)
        }
        className={`${actionBase} bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400`}
      >
        Redigér
      </button>

      <button
        type="button"
        onClick={() =>
          onOpenHistory(entry)
        }
        className={`${actionBase} bg-gray-700 text-white hover:bg-gray-800 active:bg-gray-900 focus-visible:ring-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 dark:active:bg-gray-400 dark:focus-visible:ring-gray-400`}
      >
        Historik
      </button>

      {entry.status ===
        "PENDING" && (
        <button
          type="button"
          onClick={() =>
            onApprove(entry)
          }
          className={`${actionBase} bg-green-700 text-white hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400`}
        >
          Godkend
        </button>
      )}

      {entry.status ===
        "APPROVED" && (
        <button
          type="button"
          onClick={() =>
            onUnapprove(entry)
          }
          className={`${actionBase} bg-amber-500 text-gray-950 hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-amber-500 dark:bg-amber-400 dark:hover:bg-amber-300 dark:active:bg-amber-200 dark:focus-visible:ring-amber-300`}
        >
          Fjern godkendelse
        </button>
      )}

      {entry.status ===
        "PENDING" && (
        <button
          type="button"
          onClick={() =>
            onSendBackForChanges(
              entry.id,
            )
          }
          className={`${actionBase} bg-amber-500 text-gray-950 hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-amber-500 dark:bg-amber-400 dark:hover:bg-amber-300 dark:active:bg-amber-200 dark:focus-visible:ring-amber-300`}
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
          className={`${actionBase} bg-red-900 text-white hover:bg-red-950 active:bg-black focus-visible:ring-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:active:bg-red-600 dark:focus-visible:ring-red-500`}
        >
          Afvis registrering
        </button>
      )}
    </div>
  );
}
