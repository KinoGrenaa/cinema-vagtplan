import {
  formatDateDK,
  formatTimeDK,
  formatUtcDateDK,
} from "@/app/utils/dateTime";

import type {
  LeaveRequest,
  LeaveRequestUser,
  LeaveStatus,
} from "../../helpers/core/leaveApprovalTypes";

type LeaveDisplayDateRange = {
  startDate: string;
  endDate: string;
};

type LeaveApprovalRequestCardProps = {
  request: LeaveRequest;
  focusedRequestId:
    number | null;
  onUpdateStatus: (
    requestId: number,
    status: LeaveStatus,
  ) => void;
};

function getFullDayDateRange(
  start: Date,
  end: Date,
): LeaveDisplayDateRange | null {
  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  const isLocalFullDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 23 &&
    end.getMinutes() >= 59;

  if (isLocalFullDay) {
    return {
      startDate:
        formatDateDK(start),
      endDate:
        formatDateDK(end),
    };
  }

  const isUtcFullDay =
    start.getUTCHours() === 0 &&
    start.getUTCMinutes() === 0 &&
    end.getUTCHours() === 23 &&
    end.getUTCMinutes() >= 59;

  if (isUtcFullDay) {
    return {
      startDate:
        formatUtcDateDK(start),
      endDate:
        formatUtcDateDK(end),
    };
  }

  return null;
}

function formatLeavePeriod(
  startDateString: string,
  endDateString: string,
) {
  const start = new Date(
    startDateString,
  );
  const end = new Date(
    endDateString,
  );
  const fullDayDateRange =
    getFullDayDateRange(
      start,
      end,
    );

  if (fullDayDateRange) {
    return fullDayDateRange.startDate ===
      fullDayDateRange.endDate
      ? `${fullDayDateRange.startDate} · Hele dagen`
      : `${fullDayDateRange.startDate} - ${fullDayDateRange.endDate} · Hele dagen`;
  }

  const startDate =
    formatDateDK(start);
  const endDate =
    formatDateDK(end);
  const startTime =
    formatTimeDK(start);
  const endTime =
    formatTimeDK(end);

  return startDate === endDate
    ? `${startDate} · kl. ${startTime}-${endTime}`
    : `${startDate} kl. ${startTime} - ${endDate} kl. ${endTime}`;
}

