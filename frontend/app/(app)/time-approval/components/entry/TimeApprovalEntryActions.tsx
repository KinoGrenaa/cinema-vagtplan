import type { TimeEntry } from "../../types";
import { getStatusClass, getStatusLabel } from "../../utils";

type TimeApprovalEntryActionsProps = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (entry: TimeEntry) => void;
  onApprove: (entry: TimeEntry) => void;
  onUnapprove: (entryId: number) => void;
  onSendBackForChanges: (entryId: number) => void;
  onVoid: (entryId: number) => void;
};

export default function TimeApprovalEntryActions({
  entry,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: TimeApprovalEntryActionsProps) {
  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
          entry.status,
        )}`}
      >
        {getStatusLabel(entry.status)}
      </span>
      {entry.deviation?.hasDeviation && (
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
          {entry.shift ? "Afvigelse" : "Manuel registrering"}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(entry)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Redigér
        </button>
        <button
          onClick={() => onOpenHistory(entry)}
          className="rounded-xl bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Historik
        </button>
        {entry.status === "PENDING" && (
          <button
            onClick={() => onApprove(entry)}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            Godkend
          </button>
        )}
        {entry.status === "APPROVED" && (
          <button
            onClick={() => onUnapprove(entry.id)}
            className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700"
          >
            Fjern godkendelse
          </button>
        )}
        {entry.status === "PENDING" && (
          <button
            onClick={() => onSendBackForChanges(entry.id)}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Send retur
          </button>
        )}
        {entry.status !== "VOIDED" && (
          <button
            onClick={() => onVoid(entry.id)}
            className="rounded-xl bg-red-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-900"
          >
            Afvis registrering
          </button>
        )}
      </div>
    </div>
  );
}
