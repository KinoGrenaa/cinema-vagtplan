import BaseModal from "@/app/components/modals/BaseModal";

import LeaveApprovalRequestCard from "../../../leave-approval/components/list/LeaveApprovalRequestCard";
import {
  formatCalendarDate,
  formatShortCalendarDate,
  getStatusLabel,
  getStatusStyle,
  getTodayDateKey,
  getUserName,
  requestIsOnDate,
  sortRequestsForCalendar,
} from "../../helpers/core/absenceCalendarHelpers";
import type {
  LeaveRequest,
  LeaveRequestStatus,
} from "../../helpers/core/absenceCalendarTypes";

type AbsenceCalendarGridProps = {
  calendarDays: Array<string | null>;
  requests: LeaveRequest[];
  selectedDate: string | null;
  onSelectDate: (
    date: string | null,
  ) => void;
  onUpdateStatus: (
    requestId: number,
    status: LeaveRequestStatus,
    note?: string,
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
  onUpdateStatus,
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

  const detailModalOpen =
    Boolean(
      selectedDate &&
        selectedRequests.length >
          0,
    );

  return (
    <section>
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
                  dayRequests.slice(
                    0,
                    3,
                  );
                const additionalCount =
                  dayRequests.length -
                  visibleRequests.length;
                const isToday =
                  date === today;
                const isSelected =
                  date ===
                    selectedDate &&
                  dayRequests.length >
                    0;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() =>
                      onSelectDate(
                        dayRequests.length >
                          0
                          ? date
                          : null,
                      )
                    }
                    aria-pressed={
                      isSelected
                    }
                    aria-label={
                      dayRequests.length >
                      0
                        ? `${formatCalendarDate(
                            date,
                          )}: åbn ${dayRequests.length} fraværsregistrering${dayRequests.length === 1 ? "" : "er"}`
                        : formatCalendarDate(
                            date,
                          )
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

      <BaseModal
        open={
          detailModalOpen
        }
        title={
          selectedDate
            ? `Fravær · ${formatCalendarDate(
                selectedDate,
              )}`
            : "Fravær"
        }
        onClose={() =>
          onSelectDate(
            null,
          )
        }
        width="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedRequests.length ===
            1
              ? "1 medarbejder har fravær denne dag."
              : `${selectedRequests.length} medarbejdere har fravær denne dag.`}
          </p>

          {selectedRequests.map(
            (request) => (
              <LeaveApprovalRequestCard
                key={
                  request.id
                }
                request={
                  request
                }
                focusedRequestId={
                  null
                }
                onUpdateStatus={
                  onUpdateStatus
                }
              />
            ),
          )}
        </div>
      </BaseModal>
    </section>
  );
}
