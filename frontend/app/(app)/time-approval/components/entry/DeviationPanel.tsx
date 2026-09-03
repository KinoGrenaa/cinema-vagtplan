import type { TimeEntry } from "../../types";
import {
  formatDateTime,
  formatDurationMinutes,
  formatMinutes,
} from "../../utils";

export default function DeviationPanel({ entry }: { entry: TimeEntry }) {
  const deviation = entry.deviation;
  const isManualEntry = !entry.shift;

  if (!deviation) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/40">
        <div className="font-semibold">Afvigelsesanalyse</div>
        <div className="mt-1 text-gray-500 dark:text-gray-400">
          Ingen afvigelsesdata modtaget fra backend.
        </div>
      </div>
    );
  }

  const plannedRange =
    entry.shift?.startTime && entry.shift?.endTime
      ? `${formatDateTime(entry.shift.startTime)} - ${formatDateTime(
          entry.shift.endTime,
        )}`
      : "-";
  const registeredRange = `${formatDateTime(entry.clockIn)} - ${formatDateTime(
    entry.clockOut,
  )}`;

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        isManualEntry
          ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
          : deviation.hasDeviation
            ? "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40"
            : "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {isManualEntry ? "Manuel registrering" : "Afvigelsesanalyse"}
        </span>
        {!isManualEntry && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              deviation.hasDeviation
                ? "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
                : "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100"
            }`}
          >
            {deviation.hasDeviation ? "Afvigelse" : "OK"}
          </span>
        )}
        {!isManualEntry &&
          deviation.requiresNote &&
          !(entry.clockInNote || entry.clockOutNote || entry.note) && (
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-900 dark:text-red-100">
              Mangler note
            </span>
          )}
      </div>

      <div className="grid gap-1">
        <div>
          <span className="font-semibold">
            {isManualEntry ? "Type:" : "Planlagt:"}
          </span>{" "}
          {isManualEntry ? "Arbejde uden planlagt vagt" : plannedRange}
        </div>
        <div>
          <span className="font-semibold">Registreret:</span> {registeredRange}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {isManualEntry ? (
          <div>ℹ️ Denne tidsregistrering er ikke tilknyttet en planlagt vagt.</div>
        ) : (
          deviation.messages.map((message, index) => (
            <div key={`${entry.id}-deviation-${index}`}>
              {deviation.hasDeviation ? "⚠️" : "✅"} {message}
            </div>
          ))
        )}
      </div>

      {!isManualEntry && (
        <div className="mt-3 grid gap-1 text-xs opacity-80 sm:grid-cols-2">
          <div>
            Planlagt arbejdstid:{" "}
            {formatDurationMinutes(deviation.plannedMinutes)}
          </div>
          <div>
            Registreret arbejdstid:{" "}
            {formatDurationMinutes(deviation.registeredMinutes)}
          </div>
          <div>Difference: {formatMinutes(deviation.differenceMinutes)}</div>
          <div className="flex flex-wrap items-center gap-x-2">
            <span>
              Mødetidsafvigelse:{" "}
              {formatMinutes(deviation.clockInDeviationMinutes)}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Fyraftensafvigelse:{" "}
              {formatMinutes(deviation.clockOutDeviationMinutes)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
