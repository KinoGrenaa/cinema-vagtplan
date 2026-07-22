"use client";

import type { LeaveRequest } from "../../../../../../shared/types";

type ScheduleLeaveOverviewProps = {
  leaveRequests: LeaveRequest[];
  selectedDate: string;
};

function leaveIsOnSelectedDate(
  request: LeaveRequest,
  selectedDate: string,
) {
  const current = new Date(
    `${selectedDate}T12:00:00`,
  );
  const start = new Date(
    request.startDate,
  );
  const end = new Date(
    request.endDate,
  );

  return (
    current >= start &&
    current <= end
  );
}

function getLeaveStyle(
  status: LeaveRequest["status"],
) {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-100 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100";
  }

  if (status === "REJECTED") {
    return "border-red-300 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100";
  }

  return "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100";
}

export default function ScheduleLeaveOverview({
  leaveRequests,
  selectedDate,
}: ScheduleLeaveOverviewProps) {
  const selectedDateLeaveRequests =
    leaveRequests.filter(
      (request) =>
        (request.status === "PENDING" ||
          request.status === "APPROVED") &&
        leaveIsOnSelectedDate(
          request,
          selectedDate,
        ),
    );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <h2 className="mb-4 text-2xl font-bold text-gray-950 dark:text-white">
        Fravær denne dag
      </h2>

      <div className="space-y-2">
        {selectedDateLeaveRequests.map(
          (request) => (
            <div
              key={request.id}
              className={`rounded-xl border p-3 ${getLeaveStyle(
                request.status,
              )}`}
            >
              <div className="font-bold">
                {request.user.firstName}{" "}
                {request.user.lastName}
              </div>

              <div className="mt-1 text-sm">
                Status: {request.status}
              </div>

              {request.reason && (
                <div className="mt-1 text-sm">
                  Årsag: {request.reason}
                </div>
              )}
            </div>
          ),
        )}

        {selectedDateLeaveRequests.length ===
          0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
            Ingen fravær denne dag.
          </div>
        )}
      </div>
    </div>
  );
}
