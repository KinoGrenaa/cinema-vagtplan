import {
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
} from "@/app/utils/dateTime";

import type { LeaveRequest, LeaveRequestUser, LeaveStatus } from "../helpers/leaveApprovalTypes";

type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

type LeaveApprovalRequestCardProps = {
  request: LeaveRequest;
  onUpdateStatus: (requestId: number, status: LeaveStatus) => void;
};

function getFullDayDateRange(
  start: Date,
  end: Date,
): LeaveDisplayDateRange | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const isLocalFullDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalFullDay) {
    return {
      startDate: formatDateDK(start),
      endDate: formatDateDK(end),
    };
  }

  const isUtcFullDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcFullDay) {
    return {
      startDate: formatUtcDateDK(start),
      endDate: formatUtcDateDK(end),
    };
  }

  return null;
}

function formatLeavePeriod(startDateString: string, endDateString: string) {
  const start = new Date(startDateString);
  const end = new Date(endDateString);
  const fullDayDateRange = getFullDayDateRange(start, end);

  if (fullDayDateRange) {
    return fullDayDateRange.startDate === fullDayDateRange.endDate
      ? `${fullDayDateRange.startDate} · Hele dagen`
      : `${fullDayDateRange.startDate} - ${fullDayDateRange.endDate} · Hele dagen`;
  }

  const startDate = formatDateDK(start);
  const endDate = formatDateDK(end);
  const startTime = formatTimeDK(start);
  const endTime = formatTimeDK(end);

  return startDate === endDate
    ? `${startDate} · kl. ${startTime}-${endTime}`
    : `${startDate} kl. ${startTime} - ${endDate} kl. ${endTime}`;
}

function getStatusBadge(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  if (status === "CANCELLED") {
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function getStatusLabel(status: LeaveStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  if (status === "CANCELLED") return "Annulleret";
  return "Afventer";
}

function getDetailedStatusLabel(status: LeaveStatus) {
  if (status === "APPROVED") return "Godkendt fravær";
  if (status === "REJECTED") return "Afvist ansøgning";
  if (status === "CANCELLED") return "Annulleret ansøgning";
  return "Afventer behandling";
}

function getStatusDescription(status: LeaveStatus) {
  if (status === "APPROVED") {
    return "Fraværet er godkendt og bør tages højde for i vagtplanen.";
  }

  if (status === "REJECTED") {
    return "Ansøgningen er afvist og kræver ikke yderligere handling.";
  }

  if (status === "CANCELLED") {
    return "Ansøgningen er annulleret og kræver ikke yderligere handling.";
  }

  return "Ansøgningen afventer godkendelse eller afvisning.";
}

function getNoActionLabel(status: LeaveStatus) {
  if (status === "REJECTED") return "Afvist · ingen yderligere handlinger";
  if (status === "CANCELLED") return "Annulleret · ingen yderligere handlinger";
  return "Ingen handlinger";
}

function getCancelActionLabel(status: LeaveStatus) {
  if (status === "APPROVED") return "Annullér fravær";
  return "Annullér ansøgning";
}

function formatLeaveReason(reason?: string | null) {
  const trimmedReason = reason?.trim();

  return trimmedReason ? trimmedReason : "Ingen årsag angivet";
}

function formatRequestCreatedAt(createdAt?: string) {
  if (!createdAt) return "Ukendt";

  return `${formatDateDK(createdAt)} kl. ${formatTimeDK(createdAt)}`;
}

function formatUserName(user?: LeaveRequestUser | null) {
  if (!user) {
    return "Ukendt";
  }

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return name || `Bruger #${user.id}`;
}

function formatCreatedBy(request: LeaveRequest) {
  if (!request.createdByUser) {
    return "Ukendt";
  }

  const creatorName = formatUserName(request.createdByUser);

  if (request.createdByUser.id === request.user.id) {
    return `${creatorName} (egen ansøgning)`;
  }

  return creatorName;
}

export default function LeaveApprovalRequestCard({
  request,
  onUpdateStatus,
}: LeaveApprovalRequestCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                request.status,
              )}`}
            >
              {getDetailedStatusLabel(request.status)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Oprettet {formatRequestCreatedAt(request.createdAt)} · af{" "}
              {formatCreatedBy(request)}
            </span>
          </div>

          <div className="mt-2 text-lg font-semibold">
            {formatLeavePeriod(request.startDate, request.endDate)}
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {getStatusDescription(request.status)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {request.status === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => onUpdateStatus(request.id, "APPROVED")}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                Godkend
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(request.id, "REJECTED")}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Afvis
              </button>
            </>
          )}

          {(request.status === "PENDING" || request.status === "APPROVED") && (
            <button
              type="button"
              onClick={() => onUpdateStatus(request.id, "CANCELLED")}
              className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              {getCancelActionLabel(request.status)}
            </button>
          )}

          {(request.status === "REJECTED" || request.status === "CANCELLED") && (
            <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {getNoActionLabel(request.status)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Fraværsperiode
          </div>
          <div className="mt-1 font-medium">
            {formatLeavePeriod(request.startDate, request.endDate)}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Årsag
          </div>
          <div className="mt-1 font-medium">
            {formatLeaveReason(request.reason)}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Status
          </div>
          <div className="mt-1 font-medium">{getStatusLabel(request.status)}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Oprettet {formatRequestCreatedAt(request.createdAt)}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Oprettet af
          </div>
          <div className="mt-1 font-medium">{formatCreatedBy(request)}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Fravær for {formatUserName(request.user)}
          </div>
        </div>
      </div>
    </div>
  );
}
