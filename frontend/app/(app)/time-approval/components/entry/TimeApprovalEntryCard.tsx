import PayrollAdjustmentNotice from "../../../../components/time-entries/PayrollAdjustmentNotice";
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
  onSendBackForChanges: (
    entryId: number,
  ) => void;
  onVoid: (entryId: number) => void;
};

function getHours(entry: TimeEntry) {
  if (!entry.clockOut) return "-";

  const start = new Date(entry.clockIn);
  const end = new Date(entry.clockOut);
  const hours =
    (end.getTime() - start.getTime()) /
    1000 /
    60 /
    60;

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
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {formatDateTime(entry.clockIn)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entry.shift?.workType?.name ||
                "Manuel registrering"}
            </p>
          </div>

          <PayrollAdjustmentNotice
            adjustments={
              entry.payrollAdjustments
            }
            audience="manager"
          />

          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-semibold">
                Arbejdstype:
              </span>{" "}
              {entry.shift?.workType?.name ||
                "-"}
            </div>
            <div>
              <span className="font-semibold">
                Mødt:
              </span>{" "}
              {formatDateTime(entry.clockIn)}
            </div>
            <div>
              <span className="font-semibold">
                Gået hjem:
              </span>{" "}
              {formatDateTime(entry.clockOut)}
            </div>
            <div>
              <span className="font-semibold">
                Timer:
              </span>{" "}
              {getHours(entry)}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onToggleDetails(entry.id)
                }
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  hasDetails
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {hasDetails
                  ? "⚠ Vis detaljer"
                  : "Vis detaljer"}
              </button>
            </div>

            {isExpanded && (
              <DeviationPanel entry={entry} />
            )}
            <TimeApprovalEntryNotes
              entry={entry}
            />
          </div>
        </div>

        <TimeApprovalEntryActions
          entry={entry}
          onEdit={onEdit}
          onOpenHistory={onOpenHistory}
          onApprove={onApprove}
          onUnapprove={onUnapprove}
          onSendBackForChanges={
            onSendBackForChanges
          }
          onVoid={onVoid}
        />
      </div>
    </div>
  );
}
