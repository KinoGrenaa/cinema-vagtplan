import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import type {
  GroupedLeaveRequests,
  LeaveRequest,
  LeaveStatus,
} from "../../helpers/core/leaveApprovalTypes";
import LeaveApprovalRequestCard from "./LeaveApprovalRequestCard";

type LeaveApprovalRequestsSectionProps = {
  requests:
    LeaveRequest[];
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  focusedRequestId:
    number | null;
  visibleRequests:
    LeaveRequest[];
  groupedRequests:
    GroupedLeaveRequests[];
  statusFilterSummary:
    string;
  dateFilterSummary:
    string;
  expandedUserIds:
    number[];
  isDateGroupExpanded:
    (
      userId: number,
      dateKey: string,
    ) => boolean;
  onLoadMore:
    () => Promise<unknown>;
  onToggleUserGroup:
    (
      userId: number,
    ) => void;
  onToggleDateGroup:
    (
      userId: number,
      dateKey: string,
    ) => void;
  onUpdateStatus:
    (
      requestId: number,
      status:
        LeaveStatus,
    ) => void;
};

function getStatusBadge(
  status:
    LeaveStatus,
) {
  if (
    status ===
    "APPROVED"
  ) {
    return "border-green-200 bg-green-100 text-green-900 dark:border-green-900 dark:bg-green-950/50 dark:text-green-100";
  }

  if (
    status ===
    "REJECTED"
  ) {
    return "border-red-200 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
  }

  if (
    status ===
    "CANCELLED"
  ) {
    return "border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  }

  if (
    status ===
    "EXPIRED"
  ) {
    return "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  }

  return "border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
}

function getStatusCountsForRequests(
  requests:
    LeaveRequest[],
) {
  return requests.reduce(
    (
      counts,
      request,
    ) => ({
      ...counts,
      [request.status]:
        counts[
          request.status
        ] + 1,
    }),
    {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    } satisfies Record<
      LeaveStatus,
      number
    >,
  );
}

function getStatusSummaryParts(
  requests:
    LeaveRequest[],
) {
  const counts =
    getStatusCountsForRequests(
      requests,
    );

  return [
    {
      label:
        "Afventer",
      count:
        counts.PENDING,
      status:
        "PENDING" as const,
    },
    {
      label:
        "Godkendt",
      count:
        counts.APPROVED,
      status:
        "APPROVED" as const,
    },
    {
      label:
        "Afvist",
      count:
        counts.REJECTED,
      status:
        "REJECTED" as const,
    },
    {
      label:
        "Annulleret",
      count:
        counts.CANCELLED,
      status:
        "CANCELLED" as const,
    },
    {
      label:
        "Udløbet",
      count:
        counts.EXPIRED,
      status:
        "EXPIRED" as const,
    },
  ].filter(
    (item) =>
      item.count > 0,
  );
}

const groupButtonClass =
  "flex w-full gap-4 bg-gray-50 p-4 text-left text-gray-900 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:focus-visible:ring-blue-400";

export default function LeaveApprovalRequestsSection({
  requests,
  totalCount,
  hasMore,
  loadingMore,
  focusedRequestId,
  visibleRequests,
  groupedRequests,
  statusFilterSummary,
  dateFilterSummary,
  expandedUserIds,
  isDateGroupExpanded,
  onLoadMore,
  onToggleUserGroup,
  onToggleDateGroup,
  onUpdateStatus,
}: LeaveApprovalRequestsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
            Ansøgninger
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Viser{" "}
            {visibleRequests.length} af{" "}
            {totalCount}{" "}
            ansøgninger.
          </p>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {statusFilterSummary} ·{" "}
          {dateFilterSummary}
        </div>
      </div>

      {groupedRequests.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-950/50">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Ingen
            fraværsansøgninger
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Ingen ansøgninger
            matcher det valgte
            filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedRequests.map(
            (group) => {
              const isExpanded =
                expandedUserIds.includes(
                  group.userId,
                );
              const groupStatusSummary =
                getStatusSummaryParts(
                  group.requests,
                );

              return (
                <div
                  key={
                    group.userId
                  }
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onToggleUserGroup(
                        group.userId,
                      )
                    }
                    aria-expanded={
                      isExpanded
                    }
                    className={`${groupButtonClass} items-center justify-between`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                        {isExpanded ? (
                          <ChevronDown
                            size={
                              18
                            }
                          />
                        ) : (
                          <ChevronRight
                            size={
                              18
                            }
                          />
                        )}
                        {
                          group.userName
                        }
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {
                          group
                            .requests
                            .length
                        }{" "}
                        ansøgning
                        {group
                          .requests
                          .length ===
                        1
                          ? ""
                          : "er"}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                      {groupStatusSummary
                        .map(
                          (item) =>
                            `${item.label}: ${item.count}`,
                        )
                        .join(
                          " · ",
                        )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
                      {group.dateGroups.map(
                        (
                          dateGroup,
                        ) => {
                          const isDateExpanded =
                            isDateGroupExpanded(
                              group.userId,
                              dateGroup.key,
                            );
                          const statusSummary =
                            getStatusSummaryParts(
                              dateGroup.requests,
                            );

                          return (
                            <div
                              key={
                                dateGroup.key
                              }
                              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleDateGroup(
                                    group.userId,
                                    dateGroup.key,
                                  )
                                }
                                aria-expanded={
                                  isDateExpanded
                                }
                                className={`${groupButtonClass} flex-col md:flex-row md:items-center md:justify-between`}
                              >
                                <div>
                                  <div className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                                    {isDateExpanded ? (
                                      <ChevronDown
                                        size={
                                          18
                                        }
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={
                                          18
                                        }
                                      />
                                    )}
                                    {
                                      dateGroup.title
                                    }
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {
                                      dateGroup
                                        .requests
                                        .length
                                    }{" "}
                                    ansøgning
                                    {dateGroup
                                      .requests
                                      .length ===
                                    1
                                      ? ""
                                      : "er"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 md:justify-end">
                                  {statusSummary.map(
                                    (
                                      item,
                                    ) => (
                                      <span
                                        key={
                                          item.status
                                        }
                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                          item.status,
                                        )}`}
                                      >
                                        {
                                          item.label
                                        }
                                        :{" "}
                                        {
                                          item.count
                                        }
                                      </span>
                                    ),
                                  )}
                                </div>
                              </button>

                              {isDateExpanded && (
                                <div className="space-y-3 border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/30">
                                  {dateGroup.requests.map(
                                    (
                                      request,
                                    ) => (
                                      <LeaveApprovalRequestCard
                                        key={
                                          request.id
                                        }
                                        request={
                                          request
                                        }
                                        focusedRequestId={
                                          focusedRequestId
                                        }
                                        onUpdateStatus={
                                          onUpdateStatus
                                        }
                                      />
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() =>
                  void onLoadMore()
                }
                disabled={
                  loadingMore
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              >
                {loadingMore
                  ? "Henter..."
                  : "Hent ældre ansøgninger"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
