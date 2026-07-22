import {
  formatCalendarDate,
  formatRequestRange,
  formatShortCalendarDate,
  getStatusLabel,
  getStatusStyle,
  getTodayDateKey,
  getUserName,
  requestIsOnDate,
  sortRequestsForCalendar,
} from "../../helpers/core/absenceCalendarHelpers";
import type { LeaveRequest } from "../../helpers/core/absenceCalendarTypes";

type AbsenceCalendarGridProps = {
  calendarDays: Array<string | null>;
  requests: LeaveRequest[];
  selectedDate: string | null;
  onSelectDate: (
    date: string,
  ) => void;
};

const weekdayLabels = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
];

export default function AbsenceCalendarGrid({
  calendarDays,
  requests,
  selectedDate,
  onSelectDate,
}: AbsenceCalendarGridProps) {
  const today = getTodayDateKey();
  const selectedRequests =
    selectedDate
      ? sortRequestsForCalendar(
          requests.filter(
            (request) =>
              requestIsOnDate(
                request,
                selectedDate,
              ),
          ),
        )
      : [];

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
        <div className="min-w-[980px]">
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekdayLabels.map(
              (weekday) => (
                <div
                  key={weekday}
                  className="px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {weekday}
                </div>
              ),
            )}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(
              (date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      aria-hidden="true"
                      className="min-h-36 rounded-xl bg-gray-50/60 dark:bg-gray-900/30"
                    />
                  );
                }

                const dayRequests =
                  sortRequestsForCalendar(
                    requests.filter(
                      (request) =>
                        requestIsOnDate(
                          request,
                          date,
                        ),
                    ),
                  );
                const visibleRequests =
                  dayRequests.slice(0, 3);
                const additionalCount =
                  dayRequests.length -
                  visibleRequests.length;
                const isToday =
                  date === today;
                const isSelected =
                  date === selectedDate;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() =>
                      onSelectDate(date)
                    }
                    aria-pressed={
                      isSelected
                    }
                    className={`min-h-36 rounded-xl border p-2 text-left transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20 dark:bg-blue-950/30"
                        : isToday
                          ? "border-blue-300 bg-blue-50/50 hover:border-blue-500 dark:border-blue-800 dark:bg-blue-950/20"
                          : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/45 dark:hover:border-gray-600 dark:hover:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isToday
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {formatShortCalendarDate(
                          date,
                        )}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          I dag
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {visibleRequests.map(
                        (request) => (
                          <div
                            key={
                              request.id
                            }
                            className={`rounded-lg border px-2 py-1.5 text-xs ${getStatusStyle(
                              request.status,
                            )}`}
                          >
                            <div className="truncate font-bold">
                              {getUserName(
                                request,
                              )}
                            </div>
                            <div className="mt-0.5 truncate opacity-80">
                              {getStatusLabel(
                                request.status,
                              )}
                            </div>
                          </div>
                        ),
                      )}

                      {additionalCount >
                        0 && (
                        <div className="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          +{" "}
                          {
                            additionalCount
                          }{" "}
                          flere
                        </div>
                      )}

                      {dayRequests.length ===
                        0 && (
                        <div className="px-1 pt-2 text-xs text-gray-400">
                          Ingen fravær
                        </div>
                      )}
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {selectedDate ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              {formatCalendarDate(
                selectedDate,
              )}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {selectedRequests.length ===
              1
                ? "1 medarbejder har fravær denne dag."
                : `${selectedRequests.length} medarbejdere har fravær denne dag.`}
            </p>
          </div>

          {selectedRequests.length >
          0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {selectedRequests.map(
                (request) => (
                  <article
                    key={request.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-gray-950 dark:text-white">
                          {getUserName(
                            request,
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {formatRequestRange(
                            request,
                          )}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                          request.status,
                        )}`}
                      >
                        {getStatusLabel(
                          request.status,
                        )}
                      </span>
                    </div>

                    {request.reason && (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700 dark:bg-gray-950/60 dark:text-gray-200">
                        {request.reason}
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Ingen fravær på den valgte
              dag med de aktuelle filtre.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-400">
          Vælg en dag i kalenderen for at
          se hele fraværsperioden, årsagen
          og status.
        </div>
      )}
    </section>
  );
}
