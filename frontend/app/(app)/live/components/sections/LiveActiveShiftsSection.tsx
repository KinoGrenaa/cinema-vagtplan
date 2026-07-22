import { formatTimeDK } from "@/app/utils/dateTime";

import type { Shift } from "../../helpers/core/liveTypes";

type LiveActiveShiftsSectionProps = {
  activeShifts: Shift[];
};

export function LiveActiveShiftsSection({
  activeShifts,
}: LiveActiveShiftsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
          Aktive vagter
        </h2>

        <span className="rounded-full bg-blue-700 px-3 py-1 text-sm font-semibold text-white dark:bg-blue-600">
          {activeShifts.length}
        </span>
      </div>

      <div className="space-y-3">
        {activeShifts.map((shift) => (
          <article
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100"
          >
            <div
              className="h-2"
              style={{
                backgroundColor:
                  shift.workType.color,
              }}
            />

            <div className="p-4">
              <div className="font-bold">
                {shift.user.firstName}{" "}
                {shift.user.lastName}
              </div>

              <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                {shift.workType.name}
              </div>

              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {formatTimeDK(
                  shift.startTime,
                )}
                {" - "}
                {formatTimeDK(
                  shift.endTime,
                )}
              </div>
            </div>
          </article>
        ))}

        {activeShifts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
            Ingen aktive vagter lige nu.
          </div>
        )}
      </div>
    </section>
  );
}
