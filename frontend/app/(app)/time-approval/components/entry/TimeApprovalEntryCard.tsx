import type { TimeEntry } from "../../types";
import { formatDateTime } from "../../utils";
import DeviationPanel from "./DeviationPanel";
import TimeApprovalEntryActions from "./TimeApprovalEntryActions";
import TimeApprovalEntryNotes from "./TimeApprovalEntryNotes";

type TimeApprovalEntryCardProps = {
  entry: TimeEntry;
  isExpanded: boolean;
  onToggleDetails: (entryId: number) => void;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (entry: TimeEntry) => void;
  onApprove: (entry: TimeEntry) => void;
  onUnapprove: (entryId: number) => void;
  onSendBackForChanges: (entryId: number) => void;
  onVoid: (entryId: number) => void;
};

function formatSignedMinutesAsTime(minutesValue: number) {
  const sign = minutesValue >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(minutesValue);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function getHours(entry: TimeEntry) {
  if (!entry.clockOut) return "-";

  const start = new Date(entry.clockIn);
  const end = new Date(entry.clockOut);
  const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

  return hours.toFixed(2);
}

export default function TimeApprovalEntryCard({
  entry,
  isExpanded,
  onToggleDetails,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: TimeApprovalEntryCardProps) {
  const hasDetails = Boolean(
    entry.deviation?.hasDeviation ||
      entry.clockInNote ||
      entry.clockOutNote ||
      entry.note ||
      entry.adminNote,
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {formatDateTime(entry.clockIn)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entry.shift?.workType?.name || "Manuel registrering"}
            </p>
          </div>
          {entry.payrollAdjustments && entry.payrollAdjustments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.payrollAdjustments.map((adjustment) => (
                <span
                  key={adjustment.id}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Efterregulering {formatSignedMinutesAsTime(adjustment.minutesDelta)}
                </span>
              ))}
            </div>
          )}
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-semibold">Arbejdstype:</span>{" "}
              {entry.shift?.workType?.name || "-"}
            </div>
            <div>
              <span className="font-semibold">Mødt:</span>{" "}
              {formatDateTime(entry.clockIn)}
            </div>
            <div>
              <span className="font-semibold">Gået hjem:</span>{" "}
              {formatDateTime(entry.clockOut)}
            </div>
            <div>
              <span className="font-semibold">Timer:</span> {getHours(entry)}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onToggleDetails(entry.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  hasDetails
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {hasDetails ? "⚠ Vis detaljer" : "Vis detaljer"}
              </button>
            </div>
            {isExpanded && <DeviationPanel entry={entry} />}
            <TimeApprovalEntryNotes entry={entry} />
          </div>
        </div>
        <TimeApprovalEntryActions
          entry={entry}
          onEdit={onEdit}
          onOpenHistory={onOpenHistory}
          onApprove={onApprove}
          onUnapprove={onUnapprove}
          onSendBackForChanges={onSendBackForChanges}
          onVoid={onVoid}
        />
      </div>
    </div>
  );
}
