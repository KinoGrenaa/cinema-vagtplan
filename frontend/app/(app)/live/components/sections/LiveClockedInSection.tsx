import { formatTimeDK } from "@/app/utils/dateTime";

import { getUserName } from "../../helpers/core/liveHelpers";
import type {
  TimeEntry,
  User,
} from "../../helpers/core/liveTypes";

type LiveClockedInSectionProps = {
  timeEntries: TimeEntry[];
  users: User[];
};

export function LiveClockedInSection({
  timeEntries,
  users,
}: LiveClockedInSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
          Clocked ind nu
        </h2>

        <span className="rounded-full bg-green-700 px-3 py-1 text-sm font-semibold text-white dark:bg-green-600">
          {timeEntries.length}
        </span>
      </div>

      <div className="space-y-3">
        {timeEntries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-950 transition-colors dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
          >
            <div className="font-bold">
              {getUserName(
                users,
                entry.userId,
              )}
            </div>

            <div className="mt-1 text-sm text-green-800 dark:text-green-200">
              Clocked ind siden{" "}
              {formatTimeDK(
                entry.clockIn,
              )}
            </div>
          </article>
        ))}

        {timeEntries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
            Ingen er clocked ind lige nu.
          </div>
        )}
      </div>
    </section>
  );
}
