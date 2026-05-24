"use client";

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    firstName: string;
    lastName: string;
  };
};

type LeaveRequestsPanelProps = {
  leaveRequests: LeaveRequest[];
};

function getLeaveStyle(status: LeaveRequest["status"]) {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
  }

  return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200";
}

export default function LeaveRequestsPanel({
  leaveRequests,
}: LeaveRequestsPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-2xl font-bold">Fravær denne dag</h2>

      <div className="space-y-2">
        {leaveRequests.map((request) => (
          <div
            key={request.id}
            className={`rounded-xl border p-3 ${getLeaveStyle(request.status)}`}
          >
            <div className="font-bold">
              {request.user.firstName} {request.user.lastName}
            </div>

            <div className="text-sm">Status: {request.status}</div>

            {request.reason && (
              <div className="mt-1 text-sm">Årsag: {request.reason}</div>
            )}
          </div>
        ))}

        {leaveRequests.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">
            Ingen fravær denne dag.
          </div>
        )}
      </div>
    </div>
  );
}
