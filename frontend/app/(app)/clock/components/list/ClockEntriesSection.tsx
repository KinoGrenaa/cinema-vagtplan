import type { TimeEntry } from "../../../../../../shared/types";

import {
  calculateEntryHours,
  toInputDateTime,
} from "../../helpers/core/clockHelpers";

type ClockEntriesSectionProps = {
  entries: TimeEntry[];
  totalHours: number;
};

export default function ClockEntriesSection({
  entries,
  totalHours,
}: ClockEntriesSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mine registreringer</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Oversigt over tidligere clock ind/ud.
          </p>
        </div>

        <div className="rounded-2xl bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
          <div className="text-sm opacity-80">Samlede timer</div>
          <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
              <th className="px-4 py-3">Clock ind</th>
              <th className="px-4 py-3">Clock ud</th>
              <th className="px-4 py-3">Timer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const hours = calculateEntryHours(entry);

              return (
                <tr
                  key={entry.id}
                  className="border-t border-gray-200 dark:border-gray-800"
                >
                  <td className="px-4 py-4">
                    {toInputDateTime(entry.clockIn).replace("T", " ")}
                  </td>
                  <td className="px-4 py-4">
                    {entry.clockOut
                      ? toInputDateTime(entry.clockOut).replace("T", " ")
                      : "-"}
                  </td>
                  <td className="px-4 py-4 font-semibold">{hours}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                      {entry.status || "PENDING"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Ingen registreringer endnu.
          </div>
        )}
      </div>
    </section>
  );
}