function getStatusBadge(
  status: LeaveStatus,
) {
  if (status === "APPROVED") {
    return "border-green-200 bg-green-100 text-green-900 dark:border-green-900 dark:bg-green-950/50 dark:text-green-100";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
  }

  if (status === "CANCELLED") {
    return "border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }

  if (status === "EXPIRED") {
    return "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  }

  return "border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
}

function getStatusLabel(
  status: LeaveStatus,
) {
  if (status === "APPROVED") {
    return "Godkendt";
  }

  if (status === "REJECTED") {
    return "Afvist";
  }

  if (status === "CANCELLED") {
    return "Annulleret";
  }

  if (status === "EXPIRED") {
    return "Udløbet";
  }

  return "Afventer";
}

function getDetailedStatusLabel(
  status: LeaveStatus,
) {
  if (status === "APPROVED") {
    return "Godkendt fravær";
  }

  if (status === "REJECTED") {
    return "Afvist ansøgning";
  }

  if (status === "CANCELLED") {
    return "Annulleret ansøgning";
  }

  if (status === "EXPIRED") {
    return "Udløbet ansøgning";
  }

  return "Afventer behandling";
}

function getStatusDescription(
  status: LeaveStatus,
) {
  if (status === "APPROVED") {
    return "Fraværet er godkendt og bør tages højde for i vagtplanen.";
  }

  if (status === "REJECTED") {
    return "Ansøgningen er afvist og kræver ikke yderligere handling.";
  }

  if (status === "CANCELLED") {
    return "Ansøgningen er annulleret og kræver ikke yderligere handling.";
  }

  if (status === "EXPIRED") {
    return "Ansøgningen blev ikke behandlet, før fraværsperioden begyndte.";
  }

  return "Ansøgningen afventer godkendelse eller afvisning.";
}

function getNoActionLabel(
  status: LeaveStatus,
) {
  if (status === "REJECTED") {
    return "Afvist · ingen yderligere handlinger";
  }

  if (status === "CANCELLED") {
    return "Annulleret · ingen yderligere handlinger";
  }

  if (status === "EXPIRED") {
    return "Udløbet · ingen yderligere handlinger";
  }

  return "Ingen handlinger";
}

function getCancelActionLabel(
  status: LeaveStatus,
) {
  return status === "APPROVED"
    ? "Annullér fravær"
    : "Annullér ansøgning";
}

function formatLeaveReason(
  reason?: string | null,
) {
  const trimmedReason =
    reason?.trim();

  return trimmedReason ||
    "Ingen årsag angivet";
}

function formatRequestCreatedAt(
  createdAt?: string,
) {
  if (!createdAt) {
    return "Ukendt";
  }

  return `${formatDateDK(
    createdAt,
  )} kl. ${formatTimeDK(
    createdAt,
  )}`;
}

function formatUserName(
  user?: LeaveRequestUser | null,
) {
  if (!user) {
    return "Ukendt";
  }

  const name =
    `${user.firstName ?? ""} ${
      user.lastName ?? ""
    }`.trim();

  return name ||
    `Bruger #${user.id}`;
}

function isCreatedByAnotherUser(
  request: LeaveRequest,
) {
  return Boolean(
    request.createdByUser &&
      request.createdByUser.id !==
        request.user.id,
  );
}

function formatCreatedBy(
  request: LeaveRequest,
) {
  if (!request.createdByUser) {
    return "Ukendt";
  }

  const creatorName =
    formatUserName(
      request.createdByUser,
    );

  return isCreatedByAnotherUser(
    request,
  )
    ? creatorName
    : `${creatorName} (egen ansøgning)`;
}

function getCreatorBadgeLabel(
  request: LeaveRequest,
) {
  return isCreatedByAnotherUser(
    request,
  )
    ? "Oprettet af leder"
    : "Egen ansøgning";
}

function getCreatorBadgeClass(
  request: LeaveRequest,
) {
  return isCreatedByAnotherUser(
    request,
  )
    ? "border-purple-200 bg-purple-100 text-purple-900 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-100"
    : "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
}

const actionButtonBase =
  "rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function LeaveApprovalRequestCard({
  request,
  focusedRequestId,
  onUpdateStatus,
}: LeaveApprovalRequestCardProps) {
  const employeeName =
    formatUserName(request.user);
  const createdByText =
    formatCreatedBy(request);

  return (
    <article
      id={`leave-approval-request-${request.id}`}
      tabIndex={-1}
      aria-label={
        request.id ===
          focusedRequestId
          ? "Fremhævet fraværsansøgning"
          : undefined
      }
      className={`rounded-2xl border bg-white p-4 text-gray-900 shadow-sm outline-none transition-colors dark:bg-gray-900 dark:text-gray-100 ${
        request.id ===
        focusedRequestId
          ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-gray-50 dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-950"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
                request.status,
              )}`}
            >
              {getDetailedStatusLabel(
                request.status,
              )}
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCreatorBadgeClass(
                request,
              )}`}
            >
              {getCreatorBadgeLabel(
                request,
              )}
            </span>
            {request.id ===
              focusedRequestId && (
              <span className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                Fra notifikation
              </span>
            )}
          </div>

          <h3 className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">
            Fravær for{" "}
            {employeeName}
          </h3>

          <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            {formatLeavePeriod(
              request.startDate,
              request.endDate,
            )}
          </p>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Oprettet{" "}
            {formatRequestCreatedAt(
              request.createdAt,
            )}{" "}
            af {createdByText}
          </p>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {getStatusDescription(
              request.status,
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {request.status ===
            "PENDING" && (
            <>
              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(
                    request.id,
                    "APPROVED",
                  )
                }
                className={`${actionButtonBase} bg-green-700 hover:bg-green-800 active:bg-green-900 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400`}
              >
                Godkend
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(
                    request.id,
                    "REJECTED",
                  )
                }
                className={`${actionButtonBase} bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400`}
              >
                Afvis
              </button>
            </>
          )}

          {(request.status ===
            "PENDING" ||
            request.status ===
              "APPROVED") && (
            <button
              type="button"
              onClick={() =>
                onUpdateStatus(
                  request.id,
                  "CANCELLED",
                )
              }
              className={`${actionButtonBase} bg-red-900 hover:bg-red-950 active:bg-black focus-visible:ring-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:active:bg-red-600 dark:focus-visible:ring-red-500`}
            >
              {getCancelActionLabel(
                request.status,
              )}
            </button>
          )}

          {(request.status ===
            "REJECTED" ||
            request.status ===
              "CANCELLED" ||
            request.status ===
              "EXPIRED") && (
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-400">
              {getNoActionLabel(
                request.status,
              )}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 dark:border-purple-900/60 dark:bg-purple-950/30">
          <div className="text-xs font-semibold uppercase text-purple-700 dark:text-purple-300">
            Fravær for
          </div>

          <div className="mt-1 font-semibold text-gray-950 dark:text-white">
            {employeeName}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Fraværsperiode
          </div>

          <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
            {formatLeavePeriod(
              request.startDate,
              request.endDate,
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Årsag
          </div>

          <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
            {formatLeaveReason(
              request.reason,
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Status
          </div>

          <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
            {getStatusLabel(
              request.status,
            )}
          </div>

          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Oprettet{" "}
            {formatRequestCreatedAt(
              request.createdAt,
            )}
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
            Oprettet af
          </div>

          <div className="mt-1 font-semibold text-gray-950 dark:text-white">
            {createdByText}
          </div>

          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {getCreatorBadgeLabel(
              request,
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
