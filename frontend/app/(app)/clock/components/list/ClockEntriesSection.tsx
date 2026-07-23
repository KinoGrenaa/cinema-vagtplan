import type { TimeEntry } from "../../../../../../shared/types";

import {
  calculateEntryHours,
  toInputDateTime,
} from "../../helpers/core/clockHelpers";

type ClockEntriesSectionProps = {
  entries: TimeEntry[];
  totalHours: number;
};

function getStatusPresentation(status?: string | null) {
  switch (status) {
    case "APPROVED":
      return {
        label: "Godkendt",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
      };
    case "NEEDS_CHANGES":
      return {
        label: "Kræver handling",
        className:
          "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200",
      };
    case "VOIDED":
      return {
        label: "Annulleret",
        className:
          "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
    case "PENDING":
    default:
      return {
        label: status || "Afventer",
        className:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
      };
  }
}

export default function ClockEntriesSection({
  entries,
  totalHours,
}: ClockEntriesSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            Mine registreringer
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Oversigt over tidligere clock ind/ud.
          </p>
        </div>

        <div className="min-w-40 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Samlede timer
          </div>
          <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-950/70">
            <tr className="text-left text-sm font-semibold text-slate-600 dark:text-slate-400">
              <th className="px-4 py-3">Clock ind</th>
              <th className="px-4 py-3">Clock ud</th>
              <th className="px-4 py-3">Timer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {entries.map((entry) => {
              const hours = calculateEntryHours(entry);
              const status = getStatusPresentation(entry.status);

              return (
                <tr
                  key={entry.id}
                  className="text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50"
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    {toInputDateTime(entry.clockIn).replace("T", " ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {entry.clockOut
                      ? toInputDateTime(entry.clockOut).replace("T", " ")
                      : "-"}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">
                    {hours}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="border-t border-slate-200 px-6 py-10 text-center dark:border-slate-800">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Ingen registreringer endnu
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Dine registreringer vises her, når du har gemt den første.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
