import { formatDateDK } from "@/app/utils/dateTime";
import {
  getStatusStyle,
  requestIsOnDate,
} from "../helpers/absenceCalendarHelpers";
import type { LeaveRequest } from "../helpers/absenceCalendarTypes";

type AbsenceCalendarGridProps = {
  daysInMonth: string[];
  requests: LeaveRequest[];
};

export default function AbsenceCalendarGrid({
  daysInMonth,
  requests,
}: AbsenceCalendarGridProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-[900px]">
        {daysInMonth.map((date) => {
          const dayRequests = requests.filter(
            (request) =>
              (request.status === "PENDING" ||
                request.status === "APPROVED") &&
              requestIsOnDate(request, date),
          );

          return (
            <div key={date} className="border rounded-xl p-3 min-h-32 bg-gray-50">
              <div className="font-bold mb-2">
                {formatDateDK(`${date}T12:00:00`)}
              </div>

              <div className="space-y-2">
                {dayRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-2 text-xs ${getStatusStyle(
                      request.status,
                    )}`}
                  >
                    <div className="font-bold">
                      {request.user.firstName} {request.user.lastName}
                    </div>

                    <div>{request.status}</div>

                    {request.reason && (
                      <div className="mt-1 opacity-80">{request.reason}</div>
                    )}
                  </div>
                ))}

                {dayRequests.length === 0 && (
                  <div className="text-xs text-gray-400">Ingen fravær</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
