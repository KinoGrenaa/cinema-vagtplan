import { formatTimeDK } from "@/app/utils/dateTime";

import { getUserName } from "../../helpers/core/liveHelpers";
import type { TimeEntry, User } from "../../helpers/core/liveTypes";

type LiveClockedInSectionProps = {
  timeEntries: TimeEntry[];
  users: User[];
};

export function LiveClockedInSection({
  timeEntries,
  users,
}: LiveClockedInSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clocked ind nu</h2>
        <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-semibold text-white">
          {timeEntries.length}
        </span>
      </div>

      <div className="space-y-3">
        {timeEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-green-200 bg-green-50 p-4 transition-colors dark:border-green-900 dark:bg-green-950/40"
          >
            <div className="font-bold">{getUserName(users, entry.userId)}</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Clocked ind siden {formatTimeDK(entry.clockIn)}
            </div>
          </div>
        ))}

        {timeEntries.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
            Ingen er clocked ind lige nu.
          </div>
        )}
      </div>
    </section>
  );
}
